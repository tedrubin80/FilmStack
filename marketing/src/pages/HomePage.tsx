import React from 'react';

const APP_URL = (import.meta.env.VITE_APP_URL as string | undefined)?.replace(/\/$/, '') || 'http://localhost:3000';

function AppLink({
  to,
  className,
  style,
  children,
}: {
  to: string;
  className?: string;
  style?: React.CSSProperties;
  children: React.ReactNode;
}) {
  const href = to.startsWith('http') || to.startsWith('#') ? to : `${APP_URL}${to.startsWith('/') ? to : `/${to}`}`;
  return (
    <a href={href} className={className} style={style}>
      {children}
    </a>
  );
}

const C = {
  bg:           'oklch(0.09 0 0)',
  bgPanel:      'oklch(0.115 0 0)',
  bgRaised:     'oklch(0.14 0 0)',
  ink:          'oklch(0.95 0.006 80)',
  inkMuted:     'oklch(0.70 0.008 80)',
  inkDim:       'oklch(0.68 0.007 80)',
  primary:      'oklch(0.72 0.165 68)',
  primaryHover: 'oklch(0.60 0.155 68)',
  accent:       'oklch(0.55 0.190 22)',
  border:       'oklch(0.20 0 0)',
  borderBright: 'oklch(0.30 0.004 80)',
};

const FESTIVAL_NAMES = [
  'Sundance', 'Tribeca', 'SXSW', 'TIFF', 'Cannes', 'Berlinale',
  'Venice', 'Telluride', 'AFI Fest', 'True/False', 'Fantasia',
  'Hot Docs', 'Sheffield DocFest', 'Rotterdam', 'BFI London',
  'NewFest', 'Palm Springs', 'SFFILM', 'Outfest', 'Seattle International',
];

const PLATFORM_STEPS = [
  {
    n: '01',
    title: 'SUBMIT',
    desc: 'Filmmakers upload screeners, complete metadata, and pay entry fees through your branded submission portal.',
  },
  {
    n: '02',
    title: 'REVIEW',
    desc: 'Programming staff watches, notes, and scores submissions with customizable rubrics and conflict-of-interest controls.',
  },
  {
    n: '03',
    title: 'CURATE',
    desc: 'Build your official selection, manage waitlists, and send acceptance or rejection communications automatically.',
  },
  {
    n: '04',
    title: 'SCHEDULE',
    desc: 'Block screenings, assign venues, build the program grid, and coordinate filmmaker travel and logistics.',
  },
  {
    n: '05',
    title: 'AWARD',
    desc: 'Issue awards, generate certificates, and announce winners live — inside FestScout, in front of your audience.',
  },
];

const ORGANIZER_FEATURES = [
  'Custom submission forms and deadlines by category',
  'Judging panels with conflict-of-interest controls',
  'Automated communications for acceptances, rejections, and schedules',
  'Entry fee collection, refunds, and financial reporting',
  'Award generation and digital certificate delivery',
  'Live screening rooms and filmmaker Q&As, no add-ons required',
];

const FILMMAKER_FEATURES = [
  'One profile, multiple festivals, no re-entering film details',
  'Real-time submission status across every festival',
  'Secure screener uploads with expiring access controls',
  'Direct messaging with festival programmers',
  'Join live Q&As after your screening, no extra software',
  'Downloadable award laurels when you win',
];

const PRICING_TIERS = [
  {
    name: 'FREE',
    price: '$0',
    period: 'forever',
    desc: 'For small festivals and first-time organizers.',
    features: ['Up to 100 submissions', 'Basic judging tools', 'Email communications', 'Community support'],
    cta: 'Get started',
    highlight: false,
  },
  {
    name: 'FESTIVAL',
    price: '$49',
    period: 'per month',
    desc: 'For established festivals running full programs.',
    features: [
      'Unlimited submissions',
      'Advanced judging with scoring rubrics',
      'Live screening rooms',
      'Filmmaker Q&As',
      'Entry fee processing',
      'Award generation',
      'Priority support',
    ],
    cta: 'Start free trial',
    highlight: true,
  },
  {
    name: 'CIRCUIT',
    price: 'Custom',
    period: 'per year',
    desc: 'For multi-city festivals and touring film circuits.',
    features: ['Multiple festivals, one account', 'Custom branding and domain', 'API access', 'Dedicated support', 'SLA guarantee'],
    cta: 'Talk to us',
    highlight: false,
  },
];

