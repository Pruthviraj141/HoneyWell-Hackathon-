# pyrefly: ignore [missing-import]
import streamlit as st
import pandas as pd
import sys
import os
import json

# Set up paths so we can import src modules
PROJECT_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
SRC_DIR = os.path.join(PROJECT_ROOT, "src")
if SRC_DIR not in sys.path:
    sys.path.append(SRC_DIR)

from fusion_engine import load_all_models, score_event, RecentEventBuffer
from explainability import explain_alert
from baseline_profiler import BaselineManager
sys.modules["__main__"].BaselineManager = BaselineManager

st.set_page_config(page_title="SOC Admin Dashboard", layout="wide")

@st.cache_resource
def get_models():
    models = load_all_models(project_root=PROJECT_ROOT)
    # The models dict already has a prepopulated buffer inside the test block, 
    # but let's make sure it has one.
    if "recent_event_buffer" not in models:
        df = pd.read_csv(os.path.join(PROJECT_ROOT, "data", "synthetic_access_logs.csv"))
        buffer = RecentEventBuffer()
        buffer.prepopulate(df)
        models["recent_event_buffer"] = buffer
    return models

@st.cache_data
def get_historical_df():
    # Only used for the entity profiler history
    df = pd.read_csv(os.path.join(PROJECT_ROOT, "data", "synthetic_access_logs.csv"))
    return df

def load_live_events():
    queue_path = os.path.join(PROJECT_ROOT, "data", "live_queue.json")
    if os.path.exists(queue_path):
        with open(queue_path, "r") as f:
            try:
                events = json.load(f)
            except:
                events = []
    else:
        events = []
    return events

def clear_queue():
    queue_path = os.path.join(PROJECT_ROOT, "data", "live_queue.json")
    with open(queue_path, "w") as f:
        json.dump([], f)

# Load Data
with st.spinner("Loading models..."):
    models = get_models()
    full_df = get_historical_df()

# Sidebar Controls
st.sidebar.title("Live Control")
if st.sidebar.button("🔄 Refresh Live Queue"):
    pass # Streamlit reruns on button click automatically

if st.sidebar.button("🗑️ Clear Queue"):
    clear_queue()
    st.sidebar.success("Queue cleared!")
    
# Load live events
scored_events = load_live_events()

# Create DataFrame for display
scored_df = pd.DataFrame(scored_events)

# --- SIDEBAR FILTERS ---
st.sidebar.divider()
st.sidebar.title("Filters")
if not scored_df.empty:
    f_risk = st.sidebar.multiselect("Risk Level", options=["🔴 Critical", "🟠 High", "🟡 Elevated", "🟢 Normal"], default=["🔴 Critical", "🟠 High", "🟡 Elevated", "🟢 Normal"])
    f_attack = st.sidebar.multiselect("Attack Type", options=scored_df["attack_type"].unique(), default=[])
    f_dept = st.sidebar.multiselect("Department", options=scored_df["department"].unique(), default=[])
    f_type = st.sidebar.multiselect("Entity Type", options=scored_df["entity_type"].unique(), default=[])

    # Apply filters
    filtered_df = scored_df.copy()
    if f_risk:
        filtered_df = filtered_df[filtered_df["risk_level"].isin(f_risk)]
    if f_attack:
        filtered_df = filtered_df[filtered_df["attack_type"].isin(f_attack)]
    if f_dept:
        filtered_df = filtered_df[filtered_df["department"].isin(f_dept)]
    if f_type:
        filtered_df = filtered_df[filtered_df["entity_type"].isin(f_type)]
else:
    filtered_df = pd.DataFrame()

# --- TABS ---
tab1, tab2 = st.tabs(["Alert Queue", "Entity Profiler"])

