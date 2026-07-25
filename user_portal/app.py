# pyrefly: ignore [missing-import]
import streamlit as st
import pandas as pd
import datetime
import sys
import os
import json

# Setup paths to import src modules
PROJECT_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
SRC_DIR = os.path.join(PROJECT_ROOT, "src")
if SRC_DIR not in sys.path:
    sys.path.append(SRC_DIR)

from fusion_engine import load_all_models, score_event, RecentEventBuffer
from explainability import explain_alert
from data_generator import inject_attack
from baseline_profiler import BaselineManager
sys.modules["__main__"].BaselineManager = BaselineManager
from data_generator import generate_normal_event, inject_attack

def push_to_live_queue(raw_event, score_res, exp_res, injected_label):
    queue_path = os.path.join(PROJECT_ROOT, "data", "live_queue.json")
    if os.path.exists(queue_path):
        with open(queue_path, "r") as f:
            try:
                queue = json.load(f)
            except:
                queue = []
    else:
        queue = []
        
    rs = score_res["risk_score"]
    if rs >= 0.8: risk_level = "🔴 Critical"
    elif rs >= 0.5: risk_level = "🟠 High"
    elif rs >= 0.3: risk_level = "🟡 Elevated"
    else: risk_level = "🟢 Normal"
    
    row_res = {
        "entity_id": raw_event["entity_id"],
        "timestamp": str(raw_event["timestamp"]),
        "risk_score": rs,
        "risk_level": risk_level,
        "attack_type": score_res["attack_type"],
        "headline": exp_res["headline"],
        "reasons": exp_res["reasons"],
        "signal_summary": exp_res["signal_summary"],
        "cold_start_note": exp_res["cold_start_note"],
        "signal_breakdown": score_res["signal_breakdown"],
        "_raw_event": raw_event,
        "_ground_truth": injected_label,
        "is_anomaly": score_res["is_anomaly"],
        "department": raw_event["department"],
        "entity_type": raw_event["entity_type"]
    }
    
    # Prepend so newest is first
    queue.insert(0, row_res)
    
    # Keep queue manageable
    if len(queue) > 500:
        queue = queue[:500]
        
    with open(queue_path, "w") as f:
        json.dump(queue, f, indent=2)

st.set_page_config(page_title="User Portal & Attack Simulator", layout="wide")

@st.cache_resource
def get_models():
    models = load_all_models(project_root=PROJECT_ROOT)
    df = pd.read_csv(os.path.join(PROJECT_ROOT, "data", "synthetic_access_logs.csv"))
    buffer = RecentEventBuffer()
    buffer.prepopulate(df)
    models["recent_event_buffer"] = buffer
    return models

@st.cache_data
def get_data():
    df = pd.read_csv(os.path.join(PROJECT_ROOT, "data", "synthetic_access_logs.csv"))
    # ensure datetime format
    df['timestamp'] = pd.to_datetime(df['timestamp'])
    return df

with st.spinner("Loading models and preparing simulator..."):
    models = get_models()
    df = get_data()

bm = models["baseline_manager"]

st.title("User Portal & Threat Simulator")
st.markdown("Select an employee below to view their standard activity profile, and launch targeted simulated attacks to watch the AI detect them in real time.")

# 1. Login Simulator
all_entities = sorted(df['entity_id'].unique())
# Format nicely for the dropdown
entity_labels = []
for eid in all_entities:
    # Get dept/type
    row = df[df['entity_id'] == eid].iloc[0]
    entity_labels.append(f"{eid} ({row['department']}, {row['entity_type']})")

col1, col2 = st.columns([3, 1])
with col1:
    selected_label = st.selectbox("Select Entity to 'Log in' as:", entity_labels)
    # extract raw eid
    selected_eid = selected_label.split(" ")[0]

with col2:
    st.markdown("<br>", unsafe_allow_html=True)
    if st.button("Log In"):
        st.session_state['active_user'] = selected_eid
        
if 'active_user' not in st.session_state:
    st.info("Please select an entity and click 'Log In' to begin.")
    st.stop()
    
active_eid = st.session_state['active_user']
entity_rows = df[df['entity_id'] == active_eid].sort_values('timestamp')

st.divider()

# 2. Post-login dashboard
col_dash1, col_dash2 = st.columns([1, 2])

