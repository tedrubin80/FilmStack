import React, { useEffect, useState } from 'react';
import { useNavigate, Link, useParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import { festivalService, type CreateFestivalData } from '@/services/festivalService';

const C = {
  bg: 'oklch(0.09 0 0)',
  bgPanel: 'oklch(0.115 0 0)',
  ink: 'oklch(0.95 0.006 80)',
  inkMuted: 'oklch(0.70 0.008 80)',
  inkDim: 'oklch(0.68 0.007 80)',
  primary: 'oklch(0.72 0.165 68)',
  primaryHover: 'oklch(0.60 0.155 68)',
  accent: 'oklch(0.55 0.190 22)',
  border: 'oklch(0.20 0 0)',
  borderBright: 'oklch(0.30 0.004 80)',
};

const inputStyle: React.CSSProperties = {
  width: '100%',
  background: C.bg,
  border: `1px solid ${C.border}`,
  color: C.ink,
  padding: '0.625rem 0.875rem',
  fontSize: '0.9375rem',
  fontFamily: "'Barlow', system-ui, sans-serif",
  outline: 'none',
};

function toDateInput(v?: string | null) {
  if (!v) return '';
  return v.slice(0, 10);
}

export const EditFestivalPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [data, setData] = useState<CreateFestivalData>({ name: '', currency: 'USD' });

  useEffect(() => {
    if (!id) return;
    festivalService.getFestival(parseInt(id))
      .then((res) => {
        if (res.success && res.data?.festival) {
          const f = res.data.festival;
          setData({
            name: f.name,
            description: f.description || '',
            startDate: toDateInput(f.startDate),
            endDate: toDateInput(f.endDate),
            submissionDeadline: toDateInput(f.submissionDeadline),
            location: f.location || '',
            website: f.website || '',
            contactEmail: f.contactEmail || '',
            contactPhone: f.contactPhone || '',
            currency: f.currency || 'USD',
            entryFee: f.entryFee ?? undefined,
          });
        }
      })
      .catch(() => toast.error('Failed to load festival'))
      .finally(() => setLoading(false));
  }, [id]);

  const set = (k: keyof CreateFestivalData, v: string | number) => {
    setData((p) => ({ ...p, [k]: v }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id || !data.name?.trim()) return;
    setSubmitting(true);
    try {
      const res = await festivalService.updateFestival(parseInt(id), {
        name: data.name.trim(),
        description: data.description?.trim() || undefined,
        startDate: data.startDate || undefined,
        endDate: data.endDate || undefined,
        submissionDeadline: data.submissionDeadline || undefined,
        location: data.location?.trim() || undefined,
        website: data.website?.trim() || undefined,
        contactEmail: data.contactEmail?.trim() || undefined,
        contactPhone: data.contactPhone?.trim() || undefined,
        currency: data.currency || 'USD',
        entryFee: data.entryFee ? Number(data.entryFee) : undefined,
      });
      if (res.success) {
        toast.success('Festival updated');
        navigate(`/festivals/${id}`);
      }
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      toast.error(msg || 'Failed to update festival');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <p style={{ color: C.inkMuted }}>Loading festival...</p>;

  return (
    <div style={{ fontFamily: "'Barlow', system-ui, sans-serif", maxWidth: '720px' }}>
      <Link to={`/festivals/${id}`} style={{ color: C.inkDim, textDecoration: 'none', fontSize: '0.875rem', display: 'block', marginBottom: '1.25rem' }}>
        ← Back to festival
      </Link>
      <h1 style={{ fontFamily: "'Big Shoulders Display', sans-serif", fontWeight: 800, fontSize: '2.25rem', marginBottom: '2rem' }}>
        Edit festival
      </h1>

      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
        <div>
          <label style={{ display: 'block', fontSize: '0.75rem', color: C.inkDim, marginBottom: '0.5rem', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Name *</label>
          <input required value={data.name} onChange={(e) => set('name', e.target.value)} style={inputStyle} />
        </div>
        <div>
          <label style={{ display: 'block', fontSize: '0.75rem', color: C.inkDim, marginBottom: '0.5rem', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Description</label>
          <textarea rows={4} value={data.description || ''} onChange={(e) => set('description', e.target.value)} style={{ ...inputStyle, resize: 'vertical' }} />
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
          <div>
            <label style={{ display: 'block', fontSize: '0.75rem', color: C.inkDim, marginBottom: '0.5rem', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Start date</label>
            <input type="date" value={data.startDate || ''} onChange={(e) => set('startDate', e.target.value)} style={inputStyle} />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: '0.75rem', color: C.inkDim, marginBottom: '0.5rem', textTransform: 'uppercase', letterSpacing: '0.08em' }}>End date</label>
            <input type="date" value={data.endDate || ''} onChange={(e) => set('endDate', e.target.value)} style={inputStyle} />
          </div>
        </div>
        <div>
          <label style={{ display: 'block', fontSize: '0.75rem', color: C.inkDim, marginBottom: '0.5rem', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Submission deadline</label>
          <input type="date" value={data.submissionDeadline || ''} onChange={(e) => set('submissionDeadline', e.target.value)} style={inputStyle} />
        </div>
        <div>
          <label style={{ display: 'block', fontSize: '0.75rem', color: C.inkDim, marginBottom: '0.5rem', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Location</label>
          <input value={data.location || ''} onChange={(e) => set('location', e.target.value)} style={inputStyle} />
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
          <div>
            <label style={{ display: 'block', fontSize: '0.75rem', color: C.inkDim, marginBottom: '0.5rem', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Entry fee</label>
            <input type="number" min={0} step="0.01" value={data.entryFee ?? ''} onChange={(e) => set('entryFee', e.target.value)} style={inputStyle} />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: '0.75rem', color: C.inkDim, marginBottom: '0.5rem', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Currency</label>
            <select value={data.currency || 'USD'} onChange={(e) => set('currency', e.target.value)} style={inputStyle}>
              {['USD', 'EUR', 'GBP', 'CAD'].map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
        </div>
        <button type="submit" disabled={submitting} style={{
          alignSelf: 'flex-start', background: C.primary, color: 'oklch(0.97 0 0)',
          border: 'none', padding: '0.875rem 1.5rem', cursor: 'pointer',
          fontFamily: "'Big Shoulders Display', sans-serif", fontWeight: 700, letterSpacing: '0.04em',
        }}>
          {submitting ? 'Saving...' : 'Save changes →'}
        </button>
      </form>
    </div>
  );
};
