# pyrefly: ignore [missing-import]
import pandas as pd
# pyrefly: ignore [missing-import]
import joblib
import os
import json
from feature_utils import engineer_row_features


def compute_entity_baseline(entity_events: pd.DataFrame) -> dict:
    """
    Computes statistical baseline for a specific entity based ONLY on its 'normal' events.
    Requires that feature_utils.engineer_row_features has been run on the DataFrame.
    """
    df = entity_events[entity_events["label"] == "normal"]

    if len(df) == 0:
        return None

    baseline = {
        "count": len(df),
        "session_duration_mean": float(df["session_duration"].mean()),
        "session_duration_std": float(
            df["session_duration"].std() if len(df) > 1 else 0.0
        ),
        "failed_attempts_10m_mean": float(df["failed_attempts_10m"].mean()),
        "failed_attempts_10m_std": float(
            df["failed_attempts_10m"].std() if len(df) > 1 else 0.0
        ),
        # Categorical modes / frequent items
        "typical_resources": df["resource_accessed"].value_counts().index.tolist()[:5],
        "typical_geo_locations": df["geo_location"].value_counts().index.tolist()[:3],
        "typical_device_os": df["device_os"].value_counts().index.tolist()[:3],
        "typical_browser": df["browser"].value_counts().index.tolist()[:3],
        "hour_mean": float(df["hour"].mean()),
        "hour_std": float(df["hour"].std() if len(df) > 1 else 1.0),
    }

    # Avoid 0 std dev
    if baseline["session_duration_std"] < 0.1:
        baseline["session_duration_std"] = 0.1
    if baseline["failed_attempts_10m_std"] < 0.1:
        baseline["failed_attempts_10m_std"] = 0.1
    if baseline["hour_std"] < 0.1:
        baseline["hour_std"] = 0.1

    return baseline


def compute_department_baseline(all_events: pd.DataFrame, department: str) -> dict:
    """
    Computes an aggregate baseline for a whole department to use as a cold-start fallback.
    """
    df = all_events[
        (all_events["department"] == department) & (all_events["label"] == "normal")
    ]

    if len(df) == 0:
        return None

    baseline = {
        "count": len(df),
        "session_duration_mean": float(df["session_duration"].mean()),
        "session_duration_std": float(
            df["session_duration"].std() if len(df) > 1 else 0.0
        ),
        "failed_attempts_10m_mean": float(df["failed_attempts_10m"].mean()),
        "failed_attempts_10m_std": float(
            df["failed_attempts_10m"].std() if len(df) > 1 else 0.0
        ),
        "typical_resources": df["resource_accessed"].value_counts().index.tolist()[:10],
        "typical_geo_locations": df["geo_location"].value_counts().index.tolist()[:5],
        "typical_device_os": df["device_os"].value_counts().index.tolist()[:5],
        "typical_browser": df["browser"].value_counts().index.tolist()[:5],
        "hour_mean": float(df["hour"].mean()),
        "hour_std": float(df["hour"].std() if len(df) > 1 else 1.0),
    }

    if baseline["session_duration_std"] < 0.1:
        baseline["session_duration_std"] = 0.1
    if baseline["failed_attempts_10m_std"] < 0.1:
        baseline["failed_attempts_10m_std"] = 0.1
    if baseline["hour_std"] < 0.1:
        baseline["hour_std"] = 0.1

    return baseline


