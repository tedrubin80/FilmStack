import React from 'react';
import { Link } from 'react-router-dom';

const C = {
  bg: 'oklch(0.09 0 0)',
  bgPanel: 'oklch(0.115 0 0)',
  bgRaised: 'oklch(0.14 0 0)',
  ink: 'oklch(0.95 0.006 80)',
  inkMuted: 'oklch(0.70 0.008 80)',
  inkDim: 'oklch(0.68 0.007 80)',
  primary: 'oklch(0.72 0.165 68)',
  primaryHover: 'oklch(0.60 0.155 68)',
  border: 'oklch(0.20 0 0)',
  borderBright: 'oklch(0.30 0.004 80)',
};

const CAPABILITIES = [
  {
    title: 'Submissions',
    desc: 'Accept films, collect fees, and manage categories from this instance.',
  },
  {
    title: 'Judging',
    desc: 'Assign panels, score screeners, and track conflict-of-interest rules.',
  },
  {
    title: 'Live rooms',
    desc: 'Run screening rooms, filmmaker Q&As, and panels without extra software.',
  },
  {
    title: 'Awards',
    desc: 'Issue awards and certificates when your program is locked.',
  },
];

export const SimpleHomePage: React.FC = () => {
  return (
    <>
      <style>{`
        .fs-btn-primary {
          background: ${C.primary};
          color: oklch(0.97 0 0);
          text-decoration: none;
          font-family: 'Big Shoulders Display', sans-serif;
          font-weight: 700;
          font-size: 1rem;
          letter-spacing: 0.04em;
          padding: 0.875rem 1.75rem;
          display: inline-flex;
          align-items: center;
          gap: 0.375rem;
          transition: background 0.15s;
          border: none;
          cursor: pointer;
          white-space: nowrap;
        }
        .fs-btn-primary:hover { background: ${C.primaryHover}; }

        .fs-btn-ghost {
          color: ${C.inkMuted};
          text-decoration: none;
          font-family: 'Barlow', system-ui, sans-serif;
          font-weight: 500;
          font-size: 0.9375rem;
          padding: 0.875rem 1.75rem;
          border: 1px solid ${C.border};
          display: inline-flex;
          align-items: center;
          transition: border-color 0.15s, color 0.15s;
          background: transparent;
          cursor: pointer;
          white-space: nowrap;
        }
        .fs-btn-ghost:hover { border-color: ${C.borderBright}; color: ${C.ink}; }

        .fs-cap-grid {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 1px;
          background: ${C.border};
        }

        .fs-hero-enter {
          animation: fs-fade-up 0.7s cubic-bezier(0.16, 1, 0.3, 1) both;
        }
        .fs-hero-enter-delay {
          animation: fs-fade-up 0.7s cubic-bezier(0.16, 1, 0.3, 1) 0.12s both;
        }
        .fs-status-dot {
          animation: fs-breathe 2.4s ease-in-out infinite;
        }
        @keyframes fs-fade-up {
          from { opacity: 0; transform: translateY(12px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes fs-breathe {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.45; }
        }
        @media (prefers-reduced-motion: reduce) {
          .fs-hero-enter,
          .fs-hero-enter-delay,
          .fs-status-dot { animation: none; }
        }

        @media (max-width: 900px) {
          .fs-cap-grid { grid-template-columns: 1fr 1fr; }
        }
        @media (max-width: 560px) {
          .fs-cap-grid { grid-template-columns: 1fr; }
          .fs-hero-ctas { flex-direction: column; align-items: flex-start; }
        }
      `}</style>

      <div
        style={{
          background: C.bg,
          color: C.ink,
          minHeight: '100vh',
          fontFamily: "'Barlow', system-ui, sans-serif",
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        <header
          style={{
            borderBottom: `1px solid ${C.border}`,
            padding: '0 2rem',
            height: '3.75rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <span
            style={{
              fontFamily: "'Big Shoulders Display', sans-serif",
              fontWeight: 900,
              fontSize: '1.375rem',
              letterSpacing: '0.06em',
            }}
          >
            FEST<span style={{ color: C.primary }}>SCOUT</span>
          </span>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem' }}>
            <span
              className="fs-status-dot"
              style={{
                width: '0.4375rem',
                height: '0.4375rem',
                borderRadius: '50%',
                background: C.primary,
              }}
              aria-hidden
            />
            <span
              style={{
                fontSize: '0.75rem',
                fontWeight: 600,
                letterSpacing: '0.1em',
                textTransform: 'uppercase',
                color: C.inkDim,
              }}
            >
              This instance
            </span>
          </div>
        </header>

        <main style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
          <section
            style={{
              flex: 1,
              display: 'flex',
              alignItems: 'center',
              position: 'relative',
              overflow: 'hidden',
              padding: 'clamp(3rem, 8vw, 5.5rem) 2rem',
            }}
          >
            <div
              aria-hidden
              style={{
                position: 'absolute',
                top: '-35%',
                right: '-8%',
                width: '60%',
                height: '130%',
                background:
                  'radial-gradient(ellipse 55% 70% at 75% 10%, oklch(0.72 0.165 68 / 0.1) 0%, transparent 55%)',
                pointerEvents: 'none',
              }}
            />
            <div
              aria-hidden
              style={{
                position: 'absolute',
                inset: 0,
                backgroundImage:
                  'linear-gradient(oklch(0.20 0 0 / 0.35) 1px, transparent 1px), linear-gradient(90deg, oklch(0.20 0 0 / 0.35) 1px, transparent 1px)',
                backgroundSize: '72px 72px',
                maskImage: 'radial-gradient(ellipse 70% 60% at 40% 40%, black 0%, transparent 70%)',
                WebkitMaskImage:
                  'radial-gradient(ellipse 70% 60% at 40% 40%, black 0%, transparent 70%)',
                pointerEvents: 'none',
              }}
            />

            <div style={{ maxWidth: '920px', margin: '0 auto', width: '100%', position: 'relative', zIndex: 1 }}>
              <p
                className="fs-hero-enter"
                style={{
                  fontFamily: "'Big Shoulders Display', sans-serif",
                  fontWeight: 900,
                  fontSize: 'clamp(2.75rem, 7vw, 4.5rem)',
                  letterSpacing: '0.04em',
                  lineHeight: 0.95,
                  marginBottom: '1.75rem',
                  textWrap: 'balance',
                }}
              >
                FEST<span style={{ color: C.primary }}>SCOUT</span>
              </p>

              <h1
                className="fs-hero-enter"
                style={{
                  fontFamily: "'Big Shoulders Display', sans-serif",
                  fontWeight: 800,
                  fontSize: 'clamp(1.75rem, 4vw, 2.75rem)',
                  lineHeight: 1.05,
                  letterSpacing: '-0.01em',
                  color: C.ink,
                  marginBottom: '1.25rem',
                  textWrap: 'balance',
                }}
              >
                Your festival stack is running.
              </h1>

              <p
                className="fs-hero-enter-delay"
                style={{
                  fontSize: 'clamp(1rem, 1.6vw, 1.125rem)',
                  color: C.inkMuted,
                  maxWidth: '34rem',
                  lineHeight: 1.7,
                  marginBottom: '2.5rem',
                }}
              >
                Self-hosted open-source software for submissions, judging, live rooms, and awards.
                Sign in to manage this instance, or create an account to get started.
              </p>

              <div
                className="fs-hero-ctas fs-hero-enter-delay"
                style={{ display: 'flex', gap: '0.875rem', flexWrap: 'wrap' }}
              >
                <Link to="/login" className="fs-btn-primary">
                  Sign in →
                </Link>
                <Link to="/register" className="fs-btn-ghost">
                  Create account
                </Link>
              </div>
            </div>
          </section>

          <section
            style={{
              borderTop: `1px solid ${C.border}`,
              background: C.bgPanel,
            }}
          >
            <div style={{ maxWidth: '1280px', margin: '0 auto', padding: '2.5rem 2rem 0' }}>
              <h2
                style={{
                  fontFamily: "'Big Shoulders Display', sans-serif",
                  fontWeight: 800,
                  fontSize: '1.5rem',
                  letterSpacing: '0.02em',
                  marginBottom: '0.5rem',
                }}
              >
                What this instance provides
              </h2>
              <p style={{ fontSize: '0.9375rem', color: C.inkMuted, marginBottom: '2rem', maxWidth: '36rem' }}>
                Everything below is available on this server. No external SaaS account required.
              </p>
            </div>

            <div className="fs-cap-grid" style={{ maxWidth: '1280px', margin: '0 auto' }}>
              {CAPABILITIES.map((cap) => (
                <div
                  key={cap.title}
                  style={{
                    background: C.bgPanel,
                    padding: '1.75rem 2rem',
                  }}
                >
                  <h3
                    style={{
                      fontFamily: "'Big Shoulders Display', sans-serif",
                      fontWeight: 800,
                      fontSize: '1.125rem',
                      letterSpacing: '0.04em',
                      marginBottom: '0.5rem',
                    }}
                  >
                    {cap.title}
                  </h3>
                  <p style={{ fontSize: '0.9rem', color: C.inkMuted, lineHeight: 1.65 }}>{cap.desc}</p>
                </div>
              ))}
            </div>
          </section>
        </main>

        <footer
          style={{
            borderTop: `1px solid ${C.border}`,
            padding: '1.5rem 2rem',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '0.75rem',
          }}
        >
          <span style={{ fontSize: '0.8125rem', color: C.inkDim }}>
            FestScout · AGPL-3.0 · self-hosted
          </span>
          <div style={{ display: 'flex', gap: '1.25rem' }}>
            <a
              href="/login"
              style={{ fontSize: '0.8125rem', color: C.inkDim, textDecoration: 'none' }}
            >
              Sign in
            </a>
            <a
              href="https://github.com"
              style={{ fontSize: '0.8125rem', color: C.inkDim, textDecoration: 'none' }}
            >
              Source
            </a>
          </div>
        </footer>
      </div>
    </>
  );
};
