import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuthStore } from '@/store/authStore';
import { isPlatformAdmin } from '@/utils/platformAdmin';

const C = {
  bg:           'oklch(0.09 0 0)',
  ink:          'oklch(0.95 0.006 80)',
  inkMuted:     'oklch(0.70 0.008 80)',
  inkDim:       'oklch(0.68 0.007 80)',
  primary:      'oklch(0.72 0.165 68)',
  border:       'oklch(0.20 0 0)',
  borderBright: 'oklch(0.30 0.004 80)',
};

export const Layout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { pathname } = useLocation();
  const { user, logout } = useAuthStore();
  const showAdmin = isPlatformAdmin(user);

  const nav = [
    { label: 'Dashboard', href: '/dashboard' },
    { label: 'Festivals', href: '/festivals' },
    { label: 'Films', href: '/films' },
    { label: 'Settings', href: '/settings' },
    ...(showAdmin ? [{ label: 'Admin', href: '/admin' }] : []),
  ];

  return (
    <div style={{ minHeight: '100vh', background: C.bg, color: C.ink, fontFamily: "'Barlow', system-ui, sans-serif" }}>
      <header style={{
        position: 'sticky', top: 0, zIndex: 40,
        background: 'oklch(0.09 0 0 / 0.94)',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        borderBottom: `1px solid ${C.border}`,
      }}>
        <div style={{
          maxWidth: '1280px', margin: '0 auto',
          padding: '0 2rem', height: '3.75rem',
          display: 'flex', alignItems: 'center', gap: '2.5rem',
        }}>
          <Link to="/" style={{ textDecoration: 'none', flexShrink: 0 }}>
            <span style={{
              fontFamily: "'Big Shoulders Display', sans-serif",
              fontWeight: 900, fontSize: '1.375rem',
              letterSpacing: '0.06em', color: C.ink,
            }}>
              FEST<span style={{ color: C.primary }}>SCOUT</span>
            </span>
          </Link>

          <nav style={{ display: 'flex', alignItems: 'stretch', gap: '0', flex: 1, height: '100%' }}>
            {nav.map(({ label, href }) => {
              const active = href === '/dashboard'
                ? pathname === href
                : pathname === href || pathname.startsWith(href + '/');
              return (
                <Link key={href} to={href} style={{
                  textDecoration: 'none',
                  fontFamily: "'Barlow', system-ui, sans-serif",
                  fontWeight: 500, fontSize: '0.9375rem',
                  color: active ? C.primary : C.inkDim,
                  padding: '0 1rem',
                  display: 'inline-flex', alignItems: 'center',
                  borderBottom: active ? `2px solid ${C.primary}` : '2px solid transparent',
                  transition: 'color 0.15s',
                  boxSizing: 'border-box',
                }}
                onMouseEnter={(e) => { if (!active) (e.currentTarget as HTMLElement).style.color = C.inkMuted; }}
                onMouseLeave={(e) => { if (!active) (e.currentTarget as HTMLElement).style.color = C.inkDim; }}>
                  {label}
                </Link>
              );
            })}
          </nav>

          <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem', flexShrink: 0 }}>
            {user?.username && (
              <span style={{ fontSize: '0.875rem', color: C.inkDim }}>
                {user.username}
              </span>
            )}
            <button onClick={logout} style={{
              fontFamily: "'Barlow', system-ui, sans-serif",
              fontWeight: 500, fontSize: '0.875rem',
              color: C.inkDim, background: 'none',
              border: `1px solid ${C.border}`, padding: '0.375rem 0.875rem',
              cursor: 'pointer', transition: 'color 0.15s, border-color 0.15s',
            }}
            onMouseEnter={(e) => {
              const el = e.currentTarget;
              el.style.color = C.ink; el.style.borderColor = C.borderBright;
            }}
            onMouseLeave={(e) => {
              const el = e.currentTarget;
              el.style.color = C.inkDim; el.style.borderColor = C.border;
            }}>
              Sign out
            </button>
          </div>
        </div>
      </header>

      <main style={{ maxWidth: '1280px', margin: '0 auto', padding: '3rem 2rem' }}>
        {children}
      </main>
    </div>
  );
};
