// ResVerity - Mock Database and Application State
let appState = {
    currentUser: {
        email: "author.delacruz@uc.edu.ph",
        role: "student"
    },
    submissions: [
        {
            id: 1,
            title: "IoT-Based Microclimate Monitoring for Urban Farms",
            abstract: "This research presents a wireless sensor node deployment designed for monitoring soil humidity, ambient temperature, and sunlight levels in urban community spaces in Cebu. Using a low-cost microcontroller grid, the system reports real-time parameters to an open-source analytics dashboard.",
            visibility: "OPEN_ACCESS",
            status: "PUBLISHED",
            uploadedBy: "student.farmer@uc.edu.ph",
            coAuthors: [
                { email: "john.farmer@uc.edu.ph", approved: true },
                { email: "admin.dean@uc.edu.ph", approved: true }
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
            abstract: "Applying lightweight linear regression model scripts to sales data from local sari-sari stores to forecast optimal inventory requirements. The target output helps reduce waste in food stocks and optimize capital usage.",
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
    ]
};

// Default sample abstracts for auto-fill simulation
const SAMPLE_ABSTRACTS = [
    "Integrating NLP parsing routines with higher education repositories to map capstones and student thesis outputs to sustainable development targets. This architecture helps university heads audit and evaluate overall academic impact.",
    "A custom-tailored cryptographic checklist scheme allowing co-authors of scientific publications to authenticate their inclusion via official SSO channels. This mechanism eliminates unauthorized submissions and prevents intellectual property piracy.",
    "An open-access platform built to showcase local engineering student prototypes to regional business councils, enabling faster incubation, seed funding, and commercial software licensing deals."
];

// Reference Chart instances
let sdgChartInstance = null;
let domainChartInstance = null;

// Initialize Application UI
document.addEventListener("DOMContentLoaded", () => {
    setupNavigation();
    setupAuth();
    setupDropzone();
    setupSubmission();
    updateUI();
});

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

// Authentication Logic (Simulation)
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
        updateUI();
    });

    logoutBtn.addEventListener("click", () => {
        ssoOverlay.style.display = "flex";
    });
}

// Drag & Drop File Upload simulation
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
            handleUploadedFile(e.dataTransfer.files[0]);
        }
    });

    fileInput.addEventListener("change", (e) => {
        if (e.target.files.length > 0) {
            handleUploadedFile(e.target.files[0]);
        }
    });

    function handleUploadedFile(file) {
        uploadedName.textContent = file.name;
        statusText.style.display = "block";
        
        // Dynamic simulated metadata parsing:
        // Convert filename to Title casing, auto-insert custom abstract
        let rawName = file.name.replace(/\.pdf$/i, "").replace(/[_-]/g, " ");
        formTitle.value = rawName.charAt(0).toUpperCase() + rawName.slice(1);
        formAbstract.value = SAMPLE_ABSTRACTS[Math.floor(Math.random() * SAMPLE_ABSTRACTS.length)];
    }
}

// Lock & Submit
function setupSubmission() {
    const btn = document.getElementById("btnSubmitPaper");
    btn.addEventListener("click", () => {
        const title = document.getElementById("paperTitle").value;
        const abstract = document.getElementById("paperAbstract").value;
        const visibility = document.getElementById("paperVisibility").value;
        const coAuthorsRaw = document.getElementById("coAuthorsInput").value;

        if (!title || !abstract) {
            alert("Title and Abstract are required fields.");
            return;
        }

        // Format co-authors
        const coAuthors = coAuthorsRaw.split(",")
            .map(email => email.trim())
            .filter(email => email !== "")
            .map(email => ({ email: email, approved: false }));

        if (coAuthors.length === 0) {
            alert("At least one co-author is required to verify the output submission.");
            return;
        }

        // Auto NLP Tag Extraction (Simulated)
        const tags = [];
        const textToSearch = (title + " " + abstract).toLowerCase();
        
        if (textToSearch.includes("sustainable") || textToSearch.includes("city") || textToSearch.includes("urban")) {
            tags.push({ name: "SDG 11: Sustainable Cities", type: "SDG" });
        } else if (textToSearch.includes("data") || textToSearch.includes("governance") || textToSearch.includes("repository")) {
            tags.push({ name: "SDG 9: Industry & Innovation", type: "SDG" });
        } else {
            tags.push({ name: "SDG 4: Quality Education", type: "SDG" });
        }

        if (textToSearch.includes("nlp") || textToSearch.includes("intelligence") || textToSearch.includes("predictive")) {
            tags.push({ name: "AI & Analytics", type: "TECH" });
        } else if (textToSearch.includes("cryptographic") || textToSearch.includes("security") || textToSearch.includes("blockchain")) {
            tags.push({ name: "Cybersecurity", type: "TECH" });
        } else {
            tags.push({ name: "Data Systems", type: "TECH" });
        }

        // Add to state
        const newDoc = {
            id: appState.submissions.length + 1,
            title,
            abstract,
            visibility,
            status: "PENDING_VERIFICATION",
            uploadedBy: appState.currentUser.email,
            coAuthors,
            tags,
            date: new Date().toISOString().split("T")[0]
        };

        appState.submissions.push(newDoc);
        alert(`Verification requested! ${coAuthors.length} co-author alerts triggered.`);
        
        // Reset Form
        document.getElementById("paperTitle").value = "";
        document.getElementById("paperAbstract").value = "";
        document.getElementById("fileUploadStatus").style.display = "none";
        
        // Jump to verification page
        document.getElementById("nav-verification").click();
        updateUI();
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
    // Collect stats
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
        
        // Co-author verification bubbles
        let bubbles = sub.coAuthors.map(author => {
            const statusClass = author.approved ? 'status-approved' : 'status-pending';
            return `<div class="co-author-bubble">
                <span class="status-indicator ${statusClass}"></span>
                ${author.email}
            </div>`;
        }).join("");

        // Check if current user is an un-approved co-author
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

// Global approval function called by dynamic buttons
window.approveDocument = function(subId) {
    const sub = appState.submissions.find(s => s.id === subId);
    if (!sub) return;

    // Approve for current user
    const authorObj = sub.coAuthors.find(a => a.email === appState.currentUser.email);
    if (authorObj) {
        authorObj.approved = true;
        authorObj.approvedAt = new Date().toISOString();
    }

    // Check if all are now approved
    const allApproved = sub.coAuthors.every(a => a.approved);
    if (allApproved) {
        sub.status = "PUBLISHED";
        alert(`Success! All co-authors have signed off. "${sub.title}" is now published to the directory.`);
    } else {
        alert("Your cryptographic signature has been recorded. Document remains locked until other co-authors sign off.");
    }

    updateUI();
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

    // Re-attach input listener for filtering
    document.getElementById("directorySearchInput").oninput = renderDirectory;
}
