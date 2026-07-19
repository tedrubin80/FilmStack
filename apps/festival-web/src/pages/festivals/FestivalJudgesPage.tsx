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

interface Judge {
  id: number;
  firstName: string;
  lastName: string;
  email: string;
  expertise?: string;
  isActive: boolean;
}

export const FestivalJudgesPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [judges, setJudges] = useState<Judge[]>([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ firstName: '', lastName: '', email: '', expertise: '' });
  const [submitting, setSubmitting] = useState(false);

  const load = () => {
    if (!id) return;
    api.get(`/judges/festival/${id}`)
      .then((res) => setJudges(res.data.data || []))
      .catch(() => toast.error('Failed to load judges'))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, [id]);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id) return;
    setSubmitting(true);
    try {
      await api.post('/judges', { ...form, festivalId: parseInt(id) });
      toast.success('Judge added');
      setForm({ firstName: '', lastName: '', email: '', expertise: '' });
      load();
    } catch {
      toast.error('Failed to add judge');
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
        Judges
      </h1>

      <form onSubmit={handleAdd} style={{
        display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
        gap: '0.75rem', padding: '1.25rem', border: `1px solid ${C.border}`,
        background: C.bgPanel, marginBottom: '2rem', alignItems: 'end',
      }}>
        {(['firstName', 'lastName', 'email', 'expertise'] as const).map((field) => (
          <input
            key={field}
            required={field !== 'expertise'}
            placeholder={field === 'firstName' ? 'First name' : field === 'lastName' ? 'Last name' : field === 'email' ? 'Email' : 'Expertise (optional)'}
            type={field === 'email' ? 'email' : 'text'}
            value={form[field]}
            onChange={(e) => setForm((p) => ({ ...p, [field]: e.target.value }))}
            style={{ background: 'oklch(0.09 0 0)', border: `1px solid ${C.border}`, color: C.ink, padding: '0.625rem 0.875rem' }}
          />
        ))}
        <button type="submit" disabled={submitting} style={{
          background: C.primary, color: 'oklch(0.97 0 0)', border: 'none',
          padding: '0.625rem 1rem', cursor: 'pointer', fontWeight: 600,
        }}>
          Add judge
        </button>
      </form>

      {loading ? (
        <p style={{ color: C.inkMuted }}>Loading judges...</p>
      ) : judges.length === 0 ? (
        <p style={{ color: C.inkDim, padding: '2rem', border: `1px dashed ${C.border}`, textAlign: 'center' }}>
          No judges assigned yet.
        </p>
      ) : (
        <div style={{ border: `1px solid ${C.border}` }}>
          {judges.map((j, i) => (
            <div key={j.id} style={{
              padding: '1rem 1.25rem', background: C.bgPanel,
              borderBottom: i < judges.length - 1 ? `1px solid ${C.border}` : 'none',
              display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1rem',
            }}>
              <div>
                <div style={{ fontWeight: 600 }}>{j.firstName} {j.lastName}</div>
                <div style={{ fontSize: '0.8125rem', color: C.inkDim }}>{j.email}{j.expertise ? ` · ${j.expertise}` : ''}</div>
              </div>
              <Link to={`/festivals/${id}/judging/${j.id}`} style={{
                fontSize: '0.8125rem', color: C.primary, textDecoration: 'none', fontWeight: 600,
                padding: '0.375rem 0.75rem', border: `1px solid ${C.primary}`,
              }}>
                Score films →
              </Link>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
