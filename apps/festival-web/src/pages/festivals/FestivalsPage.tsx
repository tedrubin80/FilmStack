import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
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

type StatusKey = 'accepting' | 'closed' | 'archived';
function getStatus(f: FestivalWithCounts): { key: StatusKey; label: string; color: string } {
  if (!f.isActive) return { key: 'archived', label: 'ARCHIVED', color: C.inkDim };
  if (f.submissionDeadline && new Date(f.submissionDeadline) > new Date()) {
    return { key: 'accepting', label: 'ACCEPTING', color: C.primary };
  }
  return { key: 'closed', label: 'CLOSED', color: C.accent };
}

const FILTERS: { label: string; value: string }[] = [
  { label: 'All', value: 'all' },
  { label: 'Accepting', value: 'accepting' },
  { label: 'Closed', value: 'closed' },
  { label: 'Archived', value: 'archived' },
];

export const FestivalsPage: React.FC = () => {
  const [festivals, setFestivals] = useState<FestivalWithCounts[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all');

  useEffect(() => {
    festivalService.getFestivals({ limit: 50 })
      .then((res) => { if (res.success && res.data) setFestivals(res.data.festivals); })
      .catch(() => toast.error('Failed to load festivals'))
      .finally(() => setLoading(false));
  }, []);

  const visible = festivals.filter((f) => {
    const s = getStatus(f);
    const matchFilter = filter === 'all' || s.key === filter;
    const matchSearch = !search ||
      f.name.toLowerCase().includes(search.toLowerCase()) ||
      (f.location || '').toLowerCase().includes(search.toLowerCase());
    return matchFilter && matchSearch;
  });

  return (
    <div style={{ fontFamily: "'Barlow', system-ui, sans-serif" }}>

      {/* Header */}
      <div style={{
        display: 'flex', justifyContent: 'space-between',
        alignItems: 'flex-end', marginBottom: '2.5rem',
        gap: '2rem', flexWrap: 'wrap',
      }}>
        <div>
          <h1 style={{
            fontFamily: "'Big Shoulders Display', sans-serif",
            fontWeight: 800,
            fontSize: 'clamp(2.25rem, 4vw, 3rem)',
            letterSpacing: '-0.01em',
            color: C.ink, lineHeight: 0.95,
            marginBottom: '0.625rem',
          }}>
            FESTIVALS
          </h1>
          <p style={{ color: C.inkMuted, fontSize: '1rem' }}>
            {loading ? 'Loading…' : `${festivals.length} festival${festivals.length !== 1 ? 's' : ''}`}
          </p>
        </div>

        <Link to="/festivals/create" style={{
          textDecoration: 'none',
          fontFamily: "'Big Shoulders Display', sans-serif",
          fontWeight: 700, fontSize: '1rem',
          letterSpacing: '0.04em',
          padding: '0.75rem 1.625rem',
          background: C.primary, color: 'oklch(0.97 0 0)',
          display: 'inline-flex', alignItems: 'center', gap: '0.375rem',
          transition: 'background 0.15s',
        }}
        onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = C.primaryHover; }}
        onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = C.primary; }}>
          New Festival →
        </Link>
      </div>

      {/* Toolbar */}
      <div style={{
        display: 'flex', gap: '1rem', marginBottom: '2rem',
        flexWrap: 'wrap', alignItems: 'center',
      }}>
        <input
          type="search"
          placeholder="Search festivals…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{
            flex: '1 1 240px', maxWidth: '360px',
            background: C.bgPanel, border: `1px solid ${C.border}`,
            color: C.ink, padding: '0.625rem 1rem',
            fontSize: '0.9375rem',
            fontFamily: "'Barlow', system-ui, sans-serif",
            outline: 'none',
          }}
          onFocus={(e) => { (e.currentTarget as HTMLInputElement).style.borderColor = C.borderBright; }}
          onBlur={(e) => { (e.currentTarget as HTMLInputElement).style.borderColor = C.border; }}
        />

        <div style={{ display: 'flex', gap: '0.375rem' }}>
          {FILTERS.map(({ label, value }) => (
            <button key={value} onClick={() => setFilter(value)} style={{
              fontFamily: "'Barlow', system-ui, sans-serif",
              fontWeight: 500, fontSize: '0.8125rem',
              letterSpacing: '0.04em',
              padding: '0.375rem 0.875rem',
              border: `1px solid ${filter === value ? C.primary : C.border}`,
              background: filter === value ? C.primary : 'transparent',
              color: filter === value ? 'oklch(0.97 0 0)' : C.inkDim,
              cursor: 'pointer', transition: 'all 0.15s',
            }}>
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      {loading ? (
        <div style={{ border: `1px solid ${C.border}` }}>
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} style={{
              padding: '1.25rem 1.5rem',
              borderBottom: i < 3 ? `1px solid ${C.border}` : 'none',
              display: 'flex', gap: '1.5rem', alignItems: 'center',
            }}>
              <div style={{ flex: 3 }}>
                <div style={{ height: '0.9rem', width: '48%', background: C.bgRaised, borderRadius: '2px', marginBottom: '0.5rem' }} />
                <div style={{ height: '0.75rem', width: '28%', background: C.bgRaised, borderRadius: '2px' }} />
              </div>
              <div style={{ flex: 1.5, height: '0.75rem', background: C.bgRaised, borderRadius: '2px' }} />
              <div style={{ width: '40px', height: '0.9rem', background: C.bgRaised, borderRadius: '2px' }} />
              <div style={{ width: '72px', height: '0.75rem', background: C.bgRaised, borderRadius: '2px' }} />
              <div style={{ width: '60px', height: '1.75rem', background: C.bgRaised, borderRadius: '2px' }} />
            </div>
          ))}
        </div>
      ) : visible.length === 0 ? (
        <div style={{
          border: `1px solid ${C.border}`,
          padding: '5rem 2rem', textAlign: 'center', color: C.inkDim,
        }}>
          {search || filter !== 'all' ? (
            <>
              No festivals match your filters.{' '}
              <button onClick={() => { setSearch(''); setFilter('all'); }} style={{
                color: C.primary, background: 'none', border: 'none',
                cursor: 'pointer', fontFamily: 'inherit', fontSize: 'inherit',
              }}>
                Clear filters
              </button>
            </>
          ) : (
            <>
              No festivals yet.{' '}
              <Link to="/festivals/create" style={{ color: C.primary, textDecoration: 'none' }}>
                Create your first →
              </Link>
            </>
          )}
        </div>
      ) : (
        <>
          {/* Column headers */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: '3fr 1.75fr 0.75fr 1fr auto',
            padding: '0.5rem 1.5rem',
            borderBottom: `1px solid ${C.border}`,
            gap: '1rem',
          }}>
            {['Festival', 'Dates', 'Films', 'Status', ''].map((h) => (
              <div key={h} style={{
                fontSize: '0.6875rem', fontWeight: 600,
                letterSpacing: '0.1em', color: C.inkDim,
                textTransform: 'uppercase',
              }}>
                {h}
              </div>
            ))}
          </div>

          <div style={{ border: `1px solid ${C.border}`, borderTop: 'none' }}>
            {visible.map((f, i) => {
              const status = getStatus(f);
              return (
                <div key={f.id} style={{
                  display: 'grid',
                  gridTemplateColumns: '3fr 1.75fr 0.75fr 1fr auto',
                  padding: '1.125rem 1.5rem',
                  borderBottom: i < visible.length - 1 ? `1px solid ${C.border}` : 'none',
                  alignItems: 'center',
                  gap: '1rem',
                  transition: 'background 0.12s',
                }}
                onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = C.bgPanel; }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = 'transparent'; }}>

                  <div style={{ minWidth: 0 }}>
                    <Link to={`/festivals/${f.id}`} style={{
                      textDecoration: 'none', color: C.ink,
                      fontWeight: 600, fontSize: '0.9375rem',
                      display: 'block', overflow: 'hidden',
                      textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                    }}>
                      {f.name}
                    </Link>
                    {f.location && (
                      <div style={{ fontSize: '0.8125rem', color: C.inkDim, marginTop: '0.125rem' }}>
                        {f.location}
                      </div>
                    )}
                  </div>

                  <div style={{ fontSize: '0.875rem', color: C.inkMuted }}>
                    {f.startDate && fmt(f.startDate)}
                    {f.startDate && f.endDate && ' — '}
                    {f.endDate && fmt(f.endDate)}
                    {!f.startDate && !f.endDate && '—'}
                  </div>

                  <div style={{
                    fontFamily: "'Big Shoulders Display', sans-serif",
                    fontWeight: 700, fontSize: '1.25rem', color: C.ink,
                  }}>
                    {f._count?.films || 0}
                  </div>

                  <div style={{
                    fontSize: '0.6875rem', fontWeight: 600,
                    letterSpacing: '0.08em', color: status.color,
                  }}>
                    {status.label}
                  </div>

                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <Link to={`/festivals/${f.id}`} style={{
                      textDecoration: 'none', fontSize: '0.8125rem',
                      color: C.inkDim, fontWeight: 500,
                      padding: '0.3125rem 0.75rem',
                      border: `1px solid ${C.border}`,
                      transition: 'all 0.12s', whiteSpace: 'nowrap',
                    }}
                    onMouseEnter={(e) => {
                      const el = e.currentTarget as HTMLElement;
                      el.style.color = C.ink; el.style.borderColor = C.borderBright;
                    }}
                    onMouseLeave={(e) => {
                      const el = e.currentTarget as HTMLElement;
                      el.style.color = C.inkDim; el.style.borderColor = C.border;
                    }}>
                      Manage
                    </Link>
                  </div>

                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
};
