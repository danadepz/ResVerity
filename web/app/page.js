'use client';

import { useState, useEffect, useRef } from 'react';

/* =====================================================================
   DATA LAYER
   ===================================================================== */

// Flatten a record so downstream code reads one consistent shape,
// whether it comes from Supabase (visibility_tier, uploaded_by, tag_name)
// or the local JSON store (visibility, uploadedBy, name).
function normalize(sub) {
    return {
        id: sub.id,
        title: sub.title || 'Untitled Research',
        abstract: sub.abstract || '',
        visibility: sub.visibility || sub.visibility_tier || 'PUBLIC_ABSTRACT',
        status: sub.status,
        uploadedBy: sub.uploadedBy || sub.uploaded_by || 'Anonymous Researcher',
        date: sub.date || (sub.created_at ? String(sub.created_at).split('T')[0] : ''),
        tags: (sub.tags || []).map(t => ({
            name: t.name || t.tag_name,
            type: t.type || t.tag_type,
        })).filter(t => t.name),
    };
}

/* =====================================================================
   HELPER COMPONENTS
   ===================================================================== */

// Animate a number from 0 to `target` using requestAnimationFrame + ease-out cubic.
function CountUp({ target, duration = 1600, suffix = '' }) {
    const [value, setValue] = useState(0);

    useEffect(() => {
        let raf;
        let start;
        const easeOutCubic = t => 1 - Math.pow(1 - t, 3);

        const step = now => {
            if (start === undefined) start = now;
            const progress = Math.min((now - start) / duration, 1);
            setValue(Math.round(easeOutCubic(progress) * target));
            if (progress < 1) raf = requestAnimationFrame(step);
        };

        raf = requestAnimationFrame(step);
        return () => cancelAnimationFrame(raf);
    }, [target, duration]);

    return <>{value}{suffix}</>;
}

// Escape HTML, then convert **bold** and newlines. Used to render copilot answers safely.
function renderMarkup(text) {
    const escaped = String(text)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');
    const formatted = escaped
        .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
        .replace(/\n/g, '<br/>');
    return { __html: formatted };
}

// Reusable directory card. Clicking opens the abstract modal via onOpen(paper).
function PaperCard({ paper, onOpen }) {
    return (
        <div className="paper-card landing-card" onClick={() => onOpen(paper)}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.5rem' }}>
                <span className="badge badge-published">VERIFIED</span>
                <span style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>{paper.date}</span>
            </div>
            <h3 style={{ fontSize: '1.05rem', marginBottom: '0.5rem' }}>{paper.title}</h3>
            <p className="abstract-clamp">{paper.abstract}</p>
            <div style={{ margin: '0.9rem 0 1rem' }}>
                {paper.tags.map((t, i) => (
                    <span className={`badge ${t.type === 'SDG' ? 'badge-sdg' : 'badge-published'}`} key={i}>
                        {t.name}
                    </span>
                ))}
            </div>
            <span className="read-abstract-link">Read Abstract →</span>
        </div>
    );
}

/* =====================================================================
   LANDING PAGE
   ===================================================================== */

