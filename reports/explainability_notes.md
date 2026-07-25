# Explainability Notes (Step 8)

## 1. Real Normal Event
**Risk Score**: 0.171 | **Anomaly**: False
```json
{
  "headline": "Normal activity, no significant concerns",
  "reasons": [
    "Access occurred at an unusual time for this entity (3.5 standard deviations from their typical login hour)."
  ],
  "signal_summary": "No individual signal was strongly elevated \u2014 this event is well within normal bounds.",
  "cold_start_note": null
}
```

## 2. Real Attack Event (Injected as: `lateral_movement`)
**Risk Score**: 0.974 | **Anomaly**: True
```json
{
  "headline": "Critical risk: lateral_movement pattern detected",
  "reasons": [
    "Accessed a resource this entity does not normally use (Production Server).",
    "This pattern matches known lateral_movement behavior, most strongly indicated by is_unusual_resource."
  ],
  "signal_summary": "Multiple independent detection signals agree, increasing confidence in this alert.",
  "cold_start_note": null
}
```

## 3. Cold-Start Entity
**Risk Score**: 0.630 | **Anomaly**: True
```json
{
  "headline": "High risk: device_spoofing pattern detected",
  "reasons": [
    "Access occurred at an unusual time for this entity (5.6 standard deviations from their typical login hour).",
    "This pattern matches known device_spoofing behavior, most strongly indicated by is_new_device and is_new_country."
  ],
  "signal_summary": "Flagged primarily by the attack classifier, which recognizes patterns similar to known device_spoofing incidents.",
  "cold_start_note": "This entity has limited history in the system \u2014 this assessment used department-level behavioral norms instead of a personal baseline. Confidence should be treated as lower than for well-established entities."
}
```
