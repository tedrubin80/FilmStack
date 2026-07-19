import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
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
  return new Date(s).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
}

function fmtFee(amount?: number | null, currency?: string) {
  if (amount == null) return 'Free';
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: currency || 'USD' }).format(amount);
}

const Row: React.FC<{ label: string; value: React.ReactNode }> = ({ label, value }) => (
  <div style={{
    display: 'grid', gridTemplateColumns: '160px 1fr',
    gap: '1rem', padding: '0.875rem 0',
    borderBottom: `1px solid ${C.border}`,
    alignItems: 'start',
  }}>
    <div style={{ fontSize: '0.8125rem', fontWeight: 600, color: C.inkDim, paddingTop: '0.0625rem' }}>{label}</div>
    <div style={{ fontSize: '0.9375rem', color: C.inkMuted, lineHeight: 1.6 }}>{value || '—'}</div>
  </div>
);

export const FestivalDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [festival, setFestival] = useState<FestivalWithCounts | null>(null);
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  useEffect(() => {
    if (!id) return;
    const fid = parseInt(id);
    Promise.all([
      festivalService.getFestival(fid),
      festivalService.getFestivalStats(fid).catch(() => null),
    ]).then(([festRes, statsRes]) => {
      if (festRes.success && festRes.data) {
        setFestival(festRes.data.festival);
      } else {
        setError('Festival not found');
      }
      if (statsRes?.success && statsRes.data) {
        setStats(statsRes.data.statistics);
      }
    }).catch(() => setError('Failed to load festival'))
      .finally(() => setLoading(false));
  }, [id]);

  const handleDelete = async () => {
    if (!festival) return;
    setDeleting(true);
    try {
      const res = await festivalService.deleteFestival(festival.id);
      if (res.success) {
        navigate('/festivals', { replace: true });
      } else {
        setError(res.message || 'Failed to delete festival');
        setConfirmDelete(false);
      }
    } catch (err: any) {
      setError(err?.response?.status === 409
        ? 'Cannot delete a festival with existing film submissions.'
        : err?.response?.data?.message || 'Failed to delete festival');
      setConfirmDelete(false);
    } finally {
      setDeleting(false);
    }
  };

  if (loading) {
    return (
      <div style={{ fontFamily: "'Barlow', system-ui, sans-serif" }}>
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} style={{
            height: '1rem', width: `${40 + i * 15}%`,
            background: C.bgRaised, borderRadius: '2px',
            marginBottom: '1.25rem',
          }} />
        ))}
      </div>
    );
  }

  if (error || !festival) {
    return (
      <div style={{ fontFamily: "'Barlow', system-ui, sans-serif" }}>
        <div style={{ padding: '1.25rem', border: `1px solid ${C.accent}`, color: C.accent, marginBottom: '1.5rem' }}>
          {error || 'Festival not found'}
        </div>
        <Link to="/festivals" style={{ color: C.primary, textDecoration: 'none', fontSize: '0.9375rem' }}>
          ← Back to festivals
        </Link>
      </div>
    );
  }

  const isLive = festival.isActive && (!festival.submissionDeadline || new Date(festival.submissionDeadline) > new Date());

  const ACTIONS = [
    { label: 'Edit festival', href: `/festivals/${festival.id}/edit` },
    { label: 'View films', href: `/films?festival=${festival.id}` },
    { label: 'Manage submissions', href: `/festivals/${festival.id}/films` },
    { label: 'Submit a film', href: `/festivals/${festival.id}/submit` },
    { label: 'Manage judges', href: `/festivals/${festival.id}/judges` },
    { label: 'Awards', href: `/festivals/${festival.id}/awards` },
  ];

  return (
    <div style={{ fontFamily: "'Barlow', system-ui, sans-serif" }}>

      {/* Back + header */}
      <div style={{ marginBottom: '2.5rem' }}>
        <Link to="/festivals" style={{
          color: C.inkDim, textDecoration: 'none', fontSize: '0.875rem',
          fontWeight: 500, display: 'block', marginBottom: '1.25rem',
        }}>
          ← Festivals
        </Link>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '2rem', flexWrap: 'wrap' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.875rem', marginBottom: '0.5rem' }}>
              <span style={{
                fontSize: '0.6875rem', fontWeight: 600, letterSpacing: '0.08em',
                textTransform: 'uppercase', padding: '0.25rem 0.625rem',
                border: `1px solid ${isLive ? C.primary : C.border}`,
                color: isLive ? C.primary : C.inkDim,
              }}>
                {isLive ? 'Accepting' : festival.isActive ? 'Closed' : 'Archived'}
              </span>
              {festival._count && (
                <span style={{ fontSize: '0.875rem', color: C.inkDim }}>
                  {festival._count.films} film{festival._count.films !== 1 ? 's' : ''}
                </span>
              )}
            </div>
            <h1 style={{
              fontFamily: "'Big Shoulders Display', sans-serif",
              fontWeight: 800,
              fontSize: 'clamp(2rem, 4vw, 2.75rem)',
              letterSpacing: '-0.01em',
              color: C.ink, lineHeight: 0.95,
            }}>
              {festival.name}
            </h1>
          </div>

          <div style={{ display: 'flex', gap: '0.5rem', flexShrink: 0 }}>
            <Link to={`/festivals/${festival.id}/edit`} style={{
              textDecoration: 'none', fontSize: '0.875rem', fontWeight: 500,
              color: C.inkMuted, padding: '0.5rem 1rem',
              border: `1px solid ${C.border}`, transition: 'all 0.15s',
            }}
            onMouseEnter={(e) => { const el = e.currentTarget as HTMLElement; el.style.color = C.ink; el.style.borderColor = C.borderBright; }}
            onMouseLeave={(e) => { const el = e.currentTarget as HTMLElement; el.style.color = C.inkMuted; el.style.borderColor = C.border; }}>
              Edit
            </Link>
            <button onClick={() => setConfirmDelete(true)} style={{
              fontSize: '0.875rem', fontWeight: 500,
              color: C.accent, padding: '0.5rem 1rem',
              border: `1px solid ${C.accent}`, background: 'none',
              cursor: 'pointer', transition: 'all 0.15s',
            }}
            onMouseEnter={(e) => { const el = e.currentTarget; el.style.background = C.accent; el.style.color = 'oklch(0.97 0 0)'; }}
            onMouseLeave={(e) => { const el = e.currentTarget; el.style.background = 'none'; el.style.color = C.accent; }}>
              Delete
            </button>
          </div>
        </div>
      </div>

      {/* Error banner */}
      {error && (
        <div style={{ padding: '1rem', border: `1px solid ${C.accent}`, color: C.accent, marginBottom: '1.5rem' }}>
          {error}
        </div>
      )}

      {/* Two-col layout */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 260px', gap: '3rem', alignItems: 'start' }}>

        {/* Main */}
        <div>
          {festival.description && (
            <div style={{ marginBottom: '2.5rem' }}>
              <h2 style={{
                fontFamily: "'Big Shoulders Display', sans-serif",
                fontWeight: 700, fontSize: '1rem', letterSpacing: '0.1em',
                color: C.inkDim, textTransform: 'uppercase', marginBottom: '1rem',
              }}>
                About
              </h2>
              <p style={{ fontSize: '0.9375rem', color: C.inkMuted, lineHeight: 1.75, maxWidth: '65ch' }}>
                {festival.description}
              </p>
            </div>
          )}

          <div>
            <h2 style={{
              fontFamily: "'Big Shoulders Display', sans-serif",
              fontWeight: 700, fontSize: '1rem', letterSpacing: '0.1em',
              color: C.inkDim, textTransform: 'uppercase', marginBottom: '0.75rem',
            }}>
              Details
            </h2>
            <div style={{ borderTop: `1px solid ${C.border}` }}>
              <Row label="Festival dates" value={`${fmt(festival.startDate)} — ${fmt(festival.endDate)}`} />
              <Row label="Submission deadline" value={fmt(festival.submissionDeadline)} />
              {festival.earlyBirdDeadline && (
                <Row label="Early bird deadline" value={fmt(festival.earlyBirdDeadline)} />
              )}
              {festival.location && <Row label="Location" value={festival.location} />}
              <Row label="Entry fee" value={fmtFee(festival.entryFee, festival.currency)} />
              {festival.website && (
                <Row label="Website" value={
                  <a href={festival.website} target="_blank" rel="noopener noreferrer"
                    style={{ color: C.primary, textDecoration: 'none' }}>
                    {festival.website}
                  </a>
                } />
              )}
              {festival.contactEmail && (
                <Row label="Contact email" value={
                  <a href={`mailto:${festival.contactEmail}`} style={{ color: C.primary, textDecoration: 'none' }}>
                    {festival.contactEmail}
                  </a>
                } />
              )}
              {festival.contactPhone && <Row label="Contact phone" value={festival.contactPhone} />}
              <Row label="Created" value={fmt(festival.createdAt)} />
            </div>
          </div>

          {stats && (
            <div style={{ marginTop: '2.5rem' }}>
              <h2 style={{
                fontFamily: "'Big Shoulders Display', sans-serif",
                fontWeight: 700, fontSize: '1rem', letterSpacing: '0.1em',
                color: C.inkDim, textTransform: 'uppercase', marginBottom: '0.75rem',
              }}>
                Submission breakdown
              </h2>
              <div style={{
                display: 'flex', gap: '1px', background: C.border,
                border: `1px solid ${C.border}`,
              }}>
                {[
                  { label: 'Pending', value: stats.pending || 0, color: 'oklch(0.80 0.12 75)' },
                  { label: 'Accepted', value: stats.accepted || 0, color: 'oklch(0.65 0.15 145)' },
                  { label: 'Rejected', value: stats.rejected || 0, color: C.accent },
                ].map((s) => (
                  <div key={s.label} style={{ background: C.bgPanel, padding: '1.25rem 1.5rem', flex: 1 }}>
                    <div style={{
                      fontFamily: "'Big Shoulders Display', sans-serif",
                      fontWeight: 900, fontSize: '2rem', color: s.color,
                      letterSpacing: '-0.02em', lineHeight: 1, marginBottom: '0.375rem',
                    }}>
                      {s.value}
                    </div>
                    <div style={{ fontSize: '0.75rem', fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase', color: C.inkDim }}>
                      {s.label}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div>
          <h2 style={{
            fontFamily: "'Big Shoulders Display', sans-serif",
            fontWeight: 700, fontSize: '1rem', letterSpacing: '0.1em',
            color: C.inkDim, textTransform: 'uppercase', marginBottom: '0.875rem',
          }}>
            Manage
          </h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {ACTIONS.map(({ label, href }) => (
              <Link key={href} to={href} style={{
                textDecoration: 'none', display: 'block',
                padding: '0.75rem 1rem',
                border: `1px solid ${C.border}`,
                color: C.inkMuted, fontSize: '0.9375rem', fontWeight: 500,
                transition: 'all 0.15s',
              }}
              onMouseEnter={(e) => { const el = e.currentTarget as HTMLElement; el.style.borderColor = C.borderBright; el.style.color = C.ink; }}
              onMouseLeave={(e) => { const el = e.currentTarget as HTMLElement; el.style.borderColor = C.border; el.style.color = C.inkMuted; }}>
                {label} →
              </Link>
            ))}
          </div>

          <div style={{ marginTop: '2rem' }}>
            <div style={{
              display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1px',
              background: C.border, border: `1px solid ${C.border}`,
            }}>
              <div style={{ background: C.bgPanel, padding: '1rem' }}>
                <div style={{
                  fontFamily: "'Big Shoulders Display', sans-serif",
                  fontWeight: 900, fontSize: '1.75rem', color: C.ink,
                  letterSpacing: '-0.02em', lineHeight: 1, marginBottom: '0.25rem',
                }}>
                  {festival._count?.films || 0}
                </div>
                <div style={{ fontSize: '0.6875rem', fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase', color: C.inkDim }}>Films</div>
              </div>
              <div style={{ background: C.bgPanel, padding: '1rem' }}>
                <div style={{
                  fontFamily: "'Big Shoulders Display', sans-serif",
                  fontWeight: 900, fontSize: '1.75rem', color: C.ink,
                  letterSpacing: '-0.02em', lineHeight: 1, marginBottom: '0.25rem',
                }}>
                  {festival._count?.awards || 0}
                </div>
                <div style={{ fontSize: '0.6875rem', fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase', color: C.inkDim }}>Awards</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Delete confirmation modal */}
      {confirmDelete && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 50,
          background: 'oklch(0 0 0 / 0.75)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          padding: '1rem',
        }}
        onClick={(e) => { if (e.target === e.currentTarget) setConfirmDelete(false); }}>
          <div style={{
            background: C.bgPanel, border: `1px solid ${C.border}`,
            padding: '2rem', maxWidth: '420px', width: '100%',
          }}>
            <h3 style={{
              fontFamily: "'Big Shoulders Display', sans-serif",
              fontWeight: 800, fontSize: '1.375rem', letterSpacing: '0.03em',
              color: C.ink, marginBottom: '1rem',
            }}>
              Delete festival?
            </h3>
            <p style={{ fontSize: '0.9375rem', color: C.inkMuted, lineHeight: 1.65, marginBottom: '2rem' }}>
              "{festival.name}" will be permanently deleted. This cannot be undone. Festivals with existing film submissions cannot be deleted.
            </p>
            <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
              <button onClick={() => setConfirmDelete(false)} disabled={deleting} style={{
                padding: '0.625rem 1.25rem', border: `1px solid ${C.border}`,
                background: 'none', color: C.inkMuted, cursor: 'pointer',
                fontFamily: "'Barlow', system-ui, sans-serif", fontSize: '0.9375rem', fontWeight: 500,
              }}>
                Cancel
              </button>
              <button onClick={handleDelete} disabled={deleting} style={{
                padding: '0.625rem 1.25rem',
                border: `1px solid ${C.accent}`,
                background: C.accent, color: 'oklch(0.97 0 0)',
                cursor: deleting ? 'not-allowed' : 'pointer', opacity: deleting ? 0.6 : 1,
                fontFamily: "'Barlow', system-ui, sans-serif", fontSize: '0.9375rem', fontWeight: 700,
              }}>
                {deleting ? 'Deleting…' : 'Delete festival'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
