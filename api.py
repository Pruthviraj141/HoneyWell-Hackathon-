from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import json
import os
import sys

# Set up paths so we can import src modules
PROJECT_ROOT = os.path.dirname(os.path.abspath(__file__))
SRC_DIR = os.path.join(PROJECT_ROOT, "src")
if SRC_DIR not in sys.path:
    sys.path.append(SRC_DIR)

from fusion_engine import load_all_models, score_event, RecentEventBuffer
from baseline_profiler import BaselineManager
from data_generator import inject_attack, generate_normal_event
sys.modules["__main__"].BaselineManager = BaselineManager
import pandas as pd

app = FastAPI(title="Cyber Anomaly SOC API")

# Enable CORS for React Frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

QUEUE_FILE = os.path.join(PROJECT_ROOT, "data", "live_queue.json")

# Global models dictionary
models_cache = {}

@app.on_event("startup")
def load_models_on_startup():
    global models_cache
    print("Loading AI Models...")
    models_cache = load_all_models(project_root=PROJECT_ROOT)
    
    if "recent_event_buffer" not in models_cache:
        df = pd.read_csv(os.path.join(PROJECT_ROOT, "data", "synthetic_access_logs.csv"))
        buffer = RecentEventBuffer()
        buffer.prepopulate(df)
        models_cache["recent_event_buffer"] = buffer
    print("Models loaded successfully.")

def get_queue():
    if os.path.exists(QUEUE_FILE):
        with open(QUEUE_FILE, "r") as f:
            try:
                return json.load(f)
            except:
                return []
    return []

def save_queue(events):
    with open(QUEUE_FILE, "w") as f:
        json.dump(events, f)

@app.get("/api/queue")
def read_queue():
    return get_queue()

@app.delete("/api/queue")
def clear_queue():
    save_queue([])
    return {"status": "cleared"}

import datetime

# Global DataFrame cache to drastically improve API speed
CSV_PATH = os.path.join(PROJECT_ROOT, "data", "synthetic_access_logs.csv")
global_df = None

def get_df():
    global global_df
    if global_df is None:
        global_df = pd.read_csv(CSV_PATH)
        global_df['timestamp'] = pd.to_datetime(global_df['timestamp'])
    return global_df

class AttackRequest(BaseModel):
    attack_type: str
    entity_id: str

@app.get("/api/entities")
def get_entities():
    df = get_df()
    entities = sorted(df['entity_id'].unique().tolist())
    # Format them nicely
    labels = []
    for eid in entities:
        row = df[df['entity_id'] == eid].iloc[0]
        labels.append({"id": eid, "label": f"{eid} ({row['department']}, {row['entity_type']})"})
    return labels

@app.get("/api/entity/{entity_id}")
def get_entity_profile(entity_id: str):
    bm = models_cache.get("baseline_manager")
    if bm and entity_id in bm.entity_profiles:
        return bm.entity_profiles[entity_id]
    return {"error": "No established baseline (Cold Start Entity)"}

@app.get("/api/history/{entity_id}")
def get_entity_history(entity_id: str):
    df = get_df()
    entity_rows = df[df['entity_id'] == entity_id].sort_values('timestamp', ascending=False)
    # Return last 100 events, format timestamps back to string for JSON serialization
    res = entity_rows.head(100).copy()
    res['timestamp'] = res['timestamp'].astype(str)
    return res.to_dict(orient="records")

@app.post("/api/inject")
def inject_event(req: AttackRequest):
    df = get_df()
    entity_rows = df[df['entity_id'] == req.entity_id]
    if entity_rows.empty:
        raise HTTPException(status_code=400, detail="Entity not found")
        
    row = entity_rows.iloc[-1]
    
    # Reconstruct profile
    profile = {
        "entity_id": req.entity_id,
        "entity_type": row["entity_type"],
        "department": row["department"],
        "home_city": entity_rows["geo_location"].mode().iloc[0] if not entity_rows["geo_location"].empty else "Unknown",
        "home_country": row["country"],
        "preferred_device_os": entity_rows["device_os"].mode().iloc[0] if not entity_rows["device_os"].empty else "Unknown",
        "preferred_browser": entity_rows["browser"].mode().iloc[0] if not entity_rows["browser"].empty else "Unknown",
        "login_hour_mean": 9,
        "login_hour_std": 1,
        "common_resources": entity_rows["resource_accessed"].value_counts().head(3).index.tolist(),
        "auth_method": entity_rows["auth_method"].mode().iloc[0] if not entity_rows["auth_method"].empty else "password",
        "shared_ip": None,
        "shared_device": None,
        "own_ip": row.get("source_ip", "192.168.1.1"),
        "own_mac": row.get("mac_prefix", "00:00:00")
    }
    
    now = datetime.datetime.now()
    normal_event = generate_normal_event(profile, now)

    if req.attack_type == "normal":
        event = normal_event
        injected_label = "normal"
    else:
        event = inject_attack(normal_event, profile, req.attack_type)
        if event is None:
            raise HTTPException(status_code=400, detail="Unknown attack type")
        injected_label = event.pop("label", req.attack_type)
    
    # Score the event through the AI
    scored_event = score_event(event, models_cache)
    
    # Add explainability
    from explainability import explain_alert
    exp_res = explain_alert(event, scored_event, models_cache["baseline_manager"], models_cache)
    
    # Format for frontend Live Queue
    rs = scored_event["risk_score"]
    if rs >= 0.8: risk_level = "🔴 Critical"
    elif rs >= 0.5: risk_level = "🟠 High"
    elif rs >= 0.3: risk_level = "🟡 Elevated"
    else: risk_level = "🟢 Normal"

    row_res = {
        "entity_id": event["entity_id"],
        "timestamp": str(event["timestamp"]),
        "risk_score": rs,
        "risk_level": risk_level,
        "attack_type": scored_event["attack_type"],
        "headline": exp_res["headline"],
        "reasons": exp_res["reasons"],
        "signal_summary": exp_res["signal_summary"],
        "cold_start_note": exp_res["cold_start_note"],
        "signal_breakdown": scored_event["signal_breakdown"],
        "_raw_event": event,
        "_ground_truth": injected_label,
        "is_anomaly": scored_event["is_anomaly"],
        "department": event["department"],
        "entity_type": event["entity_type"]
    }
    
    # Append to live queue
    q = get_queue()
    q.insert(0, row_res) # Add to top
    if len(q) > 100:
        q = q[:100] # Keep last 100
    save_queue(q)
    
    return {"status": "success", "scored_event": row_res}
