// ResVerity Client Engine - Connected to FastAPI / Supabase backend

const API_BASE = "http://127.0.0.1:8000/api";

let appState = {
    currentUser: {
        email: "author.delacruz@uc.edu.ph",
        role: "student"
    },
    submissions: []
};

// Reference Chart instances
let sdgChartInstance = null;
let domainChartInstance = null;

// Initialize Application UI
document.addEventListener("DOMContentLoaded", () => {
    setupNavigation();
    setupAuth();
    setupDropzone();
    setupSubmission();
    loadSubmissions();
    setupCopilot();
});

// Load Submissions from FastAPI backend
async function loadSubmissions() {
    try {
        const res = await fetch(`${API_BASE}/submissions`);
        if (res.ok) {
            appState.submissions = await res.json();
            updateUI();
        } else {
            console.warn("Backend API returned error, operating with local state fallback.");
        }
    } catch (e) {
        console.warn("Cannot connect to backend server. Run: uvicorn main:app in /backend folder.");
        // Set basic mock items if offline
        loadMockFallback();
    }
}

function loadMockFallback() {
    appState.submissions = [
        {
            id: 1,
            title: "IoT-Based Microclimate Monitoring for Urban Farms",
            abstract: "Wireless sensor node deployment designed for monitoring soil humidity levels in urban Cebu community gardens.",
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
        }
    ];
    updateUI();
}

// Navigation Engine
function setupNavigation() {
    const navs = ["dashboard", "submit", "verification", "directory"];
    navs.forEach(nav => {
        document.getElementById(`nav-${nav}`).addEventListener("click", (e) => {
            e.preventDefault();
            navs.forEach(n => {
                document.getElementById(`nav-${n}`).classList.remove("active");
                document.getElementById(`section-${n}`).classList.remove("active");
            });
            e.target.classList.add("active");
            document.getElementById(`section-${nav}`).classList.add("active");
        });
    });
}

// Authentication Logic
function setupAuth() {
    const ssoOverlay = document.getElementById("ssoOverlay");
    const loginBtn = document.getElementById("ssoLoginBtn");
    const logoutBtn = document.getElementById("logoutBtn");
    const ssoEmail = document.getElementById("ssoEmail");
    const ssoRole = document.getElementById("ssoRole");

    loginBtn.addEventListener("click", () => {
        if (!ssoEmail.value) {
            alert("Please enter a valid institutional email.");
            return;
        }
        
        appState.currentUser.email = ssoEmail.value;
        appState.currentUser.role = ssoRole.value;
        
        // Update labels
        document.getElementById("userName").textContent = appState.currentUser.email;
        const badge = document.getElementById("userBadge");
        badge.textContent = appState.currentUser.role.toUpperCase();
        if (appState.currentUser.role === 'dean') {
            badge.className = "badge badge-sdg";
        } else {
            badge.className = "badge badge-published";
        }

        ssoOverlay.style.display = "none";
        loadSubmissions();
    });

    logoutBtn.addEventListener("click", () => {
        ssoOverlay.style.display = "flex";
    });
}

// Drag & Drop File Upload with Real parsing
function setupDropzone() {
    const dropzone = document.getElementById("pdfDropzone");
    const fileInput = document.getElementById("pdfFileInput");
    const statusText = document.getElementById("fileUploadStatus");
    const uploadedName = document.getElementById("uploadedFileName");
    const formTitle = document.getElementById("paperTitle");
    const formAbstract = document.getElementById("paperAbstract");

    dropzone.addEventListener("click", () => fileInput.click());
    
    dropzone.addEventListener("dragover", (e) => {
        e.preventDefault();
        dropzone.style.borderColor = "var(--accent-cyan)";
    });
    
    dropzone.addEventListener("dragleave", () => {
        dropzone.style.borderColor = "rgba(255, 255, 255, 0.15)";
    });
    
    dropzone.addEventListener("drop", (e) => {
        e.preventDefault();
        dropzone.style.borderColor = "rgba(255, 255, 255, 0.15)";
        if (e.dataTransfer.files.length > 0) {
            uploadFileAndParse(e.dataTransfer.files[0]);
        }
    });

    fileInput.addEventListener("change", (e) => {
        if (e.target.files.length > 0) {
            uploadFileAndParse(e.target.files[0]);
        }
    });

    async function uploadFileAndParse(file) {
        uploadedName.textContent = file.name;
        statusText.style.display = "block";
        statusText.textContent = "Analyzing document content with AI...";
        
        const formData = new FormData();
        formData.append("file", file);

        try {
            const res = await fetch(`${API_BASE}/upload`, {
                method: "POST",
                body: formData
            });
            if (res.ok) {
                const parsed = await res.json();
                formTitle.value = parsed.title;
                formAbstract.value = parsed.abstract;
                statusText.innerHTML = `📄 PDF Parsed and Classified successfully!`;
            } else {
                statusText.textContent = "Failed to parse PDF backend side.";
            }
        } catch (e) {
            statusText.textContent = "Offline Mode: Simulated PDF metadata loading.";
            formTitle.value = file.name.replace(".pdf", "").replace("_", " ").toUpperCase();
            formAbstract.value = "An open-access platform built to showcase local engineering student prototypes.";
        }
    }
}

