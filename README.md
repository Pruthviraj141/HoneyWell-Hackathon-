# 🛡️ Cyber AI Fusion — Honeywell SOC Dashboard

> **AI-powered cybersecurity anomaly detection system** built for real-time threat monitoring, behavioral profiling, and red-team simulation. Built for the **Honeywell Hackathon**.

![Python](https://img.shields.io/badge/Python-3.10+-blue?style=flat-square&logo=python)
![React](https://img.shields.io/badge/React-18-61DAFB?style=flat-square&logo=react)
![FastAPI](https://img.shields.io/badge/FastAPI-0.100+-009688?style=flat-square&logo=fastapi)
![TailwindCSS](https://img.shields.io/badge/Tailwind-3.x-38BDF8?style=flat-square&logo=tailwindcss)

---

## 🚀 What This Does

A full-stack **Security Operations Center (SOC)** dashboard that:

- **Ingests** synthetic user access logs and builds behavioral baselines for every entity
- **Detects anomalies** in real-time using a 3-model AI fusion engine (Random Forest + GRU + Graph Neural Network)
- **Explains** every alert with human-readable reasons, signal breakdown, and raw telemetry
- **Simulates attacks** via a Red Team Sandbox — inject 7 different attack types and watch the AI catch them live

---

## 🧠 AI Architecture

```
User Event → Feature Extraction
                    ↓
     ┌──────────────────────────────┐
     │  Random Forest Classifier    │  ← 0.5× weight  (tabular features)
     │  GRU Sequence Model          │  ← 0.3× weight  (login sequence patterns)
     │  Graph Neural Network        │  ← 0.2× weight  (entity relationships)
     └──────────────────────────────┘
                    ↓
           Fusion Risk Score (0.0 – 1.0)
                    ↓
           Explainability Engine
                    ↓
           SOC Alert Queue (live_queue.json)
```

**Attack types detected:**
| Attack | Description |
|---|---|
| `brute_force` | Rapid repeated failed-auth attempts |
| `credential_stuffing` | Many entities, few IPs, high failure rate |
| `impossible_travel` | Login from implausible distant location |
| `device_spoofing` | Device ID with mismatched fingerprint |
| `lateral_movement` | Accessing unusual breadth of new resources |
| `low_and_slow_exfiltration` | Gradual off-hours resource access |
| `insider_drift` | Slowly expanding privilege footprint |

---

## 📁 Project Structure

```
anomaly_detection_project/
├── api.py                          # ← FastAPI backend (main entry point)
├── requirements.txt                # Python dependencies
│
├── src/                            # AI/ML core modules
│   ├── fusion_engine.py            # 3-model fusion + scoring
│   ├── baseline_profiler.py        # Per-entity behavioral profiles
│   ├── attack_classifier.py        # Random Forest classifier
│   ├── sequence_model.py           # GRU sequence model
│   ├── gnn_model.py                # Graph Neural Network
│   ├── graph_builder.py            # Entity relationship graph
│   ├── data_generator.py           # Synthetic attack injector
│   ├── explainability.py           # Alert explanation engine
│   └── feature_utils.py            # Feature engineering
│
├── models/                         # Pre-trained model files (ready to use)
│   ├── rf_classifier.joblib
│   ├── gru_model.pt
│   ├── gnn_model.pt
│   ├── baseline_profiles.joblib
│   └── ...
│
├── data/
│   ├── synthetic_access_logs.csv   # Training/demo dataset
│   └── live_queue.json             # Live alert queue (written by backend)
│
├── frontend/                       # React + Tailwind UI
│   ├── src/
│   │   ├── App.jsx                 # Sidebar + routing
│   │   ├── index.css               # Design system
│   │   └── pages/
│   │       ├── AdminDashboard.jsx  # SOC alert queue + SAR drill-down
│   │       └── UserPortal.jsx      # Red Team Simulator
│   ├── package.json
│   ├── tailwind.config.js
│   └── vite.config.js
│
├── admin_dashboard/
│   └── app.py                      # (Optional) Streamlit admin UI
└── user_portal/
    └── app.py                      # (Optional) Streamlit user portal
```

---

## ⚡ Quick Start (Clone & Run in 5 minutes)

### Prerequisites

- Python 3.10+
- Node.js 18+
- npm

---

### Step 1 — Clone the repo

```bash
git clone https://github.com/Pruthviraj141/HoneyWell-Hackathon-.git
cd HoneyWell-Hackathon-/anomaly_detection_project
```

### Step 2 — Set up Python backend

```bash
# Create virtual environment
python3 -m venv venv
source venv/bin/activate        # Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt
```

> ⚠️ `torch_geometric` may need a specific install based on your CUDA/CPU setup.
> For CPU only:
> ```bash
> pip install torch torchvision --index-url https://download.pytorch.org/whl/cpu
> pip install torch_geometric
> ```

### Step 3 — Start the FastAPI backend

```bash
# From anomaly_detection_project/
source venv/bin/activate
uvicorn api:app --host 0.0.0.0 --port 8000 --reload
```

✅ Backend will be live at: **http://localhost:8000**  
✅ API docs at: **http://localhost:8000/docs**

### Step 4 — Start the React frontend

```bash
cd frontend
npm install
npm run dev
```

✅ Dashboard will be live at: **http://localhost:5173**

---

## 🖥️ Using the Dashboard

### SOC Admin (`/admin`)
1. Open **http://localhost:5173/admin**
2. The **Live Event Stream** tab shows all injected alerts in real-time
3. Click any alert card → see the full **Suspicious Activity Report (SAR)**:
   - Attack vector classification
   - Incident analysis (why it was flagged)
   - AI conclusion
   - Signal breakdown (Classifier + Sequence scores + risk bar)
   - **Color-coded telemetry** — red fields = anomaly indicators

### Red Team Simulator (`/user`)
1. Open **http://localhost:5173/user**
2. Select a target entity (user/device/service account)
3. View their behavioral baseline profile
4. In the **Red Team Sandbox** (dark panel), pick an attack type
5. Click **Deploy Attack Payload**
6. Switch to Admin Dashboard to see the alert appear in the queue

---

## 🔌 API Reference

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/entities` | List all entities with dept/type |
| `GET` | `/api/entity/{id}` | Get behavioral baseline profile |
| `GET` | `/api/history/{id}` | Get last 100 access events |
| `GET` | `/api/queue` | Get live SOC alert queue |
| `DELETE` | `/api/queue` | Clear the alert queue |
| `POST` | `/api/inject` | Inject & score an attack event |

**Inject example:**
```bash
curl -X POST http://localhost:8000/api/inject \
  -H "Content-Type: application/json" \
  -d '{"attack_type": "brute_force", "entity_id": "user_001"}'
```

---

## 🎨 Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 18, Vite, Tailwind CSS v3, Framer Motion, Recharts, Lucide Icons |
| Backend | FastAPI, Uvicorn, Pydantic |
| AI/ML | PyTorch, scikit-learn, torch_geometric |
| Data | pandas, numpy, Faker |
| Serialization | joblib |

---

## 🔧 Environment Notes

- All **pre-trained models** are included in `models/` — no training needed
- The `data/synthetic_access_logs.csv` dataset is included — no external data needed
- `live_queue.json` is auto-created on first inject — no setup needed
- The app runs **fully offline** — no API keys or cloud services required

---

## 👨‍💻 Team

Built with ❤️ for the **Honeywell Cybersecurity Hackathon**

---

## 📄 License

MIT License — free to use, modify, and distribute.
