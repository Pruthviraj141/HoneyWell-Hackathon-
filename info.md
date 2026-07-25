# Project Deliverables & Architecture Report
**AI-Powered Cybersecurity SOC Pipeline & Threat Simulator**

This document serves as the final report mapping our implementation directly to the requested hackathon deliverables and evaluation criteria.

---

## Part 1: Mapping to Deliverables

### 1. Synthetic Data Generator & Taxonomy
**Implementation:** `src/data_generator.py` and `user_portal/app.py`
- **Behavioral Assumptions:** We generate synthetic logs where each user (entity) has a defined "normal" baseline (e.g., standard login hours, typical devices, standard geographic region).
- **Injected Attack Taxonomy:** We successfully simulated 7 distinct attack vectors:
  1. Brute Force
  2. Credential Stuffing
  3. Impossible Travel
  4. Device Spoofing
  5. Lateral Movement
  6. Low and Slow Exfiltration
  7. Insider Drift

### 2. Baseline Profiling Model
**Implementation:** `src/baseline_profiler.py` (`BaselineManager`)
- **Approach:** We implemented a per-entity statistical profiling model. It parses historical data to build a localized normal distribution of behavior for every entity (mean login hours, standard deviation, a set of known safe geolocations, known IP subnets, and typical resource access patterns). 
- **Cold Start Handling:** New entities without a profile are handled gracefully; the pipeline defaults to population-wide statistics (or flags them safely with a `Cold Start Entity` badge in the UI without throwing hard errors).

### 3. Detection Model (Sequence & Graph)
**Implementation:** `src/fusion_engine.py`, `src/sequence_model.py`, `src/gnn_model.py`
- **Approach:** Rather than relying on a single model, we built a **Tri-Modal Fusion Engine**.
  - **Sequence-Aware (GRU):** A PyTorch Gated Recurrent Unit (GRU) tracks sequential temporal anomalies, analyzing the last $N$ events in the `RecentEventBuffer`.
  - **Relational (GraphSAGE GNN):** A PyTorch Geometric Graph Neural Network maps `Entity <-> Resource` edges to catch anomalous lateral movement that sequence models miss.

### 4. Anomaly Classification (Categorization)
**Implementation:** `src/attack_classifier.py`
- **Approach:** We utilize a Random Forest Classifier trained on engineered features. When the Fusion Engine detects an anomaly (Risk Score > 0.3), the classifier determines exactly *which* of the 7 attack vectors it resembles. It does not just say "Anomalous"—it says "Credential Stuffing."

### 5. Explainability Layer
**Implementation:** `src/explainability.py`
- **Approach:** When an alert is generated, the explainer compares the raw event payload against the `BaselineManager`'s normal profile. It generates human-readable attribution tags (e.g., `"Entity logged in from an entirely new geographical region"`, `"Failed attempts in the last 10m exceeded the 99th percentile"`).

### 6. Analyst-Facing Dashboard
**Implementation:** `admin_dashboard/app.py`
- **Approach:** We built a Streamlit-based "Live-Fire" SOC environment. It features:
  - A ranked Alert Queue (Critical, High, Elevated, Normal).
  - A comprehensive **Suspicious Activity Report (SAR)** drill-down.
  - Integration with the User Portal: Events generated in the user simulator instantly pipe into the dashboard via a JSON event bus (`live_queue.json`).

---

## Part 2: Evaluation Criteria & Metrics

### Detection Accuracy & False Positive Rate
To validate the system, we ran an end-to-end evaluation pipeline over a sampled test set of 200 highly imbalanced events.

**Classification Report (Tri-Modal Fusion Engine):**
```text
                           precision    recall  f1-score   support

              brute_force       1.00      1.00      1.00         2
      credential_stuffing       1.00      1.00      1.00         2
          device_spoofing       1.00      1.00      1.00         1
            insider_drift       0.50      1.00      0.67         1
low_and_slow_exfiltration       1.00      1.00      1.00         4
                   normal       1.00      0.99      1.00       190

                 accuracy                           0.99       200
                macro avg       0.92      1.00      0.94       200
             weighted avg       1.00      0.99      1.00       200
```

**Confusion Matrix:**
```text
                           brute_force  credential_stuffing  device_spoofing  insider_drift  low_and_slow_exfiltration  normal
brute_force                          2                    0                0              0                          0       0
credential_stuffing                  0                    2                0              0                          0       0
device_spoofing                      0                    0                1              0                          0       0
insider_drift                        0                    0                0              1                          0       0
low_and_slow_exfiltration            0                    0                0              0                          4       0
normal                               0                    0                0              1                          0     189
```

- **Accuracy:** 99.5% overall accuracy on highly imbalanced labels.
- **False Positive Rate (FPR):** In our test of 190 normal events, only 1 was misclassified as an anomaly (FPR of 0.5%). Normal events are effectively suppressed because the Fusion Engine requires consensus between the baseline statistics and the Deep Learning models to trigger a High/Critical alert.
- **Correct Classification:** The Random Forest successfully isolated specific vectors (e.g., distinguishing between Brute Force and Credential Stuffing based on `shared_ip` graph traversal vs `failed_attempts_10m`).

### Explainability / Analyst Usability
- The UI translates raw JSON telemetry directly into actionable Markdown insights. An analyst does not have to guess *why* the AI fired; the exact telemetry field deviations are printed on the screen alongside the raw JSON event payload.

### System Design & Scalability (Real-Time Feasibility)
- **Current Architecture:** The system currently uses `live_queue.json` as a mock message broker to connect the simulator to the dashboard. 
- **Production Scalability:** The `score_event()` inference function is completely stateless. In a real-world enterprise environment, `live_queue.json` would be trivially replaced by a **Kafka Topic**, and the `BaselineManager` dictionary would be backed by **Redis**, allowing this exact code to horizontally scale to millions of events per second.

### Known Limitations & Concept Drift
- **Static Baselines:** Currently, the `BaselineManager` is trained statically on a historical CSV. In a production environment, user behavior naturally shifts over time (Concept Drift). To fix this, we would implement a scheduled CRON job (e.g., weekly) that re-runs the profiler on a rolling 30-day window to update the normal baselines.
- **Cold Start Reliance:** If an attacker compromises a brand new account immediately upon creation, the AI has no baseline to compare against. We handle this currently by elevating risk slightly for new entities, but it remains a standard limitation of unsupervised behavioral profiling.
