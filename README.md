# ActivKlass ResVerity 🛡️

### HEI Research Output Governance Repository & Anti-Piracy Portal
Built for **Reverse Pitch Challenge #4** in collaboration with **DTI Region 7** and **DICT**.

---

## 💡 The Solution
**ResVerity** is a production-ready Web Application designed to collect, index, audit, and showcase academic output. It is built using the requested modern stack:

* **Frontend:** **Next.js (App Router)** with React state components.
* **Styling:** Custom premium Glassmorphism & Dark Mode.
* **Database/Storage:** **Supabase (PostgreSQL + Bucket Storage)** integration, with a built-in zero-config **local JSON filesystem database** fallback for easy offline offline demo runs.
* **AI NLP Services:** **Google Gemini API** integration for automated PDF text parsing and SDG target mapping.

---

## 🛠️ Project Structure
```bash
DASIG/
├── web/
│   ├── app/
│   │   ├── api/             # API Router Endpoints
│   │   │   ├── upload/      # PDF text parsing & SDG tagging
│   │   │   ├── submissions/ # Read/Write research metadata
│   │   │   ├── approve/     # Co-Author cryptographic checks
│   │   │   └── copilot/     # AI chatbot discovery routing
│   │   ├── layout.js        # Global wrapper metadata
│   │   ├── globals.css      # Premium design token styles
│   │   └── page.js          # Core React client view
│   ├── lib/
│   │   ├── supabase.js      # Supabase Client Initializer
│   │   └── localDb.js       # Local JSON filesystem storage helper
│   ├── package.json         # Web dependencies
│   └── jsconfig.json        # Import path mappings
├── legacy-prototype/        # Backup of initial HTML/JS prototype files
├── .env.example             # Environment configuration template
└── package.json             # Root script proxies
```

---

## 🚀 How to Run the App Locally

### **1. Configure Settings (Optional)**
Copy `.env.example` in the root folder to `.env.local` inside the `web/` folder:
```bash
cp .env.example web/.env.local
```
Add your `GEMINI_API_KEY` to enable live AI parser classification.
*(If empty, the app will run with a smart local rule engine fallback.)*

### **2. Launch the Development Server**
From the root repository folder, simply run:

```bash
# Install root script proxies
npm install

# Start the dev server
npm run dev
```

Open **`http://localhost:3000`** in your browser. The app is fully operational and ready to demonstrate!
