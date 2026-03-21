'use client'

import { useState, useEffect, useRef, FormEvent } from 'react'
import Link from 'next/link'

/* ── Animated counter hook ── */
function useCounter(end: number, duration = 2000, suffix = '', prefix = '') {
  const [val, setVal] = useState(0)
  const ref = useRef<HTMLDivElement>(null)
  const started = useRef(false)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    const obs = new IntersectionObserver(([e]) => {
      if (e.isIntersecting && !started.current) {
        started.current = true
        const start = performance.now()
        const tick = (now: number) => {
          const p = Math.min((now - start) / duration, 1)
          const eased = 1 - Math.pow(1 - p, 3)
          setVal(Math.round(eased * end))
          if (p < 1) requestAnimationFrame(tick)
        }
        requestAnimationFrame(tick)
      }
    }, { threshold: 0.3 })
    obs.observe(el)
    return () => obs.disconnect()
  }, [end, duration])

  return { ref, display: `${prefix}${val.toLocaleString('it-IT')}${suffix}` }
}

/* ── Scroll-reveal hook ── */
function useReveal(delay = 0) {
  const ref = useRef<HTMLDivElement>(null)
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    const obs = new IntersectionObserver(([e]) => {
      if (e.isIntersecting) {
        setTimeout(() => setVisible(true), delay)
        obs.disconnect()
      }
    }, { threshold: 0.15 })
    obs.observe(el)
    return () => obs.disconnect()
  }, [delay])

  return { ref, className: visible ? 'land-reveal land-visible' : 'land-reveal' }
}

/* ── Typed text effect ── */
function TypedText({ text, speed = 40 }: { text: string; speed?: number }) {
  const [shown, setShown] = useState('')
  const [done, setDone] = useState(false)
  useEffect(() => {
    let i = 0
    const iv = setInterval(() => {
      setShown(text.slice(0, ++i))
      if (i >= text.length) { clearInterval(iv); setDone(true) }
    }, speed)
    return () => clearInterval(iv)
  }, [text, speed])
  return <span>{shown}<span className={done ? 'land-cursor land-cursor-done' : 'land-cursor'}>|</span></span>
}

/* ── Floating particles ── */
function Particles() {
  return (
    <div className="land-particles" aria-hidden>
      {Array.from({ length: 20 }).map((_, i) => (
        <div key={i} className="land-particle" style={{
          left: `${Math.random() * 100}%`,
          animationDelay: `${Math.random() * 8}s`,
          animationDuration: `${6 + Math.random() * 8}s`,
          width: `${3 + Math.random() * 5}px`,
          height: `${3 + Math.random() * 5}px`,
          opacity: 0.15 + Math.random() * 0.25,
        }} />
      ))}
    </div>
  )
}

/* ── Feature Card with reveal ── */
function FeatureCard({ icon, title, desc, delay }: { icon: string; title: string; desc: string; delay: number }) {
  const rv = useReveal(delay)
  return (
    <div {...rv} className={`${rv.className} land-feature-card`}>
      <div className="land-feature-icon">{icon}</div>
      <h3>{title}</h3>
      <p>{desc}</p>
    </div>
  )
}

