# Presentation Slides Outline

## 1. Title Slide
- **Project**: AI-Powered Behavioral Anomaly Detection
- **Team**: [Your Team Name]
- **Theme**: Moving beyond static rules to mathematical behavioral baselines.

## 2. Problem & Motivation
- **The Challenge**: Static thresholds fail because every user's "normal" is different.
- **The Solution**: A system that models individual behaviors, detects deviations, and classifies the specific threat vector in near-real-time.
- **The Goal**: Produce explainable, tri-modal risk scores for SOC Analysts.

## 3. System Architecture
- **Data Intake**: Processes access logs through a rolling Baseline Profiler.
- **Tri-Modal Engine**: Fuses three mathematical models (RandomForest, GRU Sequence, GraphSAGE).
- **Output**: Generates human-readable alert summaries delivered to an interactive Streamlit UI.

## 4. Synthetic Data Approach
- **Scale**: Generated 100 diverse entities over 30 days (~17,000 events).
- **Threat Injection**: Introduced a 5% attack rate spanning 7 vectors (e.g., Lateral Movement, Impossible Travel).
- **Structural Integrity**: Hardcoded 5% shared infrastructure usage (IPs/MACs) to provide a realistic relational signal for the graph network.

## 5. Design Decisions & Iteration
- **The GNN Pivot**: We initially designed the GNN to track "Entity Embedding Drift", but found the signal was completely diluted by the volume of normal daily events.
- **The Solution**: We iterated to an "Edge-Level Link Prediction" architecture. Instead of evaluating the whole entity, we scored the specific `(Entity, Resource)` interaction, successfully exposing the anomalies.
- **Explainability**: We rejected heavy black-box explainers like SHAP for a deterministic rule-attribution layer to guarantee sub-millisecond dashboard performance.

## 6. Overcoming Hard Requirements
| Requirement | Our Solution |
|---|---|
| **Sequential Data** | 10-event rolling state buffer via PyTorch GRU |
| **Class Imbalance** | `class_weight='balanced'` and `pos_weight=1.39` in loss functions |
| **Concept Drift** | Rolling baseline window re-averaging |
| **Explainability** | Custom rule-based NLP translation layer |
| **Cold-Start** | Department-level fallback norms for brand-new users |

## 7. Results & Metrics
- **Performance**: Achieved ~99% F1-Score on the classifier and 0.0% False Positive Rate for the GRU in the top 1% alert budget.
- **Honest Assessment**: These near-perfect metrics are heavily reliant on the synthetic data injection logic.
- **True Learning**: Our GraphSAGE model, which only evaluated raw structural interactions without direct access to the injection flags, demonstrated genuine mathematical separation (0.86 vs 0.79 mean scores). 

## 8. Explainability in Action
- *(Include Screenshot of a Live Drill-Down from the UI)*
- **Mathematical Translation**: Z-Score deviations are automatically translated to "Access occurred at an unusual time (3.5 standard deviations from their typical login hour)."
- **Signal Breakdown**: Clearly attributes exactly which of the three models triggered the alarm.

## 9. Dashboard Previews
- *(Include Screenshot of the Admin Alert Queue)*
- *(Include Screenshot of the User Portal Simulator)*
- Two distinct interfaces: One for triaging the global network, one for deep-diving into a specific employee's behavioral footprint.

## 10. Limitations & Future Scalability
- **Synthetic Rigidity**: The system currently identifies 7 specific vectors; zero-day adaptability requires larger real-world datasets.
- **Production Streaming**: To handle enterprise loads, the Fusion Engine would sit behind Kafka/Kinesis, querying a Redis cache for the active user buffer, pushing heavy Graph computations to asynchronous Airflow batches.

## 11. Closing
- Thank you!
- Questions?
