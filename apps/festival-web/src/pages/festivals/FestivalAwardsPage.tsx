import React, { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import api from '@/lib/api';

const C = {
  bgPanel: 'oklch(0.115 0 0)',
  ink: 'oklch(0.95 0.006 80)',
  inkMuted: 'oklch(0.70 0.008 80)',
  inkDim: 'oklch(0.68 0.007 80)',
  primary: 'oklch(0.72 0.165 68)',
  border: 'oklch(0.20 0 0)',
};

interface Award {
  id: number;
  awardName: string;
  category?: string;
  recipientName?: string;
  year?: number;
  film?: { title: string; director?: string };
}

export const FestivalAwardsPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [awards, setAwards] = useState<Award[]>([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ awardName: '', category: '', recipientName: '', year: new Date().getFullYear() });
  const [submitting, setSubmitting] = useState(false);

  const load = () => {
    if (!id) return;
    api.get(`/awards/festival/${id}`)
      .then((res) => setAwards(res.data.data || []))
      .catch(() => toast.error('Failed to load awards'))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, [id]);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id) return;
    setSubmitting(true);
    try {
      await api.post('/awards', {
        festivalId: parseInt(id),
        awardName: form.awardName,
        category: form.category || undefined,
        recipientName: form.recipientName || undefined,
        year: form.year,
      });
      toast.success('Award created');
      setForm({ awardName: '', category: '', recipientName: '', year: new Date().getFullYear() });
      load();
    } catch {
      toast.error('Failed to create award');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div style={{ fontFamily: "'Barlow', system-ui, sans-serif" }}>
      <Link to={`/festivals/${id}`} style={{ color: C.inkDim, textDecoration: 'none', fontSize: '0.875rem', display: 'block', marginBottom: '1.25rem' }}>
        ← Back to festival
      </Link>
      <h1 style={{ fontFamily: "'Big Shoulders Display', sans-serif", fontWeight: 800, fontSize: '2.25rem', marginBottom: '2rem' }}>
        Awards
      </h1>

      <form onSubmit={handleAdd} style={{
        display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
        gap: '0.75rem', padding: '1.25rem', border: `1px solid ${C.border}`,
        background: C.bgPanel, marginBottom: '2rem', alignItems: 'end',
      }}>
        <input required placeholder="Award name" value={form.awardName} onChange={(e) => setForm((p) => ({ ...p, awardName: e.target.value }))}
          style={{ background: 'oklch(0.09 0 0)', border: `1px solid ${C.border}`, color: C.ink, padding: '0.625rem 0.875rem' }} />
        <input placeholder="Category" value={form.category} onChange={(e) => setForm((p) => ({ ...p, category: e.target.value }))}
          style={{ background: 'oklch(0.09 0 0)', border: `1px solid ${C.border}`, color: C.ink, padding: '0.625rem 0.875rem' }} />
        <input placeholder="Recipient" value={form.recipientName} onChange={(e) => setForm((p) => ({ ...p, recipientName: e.target.value }))}
          style={{ background: 'oklch(0.09 0 0)', border: `1px solid ${C.border}`, color: C.ink, padding: '0.625rem 0.875rem' }} />
        <input type="number" placeholder="Year" value={form.year} onChange={(e) => setForm((p) => ({ ...p, year: parseInt(e.target.value) }))}
          style={{ background: 'oklch(0.09 0 0)', border: `1px solid ${C.border}`, color: C.ink, padding: '0.625rem 0.875rem' }} />
        <button type="submit" disabled={submitting} style={{
          background: C.primary, color: 'oklch(0.97 0 0)', border: 'none',
          padding: '0.625rem 1rem', cursor: 'pointer', fontWeight: 600,
        }}>
          Add award
        </button>
      </form>

      {loading ? (
        <p style={{ color: C.inkMuted }}>Loading awards...</p>
      ) : awards.length === 0 ? (
        <p style={{ color: C.inkDim, padding: '2rem', border: `1px dashed ${C.border}`, textAlign: 'center' }}>
          No awards issued yet.
        </p>
      ) : (
        <div style={{ border: `1px solid ${C.border}` }}>
          {awards.map((a, i) => (
            <div key={a.id} style={{
              padding: '1rem 1.25rem', background: C.bgPanel,
              borderBottom: i < awards.length - 1 ? `1px solid ${C.border}` : 'none',
              display: 'flex', justifyContent: 'space-between', gap: '1rem',
            }}>
              <div>
                <div style={{ fontWeight: 600 }}>{a.awardName}</div>
                <div style={{ fontSize: '0.8125rem', color: C.inkDim }}>
                  {[a.category, a.recipientName, a.film?.title].filter(Boolean).join(' · ')}
                </div>
              </div>
              {a.year && <span style={{ color: C.primary, fontSize: '0.875rem' }}>{a.year}</span>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