export default function Landing() {
    const [papers, setPapers] = useState([]);
    const [loading, setLoading] = useState(true);

    // Directory search + active filter chip
    const [search, setSearch] = useState('');
    const [activeFilter, setActiveFilter] = useState('All');

    // Detail modal (the gating mechanism)
    const [selected, setSelected] = useState(null);

    // FAQ accordion
    const [openFaq, setOpenFaq] = useState(null);

    // AI copilot teaser
    const [copilotInput, setCopilotInput] = useState('');
    const [copilotAnswer, setCopilotAnswer] = useState('');
    const [copilotLoading, setCopilotLoading] = useState(false);

    // Header gets a solid background + shadow once the user scrolls.
    const [scrolled, setScrolled] = useState(false);
    useEffect(() => {
        const onScroll = () => setScrolled(window.scrollY > 24);
        onScroll();
        window.addEventListener('scroll', onScroll, { passive: true });
        return () => window.removeEventListener('scroll', onScroll);
    }, []);

    // Scroll-reveal: fade/slide sections in as they enter the viewport.
    // Re-runs when content changes so newly-rendered nodes get observed.
    useEffect(() => {
        if (typeof IntersectionObserver === 'undefined') return;
        const els = document.querySelectorAll('[data-reveal]:not(.is-visible)');
        const obs = new IntersectionObserver((entries) => {
            entries.forEach((e) => {
                if (e.isIntersecting) {
                    e.target.classList.add('is-visible');
                    obs.unobserve(e.target);
                }
            });
        }, { threshold: 0.12, rootMargin: '0px 0px -8% 0px' });
        els.forEach((el) => obs.observe(el));
        return () => obs.disconnect();
    }, [loading, papers.length]);

    // On mount: fetch published, public-facing papers only.
    useEffect(() => {
        (async () => {
            try {
                const res = await fetch('/api/submissions');
                if (res.ok) {
                    const data = await res.json();
                    const cleaned = data
                        .map(normalize)
                        .filter(s => s.status === 'PUBLISHED' && s.visibility !== 'INSTITUTIONAL');
                    setPapers(cleaned);
                }
            } catch (e) {
                console.error('Landing submissions load failed', e);
            } finally {
                setLoading(false);
            }
        })();
    }, []);

    // The single "go log in" action, reused everywhere.
    const goToPortal = () => { window.location.href = '/portal'; };

    // Smooth-scroll nav helper.
    const scrollTo = (id) => (e) => {
        e.preventDefault();
        document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
    };

    // Derived lists
    const featured = papers.slice(0, 2);
    const recent = [...papers]
        .sort((a, b) => (b.date || '').localeCompare(a.date || ''))
        .slice(0, 5);

    const filterOptions = ['All', ...Array.from(new Set(
        papers.flatMap(p => p.tags.map(t => t.name))
    ))];

    const sdgCount = new Set(
        papers.flatMap(p => p.tags.filter(t => t.type === 'SDG').map(t => t.name))
    ).size;

    const filtered = papers.filter(p => {
        const q = search.toLowerCase();
        const matchesSearch = !q ||
            p.title.toLowerCase().includes(q) ||
            p.abstract.toLowerCase().includes(q) ||
            p.tags.some(t => t.name.toLowerCase().includes(q));
        const matchesChip = activeFilter === 'All' || p.tags.some(t => t.name === activeFilter);
        return matchesSearch && matchesChip;
    });

    const askCopilot = async (question) => {
        const text = (question ?? copilotInput).trim();
        if (!text) return;
        setCopilotInput(text);
        setCopilotAnswer('');
        setCopilotLoading(true);
        try {
            const res = await fetch('/api/copilot', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ query: text }),
            });
            if (res.ok) {
                const data = await res.json();
                setCopilotAnswer(data.response || 'No response.');
            } else {
                setCopilotAnswer('The copilot is unavailable right now. Please try again.');
            }
        } catch (e) {
            setCopilotAnswer('Error connecting to the AI Copilot.');
        } finally {
            setCopilotLoading(false);
        }
    };

    const suggestions = [
        'Find farming prototypes',
        'Show research on SDG 11',
        'Retail supply chain projects',
    ];

    const faqs = [
        {
            q: 'Is the research free to browse?',
            a: 'Yes. Every verified abstract in the public directory is free to read. Full papers are available to authenticated students and faculty through the portal.',
        },
        {
            q: 'Why can I only see the abstract?',
            a: 'ResVerity protects student intellectual property. The public sees a verified abstract; the full research is unlocked after you log in with your institutional account.',
        },
        {
            q: 'How is a paper verified?',
            a: 'Each submission is cryptographically sealed (SHA-256 + ECDSA) and every co-author must sign off before it is published. That is what the VERIFIED badge means.',
        },
        {
            q: 'Who can publish here?',
            a: 'Students and faculty at participating higher-education institutions. Sign in through the portal to upload, tag, and route your work for co-author sign-off.',
        },
    ];

    return (
        <div className="landing">

            {/* ============================ HEADER ============================ */}
            <header className={scrolled ? 'scrolled' : ''}>
                <div className="header-container">
                    <div className="logo-group">
                        <div className="logo-icon">V</div>
                        <span className="logo-text">ResVerity</span>
                    </div>
                    <nav>
                        <ul>
                            <li><a onClick={scrollTo('directory')}>Directory</a></li>
                            <li><a onClick={scrollTo('verify')}>Verification</a></li>
                            <li><a onClick={scrollTo('faq')}>FAQ</a></li>
                        </ul>
                    </nav>
                    <button onClick={goToPortal} className="btn btn-primary" style={{ padding: '0.55rem 1.25rem' }}>
                        Sign In
                    </button>
                </div>
            </header>

            {/* ============================= HERO ============================= */}
            <section className="landing-hero">
                <div className="hero-aurora" aria-hidden="true">
                    <span className="aurora-blob aurora-1" />
                    <span className="aurora-blob aurora-2" />
                    <span className="aurora-grid" />
                </div>
                <div className="hero-grid">
                    <div className="hero-copy">
                        <span className="hero-eyebrow">🛡️ Verified Academic Research</span>
                        <h1 className="hero-title">
                            Where student research is <span className="hero-highlight">verified, protected, and discoverable.</span>
                        </h1>
                        <p className="hero-subtitle">
                            ResVerity is the anti-piracy repository for higher-education innovation. Browse verified
                            abstracts freely — unlock full papers with your institutional login.
                        </p>
                        <div className="hero-ctas">
                            <a onClick={scrollTo('directory')} className="btn btn-primary">Explore Research</a>
                            <button onClick={goToPortal} className="btn btn-secondary">Sign In to Portal</button>
                        </div>
                    </div>

                    <div className="hero-visual" aria-hidden="true">
                        <div className="hero-orb" />
                        <div className="float-card float-card-1">
                            <span className="badge badge-published">VERIFIED</span>
                            <strong>IoT Microclimate Monitor</strong>
                            <span>SHA-256 sealed · 2 co-authors signed</span>
                        </div>
                        <div className="float-card float-card-2">
                            <span className="badge badge-sdg">SDG 11</span>
                            <strong>Sustainable Cities</strong>
                            <span>Mapped to UN goals</span>
                        </div>
                        <div className="float-card float-card-3">
                            <span className="badge badge-published">VERIFIED</span>
                            <strong>Predictive Retail Analytics</strong>
                            <span>Co-author shield · published</span>
                        </div>
                    </div>
                </div>

                <div className="hero-stats">
                    <div className="hero-stat">
                        <div className="hero-stat-value"><CountUp target={papers.length} /></div>
                        <div className="hero-stat-label">Published Papers</div>
                    </div>
                    <div className="hero-stat">
                        <div className="hero-stat-value"><CountUp target={sdgCount} /></div>
                        <div className="hero-stat-label">SDGs Mapped</div>
                    </div>
                    <div className="hero-stat">
                        <div className="hero-stat-value"><CountUp target={100} suffix="%" /></div>
                        <div className="hero-stat-label">Verified &amp; Protected</div>
                    </div>
                </div>
            </section>

            {/* ======================= FEATURED RESEARCH ====================== */}
            {featured.length > 0 && (
                <section className="landing-section" data-reveal>
                    <h2 className="section-title">Featured Research</h2>
                    <p className="section-sub">Hand-picked verified work from the repository.</p>
                    <div className="featured-grid">
                        {featured.map(paper => (
                            <div className="featured-card" key={paper.id} onClick={() => setSelected(paper)}>
                                <div style={{ marginBottom: '0.75rem' }}>
                                    <span className="badge badge-published">VERIFIED</span>
                                    <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{paper.date}</span>
                                </div>
                                <h3 className="featured-title">{paper.title}</h3>
                                <p className="abstract-clamp">{paper.abstract}</p>
                                <div style={{ margin: '1rem 0' }}>
                                    {paper.tags.map((t, i) => (
                                        <span className={`badge ${t.type === 'SDG' ? 'badge-sdg' : 'badge-published'}`} key={i}>
                                            {t.name}
                                        </span>
                                    ))}
                                </div>
                                <span className="read-abstract-link">Read Abstract →</span>
                            </div>
                        ))}
                    </div>
                </section>
            )}

            {/* ======================= RECENT SUBMISSIONS ===================== */}
            {recent.length > 0 && (
                <section className="landing-section" data-reveal>
                    <h2 className="section-title">Recent Submissions</h2>
                    <p className="section-sub">The latest verified additions to the directory.</p>
                    <div className="recent-list">
                        {recent.map(paper => (
                            <div className="recent-item" key={paper.id} onClick={() => setSelected(paper)}>
                                <span className="badge badge-published">VERIFIED</span>
                                <div className="recent-body">
                                    <strong>{paper.title}</strong>
                                    <span className="recent-meta">
                                        {paper.uploadedBy}
                                        {paper.tags.length > 0 && <> · {paper.tags.map(t => t.name).join(' · ')}</>}
                                    </span>
                                </div>
                                <span className="recent-date">{paper.date}</span>
                            </div>
                        ))}
                    </div>
                </section>
            )}

            {/* ===================== VERIFICATION / TRUST ===================== */}
            <section id="verify" className="landing-section verify-section" data-reveal>
                <h2 className="section-title">How Verification Works</h2>
                <p className="section-sub">Anti-piracy by design — no paper goes public unverified.</p>

                <div className="verify-flow">
                    <div className="verify-step">
                        <div className="verify-num">1</div>
                        <strong>Upload</strong>
                        <span>A student submits a draft. It is hashed and locked immediately.</span>
                    </div>
                    <div className="verify-arrow">→</div>
                    <div className="verify-step">
                        <div className="verify-num">2</div>
                        <strong>Co-authors sign</strong>
                        <span>Every co-author cryptographically signs off before publication.</span>
                    </div>
                    <div className="verify-arrow">→</div>
                    <div className="verify-step">
                        <div className="verify-num">3</div>
                        <strong>Published</strong>
                        <span>Only fully-signed work appears in the public directory.</span>
                    </div>
                </div>

                <div className="verify-pills">
                    <span className="verify-pill">🔐 SHA-256 / ECDSA</span>
                    <span className="verify-pill">🌐 Public Abstract</span>
                    <span className="verify-pill">🏛️ Institutional Access</span>
                    <span className="verify-pill">📖 Open Access</span>
                </div>
            </section>

            {/* ======================= AI COPILOT TEASER ===================== */}
            <section className="landing-section" data-reveal>
                <div className="copilot-band">
                    <div className="copilot-head">
                        <span className="badge badge-sdg">AI COPILOT</span>
                        <h2 className="section-title" style={{ marginTop: '0.5rem' }}>Ask the research assistant</h2>
                        <p className="section-sub">Discover papers by topic, SDG, or technology — in plain language.</p>
                    </div>

                    <div className="copilot-input-row">
                        <input
                            className="form-input"
                            placeholder="e.g. What research helps local farmers?"
                            value={copilotInput}
                            onChange={e => setCopilotInput(e.target.value)}
                            onKeyDown={e => e.key === 'Enter' && askCopilot()}
                        />
                        <button onClick={() => askCopilot()} className="btn btn-primary" disabled={copilotLoading}>
                            Ask
                        </button>
                    </div>

                    <div className="copilot-suggestions">
                        {suggestions.map((s, i) => (
                            <button key={i} className="suggestion-chip" onClick={() => askCopilot(s)}>{s}</button>
                        ))}
                    </div>

                    {(copilotLoading || copilotAnswer) && (
                        <div className="copilot-answer">
                            {copilotLoading
                                ? <span className="copilot-thinking">Thinking…</span>
                                : <span dangerouslySetInnerHTML={renderMarkup(copilotAnswer)} />}
                        </div>
                    )}
                </div>
            </section>

            {/* ======================= PUBLIC DIRECTORY ====================== */}
            <section id="directory" className="landing-section" data-reveal>
                <h2 className="section-title">Public Directory</h2>
                <p className="section-sub">Search verified research. Log in to unlock full papers.</p>

                <div className="search-wrapper" style={{ marginBottom: '1.25rem' }}>
                    <span className="search-icon">🔍</span>
                    <input
                        type="text"
                        placeholder="Search by title, abstract, SDG, or technology…"
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                    />
                </div>

                <div className="filter-chips">
                    {filterOptions.map((opt, i) => (
                        <button
                            key={i}
                            className={`filter-chip ${activeFilter === opt ? 'active' : ''}`}
                            onClick={() => setActiveFilter(opt)}
                        >
                            {opt}
                        </button>
                    ))}
                </div>

                {loading ? (
                    <div className="directory-grid">
                        {Array.from({ length: 4 }).map((_, i) => (
                            <div className="skeleton-card" key={i}>
                                <div className="skeleton-line sk-badge" />
                                <div className="skeleton-line sk-title" />
                                <div className="skeleton-line sk-text" />
                                <div className="skeleton-line sk-text short" />
                                <div className="skeleton-line sk-tags" />
                            </div>
                        ))}
                    </div>
                ) : filtered.length === 0 ? (
                    <div className="empty-state">No matching published papers found.</div>
                ) : (
                    <div className="directory-grid">
                        {filtered.map(paper => (
                            <PaperCard key={paper.id} paper={paper} onOpen={setSelected} />
                        ))}
                    </div>
                )}
            </section>

            {/* ============================= FAQ ============================= */}
            <section id="faq" className="landing-section" data-reveal>
                <h2 className="section-title">Frequently Asked Questions</h2>
                <div className="faq-list">
                    {faqs.map((item, i) => (
                        <div className={`faq-item ${openFaq === i ? 'open' : ''}`} key={i}>
                            <button className="faq-q" onClick={() => setOpenFaq(openFaq === i ? null : i)}>
                                <span>{item.q}</span>
                                <span className="faq-toggle">{openFaq === i ? '−' : '+'}</span>
                            </button>
                            {openFaq === i && <div className="faq-a">{item.a}</div>}
                        </div>
                    ))}
                </div>
            </section>

            {/* ======================= CLOSING CTA BAND ====================== */}
            <section className="landing-section" data-reveal>
                <div className="cta-band">
                    <div className="cta-card" onClick={goToPortal}>
                        <h3>For Students &amp; Faculty</h3>
                        <p>Upload, protect, and publish your research with verified co-author sign-off.</p>
                        <span className="read-abstract-link">Enter the Portal →</span>
                    </div>
                    <div className="cta-card" onClick={goToPortal}>
                        <h3>For Institutions</h3>
                        <p>Govern research output, map to SDGs, and stop academic piracy at the source.</p>
                        <span className="read-abstract-link">Request Access →</span>
                    </div>
                </div>
            </section>

            <footer style={{ padding: '2rem', borderTop: '1px solid var(--border-color)', textAlign: 'center', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                &copy; 2026 ActivKlass ResVerity. Built for Flip the Script: Reverse Pitch Challenge #4 (DASIG).
            </footer>

            {/* ==================== DETAIL MODAL (GATING) ==================== */}
            {selected && (
                <div className="modal-overlay" onClick={() => setSelected(null)}>
                    <div className="modal-card" onClick={e => e.stopPropagation()}>
                        <button className="modal-close" onClick={() => setSelected(null)}>&times;</button>

                        <div style={{ marginBottom: '0.75rem' }}>
                            {selected.tags.map((t, i) => (
                                <span className={`badge ${t.type === 'SDG' ? 'badge-sdg' : 'badge-published'}`} key={i}>
                                    {t.name}
                                </span>
                            ))}
                        </div>

                        <h2 className="modal-title">{selected.title}</h2>
                        <div className="modal-author">By {selected.uploadedBy} · {selected.date}</div>

                        <h4 className="modal-label">Abstract</h4>
                        <p className="modal-abstract">{selected.abstract}</p>

                        <div className="modal-lock">
                            <div className="modal-lock-icon">🔒</div>
                            <strong>Full research is locked</strong>
                            <span>Log in to access the full research paper, data, and downloadable PDF.</span>
                            <button onClick={goToPortal} className="btn btn-primary" style={{ marginTop: '1rem' }}>
                                Log in to access
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
