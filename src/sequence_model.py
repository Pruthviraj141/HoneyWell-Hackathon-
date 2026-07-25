# pyrefly: ignore [missing-import]
import pandas as pd
# pyrefly: ignore [missing-import]
import numpy as np
# pyrefly: ignore [missing-import]
import torch
# pyrefly: ignore [missing-import]
import torch.nn as nn
# pyrefly: ignore [missing-import]
from torch.utils.data import DataLoader, TensorDataset
# pyrefly: ignore [missing-import]
import joblib
import os
# pyrefly: ignore [missing-import]
from sklearn.model_selection import train_test_split
# pyrefly: ignore [missing-import]
from sklearn.preprocessing import StandardScaler
# pyrefly: ignore [missing-import]
from sklearn.metrics import (
    roc_auc_score,
    average_precision_score,
    classification_report,
)

# Gotcha specified in 05_sequence_model.md
from baseline_profiler import BaselineManager
_ = BaselineManager
from feature_utils import engineer_row_features

torch.manual_seed(42)
np.random.seed(42)

SEQ_LEN = 10


class SequenceAnomalyGRU(nn.Module):
    def __init__(
        self, input_size: int = 19, hidden_size: int = 48, num_layers: int = 2
    ):
        super().__init__()
        self.gru = nn.GRU(
            input_size, hidden_size, num_layers, batch_first=True, dropout=0.2
        )
        self.classifier = nn.Sequential(
            nn.Linear(hidden_size, 16),
            nn.ReLU(),
            nn.Linear(16, 1),
        )

    def forward(self, x):
        _, h_n = self.gru(x)
        last_hidden = h_n[-1]
        logits = self.classifier(last_hidden)
        return logits.squeeze(-1)


def build_sequences(df, bm):
    print("Building sequences...")
    all_seq_x = []
    all_seq_y = []

    # Track missing entities for reporting
    total_entities = df["entity_id"].nunique()
    skipped_entities = 0

    # We will build sequences and collect 2D data for scaling, then reconstruct 3D
    # It's easier to build all rows, scale, then slice.

    # Features required per timestep:
    # 6 from feature_utils: hour, dayofweek, is_weekend, command_len, resource_risk_score, auth_risk_score
    # 7 raw: session_duration, failed_attempts_10m, geo_distance_km, is_new_device, is_new_country, is_night_hour, unique_resource_count_24h
    # 6 from baseline: hour_z, session_duration_z, is_unusual_geo, is_unusual_resource, is_unusual_os, failed_attempts_z

    feat_cols = [
        "hour",
        "dayofweek",
        "is_weekend",
        "command_len",
        "resource_risk_score",
        "auth_risk_score",
        "session_duration",
        "failed_attempts_10m",
        "geo_distance_km",
        "is_new_device",
        "is_new_country",
        "is_night_hour",
        "unique_resource_count_24h",
        "hour_z",
        "session_duration_z",
        "is_unusual_geo",
        "is_unusual_resource",
        "is_unusual_os",
        "failed_attempts_z",
    ]

    # Optimize by doing BaselineManager processing in batch if possible, or iterate
    # Actually, BaselineManager.compute_deviation is row-by-row
    # We will add columns to the dataframe
    print("Computing baseline deviations...")
    deviations = []
    for _, row in df.iterrows():
        dev = bm.compute_deviation(row["entity_id"], row["department"], row)
        deviations.append(dev)

    dev_df = pd.DataFrame(deviations)
    df = pd.concat([df.reset_index(drop=True), dev_df.reset_index(drop=True)], axis=1)

    print("Extracting windows...")
    entities = df["entity_id"].unique()

    for entity in entities:
        e_df = df[df["entity_id"] == entity].sort_values("timestamp")

        if len(e_df) < SEQ_LEN:
            skipped_entities += 1
            continue

        # extract feats matrix [N, 19]
        feat_matrix = e_df[feat_cols].values
        labels = (e_df["label"] != "normal").astype(int).values

        # Sliding windows
        for i in range(len(e_df) - SEQ_LEN + 1):
            window_x = feat_matrix[i : i + SEQ_LEN]
            window_y = 1 if np.any(labels[i : i + SEQ_LEN] == 1) else 0

            all_seq_x.append(window_x)
            all_seq_y.append(window_y)

    all_seq_x = np.array(all_seq_x)  # [num_sequences, SEQ_LEN, 19]
    all_seq_y = np.array(all_seq_y)  # [num_sequences]

    print(
        f"Skipped {skipped_entities} out of {total_entities} entities due to insufficient events."
    )
    print(f"Built {len(all_seq_x)} sequences total.")
    return df, all_seq_x, all_seq_y, skipped_entities, total_entities, feat_cols


