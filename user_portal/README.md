# User Portal & Live Attack Simulator

This is the interactive simulator (Step 10) used for presenting the SOC pipeline to the hackathon judges.

## Running the Dashboard

Ensure your virtual environment is active, then launch this app on port `8502` so it runs concurrently alongside the Admin Dashboard:

```bash
cd anomaly_detection_project
source venv/bin/activate
pip install -r requirements.txt
streamlit run user_portal/app.py --server.port 8502
```

## Features
- **Entity Profiler**: Log in as any of the 100 entities to view their established behavioral footprint and see their baseline timeline.
- **Live Threat Injector**: Pick any of the 7 engineered threat vectors and inject a brand new zero-day event matching that vector right now against this user.
- **Narrative Explainability**: Watch the AI score the event live against the entity's rolling sequence cache, and read exactly *why* the attack was caught.
