# ActivKlass ResVerity 🛡️

### HEI Research Output Governance Repository & Anti-Piracy Portal
Built for **Reverse Pitch Challenge #4** in collaboration with **DTI Region 7** and **DICT**.

---

## 📖 The Problem
Research outputs (capstones, theses, and papers) in Higher Education Institutions (HEIs) often reside in unlinked folders, local drives, or email chains. This creates **zero centralized search capability**, leads to **duplicate student project efforts**, and **hinders the commercialization** of student research.

However, exposing research publicly risks intellectual property piracy. Trust is paramount to academic output management.

---

## 💡 The Solution: ResVerity
**ResVerity** is a unified, secure portal designed to collect, index, audit, and showcase Cebu's academic outputs under strict access control and anti-piracy mechanisms:

1. **Standardized Curation Pipeline:** Captures precise metadata, funding structures, and SDG alignment tags.
2. **Co-Author Shield:** Academic papers remain locked in a hidden draft status until all listed co-authors authenticate via institutional SSO and cryptographically sign off.
3. **Semantic Mapping Engine (AI Tagger):** Uses Python-driven PDF scraping and the Gemini API to extract abstract content and auto-categorize papers into UN Sustainable Development Goals (SDGs) and technical domains.
4. **Public Discovery Directory:** Connects Cebu's validated student research outputs with local incubators, companies, and community organizations.

---

## 🛠️ Project Structure
```bash
DASIG/
├── backend/
│   ├── main.py             # FastAPI entry point & REST endpoints
│   ├── parser.py           # PDF Text Extraction (PyPDF)
│   ├── tagger.py           # Gemini API & Fallback SDG classifier
│   ├── requirements.txt    # Python dependencies
│   └── schema.sql          # Database table structures (PostgreSQL)
├── index.html              # Frontend portal dashboard (SSO, Submission, Directory)
├── style.css               # Design system styling (Glassmorphism & Dark Mode)
└── app.js                  # Frontend client connector & mock fallbacks
```

---

## 🚀 How to Run the App Locally

### **1. Spin up the Backend API**
Open your terminal in the `backend/` directory:

```bash
# Install Python dependencies
pip install -r requirements.txt

# Run the API server
uvicorn main:app --reload
```
*Note: The backend automatically boots in **SQLite Mode** (`resverity.db`) if no Supabase environment credentials are set, making it fully ready for presentation without database setups!*

### **2. Open the Frontend**
Open [index.html](index.html) directly in your browser. The client will automatically detect the local API server and switch from simulation mode to live database operations.

---

## 🔒 Crucial Security Architecture
* **Row-Level Security (RLS):** Database visibility tiers keep draft publications locked from public metadata queries.
* **Hybrid Auth Flow:** Restricts uploads strictly to institutional SSO verification bounds (e.g., student/faculty logins).
* **Pre-signed Access Links:** High-tier documents serve raw PDFs via temporary AWS S3/Supabase Storage links to prevent direct URL sharing.