def train_sequence_model():
    df = pd.read_csv("data/synthetic_access_logs.csv")
    df["timestamp"] = pd.to_datetime(df["timestamp"])

    df = engineer_row_features(df)
    bm = joblib.load("models/baseline_profiles.joblib")

    df, X_3d, y, skipped, total, feat_cols = build_sequences(df, bm)

    num_sequences = len(X_3d)

    # Scale continuous features
    # Z-scores, session_duration, geo_distance_km, hour, unique_resource_count_24h
    continuous_idx = [
        feat_cols.index("hour"),
        feat_cols.index("session_duration"),
        feat_cols.index("geo_distance_km"),
        feat_cols.index("unique_resource_count_24h"),
        feat_cols.index("hour_z"),
        feat_cols.index("session_duration_z"),
        feat_cols.index("failed_attempts_z"),
    ]

    # Flatten to fit scaler
    
    scaler = StandardScaler()

    # Fit only on training data technically, but we can do train_test split of indices first
    X_train_3d, X_test_3d, y_train, y_test = train_test_split(
        X_3d, y, test_size=0.2, stratify=y, random_state=42
    )

    # Fit scaler on train
    X_train_flat = X_train_3d.reshape(-1, 19)
    scaler.fit(X_train_flat[:, continuous_idx])

    # Transform train and test
    X_train_flat[:, continuous_idx] = scaler.transform(X_train_flat[:, continuous_idx])
    X_train_3d = X_train_flat.reshape(-1, SEQ_LEN, 19)

    X_test_flat = X_test_3d.reshape(-1, 19)
    X_test_flat[:, continuous_idx] = scaler.transform(X_test_flat[:, continuous_idx])
    X_test_3d = X_test_flat.reshape(-1, SEQ_LEN, 19)

    os.makedirs("models", exist_ok=True)
    joblib.dump(scaler, "models/gru_feature_scaler.joblib")

    pos_count = np.sum(y_train == 1)
    neg_count = np.sum(y_train == 0)
    pos_weight = torch.tensor(
        [neg_count / pos_count if pos_count > 0 else 1.0], dtype=torch.float
    )
    print(
        f"Train Balance: {pos_count} anomalous vs {neg_count} normal. pos_weight={pos_weight.item():.2f}"
    )

    train_dataset = TensorDataset(
        torch.tensor(X_train_3d, dtype=torch.float),
        torch.tensor(y_train, dtype=torch.float),
    )
    train_loader = DataLoader(train_dataset, batch_size=32, shuffle=True)

    model = SequenceAnomalyGRU(input_size=19)
    criterion = nn.BCEWithLogitsLoss(pos_weight=pos_weight)
    optimizer = torch.optim.Adam(model.parameters(), lr=0.001)

    epochs = 30

    for epoch in range(epochs):
        model.train()
        total_loss = 0
        for batch_x, batch_y in train_loader:
            optimizer.zero_grad()
            logits = model(batch_x)
            loss = criterion(logits, batch_y)
            loss.backward()
            optimizer.step()
            total_loss += loss.item()

        if (epoch + 1) % 5 == 0:
            print(
                f"Epoch {epoch+1:02d}/{epochs} - Loss: {total_loss/len(train_loader):.4f}"
            )

    torch.save(model.state_dict(), "models/gru_model.pt")

    # Evaluate
    model.eval()
    test_x_t = torch.tensor(X_test_3d, dtype=torch.float)
    

    with torch.no_grad():
        test_logits = model(test_x_t)
        test_probs = torch.sigmoid(test_logits).numpy()

    roc_auc = roc_auc_score(y_test, test_probs)
    pr_auc = average_precision_score(y_test, test_probs)

    preds = (test_probs > 0.5).astype(int)
    report = classification_report(y_test, preds)

    # 1% Alert Budget False Positive Rate
    # Sort test predictions descending
    sort_idx = np.argsort(test_probs)[::-1]
    top_1_percent_count = max(1, int(len(test_probs) * 0.01))

    top_1_indices = sort_idx[:top_1_percent_count]
    top_1_actual = y_test[top_1_indices]

    # FPR in top 1% = fraction of these alerts that are normal (0)
    top_1_fpr = np.mean(top_1_actual == 0)

    # Score EVERY entity's most recent sequence
    # Re-use X_3d generation logic but just grab the last 10 events
    print("Scoring recent sequences for downstream fusion...")
    recent_records = []
    for entity in df["entity_id"].unique():
        e_df = df[df["entity_id"] == entity].sort_values("timestamp")
        if len(e_df) < SEQ_LEN:
            continue

        last_timestamp = e_df["timestamp"].iloc[-1].isoformat()
        last_window_feats = e_df[feat_cols].values[-SEQ_LEN:]

        # Scale
        last_window_feats[:, continuous_idx] = scaler.transform(
            last_window_feats[:, continuous_idx]
        )

        # Predict
        with torch.no_grad():
            t_input = torch.tensor(last_window_feats, dtype=torch.float).unsqueeze(
                0
            )  # [1, 10, 19]
            logit = model(t_input)
            prob = float(torch.sigmoid(logit).item())

        recent_records.append(
            {
                "entity_id": entity,
                "last_event_timestamp": last_timestamp,
                "sequence_risk_score": prob,
            }
        )

    recent_df = pd.DataFrame(recent_records)
    joblib.dump(recent_df, "models/entity_sequence_risk_scores.joblib")

    notes = f"""# Sequence Model Notes (Step 5)

## Data Preparation
- **Total Entities**: {total}
- **Skipped Entities**: {skipped} (Did not have at least 10 events to form a sequence)
- **Total Sequences Generated**: {num_sequences}

## Training Info
- **Class Balance**: In the training split, there were {pos_count} anomalous sequences and {neg_count} normal sequences. The class imbalance was handled via `BCEWithLogitsLoss(pos_weight={pos_weight.item():.2f})`.
- The `label` column was rigorously excluded from the 19-dimensional feature vectors.

## Test Split Evaluation
- **ROC-AUC**: {roc_auc:.4f}
- **PR-AUC**: {pr_auc:.4f}

### 1% Alert Budget
If a SOC analyst only has the budget to investigate the **Top 1%** highest-scoring sequences:
- **False Positive Rate in Top 1%**: {top_1_fpr*100:.1f}%

### Classification Report (Threshold 0.5)
```text
{report}
```

## Architectural Justification
Expect near-perfect metrics (ROC-AUC close to 1.0). This is a known, explainable property of the synthetic data. The baseline-deviation features (`is_new_resource`, `is_new_device_combo`, `is_new_geo`) are near-perfect proxies for the attack label because Step 1's attack-injection logic directly *sets* those flags as part of how each attack type is defined. The model isn't learning a subtle temporal pattern so much as reading off flags that were injected as ground truth markers in the first place. This is an accepted, documented simplification for this hackathon's synthetic-data setup.

## Real-Time Single-Event Scoring
For real-time scoring in the final Dashboard (Steps 9/10), the system must maintain a rolling buffer of each entity's last 9 events plus the new event. It applies `engineer_row_features`, queries the `BaselineManager`, scales via `gru_feature_scaler.joblib`, and runs the 10-event tensor through `gru_model.pt` without retraining.
"""
    os.makedirs("reports", exist_ok=True)
    with open("reports/sequence_model_notes.md", "w") as f:
        f.write(notes)


if __name__ == "__main__":
    train_sequence_model()
