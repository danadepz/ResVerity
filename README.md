# ActivKlass ResVerity 🛡️

### HEI Research Output Governance Repository & Anti-Piracy Portal
Built for **Reverse Pitch Challenge #4** in collaboration with **DTI Region 7** and **DICT**.

---

## 📖 The Problem
Research outputs (capstones, theses, and papers) in Higher Education Institutions (HEIs) often reside in unlinked folders, local drives, or email chains. This creates **zero centralized search capability**, leads to **duplicate student project efforts**, and **hinders the commercialization** of student research.

However, exposing research publicly risks intellectual property piracy. Trust is paramount to academic output management.

---

## 💡 The Solution: ResVerity
**ResVerity** is a unified, secure portal designed to collect, index, audit, and showcase institutional research projects under strict access control and anti-piracy mechanisms:

1. **Standardized Curation Pipeline:** Captures precise metadata, funding structures, and SDG alignment tags.
2. **Co-Author Shield:** Academic papers remain locked in a hidden draft status until all listed co-authors authenticate via institutional SSO and cryptographically sign off.
3. **Semantic Mapping Engine:** Uses abstract NLP processing to categorize papers into sustainable goals and technical domains automatically.
4. **Public Discovery Directory:** Connects Cebu's validated student research outputs with local incubators, companies, and community organizations.

---

## 🛠️ Project Structure
```bash
DASIG/
├── index.html     # Portal View Layout (SSO, Submit, Board, Directory)
├── style.css      # Premium Glassmorphic Design System Styles
└── app.js         # Interactive State & Front-End Simulation Logic
```

---

## 🚀 Live Demo Guide

Open [index.html](index.html) directly in your browser.

1. **Authenticate:** Log in using the simulated institutional SSO screen.
2. **Submit Paper:** Drag and drop a research draft PDF. The portal parses details and populates fields. Add co-authors.
3. **Sign-off Review:** Log in as one of the listed co-authors to sign off cryptographically, unlocking the paper to the public directory.
4. **Search Directory:** Search papers via SDG numbers (e.g. `SDG 11`), technologies, or keywords.
5. **Dashboard Analytics:** Analyze publishing velocities and SDG alignments via Chart.js visualizations.