// Lock & Submit to Backend
function setupSubmission() {
    const btn = document.getElementById("btnSubmitPaper");
    btn.addEventListener("click", async () => {
        const title = document.getElementById("paperTitle").value;
        const abstract = document.getElementById("paperAbstract").value;
        const visibility = document.getElementById("paperVisibility").value;
        const coAuthorsRaw = document.getElementById("coAuthorsInput").value;

        if (!title || !abstract) {
            alert("Title and Abstract are required fields.");
            return;
        }

        const coAuthors = coAuthorsRaw.split(",")
            .map(email => email.trim())
            .filter(email => email !== "");

        if (coAuthors.length === 0) {
            alert("At least one co-author is required to verify the output submission.");
            return;
        }

        const payload = {
            title,
            abstract,
            visibility,
            uploaded_by: appState.currentUser.email,
            co_authors: coAuthors
        };

        try {
            const res = await fetch(`${API_BASE}/submit`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload)
            });
            
            if (res.ok) {
                alert(`Verification requested! Co-author email alerts triggered.`);
            } else {
                alert("Backend storage failed.");
            }
        } catch (e) {
            alert("Offline Mock Submission triggered.");
            // Offline fallback
            appState.submissions.push({
                id: Date.now(),
                title,
                abstract,
                visibility,
                status: "PENDING_VERIFICATION",
                uploadedBy: appState.currentUser.email,
                coAuthors: coAuthors.map(email => ({ email, approved: false })),
                tags: [{ name: "SDG 9: Industry & Innovation", type: "SDG" }],
                date: new Date().toISOString().split("T")[0]
            });
        }

        // Reset
        document.getElementById("paperTitle").value = "";
        document.getElementById("paperAbstract").value = "";
        document.getElementById("fileUploadStatus").style.display = "none";
        
        document.getElementById("nav-verification").click();
        await loadSubmissions();
    });
}

// Master UI Update Engine
function updateUI() {
    renderDashboardStats();
    renderCharts();
    renderVerifications();
    renderDirectory();
}

function renderDashboardStats() {
    const total = appState.submissions.length;
    const pending = appState.submissions.filter(s => s.status === "PENDING_VERIFICATION").length;
    const sdgMapped = appState.submissions.filter(s => s.tags.some(t => t.type === "SDG")).length;
    
    document.getElementById("val-total").textContent = total;
    document.getElementById("val-pending").textContent = pending;
    document.getElementById("val-sdg").textContent = sdgMapped;
}

