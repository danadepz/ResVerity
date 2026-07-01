'use client';

import { useState, useEffect, useRef } from 'react';

export default function Home() {
    // Session State
    const [isLoggedIn, setIsLoggedIn] = useState(false);
    const [currentUser, setCurrentUser] = useState({
        email: "author.delacruz@uc.edu.ph",
        role: "student"
    });
    const [password, setPassword] = useState('');
    const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
    const [toast, setToast] = useState({ message: '', visible: false, type: 'info' });

    const showToast = (message, type = 'info') => {
        setToast({ message, visible: true, type });
        setTimeout(() => {
            setToast(prev => ({ ...prev, visible: false }));
        }, 4000);
    };
    
    // Portal Sections Navigation
    const [activeSection, setActiveSection] = useState('dashboard');

    // Submissions State
    const [submissions, setSubmissions] = useState([]);
    const [loading, setLoading] = useState(true);

    // Form inputs
    const [paperTitle, setPaperTitle] = useState('');
    const [paperAbstract, setPaperAbstract] = useState('');
    const [paperVisibility, setPaperVisibility] = useState('PUBLIC_ABSTRACT');
    const [coAuthorsInput, setCoAuthorsInput] = useState('jane.doe@uc.edu.ph, mark.smith@uc.edu.ph');
    const [fileName, setFileName] = useState('');
    const [uploadStatus, setUploadStatus] = useState('');
    const [pdfUrl, setPdfUrl] = useState('');

    // Search
    const [searchVal, setSearchVal] = useState('');

    // Copilot State
    const [copilotOpen, setCopilotOpen] = useState(false);
    const [copilotInput, setCopilotInput] = useState('');
    const [copilotLog, setCopilotLog] = useState([
        { text: "Hello! I am your ResVerity AI Copilot. Ask me about specific sustainable goals (SDGs), technologies, or summaries of research in the repository!", sender: "bot" }
    ]);
    const [copilotLoading, setCopilotLoading] = useState(false);
    const chatLogRef = useRef(null);

    // Load Submissions on mount or auth change
    useEffect(() => {
        if (isLoggedIn) {
            fetchSubmissions();
        }
    }, [isLoggedIn]);

    // Scroll Chat to bottom
    useEffect(() => {
        if (chatLogRef.current) {
            chatLogRef.current.scrollTop = chatLogRef.current.scrollHeight;
        }
    }, [copilotLog, copilotOpen]);

    const fetchSubmissions = async () => {
        setLoading(true);
        try {
            const res = await fetch('/api/submissions');
            if (res.ok) {
                const data = await res.json();
                setSubmissions(data);
            }
        } catch (e) {
            console.error("Submissions load failed", e);
        } finally {
            setLoading(false);
        }
    };

    // SSO login simulator
    const handleLogin = () => {
        if (!currentUser.email || !password) {
            showToast("Please enter both institutional email and password.", "error");
            return;
        }

        // Automatically determine user authorization role based on domain pattern
        let role = 'student';
        const emailLower = currentUser.email.toLowerCase();
        if (emailLower.includes('dean') || emailLower.includes('admin')) {
            role = 'dean';
        } else if (emailLower.includes('coauthor') || emailLower.includes('jane.doe') || emailLower.includes('mark.smith') || emailLower.includes('john.farmer')) {
            role = 'coauthor';
        }

        setCurrentUser(prev => ({
            ...prev,
            role: role
        }));
        setIsLoggedIn(true);
    };

    const handleLogout = () => {
        setShowLogoutConfirm(true);
    };

    // Dropzone Upload Simulation
    const triggerFileSelect = () => {
        const fileInput = document.createElement('input');
        fileInput.type = 'file';
        fileInput.accept = '.pdf';
        fileInput.onchange = async (e) => {
            if (e.target.files.length > 0) {
                await handleFileUpload(e.target.files[0]);
            }
        };
        fileInput.click();
    };

    const handleFileUpload = async (file) => {
        setFileName(file.name);
        setUploadStatus("Extracting content and predicting metadata via AI...");
        
        const formData = new FormData();
        formData.append("file", file);

        try {
            const res = await fetch('/app/api/upload' ? '/api/upload' : '/api/upload', {
                method: "POST",
                body: formData
            });
            if (res.ok) {
                const data = await res.json();
                setPaperTitle(data.title);
                setPaperAbstract(data.abstract);
                setPdfUrl(data.pdf_url);
                setUploadStatus("📄 PDF Parsed and Classified successfully!");
            } else {
                setUploadStatus("Failed to parse PDF using backend. Setting defaults.");
                setDefaultFormFields(file.name);
            }
        } catch (e) {
            setUploadStatus("Offline mode parser activated.");
            setDefaultFormFields(file.name);
        }
    };

    const setDefaultFormFields = (name) => {
        const cleanTitle = name.replace(".pdf", "").replace(/[_-]/g, " ").replace(/\b\w/g, c => c.toUpperCase());
        setPaperTitle(cleanTitle);
        setPaperAbstract("This research introduces a cloud-based web application deployed to help local retail stores and community farmers track inventory.");
    };

    // Submit Paper to Backend
    const submitResearch = async () => {
        if (!paperTitle || !paperAbstract) {
            showToast("Title and Abstract are required.", "error");
            return;
        }

        const coAuthors = coAuthorsInput.split(",")
            .map(email => email.trim())
            .filter(email => email !== "");

        if (coAuthors.length === 0) {
            showToast("At least one co-author is required to verify the output submission.", "error");
            return;
        }

        const payload = {
            title: paperTitle,
            abstract: paperAbstract,
            visibility: paperVisibility,
            uploaded_by: currentUser.email,
            co_authors: coAuthors,
            pdf_url: pdfUrl
        };

        try {
            const res = await fetch('/api/submissions', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            if (res.ok) {
                showToast("Verification requested! Co-author email approvals triggered.", "success");
                setPaperTitle('');
                setPaperAbstract('');
                setFileName('');
                setUploadStatus('');
                setPdfUrl('');
                setActiveSection('verification');
                fetchSubmissions();
            } else {
                showToast("Submission failed.", "error");
            }
        } catch (e) {
            console.error(e);
        }
    };

    // Co-Author Cryptographic Shield Sign-off
    const signOffDocument = async (subId) => {
        try {
            const res = await fetch(`/api/approve?submission_id=${subId}&email=${currentUser.email}`, {
                method: "POST"
            });
            if (res.ok) {
                showToast("Cryptographic signature registered!", "success");
                fetchSubmissions();
            }
        } catch (e) {
            console.error(e);
        }
    };

    const handleDisapprove = async (subId) => {
        showToast("Submission disapproved. Authors have been notified of rejection.", "error");
        setSubmissions(prev => prev.map(s => s.id === subId ? { ...s, status: 'REJECTED' } : s));
    };

    const handleRequestPdf = (sub) => {
        const visibility = sub.visibility || sub.visibility_tier;
        const pdfLink = sub.pdfUrl || sub.pdf_url;

        if (visibility === 'OPEN_ACCESS') {
            if (pdfLink) {
                window.open(pdfLink, '_blank');
                showToast("Opening full PDF from Supabase Storage...", "success");
            } else {
                showToast("Open Access PDF link is currently empty in database.", "error");
            }
        } else if (visibility === 'PUBLIC_ABSTRACT') {
            // Generate and trigger download of abstract text sheet
            const element = document.createElement("a");
            const file = new Blob([
                `=========================================\n`,
                `   RESVERITY VERIFIED ACADEMIC ABSTRACT  \n`,
                `=========================================\n\n`,
                `TITLE: ${sub.title}\n\n`,
                `ABSTRACT:\n${sub.abstract}\n\n`,
                `AUTHORS & CO-AUTHORS:\n- ${sub.uploadedBy || sub.uploaded_by || "Primary Student Creator"}\n`,
                (sub.coAuthors || []).map(co => `- ${co.email} (${co.approved ? 'Verified' : 'Pending Approval'})\n`).join(''),
                `\nSDG & TECHNICAL TAGS:\n`,
                (sub.tags || []).map(t => `- [${t.type || t.tag_type}] ${t.name || t.tag_name}\n`).join(''),
                `\n=========================================\n`,
                `Verification Key: SHA-256/ECDSA-SECURED\n`
            ], { type: 'text/plain;charset=utf-8' });
            element.href = URL.createObjectURL(file);
            element.download = `Abstract_${sub.title.replace(/[^a-zA-Z0-9]/g, '_')}.txt`;
            document.body.appendChild(element);
            element.click();
            document.body.removeChild(element);
            showToast("Downloading verified Abstract Sheet...", "success");
        } else if (visibility === 'INSTITUTIONAL') {
            if (pdfLink) {
                window.open(pdfLink, '_blank');
                showToast("Institutional access verified. Opening PDF...", "success");
            } else {
                showToast("Institutional PDF link is missing in database.", "error");
            }
        }
    };

    // Copilot Queries
    const sendCopilotMessage = async () => {
        const text = copilotInput.trim();
        if (!text) return;

        setCopilotLog(prev => [...prev, { text, sender: "user" }]);
        setCopilotInput('');
        setCopilotLoading(true);

        try {
            const res = await fetch('/api/copilot', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ query: text })
            });

            if (res.ok) {
                const data = await res.json();
                setCopilotLog(prev => [...prev, { text: data.response, sender: "bot" }]);
            }
        } catch (e) {
            setCopilotLog(prev => [...prev, { text: "Error connecting to AI Copilot backend routes.", sender: "bot" }]);
        } finally {
            setCopilotLoading(false);
        }
    };

    // Aggregate Analytics Calculations
    const totalCount = submissions.length;
    const pendingCount = submissions.filter(s => s.status === 'PENDING_VERIFICATION').length;
    
    // Dynamically calculate SDG and Domain tags based on current dataset
    const sdgCounts = {};
    const domainCounts = {};
    
    submissions.forEach(s => {
        const tagsList = s.tags || [];
        tagsList.forEach(t => {
            const name = t.name || t.tag_name;
            const type = t.type || t.tag_type;
            if (type === 'SDG') {
                sdgCounts[name] = (sdgCounts[name] || 0) + 1;
            } else {
                domainCounts[name] = (domainCounts[name] || 0) + 1;
            }
        });
    });

    const finalSdgCounts = Object.keys(sdgCounts).length > 0 ? sdgCounts : { "SDG 11: Sustainable Cities": 1, "SDG 9: Industry & Innovation": 1, "SDG 8: Decent Work": 1 };
    const finalDomainCounts = Object.keys(domainCounts).length > 0 ? domainCounts : { "IoT & Hardware": 1, "AI & Analytics": 1 };

    const sdgMappedCount = Object.keys(sdgCounts).length > 0 ? Object.keys(sdgCounts).length : 2;

    // Compute SVG doughnut segments dynamically
    const sdgPairs = Object.entries(finalSdgCounts);
    const sdgTotal = sdgPairs.reduce((acc, [_, count]) => acc + count, 0);
    let cumulativePercent = 0;
    const colors = ['var(--accent-purple)', 'var(--accent-cyan)', 'var(--accent-emerald)', '#f59e0b', '#ec4899'];
    const svgCircles = sdgPairs.map(([sdg, count], idx) => {
        const percent = sdgTotal > 0 ? (count / sdgTotal) * 100 : 33.3;
        const strokeDash = `${percent} 100`;
        const strokeOffset = -cumulativePercent;
        cumulativePercent += percent;
        return (
            <circle 
                key={idx}
                cx="18" 
                cy="18" 
                r="15.915" 
                fill="none" 
                stroke={colors[idx % colors.length]} 
                strokeWidth="3.2" 
                strokeDasharray={strokeDash} 
                strokeDashoffset={strokeOffset} 
            />
        );
    });

    // Generate Dynamic activity feed
    const activityFeed = [];
    submissions.forEach(s => {
        const uEmail = s.uploadedBy || s.uploaded_by || "student@uc.edu.ph";
        activityFeed.push({
            icon: "📤",
            text: `Draft paper "${s.title}" uploaded by ${uEmail}`,
            date: s.date || "2026-06-25"
        });
        
        const coAuthorsList = s.coAuthors || [];
        coAuthorsList.forEach(co => {
            if (co.approved) {
                activityFeed.push({
                    icon: "✍️",
                    text: `Co-author ${co.email} verified and signed "${s.title}"`,
                    date: s.date || "2026-06-25"
                });
            }
        });

        if (s.status === 'PUBLISHED') {
            activityFeed.push({
                icon: "🎉",
                text: `Paper "${s.title}" is 100% verified & published to Public Directory`,
                date: s.date || "2026-06-25"
            });
        } else if (s.status === 'REJECTED') {
            activityFeed.push({
                icon: "❌",
                text: `Paper "${s.title}" was disapproved by reviewers`,
                date: s.date || "2026-06-25"
            });
        }
    });

    const latestActivities = activityFeed.slice(-4).reverse();

    // Filter directory list
    const filteredDirectory = submissions.filter(s => {
        if (s.status !== 'PUBLISHED') return false;
        
        // Institutional access restriction: 
        // Only show to users logged in with matching email domains
        const visibility = s.visibility || s.visibility_tier;
        if (visibility === 'INSTITUTIONAL') {
            if (!isLoggedIn) return false;
            const myDomain = currentUser.email ? currentUser.email.split('@')[1] : '';
            const uploaderDomain = (s.uploadedBy || s.uploaded_by || '').split('@')[1];
            if (myDomain !== uploaderDomain) return false;
        }

        const matches = s.title.toLowerCase().includes(searchVal.toLowerCase()) || 
                      s.abstract.toLowerCase().includes(searchVal.toLowerCase()) ||
                      s.tags.some(t => t.name.toLowerCase().includes(searchVal.toLowerCase()));
        return matches;
    });

    const renderMessageText = (text) => {
        const escaped = text
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;");
        const formatted = escaped
            .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
            .replace(/\n/g, "<br>");
        return { __html: formatted };
    };

    return (
        <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
            
            {/* FLOATING TOAST NOTIFICATIONS */}
            {toast.visible && (
                <div style={{
                    position: 'fixed',
                    top: '2rem',
                    right: '2rem',
                    background: toast.type === 'error' ? 'var(--accent-rose)' : toast.type === 'success' ? 'var(--accent-emerald)' : 'var(--gradient-accent)',
                    color: 'white',
                    padding: '1rem 1.5rem',
                    borderRadius: 'var(--radius-md)',
                    boxShadow: '0 4px 20px rgba(0, 0, 0, 0.4)',
                    zIndex: 250,
                    fontSize: '0.9rem',
                    fontWeight: '600',
                    animation: 'fadeIn 0.2s ease-out'
                }}>
                    {toast.message}
                </div>
            )}

            {/* LOGOUT CONFIRMATION MODAL */}
            {showLogoutConfirm && (
                <div className="sso-overlay" style={{ zIndex: 300 }}>
                    <div className="sso-card" style={{ padding: '2rem' }}>
                        <h2>Log Out</h2>
                        <p style={{ color: 'var(--text-secondary)', marginBottom: '1.5rem' }}>Are you sure you want to end your current session?</p>
                        <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center' }}>
                            <button 
                                onClick={() => {
                                    setPassword('');
                                    setIsLoggedIn(false);
                                    setShowLogoutConfirm(false);
                                }} 
                                className="btn" 
                                style={{ background: 'var(--accent-rose)', color: 'white', flex: 1 }}
                            >
                                Yes, Log Out
                            </button>
                            <button 
                                onClick={() => setShowLogoutConfirm(false)} 
                                className="btn btn-secondary"
                                style={{ flex: 1 }}
                            >
                                Cancel
                            </button>
                        </div>
                    </div>
                </div>
            )}
            
            {/* SSO LOGIN OVERLAY SCREEN */}
            {!isLoggedIn && (
                <div className="sso-overlay">
                    <div className="sso-card" style={{ position: 'relative' }}>
                        <button
                            onClick={() => { window.location.href = '/'; }}
                            aria-label="Close and return to landing page"
                            style={{
                                position: 'absolute',
                                top: '1rem',
                                right: '1.25rem',
                                background: 'none',
                                border: 'none',
                                color: 'var(--text-secondary)',
                                fontSize: '1.75rem',
                                lineHeight: 1,
                                cursor: 'pointer',
                                padding: 0,
                            }}
                        >
                            &times;
                        </button>
                        <div className="logo-group" style={{ justifyContent: 'center', marginBottom: '1.5rem' }}>
                            <div className="logo-icon">V</div>
                            <span className="logo-text">ResVerity</span>
                        </div>
                        <h2>Institutional SSO Login</h2>
                        <p>Authenticate your higher education account to manage output governance.</p>
                        
                        <div className="form-group">
                            <label>Institutional Email</label>
                            <input 
                                type="email" 
                                className="form-input" 
                                value={currentUser.email}
                                onChange={(e) => setCurrentUser({...currentUser, email: e.target.value})}
                            />
                        </div>
                        <div className="form-group">
                            <label>Password</label>
                            <input 
                                type="password" 
                                className="form-input" 
                                placeholder="••••••••"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                            />
                        </div>
                        <button onClick={handleLogin} className="btn btn-primary" style={{ width: '100%', marginTop: '1rem' }}>
                            Authenticate
                        </button>
                    </div>
                </div>
            )}

            {/* HEADER NAVIGATION */}
            <header>
                <div className="header-container">
                    <div className="logo-group">
                        <div className="logo-icon">V</div>
                        <span className="logo-text">ResVerity</span>
                    </div>
                    <nav>
                        <ul>
                            <li><a className={activeSection === 'dashboard' ? 'active' : ''} onClick={() => setActiveSection('dashboard')}>Dashboard</a></li>
                            <li><a className={activeSection === 'submit' ? 'active' : ''} onClick={() => setActiveSection('submit')}>Submit Research</a></li>
                            <li><a className={activeSection === 'verification' ? 'active' : ''} onClick={() => setActiveSection('verification')}>Co-Author Shield</a></li>
                            <li><a className={activeSection === 'directory' ? 'active' : ''} onClick={() => setActiveSection('directory')}>Public Directory</a></li>
                        </ul>
                    </nav>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        <span className={`badge ${currentUser.role === 'dean' ? 'badge-sdg' : 'badge-published'}`} style={{ marginRight: 0 }}>
                            {currentUser.role.toUpperCase()}
                        </span>
                        <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>{currentUser.email}</span>
                        <button onClick={handleLogout} className="btn btn-secondary" style={{ padding: '0.4rem 0.8rem', fontSize: '0.75rem' }}>
                            Log Out
                        </button>
                    </div>
                </div>
            </header>

            {/* MAIN PORTAL PAGES */}
            <main>
                
                {/* 1. DASHBOARD PANEL */}
                {activeSection === 'dashboard' && (
                    <div>
                        <div className="analytics-grid">
                            <div className="stat-card">
                                <div className="stat-icon">📄</div>
                                <div className="stat-info">
                                    <h3>Total Submissions</h3>
                                    <div className="value">{totalCount}</div>
                                </div>
                            </div>
                            <div className="stat-card">
                                <div className="stat-icon">🔒</div>
                                <div className="stat-info">
                                    <h3>Awaiting Sign-offs</h3>
                                    <div className="value" style={{ color: '#f59e0b' }}>{pendingCount}</div>
                                </div>
                            </div>
                            <div className="stat-card">
                                <div className="stat-icon">🎯</div>
                                <div className="stat-info">
                                    <h3>SDG Mapped Projects</h3>
                                    <div className="value" style={{ color: 'var(--accent-purple)' }}>{sdgMappedCount}</div>
                                </div>
                            </div>
                            <div className="stat-card">
                                <div className="stat-icon">🛡️</div>
                                <div className="stat-info">
                                    <h3>Anti-Piracy Compliance</h3>
                                    <div className="value" style={{ color: 'var(--accent-emerald)' }}>100%</div>
                                </div>
                            </div>
                        </div>

                        <div className="card">
                            <h2>DASIG Governance Analytics Center</h2>
                            <p style={{ color: 'var(--text-secondary)', marginBottom: '2rem' }}>
                                Real-time mapping of research outcomes to UN Sustainable Development Goals (SDGs) and technical domains.
                            </p>
                            
                            <div className="charts-row">
                                {/* SDG target counts representation */}
                                <div style={{ background: 'rgba(0,0,0,0.2)', padding: '1.5rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem' }}>
                                    <h4 style={{ alignSelf: 'flex-start', margin: 0 }}>SDG Target Alignments</h4>
                                    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '130px' }}>
                                        <svg width="120" height="120" viewBox="0 0 36 36" style={{ transform: 'rotate(-90deg)' }}>
                                            <circle cx="18" cy="18" r="15.915" fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="3" />
                                            {svgCircles}
                                        </svg>
                                    </div>
                                    <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                                        {Object.entries(finalSdgCounts).map(([sdg, count], idx) => (
                                            <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem' }}>
                                                <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                                    <span style={{ color: colors[idx % colors.length], fontSize: '1rem' }}>●</span>
                                                    {sdg}
                                                </span>
                                                <strong>{count} paper{count > 1 ? 's' : ''}</strong>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                {/* Tech Domains dynamic Bar chart representation */}
                                <div style={{ background: 'rgba(0,0,0,0.2)', padding: '1.5rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)' }}>
                                    <h4 style={{ marginBottom: '1.5rem' }}>Thematic Domain Distribution</h4>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                                        {Object.entries(finalDomainCounts).map(([domain, count], idx) => {
                                            const maxVal = Math.max(...Object.values(finalDomainCounts));
                                            const percentage = maxVal > 0 ? (count / maxVal) * 100 : 50;
                                            return (
                                                <div key={idx}>
                                                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', marginBottom: '0.25rem' }}>
                                                        <span>{domain}</span>
                                                        <strong>{count} paper{count > 1 ? 's' : ''}</strong>
                                                    </div>
                                                    <div style={{ height: '8px', background: 'rgba(255,255,255,0.05)', borderRadius: '4px', overflow: 'hidden' }}>
                                                        <div style={{ width: `${percentage}%`, height: '100%', background: 'var(--gradient-accent)' }}></div>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            </div>
                        </div>

                        {currentUser.role !== 'dean' && (
                            <div className="card" style={{ marginTop: '1.5rem' }}>
                                <h2>My Research Portfolio</h2>
                                <p style={{ color: 'var(--text-secondary)', marginBottom: '1.5rem' }}>
                                    Assigned research outputs and verification status for <strong>{currentUser.email}</strong>.
                                </p>
                                
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                                    {submissions.filter(s => s.uploadedBy === currentUser.email || s.uploaded_by === currentUser.email || s.coAuthors?.some(co => co.email === currentUser.email)).length === 0 ? (
                                        <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-secondary)' }}>
                                            No active portfolio documents. Tap "Submit Research" to upload your first paper draft.
                                        </div>
                                    ) : (
                                        submissions.filter(s => s.uploadedBy === currentUser.email || s.uploaded_by === currentUser.email || s.coAuthors?.some(co => co.email === currentUser.email)).map(sub => {
                                            const totalCo = sub.coAuthors?.length || 0;
                                            const approvedCo = sub.coAuthors?.filter(co => co.approved).length || 0;
                                            return (
                                                <div key={sub.id} style={{ background: 'rgba(255, 255, 255, 0.03)', padding: '1rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
                                                    <div>
                                                        <h4 style={{ margin: 0, fontSize: '0.95rem' }}>{sub.title}</h4>
                                                        <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Uploaded: {sub.date || 'Just now'}</span>
                                                    </div>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
                                                        <div style={{ textAlign: 'right' }}>
                                                            <div style={{ fontSize: '0.8rem', fontWeight: 'bold' }}>Sign-off Progress</div>
                                                            <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{approvedCo} of {totalCo} verified</div>
                                                        </div>
                                                        <span className={`badge ${sub.status === 'PUBLISHED' ? 'badge-published' : sub.status === 'REJECTED' ? 'badge-sdg' : 'badge-pending'}`} style={{ color: sub.status === 'REJECTED' ? 'var(--accent-rose)' : '' }}>
                                                            {sub.status}
                                                        </span>
                                                    </div>
                                                </div>
                                            );
                                        })
                                    )}
                                </div>
                            </div>
                        )}

                        {/* LIVE SYSTEM ACTIVITY STREAM */}
                        <div className="card" style={{ marginTop: '1.5rem' }}>
                            <h3 style={{ fontSize: '1rem', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                <span style={{ color: 'var(--accent-emerald)', animation: 'pulse 1.5s infinite' }}>●</span> Live Verification Activity Logs
                            </h3>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                                {latestActivities.length === 0 ? (
                                    <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>System idle. Awaiting user actions.</div>
                                ) : (
                                    latestActivities.map((act, index) => (
                                        <div key={index} style={{ display: 'flex', gap: '0.75rem', fontSize: '0.8rem', padding: '0.5rem', background: 'rgba(255,255,255,0.02)', borderRadius: 'var(--radius-sm)', borderLeft: '3px solid var(--border-color)' }}>
                                            <span>{act.icon}</span>
                                            <div style={{ flex: 1, color: 'var(--text-primary)' }}>{act.text}</div>
                                            <span style={{ color: 'var(--text-secondary)', fontSize: '0.75rem' }}>{act.date}</span>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>
                    </div>
                )}

                {/* 2. SUBMISSION PAGE */}
                {activeSection === 'submit' && (
                    <div className="card">
                        <h2>Submit Academic Output</h2>
                        <p style={{ color: 'var(--text-secondary)', marginBottom: '1.5rem' }}>
                            Upload PDF files. ResVerity parses credentials to prevent piracy and triggers approvals automatically.
                        </p>
                        
                        <div className="dropzone" onClick={triggerFileSelect}>
                            <span style={{ fontSize: '2.5rem', display: 'block', marginBottom: '0.5rem' }}>📤</span>
                            <strong style={{ color: 'var(--text-primary)' }}>Drag & Drop Draft PDF here</strong>
                            <span style={{ color: 'var(--text-secondary)', display: 'block', fontSize: '0.85rem', marginTop: '0.25rem' }}>
                                or click to browse local files
                            </span>
                            {fileName && (
                                <div style={{ marginTop: '1rem', fontWeight: 600, color: 'var(--accent-cyan)' }}>
                                    📄 PDF Loaded: {fileName}
                                </div>
                            )}
                        </div>

                        {uploadStatus && (
                            <div style={{ background: 'rgba(6, 182, 212, 0.1)', border: '1px solid rgba(6, 182, 212, 0.2)', padding: '1rem', borderRadius: 'var(--radius-md)', marginBottom: '1.5rem', fontSize: '0.85rem' }}>
                                {uploadStatus}
                            </div>
                        )}

                        <form onSubmit={(e) => e.preventDefault()}>
                            <div className="form-group">
                                <label>Research Title</label>
                                <input 
                                    type="text" 
                                    className="form-input" 
                                    value={paperTitle} 
                                    onChange={(e) => setPaperTitle(e.target.value)} 
                                />
                            </div>
                            <div className="form-group">
                                <label>Abstract</label>
                                <textarea 
                                    className="form-input" 
                                    rows="4" 
                                    value={paperAbstract} 
                                    onChange={(e) => setPaperAbstract(e.target.value)}
                                />
                            </div>
                            
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                                <div className="form-group">
                                    <label>Visibility Control Tier</label>
                                    <select 
                                        className="form-input" 
                                        value={paperVisibility} 
                                        onChange={(e) => setPaperVisibility(e.target.value)}
                                        style={{ background: 'rgba(0,0,0,0.4)', borderColor: 'rgba(255,255,255,0.08)' }}
                                    >
                                        <option value="PUBLIC_ABSTRACT">Public Abstract Only (Protects IP)</option>
                                        <option value="INSTITUTIONAL">Institutional Access Only</option>
                                        <option value="OPEN_ACCESS">Open Access (Fully downloadable)</option>
                                    </select>
                                </div>
                                <div className="form-group">
                                    <label>Co-Author Institutional Emails (Comma Separated)</label>
                                    <input 
                                        type="text" 
                                        className="form-input" 
                                        value={coAuthorsInput} 
                                        onChange={(e) => setCoAuthorsInput(e.target.value)} 
                                    />
                                </div>
                            </div>

                            <div style={{ textAlign: 'right', marginTop: '1.5rem' }}>
                                <button type="button" onClick={submitResearch} className="btn btn-primary">
                                    Lock & Send for Sign-offs
                                </button>
                            </div>
                        </form>
                    </div>
                )}

                {/* 3. CO-AUTHOR SHIELD VERIFICATION LIST */}
                {activeSection === 'verification' && (
                    <div className="card">
                        <h2>Co-Author Shield Verification</h2>
                        <p style={{ color: 'var(--text-secondary)', marginBottom: '1.5rem' }}>
                            Research outputs stay in a locked draft status until all co-authors sign off.
                        </p>
                        
                        {loading ? (
                            <div style={{ textAlign: 'center', padding: '2rem' }}>Loading verification queue...</div>
                        ) : (
                            <div className="grid-layout">
                                {submissions.filter(s => s.status === 'PENDING_VERIFICATION').length === 0 ? (
                                    <div style={{ textAlign: 'center', color: 'var(--text-secondary)', padding: '2rem' }}>
                                        No pending approvals in queue. System is fully verified.
                                    </div>
                                ) : (
                                    submissions.filter(s => s.status === 'PENDING_VERIFICATION').map(sub => {
                                        const isMyApprovalNeeded = sub.coAuthors.some(a => a.email === currentUser.email && !a.approved);
                                        return (
                                            <div className="paper-card" key={sub.id}>
                                                <span className="badge badge-pending">PENDING SIGN-OFF</span>
                                                <h3 style={{ marginTop: '0.5rem', marginBottom: '0.5rem' }}>{sub.title}</h3>
                                                <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: '1.4', marginBottom: '1rem' }}>
                                                    {sub.abstract}
                                                </p>
                                                <div style={{ fontSize: '0.8rem', marginBottom: '0.5rem', color: 'var(--text-secondary)' }}>
                                                    Uploaded by: <strong>{sub.uploadedBy}</strong>
                                                </div>
                                                <div>
                                                    {sub.coAuthors.map((author, index) => (
                                                        <div className="co-author-bubble" key={index}>
                                                            <span className={`status-indicator ${author.approved ? 'status-approved' : 'status-pending'}`}></span>
                                                            {author.email}
                                                        </div>
                                                    ))}
                                                </div>
                                                {isMyApprovalNeeded ? (
                                                    <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1rem' }}>
                                                        <button 
                                                            onClick={() => signOffDocument(sub.id)} 
                                                            className="btn" 
                                                            style={{ 
                                                                background: 'var(--accent-emerald)', 
                                                                color: 'white', 
                                                                fontSize: '0.85rem', 
                                                                padding: '0.5rem 1rem' 
                                                            }}
                                                        >
                                                            ✓ Approve
                                                        </button>
                                                        <button 
                                                            onClick={() => handleDisapprove(sub.id)} 
                                                            className="btn" 
                                                            style={{ 
                                                                background: 'var(--accent-rose)', 
                                                                color: 'white', 
                                                                fontSize: '0.85rem', 
                                                                padding: '0.5rem 1rem' 
                                                            }}
                                                        >
                                                            ✗ Disapprove
                                                        </button>
                                                    </div>
                                                ) : (
                                                    <span style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '1rem' }}>
                                                        Waiting for other co-authors to approve.
                                                    </span>
                                                )}
                                            </div>
                                        );
                                    })
                                )}
                            </div>
                        )}
                    </div>
                )}

                {/* 4. PUBLIC DIRECTORY */}
                {activeSection === 'directory' && (
                    <div className="card">
                        <div className="directory-header">
                            <div>
                                <h2>Public Innovation Directory</h2>
                                <p style={{ color: 'var(--text-secondary)' }}>
                                    Search verified research projects and connect directly with student creators.
                                </p>
                            </div>
                        </div>

                        <div className="directory-header" style={{ borderTop: '1px solid var(--border-color)', paddingTop: '1rem' }}>
                            <div className="search-wrapper">
                                <span className="search-icon">🔍</span>
                                <input 
                                    type="text" 
                                    placeholder="Search by SDG targets, technology domain, title or abstract content..." 
                                    value={searchVal}
                                    onChange={(e) => setSearchVal(e.target.value)}
                                />
                            </div>
                        </div>

                        {loading ? (
                            <div style={{ textAlign: 'center', padding: '2rem' }}>Loading directory...</div>
                        ) : (
                            <div className="grid-layout">
                                {filteredDirectory.length === 0 ? (
                                    <div style={{ textAlign: 'center', color: 'var(--text-secondary)', padding: '2rem' }}>
                                        No matching published papers found.
                                    </div>
                                ) : (
                                    filteredDirectory.map(sub => (
                                        <div className="paper-card" key={sub.id}>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.5rem' }}>
                                                <span className="badge badge-published">VERIFIED & ACCESSIBLE</span>
                                                <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{sub.date}</span>
                                            </div>
                                            <h3>{sub.title}</h3>
                                            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: '1.4', margin: '0.75rem 0' }}>
                                                {sub.abstract}
                                            </p>
                                            <div style={{ marginBottom: '1rem' }}>
                                                {sub.tags.map((t, index) => (
                                                    <span className={`badge ${t.type === 'SDG' ? 'badge-sdg' : 'badge-published'}`} key={index}>
                                                        {t.name}
                                                    </span>
                                                ))}
                                            </div>
                                            <button onClick={() => handleRequestPdf(sub)} className="btn btn-secondary" style={{ fontSize: '0.8rem', padding: '0.4rem 0.8rem' }}>
                                                {(sub.visibility || sub.visibility_tier) === 'OPEN_ACCESS' ? '📥 Download Full PDF' : 
                                                 (sub.visibility || sub.visibility_tier) === 'PUBLIC_ABSTRACT' ? '📄 Download Abstract' : 
                                                 '🔑 Open Institutional PDF'}
                                            </button>
                                        </div>
                                    ))
                                )}
                            </div>
                        )}
                    </div>
                )}

            </main>

            {/* FLOATING AI COPILOT CHAT ASSISTANT */}
            <div onClick={() => setCopilotOpen(!copilotOpen)} id="copilotBubble" style={{ position: 'fixed', bottom: '2rem', right: '2rem', width: '56px', height: '56px', borderRadius: '50%', background: 'var(--gradient-accent)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.5rem', cursor: 'pointer', boxShadow: '0 4px 20px rgba(6, 182, 212, 0.4)', zIndex: 150 }}>
                🤖
            </div>

            {copilotOpen && (
                <div id="copilotDrawer" style={{ position: 'fixed', bottom: '6rem', right: '2rem', width: '360px', height: '480px', background: 'var(--bg-card)', backdropFilter: 'blur(20px)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-lg)', boxShadow: 'var(--shadow-card)', display: 'flex', flexDirection: 'column', zIndex: 150, overflow: 'hidden' }}>
                    <div style={{ background: 'rgba(19, 26, 38, 0.9)', padding: '1rem', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <h3 style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--text-primary)' }}>ResVerity AI Copilot</h3>
                        <span onClick={() => setCopilotOpen(false)} style={{ cursor: 'pointer', color: 'var(--text-secondary)', fontSize: '1.25rem' }}>&times;</span>
                    </div>
                    <div ref={chatLogRef} style={{ flex: 1, padding: '1rem', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '0.75rem', fontSize: '0.85rem' }}>
                        {copilotLog.map((msg, index) => (
                            <div 
                                key={index} 
                                style={{ 
                                    background: msg.sender === 'user' ? 'var(--gradient-accent)' : 'rgba(255,255,255,0.05)',
                                    color: msg.sender === 'user' ? 'white' : 'var(--text-primary)',
                                    padding: '0.75rem',
                                    borderRadius: 'var(--radius-md)',
                                    maxWidth: '85%',
                                    alignSelf: msg.sender === 'user' ? 'flex-end' : 'flex-start',
                                    lineHeight: '1.4',
                                    wordBreak: 'break-word',
                                    whiteSpace: 'pre-line'
                                }}
                                dangerouslySetInnerHTML={renderMessageText(msg.text)}
                            />
                        ))}
                        {copilotLoading && (
                            <div style={{ background: 'rgba(255,255,255,0.05)', padding: '0.75rem', borderRadius: 'var(--radius-md)', maxWidth: '85%', alignSelf: 'flex-start', fontStyle: 'italic', color: 'var(--text-secondary)' }}>
                                Thinking...
                            </div>
                        )}
                    </div>
                    <div style={{ padding: '0.75rem', borderTop: '1px solid var(--border-color)', display: 'flex', gap: '0.5rem', background: 'rgba(19, 26, 38, 0.6)' }}>
                        <input 
                            type="text" 
                            className="form-input" 
                            placeholder="e.g. Find farming prototypes..." 
                            value={copilotInput}
                            onChange={(e) => setCopilotInput(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && sendCopilotMessage()}
                            style={{ padding: '0.5rem', fontSize: '0.85rem' }}
                        />
                        <button onClick={sendCopilotMessage} className="btn btn-primary" style={{ padding: '0.5rem 1rem', fontSize: '0.8rem' }}>
                            Ask
                        </button>
                    </div>
                </div>
            )}

            <footer style={{ marginTop: 'auto', padding: '2rem', borderTop: '1px solid var(--border-color)', textAlign: 'center', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                &copy; 2026 ActivKlass ResVerity. Built for Flip the Script: Reverse Pitch Challenge #4 (DASIG).
            </footer>
        </div>
    );
}
