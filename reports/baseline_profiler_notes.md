# Baseline Profiler Notes

## Profiles Computed
- **Entity Baselines**: 100 full profiles created.
- **Department Baselines (Cold-Start)**: 5 profiles created.

## Deviation Example (Normal vs Attack)

When comparing an event to its historical baseline, we extract Z-scores for numericals and binary flags for categorical shifts.

### Normal Event (from `user_015`)
**Event Context**: Accessing Email at hour 16.

**Calculated Deviations**:
```json
{
  "session_duration_z": 1.2699834366203044,
  "failed_attempts_z": 0.535937130565016,
  "hour_z": 2.7459813897955407,
  "is_unusual_resource": 0,
  "is_unusual_geo": 0,
  "is_unusual_os": 0,
  "is_unusual_browser": 0,
  "baseline_anomaly_score": 0.0
}
```

### Attack Event (brute_force from `user_036`)
**Event Context**: Accessing VPN at hour 8.

**Calculated Deviations**:
```json
{
  "session_duration_z": 1.986499146649248,
  "failed_attempts_z": 62.15508845193933,
  "hour_z": 0.33591180227583894,
  "is_unusual_resource": 1,
  "is_unusual_geo": 0,
  "is_unusual_os": 0,
  "is_unusual_browser": 0,
  "baseline_anomaly_score": 3.5
}
```

Notice how the `baseline_anomaly_score` and Z-scores strongly capture the anomaly using purely statistical (non-neural) methods, which fulfills the requirement for interpretable cold-start defenses.