class BaselineManager:
    def __init__(self, all_events: pd.DataFrame):
        self.entity_profiles = {}
        self.department_profiles = {}

        print("Initializing BaselineManager...")
        # Make sure features are computed
        if "hour" not in all_events.columns:
            all_events = engineer_row_features(all_events)

        print("Computing entity baselines...")
        for entity_id, group in all_events.groupby("entity_id"):
            profile = compute_entity_baseline(group)
            if profile is not None:
                self.entity_profiles[entity_id] = profile

        print("Computing department baselines...")
        for dept, group in all_events.groupby("department"):
            profile = compute_department_baseline(all_events, dept)
            if profile is not None:
                self.department_profiles[dept] = profile

    def get_baseline(self, entity_id: str, department: str) -> dict:
        """
        Fetches the entity's baseline, falling back to the department baseline if missing.
        """
        if entity_id in self.entity_profiles:
            return self.entity_profiles[entity_id]
        if department in self.department_profiles:
            return self.department_profiles[department]

        raise ValueError(
            f"No baseline available for entity {entity_id} or department {department}"
        )

    def compute_deviation(self, entity_id: str, department: str, event: dict) -> dict:
        """
        Compares a single event against the relevant baseline and returns deviation scores.
        """
        baseline = self.get_baseline(entity_id, department)

        # Ensure event has engineered features (if it's a raw dict, convert to df)
        if "hour" not in event:
            df_event = pd.DataFrame([event])
            df_event = engineer_row_features(df_event)
            event = df_event.iloc[0].to_dict()

        deviations = {}

        # Z-scores for numericals
        deviations["session_duration_z"] = (
            abs(event["session_duration"] - baseline["session_duration_mean"])
            / baseline["session_duration_std"]
        )
        deviations["failed_attempts_z"] = (
            abs(event["failed_attempts_10m"] - baseline["failed_attempts_10m_mean"])
            / baseline["failed_attempts_10m_std"]
        )

        # Time deviation (handling circular nature roughly)
        hour_diff = min(
            abs(event["hour"] - baseline["hour_mean"]),
            24 - abs(event["hour"] - baseline["hour_mean"]),
        )
        deviations["hour_z"] = hour_diff / baseline["hour_std"]

        # Change flags for categoricals
        deviations["is_unusual_resource"] = int(
            event["resource_accessed"] not in baseline["typical_resources"]
        )
        deviations["is_unusual_geo"] = int(
            event["geo_location"] not in baseline["typical_geo_locations"]
        )
        deviations["is_unusual_os"] = int(
            event["device_os"] not in baseline["typical_device_os"]
        )
        deviations["is_unusual_browser"] = int(
            event["browser"] not in baseline["typical_browser"]
        )

        # An aggregate "anomaly score" heuristic based purely on baseline (not ML)
        score = (
            (deviations["session_duration_z"] > 3) * 1.0
            + (deviations["failed_attempts_z"] > 3) * 2.0
            + deviations["is_unusual_resource"] * 1.5
            + deviations["is_unusual_geo"] * 1.5
            + deviations["is_unusual_os"] * 1.0
        )
        deviations["baseline_anomaly_score"] = score

        return deviations


def write_notes(manager, sample_normal, sample_attack, norm_dev, atk_dev):
    notes = f"""# Baseline Profiler Notes

## Profiles Computed
- **Entity Baselines**: {len(manager.entity_profiles)} full profiles created.
- **Department Baselines (Cold-Start)**: {len(manager.department_profiles)} profiles created.

## Deviation Example (Normal vs Attack)

When comparing an event to its historical baseline, we extract Z-scores for numericals and binary flags for categorical shifts.

### Normal Event (from `{sample_normal['entity_id']}`)
**Event Context**: Accessing {sample_normal['resource_accessed']} at hour {sample_normal['hour']}.

**Calculated Deviations**:
```json
{json.dumps(norm_dev, indent=2)}
```

### Attack Event ({sample_attack['label']} from `{sample_attack['entity_id']}`)
**Event Context**: Accessing {sample_attack['resource_accessed']} at hour {sample_attack['hour']}.

**Calculated Deviations**:
```json
{json.dumps(atk_dev, indent=2)}
```

Notice how the `baseline_anomaly_score` and Z-scores strongly capture the anomaly using purely statistical (non-neural) methods, which fulfills the requirement for interpretable cold-start defenses.
"""
    os.makedirs("reports", exist_ok=True)
    with open("reports/baseline_profiler_notes.md", "w") as f:
        f.write(notes)


if __name__ == "__main__":
    print("Loading synthetic logs...")
    df = pd.read_csv("data/synthetic_access_logs.csv")

    # Pre-compute features before making baseline manager
    df = engineer_row_features(df)

    manager = BaselineManager(df)

    # Save the model
    os.makedirs("models", exist_ok=True)
    joblib.dump(manager, "models/baseline_profiles.joblib")
    print("Saved BaselineManager to models/baseline_profiles.joblib")

    # Generate examples for the notes
    normal_event = df[df["label"] == "normal"].iloc[0]
    # Pick a brute force or impossible travel
    attack_event = df[df["label"] != "normal"].iloc[0]

    norm_dev = manager.compute_deviation(
        normal_event["entity_id"], normal_event["department"], normal_event.to_dict()
    )
    atk_dev = manager.compute_deviation(
        attack_event["entity_id"], attack_event["department"], attack_event.to_dict()
    )

    write_notes(manager, normal_event, attack_event, norm_dev, atk_dev)
    print("Generated notes at reports/baseline_profiler_notes.md")