export const HomePage: React.FC = () => {
  return (
    <>
      <style>{`
        .fs-ticker-track {
          display: flex;
          width: max-content;
          animation: fs-ticker 50s linear infinite;
        }
        @keyframes fs-ticker {
          from { transform: translateX(0); }
          to   { transform: translateX(-50%); }
        }
        @media (prefers-reduced-motion: reduce) {
          .fs-ticker-track { animation: none; }
        }

        .fs-nav-link {
          color: ${C.inkDim};
          text-decoration: none;
          font-family: 'Barlow', system-ui, sans-serif;
          font-size: 0.9375rem;
          font-weight: 500;
          transition: color 0.15s;
        }
        .fs-nav-link:hover { color: ${C.ink}; }

        .fs-btn-primary {
          background: ${C.primary};
          color: oklch(0.97 0 0);
          text-decoration: none;
          font-family: 'Big Shoulders Display', sans-serif;
          font-weight: 700;
          font-size: 1rem;
          letter-spacing: 0.04em;
          padding: 0.75rem 1.625rem;
          display: inline-flex;
          align-items: center;
          gap: 0.375rem;
          transition: background 0.15s;
          cursor: pointer;
          border: none;
          white-space: nowrap;
        }
        .fs-btn-primary:hover { background: ${C.primaryHover}; }

        .fs-btn-ghost {
          color: ${C.inkMuted};
          text-decoration: none;
          font-family: 'Barlow', system-ui, sans-serif;
          font-weight: 500;
          font-size: 0.9375rem;
          padding: 0.75rem 1.625rem;
          border: 1px solid ${C.border};
          display: inline-flex;
          align-items: center;
          gap: 0.375rem;
          transition: border-color 0.15s, color 0.15s;
          cursor: pointer;
          background: transparent;
          white-space: nowrap;
        }
        .fs-btn-ghost:hover { border-color: ${C.borderBright}; color: ${C.ink}; }

        .fs-footer-link {
          font-family: 'Barlow', system-ui, sans-serif;
          font-size: 0.875rem;
          color: ${C.inkDim};
          text-decoration: none;
          transition: color 0.15s;
        }
        .fs-footer-link:hover { color: ${C.inkMuted}; }

        .fs-mock-row {
          display: flex;
          align-items: center;
          padding: 0.625rem 1.125rem;
          border-bottom: 1px solid ${C.border};
          gap: 0.75rem;
        }
        .fs-mock-row:last-child { border-bottom: none; }

        .fs-live-pulse {
          animation: fs-live-pulse 2.2s ease-in-out infinite;
        }
        @keyframes fs-live-pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.35; }
        }
        @media (prefers-reduced-motion: reduce) {
          .fs-live-pulse { animation: none; }
        }

        .fs-video-grid-main {
          grid-row: 1 / 3;
          background: oklch(0.155 0.006 65);
          border: 2px solid oklch(0.72 0.165 68 / 0.55);
          border-radius: 0.375rem;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          position: relative;
          overflow: hidden;
          padding: 1.5rem;
        }

        .fs-video-grid-side {
          background: ${C.bgRaised};
          border: 1px solid ${C.border};
          border-radius: 0.375rem;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 1rem;
        }

        @media (max-width: 900px) {
          .fs-platform-grid { grid-template-columns: 1fr !important; }
          .fs-platform-mock  { display: none !important; }
          .fs-audience-grid  { grid-template-columns: 1fr !important; }
          .fs-video-caps-grid { grid-template-columns: 1fr !important; }
          .fs-video-caps-grid > div { border-right: none !important; border-bottom: 1px solid ${C.border}; }
          .fs-video-caps-grid > div:last-child { border-bottom: none; }
          .fs-pricing-grid   { grid-template-columns: 1fr !important; }
          .fs-footer-cols    { grid-template-columns: 1fr 1fr !important; }
          .fs-footer-brand   { grid-column: 1 / -1; }
          .fs-nav-links      { display: none !important; }
        }

        @media (max-width: 600px) {
          .fs-hero-ctas { flex-direction: column; align-items: flex-start; }
          .fs-footer-cols { grid-template-columns: 1fr !important; }
        }
      `}</style>

      <div style={{ background: C.bg, color: C.ink, minHeight: '100vh', fontFamily: "'Barlow', system-ui, sans-serif" }}>

        {/* ── NAV ─────────────────────────────────────────────────────── */}
        <header style={{
          position: 'sticky',
          top: 0,
          zIndex: 50,
          background: 'oklch(0.09 0 0 / 0.92)',
          backdropFilter: 'blur(16px)',
          WebkitBackdropFilter: 'blur(16px)',
          borderBottom: `1px solid ${C.border}`,
        }}>
          <div style={{
            maxWidth: '1280px',
            margin: '0 auto',
            padding: '0 2rem',
            height: '3.75rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '2rem',
          }}>
            <AppLink to="/" style={{ textDecoration: 'none', flexShrink: 0 }}>
              <span style={{
                fontFamily: "'Big Shoulders Display', sans-serif",
                fontWeight: 900,
                fontSize: '1.375rem',
                letterSpacing: '0.06em',
                color: C.ink,
              }}>
                FEST<span style={{ color: C.primary }}>SCOUT</span>
              </span>
            </AppLink>

            <nav className="fs-nav-links" style={{ display: 'flex', alignItems: 'center', gap: '2rem' }}>
              <a href="#platform" className="fs-nav-link">Platform</a>
              <a href="#live" className="fs-nav-link">Live</a>
              <a href="#pricing" className="fs-nav-link">Pricing</a>
              <AppLink to="/login" className="fs-nav-link">Sign in</AppLink>
            </nav>

            <AppLink to="/register" className="fs-btn-primary" style={{ fontSize: '0.9375rem' }}>
              Run a Festival →
            </AppLink>
          </div>
        </header>

        {/* ── HERO ────────────────────────────────────────────────────── */}
        <section style={{
          minHeight: 'calc(78vh - 3.75rem)',
          display: 'flex',
          alignItems: 'center',
          position: 'relative',
          overflow: 'hidden',
          padding: 'clamp(3rem, 5vw, 4.5rem) 2rem',
        }}>
          {/* Projector beam: amber cone from upper-right */}
          <div aria-hidden style={{
            position: 'absolute',
            top: '-40%',
            right: '-10%',
            width: '65%',
            height: '140%',
            background: 'radial-gradient(ellipse 55% 75% at 80% 8%, oklch(0.72 0.165 68 / 0.09) 0%, transparent 55%)',
            pointerEvents: 'none',
          }} />
          {/* Faint floor line */}
          <div aria-hidden style={{
            position: 'absolute',
            bottom: '18%',
            left: 0,
            right: 0,
            height: '1px',
            background: `linear-gradient(to right, transparent 0%, ${C.border} 20%, ${C.border} 80%, transparent 100%)`,
            pointerEvents: 'none',
          }} />

          <div style={{ maxWidth: '1280px', margin: '0 auto', width: '100%', position: 'relative', zIndex: 1 }}>
            <div style={{ maxWidth: '860px' }}>
              <h1 style={{
                fontFamily: "'Big Shoulders Display', sans-serif",
                fontWeight: 900,
                fontSize: 'clamp(3.5rem, 9vw, 6rem)',
                lineHeight: 0.93,
                letterSpacing: '-0.01em',
                color: C.ink,
                marginBottom: '2rem',
                textWrap: 'balance',
              }}>
                YOUR FESTIVAL.{' '}
                <span style={{ color: C.primary }}>NO LIMITS.</span>
              </h1>

              <p style={{
                fontSize: 'clamp(1rem, 1.8vw, 1.1875rem)',
                color: C.inkMuted,
                maxWidth: '520px',
                lineHeight: 1.75,
                marginBottom: '2.75rem',
              }}>
                Submissions, judging, payments, and awards. Plus live screening rooms and filmmaker Q&amp;As built directly into the platform. Every festival format, one tool.
              </p>

              <div className="fs-hero-ctas" style={{ display: 'flex', gap: '1rem', alignItems: 'center', flexWrap: 'wrap' }}>
                <AppLink to="/register" className="fs-btn-primary" style={{ fontSize: '1.0625rem', padding: '0.9375rem 2rem' }}>
                  Run a Festival →
                </AppLink>
                <AppLink to="/login" className="fs-btn-ghost" style={{ padding: '0.9375rem 2rem' }}>
                  Sign in
                </AppLink>
              </div>
            </div>
          </div>
        </section>

        {/* ── TICKER ──────────────────────────────────────────────────── */}
        <div style={{
          borderTop: `1px solid ${C.border}`,
          borderBottom: `1px solid ${C.border}`,
          background: C.bgPanel,
          overflow: 'hidden',
          padding: '0.9rem 0',
          userSelect: 'none',
        }}>
          <div className="fs-ticker-track">
            {[...FESTIVAL_NAMES, ...FESTIVAL_NAMES].map((name, i) => (
              <span key={i} style={{
                whiteSpace: 'nowrap',
                fontFamily: "'Barlow', system-ui, sans-serif",
                fontWeight: 500,
                fontSize: '0.8125rem',
                color: C.inkDim,
                letterSpacing: '0.14em',
                textTransform: 'uppercase',
                display: 'inline-flex',
                alignItems: 'center',
                padding: '0 2.25rem',
                gap: '2.25rem',
              }}>
                {name}
                <span style={{ color: C.primary, fontSize: '0.4375rem', lineHeight: 1 }}>◆</span>
              </span>
            ))}
          </div>
        </div>

        {/* ── PLATFORM ────────────────────────────────────────────────── */}
        <section id="platform" style={{ padding: 'clamp(5rem, 10vw, 8rem) 2rem' }}>
          <div style={{ maxWidth: '1280px', margin: '0 auto' }}>

            <div style={{ marginBottom: '2.5rem', maxWidth: '600px' }}>
              <h2 style={{
                fontFamily: "'Big Shoulders Display', sans-serif",
                fontWeight: 800,
                fontSize: 'clamp(2.25rem, 5vw, 3.75rem)',
                lineHeight: 0.97,
                color: C.ink,
                letterSpacing: '-0.01em',
                marginBottom: '1.25rem',
              }}>
                From submission<br />to screen.
              </h2>
              <p style={{ fontSize: '1.0625rem', color: C.inkMuted, lineHeight: 1.75, maxWidth: '460px' }}>
                FestScout handles the full lifecycle. A filmmaker submits; a festival director reviews, schedules, and screens their film, without switching tools.
              </p>
            </div>

            <div className="fs-platform-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '5rem', alignItems: 'start' }}>

              {/* Steps */}
              <div>
                {PLATFORM_STEPS.map((step, i) => (
                  <div key={step.n}>
                    <div style={{ display: 'flex', gap: '1.375rem', alignItems: 'flex-start' }}>
                      <span style={{
                        fontFamily: "'Big Shoulders Display', sans-serif",
                        fontWeight: 700,
                        fontSize: '0.8125rem',
                        color: C.primary,
                        letterSpacing: '0.04em',
                        paddingTop: '0.25rem',
                        flexShrink: 0,
                        width: '1.75rem',
                      }}>
                        {step.n}
                      </span>
                      <div>
                        <h3 style={{
                          fontFamily: "'Big Shoulders Display', sans-serif",
                          fontWeight: 800,
                          fontSize: '1.25rem',
                          letterSpacing: '0.06em',
                          color: C.ink,
                          marginBottom: '0.375rem',
                        }}>
                          {step.title}
                        </h3>
                        <p style={{ fontSize: '0.9375rem', color: C.inkMuted, lineHeight: 1.7 }}>
                          {step.desc}
                        </p>
                      </div>
                    </div>
                    {i < PLATFORM_STEPS.length - 1 && (
                      <div style={{
                        width: '1px',
                        height: '2.25rem',
                        background: C.border,
                        margin: '0.875rem 0 0.875rem calc(1.75rem + 1.375rem + 0.625rem)',
                      }} />
                    )}
                  </div>
                ))}
              </div>

              {/* App mockup */}
              <div className="fs-platform-mock" style={{
                position: 'sticky',
                top: '5rem',
                background: C.bgRaised,
                border: `1px solid ${C.border}`,
                borderRadius: '0.5rem',
                overflow: 'hidden',
              }}>
                {/* Window chrome */}
                <div style={{
                  background: C.bgPanel,
                  borderBottom: `1px solid ${C.border}`,
                  padding: '0.6875rem 1rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.4375rem',
                }}>
                  {[C.border, C.border, C.border].map((_, i) => (
                    <div key={i} style={{ width: '0.5625rem', height: '0.5625rem', borderRadius: '50%', background: C.bgRaised, border: `1px solid ${C.border}` }} />
                  ))}
                  <span style={{ marginLeft: '0.625rem', fontSize: '0.6875rem', color: C.inkDim, fontFamily: "'Barlow', sans-serif", letterSpacing: '0.02em' }}>
                    festscout.online/submissions
                  </span>
                </div>

                {/* Table header */}
                <div style={{
                  padding: '0.875rem 1.125rem',
                  borderBottom: `1px solid ${C.border}`,
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                }}>
                  <span style={{
                    fontFamily: "'Big Shoulders Display', sans-serif",
                    fontWeight: 700,
                    fontSize: '0.875rem',
                    letterSpacing: '0.06em',
                    color: C.ink,
                  }}>
                    SUBMISSIONS
                  </span>
                  <span style={{
                    background: C.primary,
                    color: 'oklch(0.97 0 0)',
                    fontFamily: "'Barlow', sans-serif",
                    fontWeight: 600,
                    fontSize: '0.6875rem',
                    padding: '0.1875rem 0.5625rem',
                    letterSpacing: '0.05em',
                  }}>
                    247 FILMS
                  </span>
                </div>

                {/* Filter tabs */}
                <div style={{
                  padding: '0.625rem 1.125rem',
                  borderBottom: `1px solid ${C.border}`,
                  display: 'flex',
                  gap: '0.5rem',
                  flexWrap: 'wrap',
                }}>
                  {['All', 'Reviewing', 'Shortlisted', 'Accepted'].map((label, i) => (
                    <span key={label} style={{
                      fontSize: '0.6875rem',
                      fontFamily: "'Barlow', sans-serif",
                      fontWeight: 600,
                      padding: '0.1875rem 0.625rem',
                      letterSpacing: '0.05em',
                      background: i === 2 ? C.primary : 'transparent',
                      color: i === 2 ? 'oklch(0.97 0 0)' : C.inkDim,
                      border: i !== 2 ? `1px solid ${C.border}` : 'none',
                    }}>
                      {label}
                    </span>
                  ))}
                </div>

                {/* Rows */}
                {[
                  { title: 'Parallax',     dir: 'J. Morales',  status: 'Shortlisted', dot: C.primary },
                  { title: 'Meridian',     dir: 'A. Osei',     status: 'Reviewing',   dot: 'oklch(0.58 0.16 235)' },
                  { title: 'Salt Flats',   dir: 'T. Chen',     status: 'Accepted',    dot: C.primary },
                  { title: 'Before Glass', dir: 'M. Patel',    status: 'Reviewing',   dot: 'oklch(0.58 0.16 235)' },
                  { title: 'Underglass',   dir: 'F. Dubois',   status: 'Shortlisted', dot: C.primary },
                  { title: 'The Hollow',   dir: 'R. Nakamura', status: 'Reviewing',   dot: 'oklch(0.58 0.16 235)' },
                ].map((row) => (
                  <div key={row.title} className="fs-mock-row">
                    <div style={{ width: '0.375rem', height: '0.375rem', borderRadius: '50%', background: row.dot, flexShrink: 0 }} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontFamily: "'Barlow', sans-serif", fontWeight: 600, fontSize: '0.8125rem', color: C.ink, marginBottom: '0.0625rem' }}>
                        {row.title}
                      </div>
                      <div style={{ fontFamily: "'Barlow', sans-serif", fontSize: '0.6875rem', color: C.inkDim }}>
                        Dir. {row.dir}
                      </div>
                    </div>
                    <span style={{
                      fontSize: '0.625rem',
                      fontFamily: "'Barlow', sans-serif",
                      fontWeight: 600,
                      letterSpacing: '0.08em',
                      textTransform: 'uppercase',
                      color: row.status === 'Accepted' ? C.primary : row.status === 'Shortlisted' ? C.ink : C.inkDim,
                    }}>
                      {row.status}
                    </span>
                  </div>
                ))}

                {/* Pagination */}
                <div style={{
                  padding: '0.75rem 1.125rem',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                }}>
                  <span style={{ fontSize: '0.6875rem', color: C.inkDim, fontFamily: "'Barlow', sans-serif" }}>
                    1–6 of 247
                  </span>
                  <div style={{ display: 'flex', gap: '0.3125rem' }}>
                    {[1, 2, 3].map((n) => (
                      <div key={n} style={{
                        width: '1.375rem',
                        height: '1.375rem',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '0.6875rem',
                        fontFamily: "'Barlow', sans-serif",
                        fontWeight: 600,
                        background: n === 1 ? C.primary : 'transparent',
                        color: n === 1 ? 'oklch(0.97 0 0)' : C.inkDim,
                        border: n !== 1 ? `1px solid ${C.border}` : 'none',
                      }}>
                        {n}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ── LIVE / VIDEO ─────────────────────────────────────────────── */}
        <section id="live" style={{
          background: C.bgPanel,
          borderTop: `1px solid ${C.border}`,
          borderBottom: `1px solid ${C.border}`,
          padding: 'clamp(3rem, 5vw, 4.5rem) 2rem',
          position: 'relative',
          overflow: 'hidden',
        }}>
          {/* Amber floor glow */}
          <div aria-hidden style={{
            position: 'absolute',
            bottom: '-30%',
            left: '50%',
            transform: 'translateX(-50%)',
            width: '80%',
            height: '80%',
            background: 'radial-gradient(ellipse 60% 40% at 50% 100%, oklch(0.72 0.165 68 / 0.055) 0%, transparent 65%)',
            pointerEvents: 'none',
          }} />

          <div style={{ maxWidth: '1280px', margin: '0 auto', position: 'relative', zIndex: 1 }}>

            {/* Section header */}
            <div style={{ textAlign: 'center', marginBottom: '4rem' }}>
              <div style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.625rem',
                marginBottom: '1.625rem',
              }}>
                <div className="fs-live-pulse" style={{
                  width: '0.5rem',
                  height: '0.5rem',
                  borderRadius: '50%',
                  background: C.accent,
                  flexShrink: 0,
                }} />
                <span style={{
                  fontFamily: "'Barlow', system-ui, sans-serif",
                  fontWeight: 600,
                  fontSize: '0.75rem',
                  color: C.accent,
                  letterSpacing: '0.16em',
                  textTransform: 'uppercase',
                }}>
                  Live inside the platform
                </span>
              </div>

              <h2 style={{
                fontFamily: "'Big Shoulders Display', sans-serif",
                fontWeight: 900,
                fontSize: 'clamp(2.5rem, 6.5vw, 4.75rem)',
                lineHeight: 0.93,
                letterSpacing: '-0.01em',
                color: C.ink,
                marginBottom: '1.5rem',
              }}>
                THE PART<br />NO ONE ELSE HAS.
              </h2>
              <p style={{
                fontSize: '1.0625rem',
                color: C.inkMuted,
                maxWidth: '500px',
                margin: '0 auto',
                lineHeight: 1.75,
              }}>
                Screening rooms, filmmaker Q&amp;As, and panel discussions are built into FestScout. Run a complete virtual or hybrid festival without stitching tools together.
              </p>
            </div>

            {/* Video call composition */}
            <div style={{ maxWidth: '840px', margin: '0 auto 2.75rem' }}>
              <div style={{
                display: 'grid',
                gridTemplateColumns: '2fr 1fr',
                gridTemplateRows: '1fr 1fr',
                gap: '0.5rem',
                aspectRatio: '16 / 9',
              }}>
                {/* Main speaker */}
                <div className="fs-video-grid-main">
                  <div style={{ width: '3.5rem', height: '3.5rem', borderRadius: '50%', background: 'oklch(0.28 0.012 65)', marginBottom: '0.75rem' }} />
                  <span style={{ fontFamily: "'Barlow', sans-serif", fontSize: '0.9rem', fontWeight: 600, color: C.ink, marginBottom: '0.25rem' }}>
                    Maria Chen
                  </span>
                  <span style={{ fontFamily: "'Barlow', sans-serif", fontSize: '0.75rem', color: C.inkMuted }}>
                    Director, Salt Flats
                  </span>
                  {/* Live badge */}
                  <div style={{
                    position: 'absolute',
                    bottom: '0.75rem',
                    left: '0.75rem',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.375rem',
                    background: 'oklch(0.09 0 0 / 0.8)',
                    padding: '0.25rem 0.5rem',
                  }}>
                    <div className="fs-live-pulse" style={{ width: '0.375rem', height: '0.375rem', borderRadius: '50%', background: C.accent }} />
                    <span style={{ fontSize: '0.625rem', fontFamily: "'Big Shoulders Display', sans-serif", fontWeight: 700, color: C.ink, letterSpacing: '0.1em' }}>
                      LIVE Q&A
                    </span>
                  </div>
                  {/* Speaking ring */}
                  <div aria-hidden style={{
                    position: 'absolute',
                    inset: '-2px',
                    border: '2px solid oklch(0.72 0.165 68 / 0.5)',
                    borderRadius: '0.375rem',
                    pointerEvents: 'none',
                  }} />
                </div>

                {/* Side participants */}
                {[
                  { name: 'James Lee',  role: 'Programmer' },
                  { name: 'Ana Ruiz',   role: 'Audience' },
                ].map((p) => (
                  <div key={p.name} className="fs-video-grid-side">
                    <div style={{ width: '2.25rem', height: '2.25rem', borderRadius: '50%', background: C.border, marginBottom: '0.5rem' }} />
                    <span style={{ fontFamily: "'Barlow', sans-serif", fontSize: '0.75rem', fontWeight: 600, color: C.ink }}>
                      {p.name}
                    </span>
                    <span style={{ fontFamily: "'Barlow', sans-serif", fontSize: '0.6875rem', color: C.inkDim }}>
                      {p.role}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Three capabilities */}
            <div className="fs-video-caps-grid" style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr 1fr',
              borderTop: `1px solid ${C.border}`,
            }}>
              {[
                {
                  title: 'Screening rooms',
                  desc: 'Host official selections, retrospectives, and shorts programs. Films play in sync — no Vimeo links, no third-party embeds.',
                },
                {
                  title: 'Filmmaker Q&As',
                  desc: 'Live video sessions attached to specific screenings. Directors answer audience questions directly after the film ends.',
                },
                {
                  title: 'Panel discussions',
                  desc: 'Multi-speaker rooms for juries, workshops, and industry events. Record, replay, and share — all inside FestScout.',
                },
              ].map((cap, i) => (
                <div key={cap.title} style={{
                  padding: '2.5rem',
                  borderRight: i < 2 ? `1px solid ${C.border}` : 'none',
                }}>
                  <h3 style={{
                    fontFamily: "'Big Shoulders Display', sans-serif",
                    fontWeight: 800,
                    fontSize: '1.1875rem',
                    letterSpacing: '0.04em',
                    color: C.ink,
                    marginBottom: '0.75rem',
                  }}>
                    {cap.title}
                  </h3>
                  <p style={{ fontSize: '0.9375rem', color: C.inkMuted, lineHeight: 1.7 }}>
                    {cap.desc}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── DUAL AUDIENCE ────────────────────────────────────────────── */}
        <section style={{ padding: 'clamp(5rem, 10vw, 8rem) 2rem' }}>
          <div style={{ maxWidth: '1280px', margin: '0 auto' }}>

            <div style={{ marginBottom: '2.25rem' }}>
              <h2 style={{
                fontFamily: "'Big Shoulders Display', sans-serif",
                fontWeight: 800,
                fontSize: 'clamp(2.25rem, 5vw, 3.75rem)',
                lineHeight: 0.97,
                color: C.ink,
                letterSpacing: '-0.01em',
              }}>
                Built for everyone<br />in the room.
              </h2>
            </div>

            <div className="fs-audience-grid" style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: '1px',
              background: C.border,
            }}>
              {/* Festival directors */}
              <div style={{ background: C.bg, padding: '2rem' }}>
                <div style={{
                  fontFamily: "'Barlow', sans-serif",
                  fontWeight: 600,
                  fontSize: '0.6875rem',
                  color: C.primary,
                  letterSpacing: '0.18em',
                  textTransform: 'uppercase',
                  marginBottom: '1.5rem',
                }}>
                  Festival directors
                </div>
                <h3 style={{
                  fontFamily: "'Big Shoulders Display', sans-serif",
                  fontWeight: 800,
                  fontSize: 'clamp(1.5rem, 2.5vw, 1.875rem)',
                  color: C.ink,
                  letterSpacing: '0.03em',
                  lineHeight: 1.05,
                  marginBottom: '2.25rem',
                }}>
                  RUN A TIGHTER<br />FESTIVAL.
                </h3>
                <ul style={{ listStyle: 'none', padding: 0, display: 'flex', flexDirection: 'column', gap: '1rem', marginBottom: '2.75rem' }}>
                  {ORGANIZER_FEATURES.map((item) => (
                    <li key={item} style={{ display: 'flex', gap: '0.875rem', alignItems: 'flex-start' }}>
                      <span style={{ color: C.primary, lineHeight: 1.75, flexShrink: 0, fontWeight: 700 }}>—</span>
                      <span style={{ fontSize: '0.9375rem', color: C.inkMuted, lineHeight: 1.75 }}>{item}</span>
                    </li>
                  ))}
                </ul>
                <AppLink to="/register" className="fs-btn-primary">
                  Start for free →
                </AppLink>
              </div>

              {/* Filmmakers */}
              <div style={{ background: C.bgPanel, padding: '2rem' }}>
                <div style={{
                  fontFamily: "'Barlow', sans-serif",
                  fontWeight: 600,
                  fontSize: '0.6875rem',
                  color: C.inkDim,
                  letterSpacing: '0.18em',
                  textTransform: 'uppercase',
                  marginBottom: '1.5rem',
                }}>
                  Filmmakers
                </div>
                <h3 style={{
                  fontFamily: "'Big Shoulders Display', sans-serif",
                  fontWeight: 800,
                  fontSize: 'clamp(1.5rem, 2.5vw, 1.875rem)',
                  color: C.ink,
                  letterSpacing: '0.03em',
                  lineHeight: 1.05,
                  marginBottom: '2.25rem',
                }}>
                  SUBMIT ONCE.<br />TRACK EVERYTHING.
                </h3>
                <ul style={{ listStyle: 'none', padding: 0, display: 'flex', flexDirection: 'column', gap: '1rem', marginBottom: '2.75rem' }}>
                  {FILMMAKER_FEATURES.map((item) => (
                    <li key={item} style={{ display: 'flex', gap: '0.875rem', alignItems: 'flex-start' }}>
                      <span style={{ color: C.inkDim, lineHeight: 1.75, flexShrink: 0, fontWeight: 700 }}>—</span>
                      <span style={{ fontSize: '0.9375rem', color: C.inkMuted, lineHeight: 1.75 }}>{item}</span>
                    </li>
                  ))}
                </ul>
                <AppLink to="/register" className="fs-btn-ghost">
                  Create filmmaker account →
                </AppLink>
              </div>
            </div>
          </div>
        </section>

        {/* ── PRICING ──────────────────────────────────────────────────── */}
        <section id="pricing" style={{
          background: C.bgPanel,
          borderTop: `1px solid ${C.border}`,
          padding: 'clamp(3rem, 5vw, 4.5rem) 2rem',
        }}>
          <div style={{ maxWidth: '1280px', margin: '0 auto' }}>

            <div style={{ marginBottom: '4rem' }}>
              <h2 style={{
                fontFamily: "'Big Shoulders Display', sans-serif",
                fontWeight: 800,
                fontSize: 'clamp(2.25rem, 5vw, 3.75rem)',
                color: C.ink,
                letterSpacing: '-0.01em',
                lineHeight: 0.97,
                marginBottom: '1rem',
              }}>
                Start free.<br />Scale when you do.
              </h2>
              <p style={{ fontSize: '1.0625rem', color: C.inkMuted, maxWidth: '400px', lineHeight: 1.7 }}>
                No credit card to start. Upgrade when your festival grows.
              </p>
            </div>

            <div className="fs-pricing-grid" style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(3, 1fr)',
              gap: '1px',
              background: C.border,
            }}>
              {PRICING_TIERS.map((tier) => (
                <div key={tier.name} style={{
                  background: tier.highlight ? 'oklch(0.13 0.006 65)' : C.bg,
                  padding: '2.5rem',
                  position: 'relative',
                }}>
                  {tier.highlight && (
                    <div style={{
                      position: 'absolute',
                      top: 0,
                      left: 0,
                      right: 0,
                      height: '2px',
                      background: C.primary,
                    }} />
                  )}
                  <div style={{
                    fontFamily: "'Big Shoulders Display', sans-serif",
                    fontWeight: 800,
                    fontSize: '0.875rem',
                    letterSpacing: '0.15em',
                    color: tier.highlight ? C.primary : C.inkDim,
                    marginBottom: '1.25rem',
                  }}>
                    {tier.name}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.5rem', marginBottom: '0.5rem' }}>
                    <span style={{
                      fontFamily: "'Big Shoulders Display', sans-serif",
                      fontWeight: 900,
                      fontSize: '2.625rem',
                      color: C.ink,
                      letterSpacing: '-0.02em',
                      lineHeight: 1,
                    }}>
                      {tier.price}
                    </span>
                    <span style={{ fontFamily: "'Barlow', sans-serif", fontSize: '0.875rem', color: C.inkDim }}>
                      {tier.period}
                    </span>
                  </div>
                  <p style={{ fontSize: '0.9rem', color: C.inkMuted, marginBottom: '2rem', lineHeight: 1.65 }}>
                    {tier.desc}
                  </p>
                  <ul style={{ listStyle: 'none', padding: 0, marginBottom: '2.5rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                    {tier.features.map((f) => (
                      <li key={f} style={{ display: 'flex', gap: '0.75rem', alignItems: 'flex-start' }}>
                        <span style={{ color: tier.highlight ? C.primary : C.inkDim, lineHeight: 1.5, flexShrink: 0, fontWeight: 700 }}>&#10003;</span>
                        <span style={{ fontSize: '0.9rem', color: C.inkMuted, lineHeight: 1.5 }}>{f}</span>
                      </li>
                    ))}
                  </ul>
                  <AppLink to="/register" className={tier.highlight ? 'fs-btn-primary' : 'fs-btn-ghost'}>
                    {tier.cta} →
                  </AppLink>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── CTA CLOSE ────────────────────────────────────────────────── */}
        <section style={{
          padding: 'clamp(4rem, 7vw, 6rem) 2rem',
          textAlign: 'center',
          position: 'relative',
          overflow: 'hidden',
        }}>
          <div aria-hidden style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            width: '70%',
            height: '300%',
            background: 'radial-gradient(ellipse 50% 35% at 50% 50%, oklch(0.72 0.165 68 / 0.055) 0%, transparent 65%)',
            pointerEvents: 'none',
          }} />
          <div style={{ position: 'relative', zIndex: 1 }}>
            <h2 style={{
              fontFamily: "'Big Shoulders Display', sans-serif",
              fontWeight: 900,
              fontSize: 'clamp(3rem, 8.5vw, 5.75rem)',
              lineHeight: 0.93,
              color: C.ink,
              letterSpacing: '-0.01em',
              marginBottom: '2rem',
            }}>
              READY WHEN{' '}
              <span style={{ color: C.primary }}>YOU ARE.</span>
            </h2>
            <p style={{
              fontSize: '1.0625rem',
              color: C.inkMuted,
              maxWidth: '380px',
              margin: '0 auto 2rem',
              lineHeight: 1.75,
            }}>
              Free to start. No credit card. Your first festival is live in under an hour.
            </p>
            <AppLink to="/register" className="fs-btn-primary" style={{ fontSize: '1.125rem', padding: '1.125rem 2.5rem' }}>
              Run a Festival →
            </AppLink>
          </div>
        </section>

        {/* ── FOOTER ───────────────────────────────────────────────────── */}
        <footer style={{
          borderTop: `1px solid ${C.border}`,
          background: C.bg,
          padding: '3.5rem 2rem',
        }}>
          <div style={{ maxWidth: '1280px', margin: '0 auto' }}>
            <div className="fs-footer-cols" style={{
              display: 'grid',
              gridTemplateColumns: '2fr 1fr 1fr 1fr',
              gap: '3rem',
              marginBottom: '2rem',
            }}>
              <div className="fs-footer-brand">
                <span style={{
                  fontFamily: "'Big Shoulders Display', sans-serif",
                  fontWeight: 900,
                  fontSize: '1.25rem',
                  letterSpacing: '0.06em',
                  display: 'block',
                  marginBottom: '1rem',
                }}>
                  FEST<span style={{ color: C.primary }}>SCOUT</span>
                </span>
                <p style={{ fontSize: '0.875rem', color: C.inkDim, lineHeight: 1.75, maxWidth: '240px' }}>
                  Film festival management software. Submissions, judging, live screening, and awards in one platform.
                </p>
              </div>

              {[
                { heading: 'Product', links: ['Platform', 'Live rooms', 'Pricing', 'Changelog'] },
                { heading: 'Company', links: ['About', 'Blog', 'Contact', 'Press'] },
                { heading: 'Legal',   links: ['Terms', 'Privacy', 'Security', 'Cookies'] },
              ].map((col) => (
                <div key={col.heading}>
                  <div style={{
                    fontFamily: "'Barlow', sans-serif",
                    fontWeight: 600,
                    fontSize: '0.6875rem',
                    color: C.inkDim,
                    letterSpacing: '0.14em',
                    textTransform: 'uppercase',
                    marginBottom: '1.25rem',
                  }}>
                    {col.heading}
                  </div>
                  <ul style={{ listStyle: 'none', padding: 0, display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                    {col.links.map((link) => (
                      <li key={link}>
                        <a href="#" className="fs-footer-link">{link}</a>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>

            <div style={{
              borderTop: `1px solid ${C.border}`,
              paddingTop: '1.5rem',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: '0.75rem',
            }}>
              <span style={{ fontSize: '0.8125rem', color: C.inkDim, fontFamily: "'Barlow', sans-serif" }}>
                &copy; 2026 FestScout. All rights reserved.
              </span>
              <span style={{ fontSize: '0.8125rem', color: C.inkDim, fontFamily: "'Barlow', sans-serif" }}>
                festscout.online
              </span>
            </div>
          </div>
        </footer>

      </div>
    </>
  );
};