function renderCharts() {
    const sdgCounts = {};
    const domainCounts = {};

    appState.submissions.forEach(sub => {
        sub.tags.forEach(tag => {
            if (tag.type === "SDG") {
                sdgCounts[tag.name] = (sdgCounts[tag.name] || 0) + 1;
            } else if (tag.type === "TECH") {
                domainCounts[tag.name] = (domainCounts[tag.name] || 0) + 1;
            }
        });
    });

    const sdgLabels = Object.keys(sdgCounts);
    const sdgData = Object.values(sdgCounts);
    const domainLabels = Object.keys(domainCounts);
    const domainData = Object.values(domainCounts);

    if (sdgLabels.length === 0) return;

    // Render SDG Chart
    const ctxSdg = document.getElementById("sdgChart").getContext("2d");
    if (sdgChartInstance) sdgChartInstance.destroy();
    sdgChartInstance = new Chart(ctxSdg, {
        type: 'doughnut',
        data: {
            labels: sdgLabels,
            datasets: [{
                data: sdgData,
                backgroundColor: ['#8b5cf6', '#06b6d4', '#10b981', '#f43f5e', '#3b82f6'],
                borderWidth: 0
            }]
        },
        options: {
            plugins: {
                legend: { labels: { color: '#9ca3af' } }
            }
        }
    });

    // Render Tech Domain Chart
    const ctxDomain = document.getElementById("domainChart").getContext("2d");
    if (domainChartInstance) domainChartInstance.destroy();
    domainChartInstance = new Chart(ctxDomain, {
        type: 'bar',
        data: {
            labels: domainLabels,
            datasets: [{
                label: 'Outputs Mapped',
                data: domainData,
                backgroundColor: 'rgba(6, 182, 212, 0.6)',
                borderColor: '#06b6d4',
                borderWidth: 1
            }]
        },
        options: {
            scales: {
                y: { ticks: { color: '#9ca3af', stepSize: 1 }, grid: { color: 'rgba(255,255,255,0.05)' } },
                x: { ticks: { color: '#9ca3af' }, grid: { display: false } }
            },
            plugins: {
                legend: { display: false }
            }
        }
    });
}

function renderVerifications() {
    const list = document.getElementById("pendingVerificationsList");
    list.innerHTML = "";

    const pending = appState.submissions.filter(s => s.status === "PENDING_VERIFICATION");

    if (pending.length === 0) {
        list.innerHTML = `<div style="text-align: center; color: var(--text-secondary); padding: 2rem;">No pending approvals in queue. System is fully verified.</div>`;
        return;
    }

    pending.forEach(sub => {
        const item = document.createElement("div");
        item.className = "paper-card";
        
        let bubbles = sub.coAuthors.map(author => {
            const statusClass = author.approved ? 'status-approved' : 'status-pending';
            return `<div class="co-author-bubble">
                <span class="status-indicator ${statusClass}"></span>
                ${author.email}
            </div>`;
        }).join("");

        const myCoAuthorObj = sub.coAuthors.find(a => a.email === appState.currentUser.email && !a.approved);
        const actionButton = myCoAuthorObj 
            ? `<button class="btn btn-primary" onclick="approveDocument(${sub.id})" style="margin-top: 1rem; font-size: 0.85rem; padding: 0.5rem 1rem;">✍️ Sign-Off Cryptographically</button>`
            : `<span style="display: block; font-size: 0.8rem; color: var(--text-secondary); margin-top: 1rem;">Waiting for other co-authors to verify.</span>`;

        item.innerHTML = `
            <span class="badge badge-pending">PENDING SIGN-OFF</span>
            <h3 style="margin-top: 0.5rem; margin-bottom: 0.5rem;">${sub.title}</h3>
            <p style="font-size: 0.85rem; color: var(--text-secondary); line-height: 1.4; margin-bottom: 1rem;">${sub.abstract}</p>
            <div style="font-size: 0.8rem; margin-bottom: 0.5rem; color: var(--text-secondary);">Uploaded by: <strong>${sub.uploadedBy}</strong></div>
            <div>${bubbles}</div>
            ${actionButton}
        `;
        list.appendChild(item);
    });
}

// Sign off via API
window.approveDocument = async function(subId) {
    try {
        const res = await fetch(`${API_BASE}/approve?submission_id=${subId}&email=${appState.currentUser.email}`, {
            method: "POST"
        });
        
        if (res.ok) {
            alert("Signature successfully registered!");
        } else {
            alert("Approval registration failed.");
        }
    } catch (e) {
        // Fallback for offline mode
        const sub = appState.submissions.find(s => s.id === subId);
        if (sub) {
            const author = sub.coAuthors.find(a => a.email === appState.currentUser.email);
            if (author) author.approved = true;
            if (sub.coAuthors.every(a => a.approved)) sub.status = "PUBLISHED";
        }
        alert("Offline: Recorded sign-off signature.");
    }
    await loadSubmissions();
};

