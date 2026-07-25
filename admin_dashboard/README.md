# Admin Dashboard

This is the SOC Analyst Dashboard for the AI Anomaly Detection pipeline (Step 9).

## Running the Dashboard

Ensure you have your virtual environment activated and have installed the requirements:

```bash
cd anomaly_detection_project
source venv/bin/activate
pip install -r requirements.txt
streamlit run admin_dashboard/app.py
```

## Features
- **Alert Queue**: Automatically scores the latest 1,000 historical events against the Fusion Engine, returning human-readable alerts and signal breakdowns.
- **Entity Profiler**: Shows the statistical baselines for any given employee in the system to help analyze anomalous behavior.
