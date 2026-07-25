# Fusion Engine Notes (Step 7)

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
{
  "entity_id": "user_086",
  "timestamp": "2026-06-26T06:45:47Z",
  "risk_score": 0.17100942661679366,
  "is_anomaly": false,
  "attack_type": "normal",
  "signal_breakdown": {
    "classifier_risk": 0.02400000000000002,
    "classifier_predicted_type": "normal",
    "sequence_risk": 0.0014710010727867484,
    "relational_risk": 0.792840631474788
  },
  "used_cold_start_fallback": false
}
```

### 2. Real Attack Event (Injected as: `lateral_movement`)
```json
{
  "entity_id": "user_059",
  "timestamp": "2026-07-11T06:19:24Z",
  "risk_score": 0.9742538555655145,
  "is_anomaly": true,
  "attack_type": "lateral_movement",
  "signal_breakdown": {
    "classifier_risk": 1.0,
    "classifier_predicted_type": "lateral_movement",
    "sequence_risk": 1.0,
    "relational_risk": 0.8712692778275719
  },
  "used_cold_start_fallback": false
}
```

### 3. Cold-Start Entity
```json
{
  "entity_id": "user_brand_new_9999",
  "timestamp": "2026-07-25T19:33:20.251464",
  "risk_score": 0.63,
  "is_anomaly": true,
  "attack_type": "device_spoofing",
  "signal_breakdown": {
    "classifier_risk": 0.76,
    "classifier_predicted_type": "device_spoofing",
    "sequence_risk": 0.5,
    "relational_risk": 0.5
  },
  "used_cold_start_fallback": true
}
```