/* ── Main Landing Page ── */
export default function LandingPage() {
  const [menuOpen, setMenuOpen] = useState(false)
  const [formStatus, setFormStatus] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle')
  const [scrollY, setScrollY] = useState(0)

  useEffect(() => {
    const fn = () => setScrollY(window.scrollY)
    window.addEventListener('scroll', fn, { passive: true })
    return () => window.removeEventListener('scroll', fn)
  }, [])

  const stat1 = useCounter(85, 2000, '%')
  const stat2 = useCounter(10, 1800, 'x')
  const stat3 = useCounter(500, 2200, '+')
  const stat4 = useCounter(98, 2000, '%')

  const r1 = useReveal(0)
  const r2 = useReveal(100)
  const r3 = useReveal(200)
  const r4 = useReveal(0)
  const r5 = useReveal(100)
  const r6 = useReveal(200)
  const r7 = useReveal(300)
  const r8 = useReveal(0)
  const r9 = useReveal(150)
  const r10 = useReveal(300)
  const r11 = useReveal(0)
  const r12 = useReveal(0)
  const r13 = useReveal(100)
  const r14 = useReveal(200)
  const r15 = useReveal(300)

  async function handleContact(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setFormStatus('sending')
    const fd = new FormData(e.currentTarget)
    try {
      const r = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: fd.get('name'),
          email: fd.get('email'),
          company: fd.get('company'),
          message: fd.get('message'),
        }),
      })
      setFormStatus(r.ok ? 'sent' : 'error')
    } catch { setFormStatus('error') }
  }

  return (
    <div className="land-page">
      {/* ═══ NAVBAR ═══ */}
      <nav className="land-nav" style={{ background: scrollY > 60 ? 'rgba(245,241,234,.92)' : 'transparent', backdropFilter: scrollY > 60 ? 'blur(16px)' : 'none', borderBottom: scrollY > 60 ? '1px solid var(--border)' : '1px solid transparent' }}>
        <div className="land-container land-nav-inner">
          <a href="#top" className="land-logo">
            <span className="land-logo-icon">Z</span>
            <span>Catalogo <span style={{ color: 'var(--accent2)' }}>AI</span></span>
          </a>

          <div className={`land-nav-links ${menuOpen ? 'open' : ''}`}>
            <a href="#funzionalita" onClick={() => setMenuOpen(false)}>Funzionalit&agrave;</a>
            <a href="#come-funziona" onClick={() => setMenuOpen(false)}>Come funziona</a>
            <a href="#demo" onClick={() => setMenuOpen(false)}>Demo</a>
            <a href="#tecnologia" onClick={() => setMenuOpen(false)}>Tecnologia</a>
            <a href="#contatti" onClick={() => setMenuOpen(false)}>Contatti</a>
            <Link href="/login" className="btn btn-p land-nav-cta" onClick={() => setMenuOpen(false)}>
              Accedi
            </Link>
          </div>

          <button className="land-burger" onClick={() => setMenuOpen(!menuOpen)} aria-label="Menu">
            <span className={menuOpen ? 'open' : ''} />
          </button>
        </div>
      </nav>

      {/* ═══ HERO ═══ */}
      <section className="land-hero" id="top">
        <Particles />
        <div className="land-hero-gradient" />
        <div className="land-container land-hero-inner">
          <div className="land-hero-badge">
            <span className="land-pulse" />
            Nato da chi lavora nel settore moda
          </div>
          <h1 className="land-hero-title">
            Il tuo catalogo moda,<br />
            generato dall&rsquo;<span className="land-gradient-text">Intelligenza Artificiale</span>
          </h1>
          <p className="land-hero-sub">
            <TypedText text="Carica le foto dello shooting. L'AI cataloga tutto in automatico. Esporta e pubblica." speed={30} />
          </p>
          <div className="land-hero-actions">
            <a href="#contatti" className="btn btn-p land-btn-hero">Richiedi una demo</a>
            <a href="#come-funziona" className="btn btn-s land-btn-hero">Scopri come funziona</a>
          </div>

          {/* Hero visual - floating cards */}
          <div className="land-hero-visual">
            <div className="land-float-card land-fc1" style={{ transform: `translateY(${scrollY * -0.08}px)` }}>
              <div className="land-fc-icon">📸</div>
              <div className="land-fc-label">Upload foto</div>
              <div className="land-fc-bar"><div className="land-fc-fill" style={{ width: '100%' }} /></div>
            </div>
            <div className="land-float-card land-fc2" style={{ transform: `translateY(${scrollY * -0.12}px)` }}>
              <div className="land-fc-icon">🤖</div>
              <div className="land-fc-label">AI analizza...</div>
              <div className="land-fc-shimmer" />
            </div>
            <div className="land-float-card land-fc3" style={{ transform: `translateY(${scrollY * -0.05}px)` }}>
              <div className="land-fc-icon">✅</div>
              <div className="land-fc-label">Catalogato!</div>
              <div className="land-fc-tags">
                <span>Gonna midi</span>
                <span>Nero</span>
                <span>42</span>
              </div>
            </div>
          </div>
        </div>
        <div className="land-hero-scroll">
          <div className="land-scroll-arrow" />
        </div>
      </section>

      {/* ═══ STATS BAR ═══ */}
      <section className="land-stats">
        <div className="land-container land-stats-grid">
          <div className="land-stat" ref={stat1.ref}>
            <div className="land-stat-num">{stat1.display}</div>
            <div className="land-stat-label">Tempo risparmiato</div>
          </div>
          <div className="land-stat" ref={stat2.ref}>
            <div className="land-stat-num">{stat2.display}</div>
            <div className="land-stat-label">Pi&ugrave; veloce del manuale</div>
          </div>
          <div className="land-stat" ref={stat3.ref}>
            <div className="land-stat-num">{stat3.display}</div>
            <div className="land-stat-label">Prodotti catalogati</div>
          </div>
          <div className="land-stat" ref={stat4.ref}>
            <div className="land-stat-num">{stat4.display}</div>
            <div className="land-stat-label">Precisione AI</div>
          </div>
        </div>
      </section>

      {/* ═══ WHAT IS IT ═══ */}
      <section className="land-section" id="cosa">
        <div className="land-container">
          <div {...r1} style={{ textAlign: 'center', maxWidth: 700, margin: '0 auto' }}>
            <div className="land-section-badge">Il problema</div>
            <h2 className="land-section-title">
              Catalogare a mano &egrave; un <span className="land-line-through">incubo</span>
            </h2>
            <p className="land-section-sub">
              Lo sappiamo perch&eacute; <strong>ci siamo passati</strong>. Lavoriamo nel settore moda da anni.
              Dopo ogni shooting, ore e ore spese a rinominare file, compilare schede prodotto,
              scrivere descrizioni, associare SKU... Tempo sottratto alla creativit&agrave; e al business.
            </p>
          </div>

          <div className="land-problem-grid">
            <div {...r2} className={`${r2.className} land-problem-card`}>
              <div className="land-problem-icon">⏱️</div>
              <h3>Ore di lavoro manuale</h3>
              <p>Ogni sessione di shooting genera centinaia di foto da catalogare una per una. Giorni interi persi.</p>
              <div className="land-problem-stat">
                <div className="land-problem-bar"><div className="land-problem-fill" style={{ width: '90%', background: 'var(--err)' }} /></div>
                <span>90% tempo sprecato</span>
              </div>
            </div>
            <div {...r3} className={`${r3.className} land-problem-card`}>
              <div className="land-problem-icon">❌</div>
              <h3>Errori e inconsistenze</h3>
              <p>Descrizioni diverse per lo stesso prodotto, tag mancanti, SKU errati. La qualit&agrave; dei dati crolla.</p>
              <div className="land-problem-stat">
                <div className="land-problem-bar"><div className="land-problem-fill" style={{ width: '40%', background: 'var(--warn)' }} /></div>
                <span>40% errori tipici</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ═══ FEATURES ═══ */}
      <section className="land-section land-section-alt" id="funzionalita">
        <div className="land-container">
          <div {...r4} style={{ textAlign: 'center', maxWidth: 700, margin: '0 auto 60px' }}>
            <div className="land-section-badge">La soluzione</div>
            <h2 className="land-section-title">
              Tutto quello che serve,<br />niente di pi&ugrave;
            </h2>
            <p className="land-section-sub">
              Catalogo AI &egrave; progettato da chi lavora ogni giorno con shooting e cataloghi moda.
              Ogni funzionalit&agrave; risolve un problema reale.
            </p>
          </div>

          <div className="land-features-grid">
            <FeatureCard icon="📸" title="Upload drag & drop" desc="Trascina centinaia di foto. Supporto per tutti i formati, processing parallelo, anteprima istantanea." delay={0} />
            <FeatureCard icon="🧠" title="Catalogazione AI" desc="Claude AI analizza ogni foto: tipo prodotto, colore, tessuto, fit, descrizione SEO, tag automatici." delay={80} />
            <FeatureCard icon="👤" title="Riconoscimento modelle" desc="Carica la foto del viso della modella e l'AI la riconosce automaticamente in tutti gli scatti." delay={160} />
            <FeatureCard icon="📊" title="Integrazione Excel" desc="Arricchisci i dati con il tuo file Excel. SKU, prezzi, composizioni: tutto si integra automaticamente." delay={240} />
            <FeatureCard icon="📦" title="Export multi-formato" desc="Esporta in CSV, Excel o ZIP. Dati pronti per il tuo e-commerce, gestionale o catalogo stampa." delay={320} />
            <FeatureCard icon="👥" title="Team & ruoli" desc="Owner, admin, utenti. Gestisci il tuo team con permessi granulari e accesso controllato." delay={400} />
          </div>
        </div>
      </section>

      {/* ═══ HOW IT WORKS ═══ */}
      <section className="land-section" id="come-funziona">
        <div className="land-container">
          <div {...r8} style={{ textAlign: 'center', maxWidth: 700, margin: '0 auto 60px' }}>
            <div className="land-section-badge">3 step</div>
            <h2 className="land-section-title">Semplice come 1, 2, 3</h2>
            <p className="land-section-sub">
              Dalla foto al catalogo completo in pochi minuti. Nessuna formazione necessaria.
            </p>
          </div>

          <div className="land-steps">
            <div {...r9} className={`${r9.className} land-step`}>
              <div className="land-step-num">1</div>
              <div className="land-step-content">
                <h3>Configura la sessione</h3>
                <p>Seleziona brand, stagione, tipo di shooting. Aggiungi le modelle se necessario. 30 secondi.</p>
                <div className="land-step-visual">
                  <div className="land-mock-field"><span className="land-mock-label">Brand</span><span className="land-mock-val">Zuiki</span></div>
                  <div className="land-mock-field"><span className="land-mock-label">Stagione</span><span className="land-mock-val">P/E 2026</span></div>
                  <div className="land-mock-field"><span className="land-mock-label">Tipo</span><span className="land-mock-val">Modella</span></div>
                </div>
              </div>
            </div>

            <div className="land-step-connector"><div className="land-step-line" /></div>

            <div {...r10} className={`${r10.className} land-step`}>
              <div className="land-step-num">2</div>
              <div className="land-step-content">
                <h3>Carica le foto</h3>
                <p>Drag & drop di tutte le foto dello shooting. L&rsquo;AI inizia ad analizzare immediatamente.</p>
                <div className="land-step-visual">
                  <div className="land-mock-upload">
                    <div className="land-mock-drop-icon">☁️</div>
                    <div style={{ fontSize: 13, color: 'var(--muted)' }}>236 foto caricate</div>
                    <div className="land-mock-progress"><div className="land-mock-progress-fill" /></div>
                  </div>
                </div>
              </div>
            </div>

            <div className="land-step-connector"><div className="land-step-line" /></div>

            <div {...r11} className={`${r11.className} land-step`}>
              <div className="land-step-num">3</div>
              <div className="land-step-content">
                <h3>Esporta il catalogo</h3>
                <p>Rivedi, correggi se necessario, esporta. CSV, Excel, ZIP con foto rinominate. Fatto.</p>
                <div className="land-step-visual">
                  <div className="land-mock-export">
                    <div className="land-mock-export-row"><span>📄</span> catalogo_PE26.csv <span className="land-mock-ok">✓</span></div>
                    <div className="land-mock-export-row"><span>📊</span> catalogo_PE26.xlsx <span className="land-mock-ok">✓</span></div>
                    <div className="land-mock-export-row"><span>🗂️</span> foto_rinominate.zip <span className="land-mock-ok">✓</span></div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ═══ DEMO PRODUCT ═══ */}
      <section className="land-section land-section-alt" id="demo">
        <div className="land-container">
          <div {...r12} style={{ textAlign: 'center', maxWidth: 700, margin: '0 auto 60px' }}>
            <div className="land-section-badge">Demo live</div>
            <h2 className="land-section-title">Guarda l&rsquo;AI in azione</h2>
            <p className="land-section-sub">
              Ecco cosa genera Catalogo AI da una singola foto di prodotto.
            </p>
          </div>

          <div className="land-demo-container">
            <div className="land-demo-input">
              <div className="land-demo-photo">
                <div className="land-demo-placeholder">
                  <div style={{ fontSize: 48 }}>👗</div>
                  <div style={{ fontSize: 13, color: 'var(--muted)', marginTop: 8 }}>IMG_0847.jpg</div>
                </div>
              </div>
              <div className="land-demo-arrow">
                <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="var(--accent2)" strokeWidth="2">
                  <path d="M5 12h14M12 5l7 7-7 7" />
                </svg>
                <div style={{ fontSize: 11, color: 'var(--accent2)', fontWeight: 600 }}>AI</div>
              </div>
            </div>
            <div className="land-demo-output">
              <div className="land-demo-card">
                <div className="land-demo-header">
                  <span className="sku">ZK-GN-0847</span>
                  <span className="tag-t">Gonna</span>
                </div>
                <h4 style={{ margin: '12px 0 6px' }}>Gonna midi plissettata in raso</h4>
                <p style={{ fontSize: 13, color: 'var(--muted)', lineHeight: 1.6 }}>
                  Elegante gonna midi in tessuto raso con lavorazione pliss&eacute;. Chiusura con zip laterale invisibile.
                  Lunghezza al polpaccio, vestibilit&agrave; regolare. Perfetta per occasioni speciali e look da sera.
                </p>
                <div className="land-demo-meta">
                  <div className="land-demo-meta-row"><span className="land-demo-meta-label">Colore</span><span>Nero</span></div>
                  <div className="land-demo-meta-row"><span className="land-demo-meta-label">Tessuto</span><span>100% Poliestere</span></div>
                  <div className="land-demo-meta-row"><span className="land-demo-meta-label">Fit</span><span>Regular</span></div>
                  <div className="land-demo-meta-row"><span className="land-demo-meta-label">Taglia</span><span>42</span></div>
                  <div className="land-demo-meta-row"><span className="land-demo-meta-label">Modella</span><span>Sofia R. ✓</span></div>
                </div>
                <div className="land-demo-tags">
                  <span className="tag-t">gonna</span>
                  <span className="tag-t">midi</span>
                  <span className="tag-t">pliss&eacute;</span>
                  <span className="tag-t">raso</span>
                  <span className="tag-t">nero</span>
                  <span className="tag-t">elegante</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ═══ TECHNOLOGY ═══ */}
      <section className="land-section" id="tecnologia">
        <div className="land-container">
          <div {...r13} style={{ textAlign: 'center', maxWidth: 700, margin: '0 auto 60px' }}>
            <div className="land-section-badge">Tecnologia</div>
            <h2 className="land-section-title">
              Alimentato da AI<br />di ultima generazione
            </h2>
            <p className="land-section-sub">
              Utilizziamo Claude di Anthropic, uno dei modelli AI pi&ugrave; avanzati al mondo,
              addestrato con prompt specializzati per il settore moda.
            </p>
          </div>

          <div className="land-tech-grid">
            <div {...r14} className={`${r14.className} land-tech-card`}>
              <div className="land-tech-icon">
                <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="var(--accent2)" strokeWidth="1.5">
                  <circle cx="12" cy="12" r="10" />
                  <path d="M12 6v6l4 2" />
                </svg>
              </div>
              <h3>Analisi in tempo reale</h3>
              <p>Ogni foto viene analizzata in meno di 3 secondi. Processing parallelo per centinaia di immagini contemporaneamente.</p>
              <div className="land-tech-metric">
                <div className="land-tech-metric-bar"><div className="land-tech-metric-fill" style={{ width: '95%' }} /></div>
                <span>&lt; 3 sec / foto</span>
              </div>
            </div>
            <div {...r15} className={`${r15.className} land-tech-card`}>
              <div className="land-tech-icon">
                <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="var(--accent2)" strokeWidth="1.5">
                  <path d="M9.5 2A2.5 2.5 0 0 1 12 4.5v15a2.5 2.5 0 0 1-4.96.44 2.5 2.5 0 0 1-2.96-3.08 3 3 0 0 1-.34-5.58 2.5 2.5 0 0 1 1.32-4.24A2.5 2.5 0 0 1 9.5 2" />
                  <path d="M14.5 2A2.5 2.5 0 0 0 12 4.5v15a2.5 2.5 0 0 0 4.96.44 2.5 2.5 0 0 0 2.96-3.08 3 3 0 0 0 .34-5.58 2.5 2.5 0 0 0-1.32-4.24A2.5 2.5 0 0 0 14.5 2" />
                </svg>
              </div>
              <h3>Vision AI specializzata</h3>
              <p>Non un AI generica: prompt ingegnerizzati specificamente per il fashion. Riconosce tessuti, fit, dettagli stilistici.</p>
              <div className="land-tech-metric">
                <div className="land-tech-metric-bar"><div className="land-tech-metric-fill" style={{ width: '98%' }} /></div>
                <span>98% accuratezza</span>
              </div>
            </div>
          </div>

          <div className="land-tech-features">
            {[
              'Riconoscimento facciale modelle',
              'Rilevamento loghi e licenze',
              'Descrizioni SEO-optimized',
              'Supporto multi-brand',
              'Arricchimento da Excel',
              'Elaborazione batch',
            ].map((t, i) => (
              <div key={i} className="land-tech-pill">✦ {t}</div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══ WHO IS IT FOR ═══ */}
      <section className="land-section land-section-alt">
        <div className="land-container">
          <div style={{ textAlign: 'center', maxWidth: 700, margin: '0 auto 60px' }}>
            <div className="land-section-badge">Per chi &egrave;</div>
            <h2 className="land-section-title">Progettato per il settore moda</h2>
          </div>
          <div className="land-audience-grid">
            {[
              { icon: '🏢', title: 'Brand di moda', desc: 'Zuiki, Loveskin e brand che producono cataloghi stagionali con centinaia di referenze.' },
              { icon: '📷', title: 'Studi fotografici', desc: 'Studi che gestiscono shooting per conto di brand e devono consegnare cataloghi strutturati.' },
              { icon: '🛒', title: 'E-commerce manager', desc: 'Chi deve popolare rapidamente piattaforme e-commerce con dati di prodotto accurati.' },
              { icon: '📋', title: 'Uffici prodotto', desc: 'Team che gestiscono campionari, schede tecniche e archivi prodotto stagione dopo stagione.' },
            ].map((a, i) => (
              <div key={i} className="land-audience-card">
                <div className="land-audience-icon">{a.icon}</div>
                <h3>{a.title}</h3>
                <p>{a.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══ CONTACT FORM ═══ */}
      <section className="land-section" id="contatti">
        <div className="land-container">
          <div className="land-contact-wrapper">
            <div className="land-contact-info">
              <div className="land-section-badge">Contattaci</div>
              <h2 className="land-section-title" style={{ textAlign: 'left' }}>Pronto a rivoluzionare<br />il tuo workflow?</h2>
              <p style={{ color: 'var(--muted)', lineHeight: 1.7, marginBottom: 32 }}>
                Compila il form e ti ricontatteremo entro 24 ore per organizzare
                una demo personalizzata sulla tua realt&agrave;.
              </p>
              <div className="land-contact-benefits">
                <div className="land-contact-benefit">✓ Demo gratuita e personalizzata</div>
                <div className="land-contact-benefit">✓ Setup assistito incluso</div>
                <div className="land-contact-benefit">✓ Nessun vincolo contrattuale</div>
                <div className="land-contact-benefit">✓ Supporto dedicato in italiano</div>
              </div>
            </div>
            <div className="land-contact-form-wrapper">
              {formStatus === 'sent' ? (
                <div className="land-contact-success">
                  <div style={{ fontSize: 48, marginBottom: 16 }}>🎉</div>
                  <h3>Messaggio inviato!</h3>
                  <p>Ti ricontatteremo presto.</p>
                </div>
              ) : (
                <form onSubmit={handleContact} className="land-contact-form">
                  <div className="field">
                    <label>Nome e cognome</label>
                    <input name="name" className="inp" required placeholder="Mario Rossi" />
                  </div>
                  <div className="field">
                    <label>Email</label>
                    <input name="email" type="email" className="inp" required placeholder="mario@azienda.it" />
                  </div>
                  <div className="field">
                    <label>Azienda</label>
                    <input name="company" className="inp" placeholder="Nome azienda (opzionale)" />
                  </div>
                  <div className="field">
                    <label>Messaggio</label>
                    <textarea name="message" className="inp" rows={4} required placeholder="Raccontaci le tue esigenze..." />
                  </div>
                  <button type="submit" className="btn btn-p" style={{ width: '100%', padding: '14px', fontSize: 15 }} disabled={formStatus === 'sending'}>
                    {formStatus === 'sending' ? 'Invio in corso...' : 'Invia richiesta'}
                  </button>
                  {formStatus === 'error' && <p style={{ color: 'var(--err)', fontSize: 13, marginTop: 8 }}>Errore nell&rsquo;invio. Riprova.</p>}
                </form>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* ═══ FINAL CTA ═══ */}
      <section className="land-cta-section">
        <div className="land-container" style={{ textAlign: 'center' }}>
          <h2 className="land-cta-title">Inizia a catalogare con l&rsquo;AI oggi</h2>
          <p className="land-cta-sub">
            Unisciti ai professionisti della moda che hanno gi&agrave; rivoluzionato il loro workflow.
          </p>
          <div className="land-hero-actions" style={{ justifyContent: 'center' }}>
            <a href="#contatti" className="btn btn-p land-btn-hero">Richiedi una demo</a>
            <Link href="/login" className="btn btn-s land-btn-hero">Accedi al catalogo</Link>
          </div>
        </div>
      </section>

      {/* ═══ FOOTER ═══ */}
      <footer className="land-footer">
        <div className="land-container land-footer-inner">
          <div className="land-footer-brand">
            <span className="land-logo-icon" style={{ width: 32, height: 32, fontSize: 14 }}>Z</span>
            <span style={{ fontWeight: 600 }}>Catalogo <span style={{ color: 'var(--accent2)' }}>AI</span></span>
          </div>
          <div className="land-footer-links">
            <Link href="/login">Accedi</Link>
            <a href="#funzionalita">Funzionalit&agrave;</a>
            <a href="#contatti">Contatti</a>
          </div>
          <div className="land-footer-copy">
            &copy; {new Date().getFullYear()} Zuiki &mdash; Catalogo AI. Tutti i diritti riservati.
          </div>
        </div>
      </footer>
    </div>
  )
}