with tab1:
    st.title("SOC Alert Queue (Live Fire)")
    st.markdown("Waiting for events from the User Portal Threat Simulator...")
    
    if scored_df.empty:
        st.info("The live queue is currently empty. Go to the User Portal to inject an attack or log in!")
    else:
        # Metrics
        c1, c2, c3 = st.columns(3)
        c1.metric("Total Events in Queue", len(scored_events))
        c2.metric("Flagged Anomalies", scored_df["is_anomaly"].sum())
        c3.metric("Distinct Entities Flagged", scored_df[scored_df["is_anomaly"]]["entity_id"].nunique())
        
        # Display Queue
        display_cols = ["risk_level", "risk_score", "entity_id", "timestamp", "attack_type", "headline"]
        # Make sure columns exist before display
        existing_cols = [c for c in display_cols if c in filtered_df.columns]
        st.dataframe(filtered_df[existing_cols].style.format({"risk_score": "{:.2f}"}), use_container_width=True)
        
        st.divider()
        
        # Drill-down
        st.subheader("Suspicious Activity Report (SAR)")
        if not filtered_df.empty:
            # Create selectbox labels
            options = []
            for _, row in filtered_df.iterrows():
                options.append(f"{row['entity_id']} \u2014 {row['timestamp']} (Risk: {row['risk_score']:.2f})")
            
            selected = st.selectbox("Select an alert to investigate:", options)
            # Find the selected row
            idx = options.index(selected)
            alert = filtered_df.iloc[idx]
        
            col_detail1, col_detail2 = st.columns([2, 1])
            
            with col_detail1:
                if alert['risk_score'] >= 0.8:
                    st.error(f"🚨 **{alert['headline']}**")
                elif alert['risk_score'] >= 0.5:
                    st.warning(f"⚠️ **{alert['headline']}**")
                else:
                    st.info(f"ℹ️ **{alert['headline']}**")
                    
                if alert['cold_start_note']:
                    st.warning(f"❄️ **Cold Start Entity**: {alert['cold_start_note']}")
                
                st.markdown("### 📚 Attack Vector Context")
                attack_descriptions = {
                    "brute_force": "Rapid repeated failed-auth attempts in a short window.",
                    "credential_stuffing": "Many entities, few source IPs, high failure rate.",
                    "impossible_travel": "Logging in from a distant location within an implausible time gap.",
                    "device_spoofing": "Device ID reappearing with a mismatched fingerprint.",
                    "lateral_movement": "Compromised entity accessing an unusual breadth of new resources.",
                    "low_and_slow_exfiltration": "Gradual, off-hours resource access building up.",
                    "insider_drift": "Entity slowly expanding privilege footprint (often benign drift)."
                }
                predicted = alert.get("attack_type", "normal")
                desc = attack_descriptions.get(predicted, "Normal, expected activity pattern.")
                st.info(f"**Predicted as `{predicted}`**: {desc}")
                    
                st.markdown("### 📋 Incident Analysis (Why was this flagged?)")
                for r in alert['reasons']:
                    st.markdown(f"- {r}")
                    
                st.markdown("### 💡 AI Conclusion")
                st.info(alert['signal_summary'])
                
                st.markdown("### 📜 Entity History (Last 20 Events)")
                hist_df = full_df[full_df['entity_id'] == alert['entity_id']].sort_values('timestamp').tail(20)
                st.dataframe(hist_df[['timestamp', 'resource_accessed', 'failed_attempts_10m']], use_container_width=True)
    
            with col_detail2:
                st.markdown("### 🔬 Signal Breakdown")
                bd = alert['signal_breakdown']
                st.metric("Classifier Risk (0.5x)", f"{bd['classifier_risk']:.2f}")
                st.metric("Sequence Risk (0.3x)", f"{bd['sequence_risk']:.2f}")
                st.metric("Relational Graph Risk (0.2x)", f"{bd['relational_risk']:.2f}")
                
                st.markdown("### 🔍 Triggering Telemetry (Raw)")
                st.markdown("The AI correlated the following fields directly from the event payload:")
                st.json(alert['_raw_event'])
            
        else:
            st.write("No alerts match the current filters.")

with tab2:
    st.title("Entity Profiler")
    
    all_entities = sorted(full_df['entity_id'].unique())
    selected_entity = st.selectbox("Select Entity:", all_entities)
    
    bm = models["baseline_manager"]
    
    # Display baseline profile if exists
    if selected_entity in bm.entity_profiles:
        st.success("Personal Baseline Found")
        prof = bm.entity_profiles[selected_entity]
        
        st.markdown("### Behavioral Profile")
        
        c1, c2, c3 = st.columns(3)
        c1.metric("Typical Login Hour", f"{prof.get('login_hour_mean', 0):.1f} \u00B1 {prof.get('login_hour_std', 0):.1f}")
        c2.metric("Typical Session Duration", f"{prof.get('session_duration_mean', 0):.1f}m \u00B1 {prof.get('session_duration_std', 0):.1f}")
        c3.metric("Standard Failure Rate", f"{prof.get('failed_attempts_mean', 0):.1f} fails/10m")
        
        st.markdown("**Known Safe Regions / Resources:**")
        st.write(f"- **Geolocations**: {', '.join(prof.get('known_geos', []))}")
        st.write(f"- **Resources**: {', '.join(prof.get('known_resources', []))}")
        st.write(f"- **Devices**: {', '.join(prof.get('known_devices', []))}")
        
    else:
        st.warning("No personal baseline found for this entity (Cold Start).")
        
    # Metrics regarding scored events
    if not scored_df.empty and 'entity_id' in scored_df.columns:
        scored_for_ent = scored_df[scored_df['entity_id'] == selected_entity]
        flagged = scored_for_ent['is_anomaly'].sum()
        st.write(f"**Alert Queue Status**: {flagged} anomalies flagged out of {len(scored_for_ent)} recently scored events.")
    else:
        st.write("**Alert Queue Status**: 0 anomalies flagged out of 0 recently scored events.")
    
    st.markdown("### Complete Historical Log")
    ent_hist = full_df[full_df['entity_id'] == selected_entity].sort_values('timestamp', ascending=False)
    st.dataframe(ent_hist, use_container_width=True)
