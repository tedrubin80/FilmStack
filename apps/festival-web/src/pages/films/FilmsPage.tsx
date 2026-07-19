import React, { useEffect, useState, useCallback } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import api from '@/lib/api';
import { festivalService, type FestivalWithCounts } from '@/services/festivalService';
import type { Film } from '@/types';

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

const STATUS_OPTIONS = [
  { label: 'All', value: '' },
  { label: 'Pending', value: 'pending' },
  { label: 'Accepted', value: 'accepted' },
  { label: 'Rejected', value: 'rejected' },
  { label: 'Withdrawn', value: 'withdrawn' },
];

const STATUS_COLORS: Record<string, string> = {
  pending:   'oklch(0.80 0.12 75)',
  accepted:  'oklch(0.65 0.15 145)',
  rejected:  'oklch(0.60 0.19 22)',
  withdrawn: C.inkDim,
};

function fmt(s?: string | null) {
  if (!s) return '—';
  return new Date(s).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

export const FilmsPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const festivalFromUrl = searchParams.get('festival');
  const [festivals, setFestivals] = useState<FestivalWithCounts[]>([]);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [films, setFilms] = useState<Film[]>([]);
  const [loadingFests, setLoadingFests] = useState(true);
  const [loadingFilms, setLoadingFilms] = useState(false);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  useEffect(() => {
    festivalService.getFestivals({ limit: 50 })
      .then((res) => {
        if (res.success && res.data) {
          const fests = res.data.festivals;
          setFestivals(fests);
          const preselect = festivalFromUrl ? parseInt(festivalFromUrl) : null;
          if (preselect && fests.some((f) => f.id === preselect)) {
            setSelectedId(preselect);
          } else if (fests.length > 0) {
            setSelectedId(fests[0].id);
          }
        }
      })
      .catch(() => {})
      .finally(() => setLoadingFests(false));
  }, [festivalFromUrl]);

  const loadFilms = useCallback(async (festivalId: number) => {
    setLoadingFilms(true);
    setFilms([]);
    try {
      const params: Record<string, string> = {};
      if (statusFilter) params.status = statusFilter;
      const queryString = new URLSearchParams(params).toString();
      const url = `/films/festival/${festivalId}${queryString ? `?${queryString}` : ''}`;
      const res = await api.get(url);
      setFilms(res.data.data || []);
    } catch {
      setFilms([]);
    } finally {
      setLoadingFilms(false);
    }
  }, [statusFilter]);

  useEffect(() => {
    if (selectedId) loadFilms(selectedId);
  }, [selectedId, loadFilms]);

  const selectedFestival = festivals.find((f) => f.id === selectedId);

  const visible = films.filter((f) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      f.title.toLowerCase().includes(q) ||
      (f.director || '').toLowerCase().includes(q) ||
      (f.genre || '').toLowerCase().includes(q)
    );
  });

  return (
    <div style={{ fontFamily: "'Barlow', system-ui, sans-serif" }}>

      {/* Header */}
      <div style={{ marginBottom: '2.5rem' }}>
        <h1 style={{
          fontFamily: "'Big Shoulders Display', sans-serif",
          fontWeight: 800,
          fontSize: 'clamp(2.25rem, 4vw, 3rem)',
          letterSpacing: '-0.01em',
          color: C.ink, lineHeight: 0.95,
          marginBottom: '0.625rem',
        }}>
          FILMS
        </h1>
        <p style={{ color: C.inkMuted, fontSize: '1rem' }}>
          Review and manage film submissions by festival.
        </p>
      </div>

      {loadingFests ? (
        <div style={{ color: C.inkDim, fontSize: '0.9375rem' }}>Loading festivals…</div>
      ) : festivals.length === 0 ? (
        <div style={{
          border: `1px solid ${C.border}`, padding: '5rem 2rem',
          textAlign: 'center', color: C.inkDim,
        }}>
          No festivals found. Create a festival first before reviewing film submissions.
        </div>
      ) : (
        <>
          {/* Festival selector */}
          <div style={{ marginBottom: '2rem' }}>
            <div style={{
              fontSize: '0.6875rem', fontWeight: 600,
              letterSpacing: '0.1em', textTransform: 'uppercase',
              color: C.inkDim, marginBottom: '0.625rem',
            }}>
              Festival
            </div>
            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
              {festivals.map((f) => (
                <button key={f.id} onClick={() => setSelectedId(f.id)} style={{
                  fontFamily: "'Barlow', system-ui, sans-serif",
                  fontWeight: 500, fontSize: '0.9375rem',
                  padding: '0.5rem 1rem',
                  border: `1px solid ${selectedId === f.id ? C.primary : C.border}`,
                  background: selectedId === f.id ? C.primary : 'transparent',
                  color: selectedId === f.id ? 'oklch(0.97 0 0)' : C.inkMuted,
                  cursor: 'pointer', transition: 'all 0.15s',
                  display: 'flex', alignItems: 'center', gap: '0.5rem',
                }}>
                  {f.name}
                  {f._count?.films > 0 && (
                    <span style={{
                      fontSize: '0.75rem', fontWeight: 600,
                      padding: '0.125rem 0.375rem',
                      background: selectedId === f.id ? 'oklch(0.97 0 0 / 0.25)' : C.bgRaised,
                      color: selectedId === f.id ? 'oklch(0.97 0 0)' : C.inkDim,
                    }}>
                      {f._count.films}
                    </span>
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Filters */}
          <div style={{
            display: 'flex', gap: '1rem', marginBottom: '1.5rem',
            flexWrap: 'wrap', alignItems: 'center',
          }}>
            <input
              type="search"
              placeholder="Search by title, director, genre…"
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
              {STATUS_OPTIONS.map(({ label, value }) => (
                <button key={value} onClick={() => setStatusFilter(value)} style={{
                  fontFamily: "'Barlow', system-ui, sans-serif",
                  fontWeight: 500, fontSize: '0.8125rem', letterSpacing: '0.04em',
                  padding: '0.375rem 0.75rem',
                  border: `1px solid ${statusFilter === value ? C.primary : C.border}`,
                  background: statusFilter === value ? C.primary : 'transparent',
                  color: statusFilter === value ? 'oklch(0.97 0 0)' : C.inkDim,
                  cursor: 'pointer', transition: 'all 0.15s',
                }}>
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* Films table */}
          {loadingFilms ? (
            <div style={{ border: `1px solid ${C.border}` }}>
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} style={{
                  padding: '1.125rem 1.5rem',
                  borderBottom: i < 4 ? `1px solid ${C.border}` : 'none',
                  display: 'grid', gridTemplateColumns: '3fr 1.5fr 0.75fr 0.75fr 1fr',
                  gap: '1rem', alignItems: 'center',
                }}>
                  <div>
                    <div style={{ height: '0.875rem', width: '50%', background: C.bgRaised, borderRadius: '2px', marginBottom: '0.5rem' }} />
                    <div style={{ height: '0.75rem', width: '30%', background: C.bgRaised, borderRadius: '2px' }} />
                  </div>
                  {[1, 2, 3, 4].map((k) => (
                    <div key={k} style={{ height: '0.75rem', width: '70%', background: C.bgRaised, borderRadius: '2px' }} />
                  ))}
                </div>
              ))}
            </div>
          ) : visible.length === 0 ? (
            <div style={{
              border: `1px solid ${C.border}`, padding: '5rem 2rem',
              textAlign: 'center', color: C.inkDim,
            }}>
              {films.length === 0
                ? `No submissions yet for ${selectedFestival?.name || 'this festival'}.`
                : 'No films match your search.'}
            </div>
          ) : (
            <>
              <div style={{
                display: 'grid',
                gridTemplateColumns: '3fr 1.5fr 0.75fr 0.75fr 1fr',
                padding: '0.5rem 1.5rem',
                borderBottom: `1px solid ${C.border}`,
                gap: '1rem',
              }}>
                {['Film', 'Director', 'Genre', 'Year', 'Status'].map((h) => (
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
                {visible.map((film, i) => (
                  <div key={film.id} role="button" tabIndex={0}
                    onClick={() => navigate(`/films/${film.id}`)}
                    onKeyDown={(e) => { if (e.key === 'Enter') navigate(`/films/${film.id}`); }}
                    style={{
                    display: 'grid',
                    gridTemplateColumns: '3fr 1.5fr 0.75fr 0.75fr 1fr',
                    padding: '1.125rem 1.5rem',
                    borderBottom: i < visible.length - 1 ? `1px solid ${C.border}` : 'none',
                    alignItems: 'center', gap: '1rem',
                    transition: 'background 0.12s',
                    cursor: 'pointer',
                  }}
                  onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = C.bgPanel; }}
                  onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = 'transparent'; }}>

                    <div style={{ minWidth: 0 }}>
                      <div style={{
                        fontSize: '0.9375rem', fontWeight: 600, color: C.ink,
                        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                      }}>
                        {film.title}
                      </div>
                      {film.country && (
                        <div style={{ fontSize: '0.8125rem', color: C.inkDim, marginTop: '0.125rem' }}>
                          {film.country}{film.language ? ` · ${film.language}` : ''}
                        </div>
                      )}
                    </div>

                    <div style={{ fontSize: '0.875rem', color: C.inkMuted, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {film.director || '—'}
                    </div>

                    <div style={{ fontSize: '0.875rem', color: C.inkMuted }}>
                      {film.genre || '—'}
                    </div>

                    <div style={{ fontSize: '0.875rem', color: C.inkMuted }}>
                      {film.year || '—'}
                    </div>

                    <div>
                      <span style={{
                        fontSize: '0.6875rem', fontWeight: 600,
                        letterSpacing: '0.07em', textTransform: 'uppercase',
                        color: STATUS_COLORS[film.status] || C.inkDim,
                      }}>
                        {film.status}
                      </span>
                      <div style={{ fontSize: '0.75rem', color: C.inkDim, marginTop: '0.125rem' }}>
                        {fmt(film.submissionDate)}
                      </div>
                    </div>

                  </div>
                ))}
              </div>

              <div style={{ padding: '0.875rem 1.5rem', fontSize: '0.8125rem', color: C.inkDim }}>
                {visible.length} of {films.length} submission{films.length !== 1 ? 's' : ''} shown
              </div>
            </>
          )}
        </>
      )}
    </div>
  );
};
