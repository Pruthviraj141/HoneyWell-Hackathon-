import json
import os
# pyrefly: ignore [missing-import]
import pandas as pd
from datetime import datetime

# Load rf importances once
RF_IMPORTANCES = []
if os.path.exists("models/rf_feature_importances.json"):
    with open("models/rf_feature_importances.json", "r") as f:
        RF_IMPORTANCES = json.load(f)

def explain_alert(event: dict, score_result: dict, baseline_manager, models: dict) -> dict:
    """Given the original event, the output of fusion_engine.score_event(),
    and the loaded models dict, return a human-readable explanation.
    """
    reasons = []
    
    # 1. Deviation-based reasons
    entity_id = event.get('entity_id')
    department = event.get('department')
    
    # Need to simulate the event feature extraction to get raw deviations, 
    # or just use compute_deviation since event dict usually has the raw fields
    # Note: the event passed to compute_deviation usually needs the engineered features like is_new_geo.
    # We will assume compute_deviation handles it or we'll compute it on the fly.
    try:
        from feature_utils import engineer_row_features
        df_ev = engineer_row_features(pd.DataFrame([event]))
        row_ev = df_ev.iloc[0].to_dict()
        devs = baseline_manager.compute_deviation(entity_id, department, row_ev)
    except Exception:
        # Fallback if something fails
        devs = {}

    # Map deviations to sentences
    if 'hour_z' in devs and abs(devs['hour_z']) > 2:
        reasons.append(f"Access occurred at an unusual time for this entity ({devs['hour_z']:.1f} standard deviations from their typical login hour).")
    
    if devs.get('is_unusual_geo') == 1:
        loc = event.get('geo_location', 'Unknown')
        reasons.append(f"Access originated from a location this entity has not used before ({loc}).")
        
    if devs.get('is_unusual_resource') == 1:
        res = event.get('resource_accessed', 'Unknown')
        reasons.append(f"Accessed a resource this entity does not normally use ({res}).")
        
    if 'session_duration_z' in devs and abs(devs['session_duration_z']) > 2:
        reasons.append(f"Session duration was unusual for this entity ({devs['session_duration_z']:.1f} standard deviations from typical).")
        
    if devs.get('is_new_auth_method') == 1:
        reasons.append("Used an authentication method different from this entity's usual method.")
        
    if devs.get('is_new_device_combo') == 1 or devs.get('is_unusual_os') == 1:
        reasons.append("Device/browser combination differs from this entity's usual setup.")

    # 2. Feature-importance-based reasons
    attack_type = score_result.get('attack_type', 'normal')
    if attack_type != 'normal' and RF_IMPORTANCES:
        # Find which of the top 5 features had an unusual value
        unusual_feats = []
        for feat_obj in RF_IMPORTANCES:
            feat_name = feat_obj['feature']
            is_unusual = False
            
            # Simple heuristics for "unusual"
            if feat_name in devs:
                if 'z' in feat_name and abs(devs[feat_name]) > 2:
                    is_unusual = True
                elif devs[feat_name] == 1:
                    is_unusual = True
            elif feat_name == 'failed_attempts_10m' and row_ev.get(feat_name, 0) > 3:
                is_unusual = True
            elif feat_name == 'is_new_device' and row_ev.get(feat_name) == 1:
                is_unusual = True
            elif feat_name == 'is_new_country' and row_ev.get(feat_name) == 1:
                is_unusual = True
                
            if is_unusual:
                unusual_feats.append(feat_name)
                if len(unusual_feats) >= 2:
                    break
                    
        if unusual_feats:
            feats_str = " and ".join(unusual_feats)
            reasons.append(f"This pattern matches known {attack_type} behavior, most strongly indicated by {feats_str}.")
        else:
            reasons.append(f"This pattern matches known {attack_type} behavior based on the classifier's top indicator features.")

    # 3. Signal summary sentence
    breakdown = score_result.get('signal_breakdown', {})
    c_risk = breakdown.get('classifier_risk', 0.0)
    s_risk = breakdown.get('sequence_risk', 0.0)
    r_risk = breakdown.get('relational_risk', 0.0)
    r_p90 = models.get('relational_risk_p90', 0.95)

    elevated = []
    if c_risk > 0.5: elevated.append(('classifier', c_risk))
    if s_risk > 0.5: elevated.append(('sequence', s_risk))
    if r_risk > r_p90: elevated.append(('relational', r_risk))

    if not elevated:
        signal_summary = "No individual signal was strongly elevated \u2014 this event is well within normal bounds."
    elif len(elevated) > 1:
        signal_summary = "Multiple independent detection signals agree, increasing confidence in this alert."
    else:
        top_signal = elevated[0][0]
        if top_signal == 'classifier':
            signal_summary = f"Flagged primarily by the attack classifier, which recognizes patterns similar to known {attack_type} incidents."
        elif top_signal == 'sequence':
            signal_summary = "Flagged primarily by unusual timing/sequence of recent activity for this entity."
        elif top_signal == 'relational':
            signal_summary = "Flagged primarily by an unusual resource-access relationship \u2014 this entity accessed a resource that doesn't fit its normal access neighborhood."

    # 4. Headline generation
    rs = score_result.get('risk_score', 0.0)
    if rs >= 0.8:
        headline = f"Critical risk: {attack_type} pattern detected"
    elif rs >= 0.5:
        headline = f"High risk: {attack_type} pattern detected"
    elif rs >= 0.3:
        headline = f"Elevated risk: reviewing for {attack_type}-like patterns"
    else:
        headline = "Normal activity, no significant concerns"

    # 5. Cold-start note
    if score_result.get('used_cold_start_fallback', False):
        cold_start_note = "This entity has limited history in the system \u2014 this assessment used department-level behavioral norms instead of a personal baseline. Confidence should be treated as lower than for well-established entities."
    else:
        cold_start_note = None

    return {
        "headline": headline,
        "reasons": reasons,
        "signal_summary": signal_summary,
        "cold_start_note": cold_start_note
    }

