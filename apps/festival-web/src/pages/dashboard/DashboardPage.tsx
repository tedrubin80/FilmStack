import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuthStore } from '@/store/authStore';
import { festivalService, type FestivalWithCounts } from '@/services/festivalService';

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

function fmt(s?: string | null) {
  if (!s) return '—';
  return new Date(s).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function isLive(f: FestivalWithCounts) {
  return f.isActive && (!f.submissionDeadline || new Date(f.submissionDeadline) > new Date());
}

export const DashboardPage: React.FC = () => {
  const { user } = useAuthStore();
  const [festivals, setFestivals] = useState<FestivalWithCounts[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    festivalService.getFestivals({ limit: 50 })
      .then((res) => { if (res.success && res.data) setFestivals(res.data.festivals); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const totalFilms  = festivals.reduce((n, f) => n + (f._count?.films  || 0), 0);
  const totalAwards = festivals.reduce((n, f) => n + (f._count?.awards || 0), 0);
  const liveCount   = festivals.filter(isLive).length;
  const recent      = [...festivals]
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 6);

  const STATS = [
    { label: 'Festivals', value: loading ? '—' : String(festivals.length) },
    { label: 'Accepting now', value: loading ? '—' : String(liveCount) },
    { label: 'Submissions', value: loading ? '—' : String(totalFilms) },
    { label: 'Awards issued', value: loading ? '—' : String(totalAwards) },
  ];

  const ACTIONS = [
    { label: 'Create festival', href: '/festivals/create', primary: true },
    { label: 'Manage festivals', href: '/festivals', primary: false },
    { label: 'Review films', href: '/films', primary: false },
    { label: 'Settings', href: '/settings', primary: false },
  ];

  return (
    <div style={{ fontFamily: "'Barlow', system-ui, sans-serif" }}>

      {/* Page heading */}
      <div style={{ marginBottom: '3rem' }}>
        <h1 style={{
          fontFamily: "'Big Shoulders Display', sans-serif",
          fontWeight: 800,
          fontSize: 'clamp(2.25rem, 4vw, 3rem)',
          letterSpacing: '-0.01em',
          color: C.ink,
          lineHeight: 0.95,
          marginBottom: '0.75rem',
        }}>
          {user?.username ? `${user.username}.` : 'Dashboard.'}
        </h1>
        <p style={{ fontSize: '1rem', color: C.inkMuted, lineHeight: 1.7 }}>
          {user?.tenant?.name || 'Film festival management'}
        </p>
      </div>

      {/* Stats strip */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(4, 1fr)',
        gap: '1px',
        background: C.border,
        border: `1px solid ${C.border}`,
        marginBottom: '3rem',
      }}>
        {STATS.map((s) => (
          <div key={s.label} style={{ background: C.bgPanel, padding: '1.75rem 2rem' }}>
            <div style={{
              fontFamily: "'Big Shoulders Display', sans-serif",
              fontWeight: 900,
              fontSize: '2.625rem',
              color: C.ink,
              letterSpacing: '-0.02em',
              lineHeight: 1,
              marginBottom: '0.5rem',
            }}>
              {s.value}
            </div>
            <div style={{
              fontSize: '0.75rem', fontWeight: 600,
              letterSpacing: '0.1em', textTransform: 'uppercase',
              color: C.inkDim,
            }}>
              {s.label}
            </div>
          </div>
        ))}
      </div>

      {/* Two-col layout */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 280px', gap: '3rem', alignItems: 'start' }}>

        {/* Recent festivals list */}
        <div>
          <div style={{
            display: 'flex', justifyContent: 'space-between',
            alignItems: 'baseline', marginBottom: '1.125rem',
          }}>
            <h2 style={{
              fontFamily: "'Big Shoulders Display', sans-serif",
              fontWeight: 700, fontSize: '1rem', letterSpacing: '0.1em',
              color: C.inkDim, textTransform: 'uppercase',
            }}>
              Recent festivals
            </h2>
            <Link to="/festivals" style={{
              fontSize: '0.875rem', color: C.primary,
              textDecoration: 'none', fontWeight: 500,
            }}>
              View all →
            </Link>
          </div>

          <div style={{ border: `1px solid ${C.border}` }}>
            {loading ? (
              Array.from({ length: 4 }).map((_, i) => (
                <div key={i} style={{
                  padding: '1rem 1.25rem',
                  borderBottom: i < 3 ? `1px solid ${C.border}` : 'none',
                  display: 'flex', gap: '1rem', alignItems: 'center',
                }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ height: '0.875rem', width: '52%', background: C.bgRaised, borderRadius: '2px', marginBottom: '0.5rem' }} />
                    <div style={{ height: '0.75rem', width: '35%', background: C.bgRaised, borderRadius: '2px' }} />
                  </div>
                  <div style={{ height: '0.75rem', width: '60px', background: C.bgRaised, borderRadius: '2px' }} />
                </div>
              ))
            ) : recent.length === 0 ? (
              <div style={{ padding: '3rem 2rem', textAlign: 'center', color: C.inkDim, fontSize: '0.9375rem' }}>
                No festivals yet.{' '}
                <Link to="/festivals/create" style={{ color: C.primary, textDecoration: 'none' }}>
                  Create your first →
                </Link>
              </div>
            ) : (
              recent.map((f, i) => {
                const live = isLive(f);
                return (
                  <Link key={f.id} to={`/festivals/${f.id}`} style={{
                    textDecoration: 'none',
                    display: 'flex', alignItems: 'center', gap: '1rem',
                    padding: '1rem 1.25rem',
                    borderBottom: i < recent.length - 1 ? `1px solid ${C.border}` : 'none',
                    transition: 'background 0.12s',
                  }}
                  onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = C.bgPanel; }}
                  onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = 'transparent'; }}>
                    <div style={{
                      width: '0.4375rem', height: '0.4375rem',
                      borderRadius: '50%',
                      background: live ? C.primary : C.border,
                      flexShrink: 0,
                    }} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{
                        fontSize: '0.9375rem', fontWeight: 600, color: C.ink,
                        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                      }}>
                        {f.name}
                      </div>
                      <div style={{ fontSize: '0.8125rem', color: C.inkDim, marginTop: '0.125rem' }}>
                        {fmt(f.startDate)}{f.endDate ? ` — ${fmt(f.endDate)}` : ''}
                      </div>
                    </div>
                    <div style={{ textAlign: 'right', flexShrink: 0 }}>
                      <div style={{
                        fontSize: '0.6875rem', fontWeight: 600,
                        letterSpacing: '0.07em', textTransform: 'uppercase',
                        color: live ? C.primary : f.isActive ? C.accent : C.inkDim,
                      }}>
                        {live ? 'Accepting' : f.isActive ? 'Closed' : 'Archived'}
                      </div>
                      <div style={{ fontSize: '0.75rem', color: C.inkDim, marginTop: '0.125rem' }}>
                        {f._count?.films || 0} film{f._count?.films !== 1 ? 's' : ''}
                      </div>
                    </div>
                  </Link>
                );
              })
            )}
          </div>
        </div>

        {/* Sidebar: Quick actions + plan */}
        <div>
          <h2 style={{
            fontFamily: "'Big Shoulders Display', sans-serif",
            fontWeight: 700, fontSize: '1rem', letterSpacing: '0.1em',
            color: C.inkDim, textTransform: 'uppercase',
            marginBottom: '1.125rem',
          }}>
            Quick actions
          </h2>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginBottom: '2rem' }}>
            {ACTIONS.map(({ label, href, primary }) => (
              <Link key={href} to={href} style={{
                textDecoration: 'none',
                display: 'block', padding: '0.75rem 1rem',
                border: `1px solid ${primary ? C.primary : C.border}`,
                background: primary ? C.primary : 'transparent',
                color: primary ? 'oklch(0.97 0 0)' : C.inkMuted,
                fontFamily: "'Barlow', system-ui, sans-serif",
                fontWeight: primary ? 700 : 500,
                fontSize: '0.9375rem',
                transition: 'all 0.15s',
              }}
              onMouseEnter={(e) => {
                const el = e.currentTarget as HTMLElement;
                if (primary) { el.style.background = C.primaryHover; }
                else { el.style.borderColor = C.borderBright; el.style.color = C.ink; }
              }}
              onMouseLeave={(e) => {
                const el = e.currentTarget as HTMLElement;
                if (primary) { el.style.background = C.primary; }
                else { el.style.borderColor = C.border; el.style.color = C.inkMuted; }
              }}>
                {label} →
              </Link>
            ))}
          </div>

          {user?.tenant && (
            <div style={{
              padding: '1.25rem',
              border: `1px solid ${C.border}`,
              background: C.bgPanel,
            }}>
              <div style={{
                fontSize: '0.6875rem', color: C.inkDim,
                letterSpacing: '0.12em', textTransform: 'uppercase',
                marginBottom: '0.625rem',
              }}>
                Plan
              </div>
              <div style={{
                fontFamily: "'Big Shoulders Display', sans-serif",
                fontWeight: 800, fontSize: '1.375rem', letterSpacing: '0.05em',
                color: C.primary, lineHeight: 1,
                marginBottom: '0.375rem',
              }}>
                {user.tenant.planType.toUpperCase()}
              </div>
              <div style={{ fontSize: '0.875rem', color: C.inkDim }}>
                {user.tenant.name}
              </div>
            </div>
          )}
        </div>

      </div>
    </div>
  );
};
