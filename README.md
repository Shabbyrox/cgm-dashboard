# 🩸 FreeStyle Libre Clinical Dashboard

[![Next.js](https://img.shields.io/badge/Frontend-Next.js-black?style=flat-square&logo=next.js)](https://nextjs.org/)
[![FastAPI](https://img.shields.io/badge/Backend-FastAPI-009688?style=flat-square&logo=fastapi)](https://fastapi.tiangolo.com/)
[![Scikit-Learn](https://img.shields.io/badge/ML-Scikit--Learn-F7931E?style=flat-square&logo=scikit-learn)](https://scikit-learn.org/)
[![Pandas](https://img.shields.io/badge/Data-Pandas-150458?style=flat-square&logo=pandas)](https://pandas.pydata.org/)

An enterprise-grade clinical analytics platform designed to ingest raw Continuous Glucose Monitor (CGM) data and provide real-time risk assessments using Machine Learning. This project mimics the logic of a **FreeStyle Libre** system, prioritizing data privacy through client-side processing.

## 🚀 Key Features

* **Zero-Trust Data Privacy:** Implements client-side CSV parsing so sensitive patient time-series data is processed locally and never uploaded to the server.
* **AI Risk Engine:** A **Random Forest** model trained to detect impending hypoglycemic "crashes" 20 minutes in advance, achieving **96% accuracy** and **88% recall**.
* **Clinical Guardrails:** Hardcoded logic to detect immediate medical emergencies (Hyper/Hypoglycemia) independently of the AI model.
* **Automated Clinical Metrics:** Instant calculation of **Time-In-Range (TIR)**, **Glucose Variability (%CV)**, and **Estimated A1c (GMI)**.


## 🛠️ Tech Stack

* **Frontend:** Next.js, Tailwind CSS, Recharts (for AGP visualization).
* **Backend:** FastAPI (Python), Uvicorn.
* **Data/ML:** Pandas (ETL), Scikit-Learn (Random Forest), Joblib.

## 📈 Model Performance

The model was evaluated on a dataset of **8,200+** time-series data points. Due to the critical nature of hypoglycemic events, the engine was optimized for high **Recall** to minimize false negatives.

| Metric | Score |
| :--- | :--- |
| **Overall Accuracy** | 96.1% |
| **Recall (Crash Detection)** | 88.1% |
| **F1-Score (Crashes)** | 0.83 |

## 🏗️ Getting Started

### 1. Backend Setup
```bash
cd backend
pip install -r requirements.txt
python main.py