with col_dash1:
    st.subheader(f"Profile: {active_eid}")
    if active_eid in bm.entity_profiles:
        prof = bm.entity_profiles[active_eid]
        st.write(f"**Department**: {prof.get('department', 'Unknown')}")
        st.write(f"**Typical Login Window**: {prof.get('login_hour_mean', 0):.0f}:00 \u00B1 {prof.get('login_hour_std', 0):.0f} hours")
        st.write(f"**Primary Devices**: {', '.join(prof.get('known_devices', []))}")
        st.write(f"**Standard Resources**: {', '.join(prof.get('known_resources', []))}")
        st.write(f"**Locations**: {', '.join(prof.get('known_geos', []))}")
    else:
        st.warning("No established baseline (Cold Start Entity).")
        
    st.markdown("<br>**Recent Risk Check**", unsafe_allow_html=True)
    # Generate a live normal event to score and push to queue
    # Reconstruct profile dict for data_generator
    row = entity_rows.iloc[-1]
    profile = {
        "entity_id": active_eid,
        "entity_type": row["entity_type"],
        "department": row["department"],
        "home_city": entity_rows["geo_location"].mode().iloc[0],
        "home_country": row["country"],
        "preferred_device_os": entity_rows["device_os"].mode().iloc[0],
        "preferred_browser": entity_rows["browser"].mode().iloc[0],
        "login_hour_mean": 9,
        "login_hour_std": 1,
        "common_resources": entity_rows["resource_accessed"].value_counts().head(3).index.tolist(),
        "auth_method": entity_rows["auth_method"].mode().iloc[0],
        "shared_ip": None,
        "shared_device": None,
        "own_ip": row.get("source_ip", "192.168.1.1"),
        "own_mac": row.get("mac_prefix", "00:00:00")
    }
    
    if st.button("🔄 Generate Live Normal Event"):
        now = datetime.datetime.now()
        live_normal = generate_normal_event(profile, now)
        score_res = score_event(live_normal, models)
        exp_res = explain_alert(live_normal, score_res, bm, models)
        push_to_live_queue(live_normal, score_res, exp_res, "normal")
        st.success("✅ Normal event generated and pushed to Live Queue!")
        st.info(f"{exp_res['headline']}")

with col_dash2:
    st.subheader("Historical Activity Timeline")
    # scatter chart mapping time vs resource accessed
    chart_df = entity_rows[['timestamp', 'resource_accessed']].copy()
    st.scatter_chart(chart_df, x='timestamp', y='resource_accessed', height=300)
    
st.divider()

# 3. Live Attack Demo
st.header("🎭 Demo: Simulate an Attack")
st.markdown("Inject a 100% novel, zero-day threat event against this user and watch the AI catch it live.")

attack_descriptions = {
    "brute_force": "Rapid repeated failed-auth attempts in a short window",
    "credential_stuffing": "Many entities, few source IPs, high failure rate",
    "impossible_travel": "Logging in from a distant location within an implausible time gap",
    "device_spoofing": "Device ID reappearing with a mismatched fingerprint",
    "lateral_movement": "Compromised entity accessing an unusual breadth of new resources",
    "low_and_slow_exfiltration": "Gradual, off-hours resource access building up",
    "insider_drift": "Entity slowly expanding privilege footprint (often benign drift)"
}

attack_options = [f"{k} — {v}" for k, v in attack_descriptions.items()]
selected_attack_desc = st.selectbox("Select Threat Vector to Inject:", attack_options)
selected_attack = selected_attack_desc.split(" — ")[0]

if st.button("▶️ Run this attack scenario"):
    # Generate event Right Now
    now = datetime.datetime.now()
    normal_event = generate_normal_event(profile, now)
    
    # Inject attack
    attack_event = inject_attack(normal_event, profile, selected_attack)
    injected_label = attack_event.pop("label")
    
    # UI Narrative
    st.markdown("### 🔴 1. Event Generated")
    st.markdown("The following malicious event was just sent to the Fusion Engine.")
    st.json(attack_event)
    
    with st.spinner("🧠 2. Scoring in progress..."):
        score_res = score_event(attack_event, models)
        exp_res = explain_alert(attack_event, score_res, bm, models)
        
        # PUSH TO LIVE QUEUE
        push_to_live_queue(attack_event, score_res, exp_res, injected_label)
        
    st.markdown("### 📊 3. Detection Result")
    
    col_r1, col_r2, col_r3 = st.columns(3)
    col_r1.metric("Headline", exp_res['headline'].split(':')[0])
    col_r2.metric("Predicted Vector", score_res['attack_type'])
    col_r3.metric("True Injected Vector", injected_label)
    
    if score_res['attack_type'] == injected_label:
        st.success("✅ The AI successfully identified the exact threat vector.")
    elif score_res['is_anomaly']:
        st.warning(f"⚠️ The AI caught the anomaly, but classified it as {score_res['attack_type']}.")
    else:
        st.error("❌ The AI missed this threat.")
        
    st.markdown("### 💡 4. Why this was flagged")
    st.info(exp_res['signal_summary'])
    for r in exp_res['reasons']:
        st.markdown(f"- {r}")
        
    st.markdown("### 🔬 5. Signal Breakdown")
    bd = score_res['signal_breakdown']
    
    c1, c2, c3 = st.columns(3)
    c1.metric("RandomForest Classifier (0.5x weight)", f"{bd['classifier_risk']:.2f}")
    c2.metric("GRU Sequence (0.3x weight)", f"{bd['sequence_risk']:.2f}")
    c3.metric("GNN Graph Relational (0.2x weight)", f"{bd['relational_risk']:.2f}")
    
    # Note: We do NOT append this event to models["recent_event_buffer"]. 
    # The instructions specifically mandate we keep the demo stateless across runs.
    
    st.divider()
    
    # 6. Optional: Compare to real historical attack
    st.subheader("Historical Context")
    st.markdown(f"Here is a real historical example of **{injected_label}** from the dataset for comparison:")
    
    real_attacks = df[df['label'] == injected_label]
    if not real_attacks.empty:
        real_example = real_attacks.iloc[0].to_dict()
        real_example['timestamp'] = str(real_example['timestamp'])
        real_label = real_example.pop('label')
        
        st.json({k: v for k, v in real_example.items() if k in ['entity_id', 'timestamp', 'resource_accessed', 'failed_attempts_10m', 'is_new_device', 'geo_location']})
    else:
        st.write("No historical examples found in this dataset subset.")
