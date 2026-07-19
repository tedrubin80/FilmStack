import React from 'react';
import { Link } from 'react-router-dom';

export const C = {
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

export const inputStyle: React.CSSProperties = {
  width: '100%',
  background: C.bg,
  border: `1px solid ${C.border}`,
  color: C.ink,
  padding: '0.75rem 1rem',
  fontSize: '0.9375rem',
  fontFamily: "'Barlow', system-ui, sans-serif",
  outline: 'none',
  transition: 'border-color 0.15s',
};

export function onInputFocus(e: React.FocusEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) {
  e.currentTarget.style.borderColor = C.borderBright;
}

export function onInputBlur(e: React.FocusEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) {
  e.currentTarget.style.borderColor = C.border;
}

interface AuthLayoutProps {
  title: string;
  subtitle: React.ReactNode;
  children: React.ReactNode;
  wide?: boolean;
}

export const AuthLayout: React.FC<AuthLayoutProps> = ({ title, subtitle, children, wide }) => (
  <div style={{
    minHeight: '100vh',
    background: C.bg,
    color: C.ink,
    fontFamily: "'Barlow', system-ui, sans-serif",
    display: 'flex',
    flexDirection: 'column',
  }}>
    <header style={{
      borderBottom: `1px solid ${C.border}`,
      padding: '0 2rem',
      height: '3.75rem',
      display: 'flex',
      alignItems: 'center',
    }}>
      <Link to="/" style={{ textDecoration: 'none' }}>
        <span style={{
          fontFamily: "'Big Shoulders Display', sans-serif",
          fontWeight: 900,
          fontSize: '1.375rem',
          letterSpacing: '0.06em',
          color: C.ink,
        }}>
          FEST<span style={{ color: C.primary }}>SCOUT</span>
        </span>
      </Link>
    </header>

    <div style={{
      flex: 1,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '3rem 1.5rem',
      position: 'relative',
      overflow: 'hidden',
    }}>
      <div aria-hidden style={{
        position: 'absolute',
        top: '-20%',
        right: '-10%',
        width: '50%',
        height: '80%',
        background: 'radial-gradient(ellipse 55% 75% at 80% 8%, oklch(0.72 0.165 68 / 0.07) 0%, transparent 55%)',
        pointerEvents: 'none',
      }} />

      <div style={{ width: '100%', maxWidth: wide ? '480px' : '400px', position: 'relative', zIndex: 1 }}>
        <div style={{ marginBottom: '2rem' }}>
          <h1 style={{
            fontFamily: "'Big Shoulders Display', sans-serif",
            fontWeight: 800,
            fontSize: 'clamp(1.75rem, 4vw, 2.25rem)',
            letterSpacing: '-0.01em',
            lineHeight: 0.95,
            marginBottom: '0.75rem',
          }}>
            {title}
          </h1>
          <p style={{ fontSize: '0.9375rem', color: C.inkMuted, lineHeight: 1.6 }}>
            {subtitle}
          </p>
        </div>

        <div style={{
          background: C.bgPanel,
          border: `1px solid ${C.border}`,
          padding: '2rem',
        }}>
          {children}
        </div>
      </div>
    </div>
  </div>
);

export const AuthLabel: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <label style={{
    display: 'block',
    fontSize: '0.75rem',
    fontWeight: 600,
    letterSpacing: '0.08em',
    textTransform: 'uppercase',
    color: C.inkDim,
    marginBottom: '0.5rem',
  }}>
    {children}
  </label>
);

export const AuthError: React.FC<{ message: string }> = ({ message }) => (
  <div style={{
    background: 'oklch(0.55 0.19 22 / 0.12)',
    border: '1px solid oklch(0.55 0.19 22 / 0.35)',
    padding: '0.875rem 1rem',
    marginBottom: '1.25rem',
  }}>
    <p style={{ color: 'oklch(0.75 0.16 22)', fontSize: '0.875rem', margin: 0 }}>{message}</p>
  </div>
);

export const AuthButton: React.FC<{
  loading?: boolean;
  loadingText?: string;
  children: React.ReactNode;
}> = ({ loading, loadingText, children }) => (
  <button
    type="submit"
    disabled={loading}
    style={{
      width: '100%',
      padding: '0.875rem 1.5rem',
      background: loading ? C.border : C.primary,
      color: loading ? C.inkDim : 'oklch(0.97 0 0)',
      border: 'none',
      fontFamily: "'Big Shoulders Display', sans-serif",
      fontWeight: 700,
      fontSize: '1rem',
      letterSpacing: '0.04em',
      cursor: loading ? 'not-allowed' : 'pointer',
      transition: 'background 0.15s',
      opacity: loading ? 0.7 : 1,
    }}
    onMouseEnter={(e) => { if (!loading) e.currentTarget.style.background = C.primaryHover; }}
    onMouseLeave={(e) => { if (!loading) e.currentTarget.style.background = C.primary; }}
  >
    {loading ? (loadingText || 'Loading...') : children}
  </button>
);

export const authLinkStyle: React.CSSProperties = {
  color: C.primary,
  textDecoration: 'none',
  fontWeight: 600,
};