if __name__ == "__main__":
    import sys
    sys.path.append(os.path.dirname(os.path.abspath(__file__)))
    from fusion_engine import load_all_models, RecentEventBuffer, score_event
    from baseline_profiler import BaselineManager
    sys.modules["__main__"].BaselineManager = BaselineManager
    
    print("Testing Explainability Engine...")
    models = load_all_models()
    bm = models["baseline_manager"]
    
    df = pd.read_csv("data/synthetic_access_logs.csv")
    buffer = RecentEventBuffer()
    buffer.prepopulate(df)
    models["recent_event_buffer"] = buffer
    
    # 1. Real Normal Event
    normal_row = df[df['label'] == 'normal'].iloc[100].to_dict()
    normal_row.pop('label', None)
    res_normal = score_event(normal_row, models)
    exp_normal = explain_alert(normal_row, res_normal, bm, models)
    
    # 2. Real Attack Event
    attack_row = df[df['label'] != 'normal'].iloc[50].to_dict()
    true_attack = attack_row.pop('label', None)
    res_attack = score_event(attack_row, models)
    exp_attack = explain_alert(attack_row, res_attack, bm, models)
    
    # 3. Cold Start Event
    cold_row = df.iloc[0].to_dict()
    cold_row.pop('label', None)
    cold_row['entity_id'] = 'user_brand_new_9999'
    cold_row['timestamp'] = datetime.now().isoformat()
    cold_row['is_new_device'] = True
    cold_row['is_new_country'] = True
    res_cold = score_event(cold_row, models)
    exp_cold = explain_alert(cold_row, res_cold, bm, models)
    
    notes = f"""# Explainability Notes (Step 8)

## 1. Real Normal Event
**Risk Score**: {res_normal['risk_score']:.3f} | **Anomaly**: {res_normal['is_anomaly']}
```json
{json.dumps(exp_normal, indent=2)}
```

## 2. Real Attack Event (Injected as: `{true_attack}`)
**Risk Score**: {res_attack['risk_score']:.3f} | **Anomaly**: {res_attack['is_anomaly']}
```json
{json.dumps(exp_attack, indent=2)}
```

## 3. Cold-Start Entity
**Risk Score**: {res_cold['risk_score']:.3f} | **Anomaly**: {res_cold['is_anomaly']}
```json
{json.dumps(exp_cold, indent=2)}
```
"""
    
    os.makedirs('reports', exist_ok=True)
    with open('reports/explainability_notes.md', 'w') as f:
        f.write(notes)
        
    print("Done! Check reports/explainability_notes.md for results.")
