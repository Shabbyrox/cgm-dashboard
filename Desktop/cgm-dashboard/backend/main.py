# File: /Users/shubhamdebnath/Desktop/abbott-cgm-dashboard/backend/main.py

from fastapi import FastAPI
from pydantic import BaseModel
from fastapi.middleware.cors import CORSMiddleware
import joblib
import pandas as pd

# 1. Initialize the app
app = FastAPI(title="Abbott CGM Risk Predictor")

# Allow our future Next.js frontend to talk to this backend safely
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], 
    allow_methods=["*"],
    allow_headers=["*"],
)

# 2. Load the trained AI model into memory
try:
    # Note: We use .load() here to read the model we dumped earlier!
    model = joblib.load('glucose_risk_model.pkl')
    print("✅ AI Model loaded successfully!")
except Exception as e:
    print(f"❌ Error loading model. Is glucose_risk_model.pkl in the right folder? Error: {e}")

# 3. Define the exact JSON structure the frontend will send us
# These MUST match the feature names we used in Scikit-Learn
class PatientVitals(BaseModel):
    Glucose_mg_dL: float
    Glucose_Velocity: float
    Rolling_Avg_Glucose: float

# 4. Create a quick health check endpoint
@app.post("/predict-risk")
def predict_crash_risk(vitals: PatientVitals):
    # ---------------------------------------------------------
    # 1. CLINICAL GUARDRAILS (Check for immediate danger first)
    # ---------------------------------------------------------
    if vitals.Glucose_mg_dL >= 250.0:
        return {
            "status": "DANGER", 
            "risk_message": f"Severe Hyperglycemia ({vitals.Glucose_mg_dL} mg/dL). Immediate medical attention required.",
            "risk_code": 2
        }
    elif vitals.Glucose_mg_dL <= 70.0:
         return {
            "status": "DANGER", 
            "risk_message": f"Active Hypoglycemia ({vitals.Glucose_mg_dL} mg/dL). Patient is currently crashing.",
            "risk_code": 1
        }

    # ---------------------------------------------------------
    # 2. THE AI PREDICTION (Looking into the future)
    # ---------------------------------------------------------
    # If they passed the guardrails, we ask the AI if a crash is *coming*.
    features = pd.DataFrame([{
        'Glucose_mg_dL': vitals.Glucose_mg_dL,
        'Glucose_Velocity': vitals.Glucose_Velocity,
        'Rolling_Avg_Glucose': vitals.Rolling_Avg_Glucose
    }])
    
    prediction = int(model.predict(features)[0])
    
    if prediction == 1:
        return {
            "status": "DANGER", 
            "risk_message": "AI Warning: High Risk of Hypoglycemic Crash within 1 hour.",
            "risk_code": 1
        }
    else:
        return {
            "status": "SAFE", 
            "risk_message": "Patient is currently stable. No imminent crashes predicted.",
            "risk_code": 0
        }

# 5. Start the server
if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="127.0.0.1", port=8000)