import React, { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import api from '@/lib/api';
import type { Film } from '@/types';

const C = {
  bgPanel: 'oklch(0.115 0 0)',
  ink: 'oklch(0.95 0.006 80)',
  inkMuted: 'oklch(0.70 0.008 80)',
  inkDim: 'oklch(0.68 0.007 80)',
  primary: 'oklch(0.72 0.165 68)',
  accent: 'oklch(0.55 0.190 22)',
  border: 'oklch(0.20 0 0)',
};

const STATUSES = ['pending', 'accepted', 'rejected', 'withdrawn'] as const;

export const FilmDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [film, setFilm] = useState<Film | null>(null);
  const [loading, setLoading] = useState(true);
  const [notes, setNotes] = useState('');
  const [updating, setUpdating] = useState(false);

  useEffect(() => {
    if (!id) return;
    api.get(`/films/${id}`)
      .then((res) => setFilm(res.data.data))
      .catch(() => toast.error('Failed to load film'))
      .finally(() => setLoading(false));
  }, [id]);

  const updateStatus = async (status: string) => {
    if (!id) return;
    setUpdating(true);
    try {
      await api.put(`/films/${id}/status`, { status, notes: notes || undefined });
      toast.success(`Status updated to ${status}`);
      setFilm((f) => f ? { ...f, status } : f);
    } catch {
      toast.error('Failed to update status');
    } finally {
      setUpdating(false);
    }
  };

  if (loading) return <p style={{ color: C.inkMuted }}>Loading submission...</p>;
  if (!film) return <p style={{ color: C.accent }}>Film not found.</p>;

  return (
    <div style={{ fontFamily: "'Barlow', system-ui, sans-serif", maxWidth: '800px' }}>
      <Link to="/films" style={{ color: C.inkDim, textDecoration: 'none', fontSize: '0.875rem', display: 'block', marginBottom: '1.25rem' }}>
        ← All submissions
      </Link>

      <div style={{ marginBottom: '2rem' }}>
        <span style={{
          fontSize: '0.6875rem', fontWeight: 600, letterSpacing: '0.08em',
          textTransform: 'uppercase', color: C.primary,
        }}>
          {film.status}
        </span>
        <h1 style={{
          fontFamily: "'Big Shoulders Display', sans-serif", fontWeight: 800,
          fontSize: 'clamp(2rem, 4vw, 2.75rem)', lineHeight: 0.95, marginTop: '0.5rem',
        }}>
          {film.title}
        </h1>
        {film.director && <p style={{ color: C.inkMuted, marginTop: '0.5rem' }}>Dir. {film.director}</p>}
      </div>

      <div style={{ border: `1px solid ${C.border}`, background: C.bgPanel, padding: '1.5rem', marginBottom: '1.5rem' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', fontSize: '0.9375rem' }}>
          {[
            ['Genre', film.genre],
            ['Year', film.year],
            ['Duration', film.duration ? `${film.duration} min` : null],
            ['Country', film.country],
            ['Language', film.language],
            ['Submitted', new Date(film.submissionDate).toLocaleDateString()],
            ['Contact', film.contactEmail],
          ].map(([label, value]) => value ? (
            <div key={label as string}>
              <div style={{ fontSize: '0.6875rem', color: C.inkDim, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '0.25rem' }}>{label}</div>
              <div style={{ color: C.inkMuted }}>{value}</div>
            </div>
          ) : null)}
        </div>
        {film.synopsis && (
          <div style={{ marginTop: '1.5rem', paddingTop: '1.5rem', borderTop: `1px solid ${C.border}` }}>
            <div style={{ fontSize: '0.6875rem', color: C.inkDim, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '0.5rem' }}>Synopsis</div>
            <p style={{ color: C.inkMuted, lineHeight: 1.7 }}>{film.synopsis}</p>
          </div>
        )}
        {film.notes && (
          <div style={{ marginTop: '1rem' }}>
            <div style={{ fontSize: '0.6875rem', color: C.inkDim, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '0.5rem' }}>Internal notes</div>
            <p style={{ color: C.inkDim, fontSize: '0.875rem' }}>{film.notes}</p>
          </div>
        )}
      </div>

      <div style={{ border: `1px solid ${C.border}`, background: C.bgPanel, padding: '1.5rem' }}>
        <h2 style={{
          fontFamily: "'Big Shoulders Display', sans-serif", fontWeight: 700,
          fontSize: '0.9rem', letterSpacing: '0.1em', textTransform: 'uppercase',
          color: C.inkDim, marginBottom: '1rem',
        }}>
          Review decision
        </h2>
        <textarea
          rows={3}
          placeholder="Optional notes for the filmmaker..."
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          style={{
            width: '100%', background: 'oklch(0.09 0 0)', border: `1px solid ${C.border}`,
            color: C.ink, padding: '0.75rem', marginBottom: '1rem', fontFamily: 'inherit',
          }}
        />
        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
          {STATUSES.map((s) => (
            <button
              key={s}
              disabled={updating || film.status === s}
              onClick={() => updateStatus(s)}
              style={{
                padding: '0.625rem 1.25rem', border: `1px solid ${film.status === s ? C.primary : C.border}`,
                background: film.status === s ? C.primary : 'transparent',
                color: film.status === s ? 'oklch(0.97 0 0)' : C.inkMuted,
                cursor: updating ? 'not-allowed' : 'pointer',
                textTransform: 'capitalize', fontSize: '0.875rem',
              }}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      {film.festivalId && (
        <button onClick={() => navigate(`/festivals/${film.festivalId}`)} style={{
          marginTop: '1.5rem', background: 'none', border: 'none', color: C.primary,
          cursor: 'pointer', fontSize: '0.875rem',
        }}>
          View festival →
        </button>
      )}
    </div>
  );
};