function renderDirectory() {
    const list = document.getElementById("directoryList");
    const searchVal = document.getElementById("directorySearchInput").value.toLowerCase();
    list.innerHTML = "";

    const published = appState.submissions.filter(s => {
        const matchesSearch = s.title.toLowerCase().includes(searchVal) || 
                              s.abstract.toLowerCase().includes(searchVal) ||
                              s.tags.some(t => t.name.toLowerCase().includes(searchVal));
        return s.status === "PUBLISHED" && matchesSearch;
    });

    if (published.length === 0) {
        list.innerHTML = `<div style="text-align: center; color: var(--text-secondary); padding: 2rem;">No matching published papers found.</div>`;
        return;
    }

    published.forEach(sub => {
        const item = document.createElement("div");
        item.className = "paper-card";
        
        let tagBadges = sub.tags.map(t => {
            const badgeClass = t.type === 'SDG' ? 'badge-sdg' : 'badge-published';
            return `<span class="badge ${badgeClass}">${t.name}</span>`;
        }).join("");

        item.innerHTML = `
            <div style="display:flex; justify-content: space-between; align-items: flex-start; margin-bottom: 0.5rem;">
                <span class="badge badge-published">VERIFIED & ACCESSIBLE</span>
                <span style="font-size: 0.8rem; color: var(--text-secondary);">${sub.date}</span>
            </div>
            <h3>${sub.title}</h3>
            <p style="font-size: 0.85rem; color: var(--text-secondary); line-height: 1.4; margin: 0.75rem 0;">${sub.abstract}</p>
            <div style="margin-bottom: 1rem;">${tagBadges}</div>
            <div style="display: flex; gap: 0.5rem;">
                <button class="btn btn-secondary" onclick="alert('Viewing document (Access Tier: ${sub.visibility})')" style="font-size: 0.8rem; padding: 0.4rem 0.8rem;">Request Full PDF</button>
            </div>
        `;
        list.appendChild(item);
    });

    document.getElementById("directorySearchInput").oninput = renderDirectory;
}

// AI Copilot Controller
function setupCopilot() {
    const bubble = document.getElementById("copilotBubble");
    const drawer = document.getElementById("copilotDrawer");
    const closeBtn = document.getElementById("closeCopilot");
    const sendBtn = document.getElementById("sendCopilotBtn");
    const input = document.getElementById("copilotInput");
    const chatLog = document.getElementById("copilotChatLog");

    bubble.addEventListener("click", () => {
        const isHidden = drawer.style.display === "none" || !drawer.style.display;
        drawer.style.display = isHidden ? "flex" : "none";
    });

    closeBtn.addEventListener("click", () => {
        drawer.style.display = "none";
    });

    sendBtn.addEventListener("click", submitQuery);
    input.addEventListener("keydown", (e) => {
        if (e.key === "Enter") submitQuery();
    });

    async function submitQuery() {
        const queryText = input.value.trim();
        if (!queryText) return;

        // Append User Message
        appendMessage(queryText, "user");
        input.value = "";

        // Append loading indicator
        const loadingDiv = appendMessage("Thinking...", "bot", true);

        try {
            const res = await fetch(`${API_BASE}/copilot`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ query: queryText })
            });

            if (res.ok) {
                const data = await res.json();
                loadingDiv.innerHTML = data.response.replace(/\n/g, "<br>");
            } else {
                loadingDiv.textContent = "Error getting response from backend.";
            }
        } catch (e) {
            // Local fallback simulation
            loadingDiv.textContent = `Offline simulation match result for '${queryText}'. To enable live AI, run uvicorn main:app and set your GEMINI_API_KEY!`;
        }
        
        chatLog.scrollTop = chatLog.scrollHeight;
    }

    function appendMessage(text, sender, isLoading = false) {
        const msgDiv = document.createElement("div");
        const isUser = sender === "user";
        
        msgDiv.style.background = isUser ? "var(--gradient-accent)" : "rgba(255,255,255,0.05)";
        msgDiv.style.color = isUser ? "white" : "var(--text-primary)";
        msgDiv.style.padding = "0.75rem";
        msgDiv.style.borderRadius = "var(--radius-md)";
        msgDiv.style.maxWidth = "85%";
        msgDiv.style.alignSelf = isUser ? "flex-end" : "flex-start";
        msgDiv.style.lineHeight = "1.4";
        msgDiv.style.wordBreak = "break-word";
        msgDiv.textContent = text;
        
        chatLog.appendChild(msgDiv);
        chatLog.scrollTop = chatLog.scrollHeight;
        return msgDiv;
    }
}

