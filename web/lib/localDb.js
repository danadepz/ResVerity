import fs from 'fs';
import path from 'path';

const DB_PATH = path.join(process.cwd(), 'resverity_local_db.json');

const INITIAL_DATA = [
    {
        id: 1,
        title: "IoT-Based Microclimate Monitoring for Urban Farms",
        abstract: "This research presents a wireless sensor node deployment designed for monitoring soil humidity, ambient temperature, and sunlight levels in Cebu community spaces. Using a low-cost microcontroller grid, the system reports real-time parameters to an open-source analytics dashboard.",
        visibility: "OPEN_ACCESS",
        status: "PUBLISHED",
        uploadedBy: "student.farmer@uc.edu.ph",
        coAuthors: [
            { email: "john.farmer@uc.edu.ph", approved: true }
        ],
        tags: [
            { name: "SDG 11: Sustainable Cities", type: "SDG" },
            { name: "IoT & Hardware", type: "TECH" }
        ],
        date: "2026-06-15"
    },
    {
        id: 2,
        title: "Predictive Analytics for Small Business Supply Chains",
        abstract: "Applying lightweight linear regression model scripts to sales data from local sari-sari stores to forecast optimal inventory requirements.",
        visibility: "PUBLIC_ABSTRACT",
        status: "PUBLISHED",
        uploadedBy: "maria.negosyo@uc.edu.ph",
        coAuthors: [
            { email: "carlos.santos@uc.edu.ph", approved: true }
        ],
        tags: [
            { name: "SDG 8: Decent Work & Growth", type: "SDG" },
            { name: "AI & Analytics", type: "TECH" }
        ],
        date: "2026-06-20"
    },
    {
        id: 3,
        title: "Decentralized Micro-Credentials and Certificate Registry",
        abstract: "A secure verification architecture designed to store academic credentials using digital signatures, solving transcript fraud in local colleges.",
        visibility: "INSTITUTIONAL",
        status: "PENDING_VERIFICATION",
        uploadedBy: "jane.doe@uc.edu.ph",
        coAuthors: [
            { email: "author.delacruz@uc.edu.ph", approved: false },
            { email: "mark.smith@uc.edu.ph", approved: false }
        ],
        tags: [
            { name: "SDG 9: Industry & Innovation", type: "SDG" },
            { name: "Cybersecurity", type: "TECH" }
        ],
        date: "2026-06-30"
    }
];

export function readLocalDb() {
    try {
        if (!fs.existsSync(DB_PATH)) {
            fs.writeFileSync(DB_PATH, JSON.stringify(INITIAL_DATA, null, 2));
            return INITIAL_DATA;
        }
        const raw = fs.readFileSync(DB_PATH, 'utf-8');
        return JSON.parse(raw);
    } catch (e) {
        console.error("Local DB read failed, returning default mockup state:", e);
        return INITIAL_DATA;
    }
}

export function writeLocalDb(data) {
    try {
        fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2));
    } catch (e) {
        console.error("Local DB write failed:", e);
    }
}
