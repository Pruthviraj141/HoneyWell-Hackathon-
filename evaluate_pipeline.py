import os
import sys
import pandas as pd
from sklearn.metrics import classification_report, confusion_matrix

sys.path.append(os.path.join(os.path.dirname(__file__), "src"))
from fusion_engine import load_all_models, score_event, RecentEventBuffer
from baseline_profiler import BaselineManager
sys.modules["__main__"].BaselineManager = BaselineManager

def evaluate():
    print("Loading models and historical dataset...")
    models = load_all_models()
    
    df = pd.read_csv("data/synthetic_access_logs.csv")
    
    buffer = RecentEventBuffer()
    buffer.prepopulate(df)
    models["recent_event_buffer"] = buffer
    
    # We will evaluate on the last 200 events
    df_eval = df.sort_values('timestamp').tail(200).copy()
    
    y_true = []
    y_pred = []
    
    print(f"Scoring {len(df_eval)} events end-to-end through the Fusion Engine...")
    
    for _, row in df_eval.iterrows():
        event = row.to_dict()
        true_label = event.pop("label")
        y_true.append(true_label)
        
        # Score the event
        res = score_event(event, models)
        
        # If the risk score doesn't exceed 0.5, we consider it normal traffic
        if not res['is_anomaly']:
            y_pred.append("normal")
        else:
            y_pred.append(res['attack_type'])
            
    print("\n" + "="*50)
    print("END-TO-END FUSION ENGINE METRICS")
    print("="*50)
    print("\nClassification Report:\n")
    print(classification_report(y_true, y_pred))
    
    print("\nConfusion Matrix:\n")
    labels = sorted(list(set(y_true + y_pred)))
    cm = confusion_matrix(y_true, y_pred, labels=labels)
    cm_df = pd.DataFrame(cm, index=labels, columns=labels)
    print(cm_df.to_string())
    print("\n" + "="*50)

if __name__ == "__main__":
    evaluate()
