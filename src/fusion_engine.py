# Cyber AI Fusion Engine — 3-Model Weighted Risk Scorer
# Models: RandomForest (0.5x) + GRU (0.3x) + GNN (0.2x)

# pyrefly: ignore [missing-import]
import pandas as pd
# pyrefly: ignore [missing-import]
import numpy as np
# pyrefly: ignore [missing-import]
import joblib
# pyrefly: ignore [missing-import]
import torch
import os
import json
from datetime import datetime

# Import models to ensure they deserialize correctly
from baseline_profiler import BaselineManager
_ = BaselineManager
from sequence_model import SequenceAnomalyGRU
from feature_utils import engineer_row_features

NUMERIC_COLUMNS = [
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

CATEGORICAL_COLUMNS = [
    "entity_type",
    "geo_location",
    "country",
    "resource_accessed",
    "auth_method",
    "device_os",
    "browser",
]


def load_all_models(project_root: str = ".") -> dict:
    print("Loading all models into memory...")
    models = {}

    # 1. Baseline Manager
    models["baseline_manager"] = joblib.load(
        f"{project_root}/models/baseline_profiles.joblib"
    )

    # 2. Random Forest Classifier
    models["rf_classifier"] = joblib.load(f"{project_root}/models/rf_classifier.joblib")

    # 3. GNN Artifacts
    # We don't necessarily need the weights for inference if we have the joblib, but let's load what's asked
    models["relational_risk_df"] = joblib.load(
        f"{project_root}/models/entity_relational_risk_scores.joblib"
    )
    models["graph_snapshots"] = torch.load(
        f"{project_root}/models/graph_snapshots.pt", weights_only=False
    )
    models["relational_risk_p90"] = float(
        models["relational_risk_df"]["relational_risk"].quantile(0.9)
    )

    # 4. GRU Artifacts
    models["gru_model"] = SequenceAnomalyGRU(input_size=19)
    models["gru_model"].load_state_dict(
        torch.load(f"{project_root}/models/gru_model.pt", weights_only=True)
    )
    models["gru_model"].eval()
    models["gru_scaler"] = joblib.load(
        f"{project_root}/models/gru_feature_scaler.joblib"
    )

    # Optional pre-scored sequences, though we will do rolling eval in score_event
    models["entity_sequence_risk_scores"] = joblib.load(
        f"{project_root}/models/entity_sequence_risk_scores.joblib"
    )

    return models


class RecentEventBuffer:
    def __init__(self, max_len: int = 9):
        self.buffers = {}
        self.max_len = max_len

    def get_sequence_with_new_event(self, entity_id: str, new_event: dict) -> list:
        """Returns the last up-to-9 buffered events + new_event, in order."""
        history = self.buffers.get(entity_id, [])
        return history + [new_event]

    def add_event(self, entity_id: str, event: dict):
        history = self.buffers.get(entity_id, [])
        history.append(event)
        self.buffers[entity_id] = history[-self.max_len :]

    def prepopulate(self, df: pd.DataFrame):
        print("Pre-populating RecentEventBuffer...")
        for entity_id, group in df.groupby("entity_id"):
            group_sorted = group.sort_values("timestamp")
            recent = group_sorted.tail(self.max_len).to_dict("records")
            self.buffers[entity_id] = recent


def _build_features_for_event(event: dict, bm: BaselineManager) -> dict:
    df_event = pd.DataFrame([event])
    df_event = engineer_row_features(df_event)

    row = df_event.iloc[0].to_dict()
    dev = bm.compute_deviation(row["entity_id"], row["department"], row)

    # Merge deviations back in
    for k, v in dev.items():
        row[k] = v

    return row


def score_event(event: dict, models: dict) -> dict:
    bm = models["baseline_manager"]
    rf = models["rf_classifier"]
    gru = models["gru_model"]
    scaler = models["gru_scaler"]
    rel_df = models["relational_risk_df"]
    buffer = models["recent_event_buffer"]
    snapshots = models["graph_snapshots"]

    entity_id = event["entity_id"]

    used_cold_start = entity_id not in bm.entity_profiles

    # 1. Feature Engineering
    feat_row = _build_features_for_event(event, bm)

    # 2. Classifier Risk
    rf_df = pd.DataFrame([feat_row])
    rf_probs = rf.predict_proba(rf_df)[0]
    classes = list(rf.classes_)

    # P(normal)
    if "normal" in classes:
        normal_idx = classes.index("normal")
        p_normal = rf_probs[normal_idx]
    else:
        p_normal = 0.0

    classifier_risk = 1.0 - p_normal
    classifier_predicted_type = rf.predict(rf_df)[0]

    # 3. Sequence Risk
    seq = buffer.get_sequence_with_new_event(entity_id, feat_row)
    if len(seq) < 10:
        # Pad with earliest event
        if len(seq) > 0:
            pad_needed = 10 - len(seq)
            seq = [seq[0]] * pad_needed + seq
        else:
            # Complete cold start, no history at all, just duplicate the current event
            seq = [feat_row] * 10

    if used_cold_start or len(buffer.buffers.get(entity_id, [])) < 9:
        sequence_risk = 0.5
    else:
        # Build tensor
        seq_feats = []
        for e in seq:
            if "hour_z" not in e:
                # Engineered history
                e = _build_features_for_event(e, bm)
            row_arr = [e[c] for c in NUMERIC_COLUMNS]
            seq_feats.append(row_arr)

        seq_feats = np.array(seq_feats, dtype=float)

        continuous_idx = [
            NUMERIC_COLUMNS.index("hour"),
            NUMERIC_COLUMNS.index("session_duration"),
            NUMERIC_COLUMNS.index("geo_distance_km"),
            NUMERIC_COLUMNS.index("unique_resource_count_24h"),
            NUMERIC_COLUMNS.index("hour_z"),
            NUMERIC_COLUMNS.index("session_duration_z"),
            NUMERIC_COLUMNS.index("failed_attempts_z"),
        ]

        seq_feats[:, continuous_idx] = scaler.transform(seq_feats[:, continuous_idx])

        with torch.no_grad():
            t_input = torch.tensor(seq_feats, dtype=torch.float).unsqueeze(0)
            logit = gru(t_input)
            sequence_risk = float(torch.sigmoid(logit).item())

    # 4. Relational Risk
    # Find which window this falls into
    ev_time = pd.to_datetime(event["timestamp"])
    window_idx = None
    for i, snap in enumerate(snapshots):
        # We need to parse snap window_start/end
        # PyG Data objects don't serialize arbitrary string attrs perfectly sometimes,
        # but in step 3 we stored them. Let's just find the closest window if it fails.
        try:
            start = pd.to_datetime(snap.window_start)
            end = pd.to_datetime(snap.window_end)
            if start <= ev_time <= end:
                window_idx = i
                break
        except Exception:
            pass

    if window_idx is None:
        relational_risk = 0.5
    else:
        edge_match = rel_df[
            (rel_df["entity_id"] == entity_id)
            & (rel_df["resource"] == event["resource_accessed"])
            & (rel_df["window_index"] == window_idx)
        ]
        if len(edge_match) > 0:
            relational_risk = float(edge_match["relational_risk"].iloc[0])
        else:
            relational_risk = 0.5

    # 5. Fusion Formula
    risk_score = 0.5 * classifier_risk + 0.3 * sequence_risk + 0.2 * relational_risk

    is_anomaly = risk_score > 0.5 or classifier_predicted_type != "normal"
    attack_type = classifier_predicted_type if is_anomaly else "normal"

    return {
        "entity_id": entity_id,
        "timestamp": event["timestamp"],
        "risk_score": float(risk_score),
        "is_anomaly": bool(is_anomaly),
        "attack_type": attack_type,
        "signal_breakdown": {
            "classifier_risk": float(classifier_risk),
            "classifier_predicted_type": classifier_predicted_type,
            "sequence_risk": float(sequence_risk),
            "relational_risk": float(relational_risk),
        },
        "used_cold_start_fallback": used_cold_start,
    }


if __name__ == "__main__":
    print("Testing Fusion Engine...")
    models = load_all_models()

    df = pd.read_csv("data/synthetic_access_logs.csv")
    buffer = RecentEventBuffer()
    buffer.prepopulate(df)
    models["recent_event_buffer"] = buffer

    # 1. Real Normal Event
    normal_row = df[df["label"] == "normal"].iloc[100].to_dict()
    # Remove label as it simulates live data
    normal_row.pop("label", None)

    res_normal = score_event(normal_row, models)

    # 2. Real Attack Event
    attack_row = df[df["label"] != "normal"].iloc[50].to_dict()
    true_attack = attack_row.pop("label", None)

    res_attack = score_event(attack_row, models)

    # 3. Cold Start Event
    cold_row = df.iloc[0].to_dict()
    cold_row.pop("label", None)
    cold_row["entity_id"] = "user_brand_new_9999"
    cold_row["timestamp"] = datetime.now().isoformat()
    cold_row["is_new_device"] = True
    cold_row["is_new_country"] = True

    res_cold = score_event(cold_row, models)

    notes = f"""# Fusion Engine Notes (Step 7)

## Fusion Formula and Weighting Rationale
```python
risk_score = (
    0.5 * classifier_risk +
    0.3 * sequence_risk +
    0.2 * relational_risk
)
```
**Rationale**:
- **0.5 (RandomForest Classifier)**: This is the most deterministic and reliable signal. Because the synthetic dataset uses absolute rules (like `is_new_device` = True during a brute force attack), the RF classifier reads these signals with near 100% accuracy.
- **0.3 (GRU Sequence Model)**: Evaluates the sequence behavior. It is powerful for temporal attacks but is more susceptible to cold starts, making it secondary.
- **0.2 (GNN Graph Model)**: The relational edges are an excellent structural indicator of compromise (IOC) but suffer from noise (normal users occasionally access rare resources). It serves as a gentle nudging weight.

## Worked Examples

### 1. Real Normal Event
```json
{json.dumps(res_normal, indent=2)}
```

### 2. Real Attack Event (Injected as: `{true_attack}`)
```json
{json.dumps(res_attack, indent=2)}
```

### 3. Cold-Start Entity
```json
{json.dumps(res_cold, indent=2)}
```
"""

    os.makedirs("reports", exist_ok=True)
    with open("reports/fusion_engine_notes.md", "w") as f:
        f.write(notes)

    print("Done! Check reports/fusion_engine_notes.md for results.")
