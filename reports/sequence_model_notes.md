# Sequence Model Notes (Step 5)

## Data Preparation
- **Total Entities**: 100
- **Skipped Entities**: 0 (Did not have at least 10 events to form a sequence)
- **Total Sequences Generated**: 17100

## Training Info
- **Class Balance**: In the training split, there were 5713 anomalous sequences and 7967 normal sequences. The class imbalance was handled via `BCEWithLogitsLoss(pos_weight=1.39)`.
- The `label` column was rigorously excluded from the 19-dimensional feature vectors.

## Test Split Evaluation
- **ROC-AUC**: 0.9987
- **PR-AUC**: 0.9987

### 1% Alert Budget
If a SOC analyst only has the budget to investigate the **Top 1%** highest-scoring sequences:
- **False Positive Rate in Top 1%**: 0.0%

### Classification Report (Threshold 0.5)
```text
              precision    recall  f1-score   support

           0       0.99      1.00      0.99      1992
           1       1.00      0.98      0.99      1428

    accuracy                           0.99      3420
   macro avg       0.99      0.99      0.99      3420
weighted avg       0.99      0.99      0.99      3420

```

## Architectural Justification
Expect near-perfect metrics (ROC-AUC close to 1.0). This is a known, explainable property of the synthetic data. The baseline-deviation features (`is_new_resource`, `is_new_device_combo`, `is_new_geo`) are near-perfect proxies for the attack label because Step 1's attack-injection logic directly *sets* those flags as part of how each attack type is defined. The model isn't learning a subtle temporal pattern so much as reading off flags that were injected as ground truth markers in the first place. This is an accepted, documented simplification for this hackathon's synthetic-data setup.

## Real-Time Single-Event Scoring
For real-time scoring in the final Dashboard (Steps 9/10), the system must maintain a rolling buffer of each entity's last 9 events plus the new event. It applies `engineer_row_features`, queries the `BaselineManager`, scales via `gru_feature_scaler.joblib`, and runs the 10-event tensor through `gru_model.pt` without retraining.
