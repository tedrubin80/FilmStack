import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { festivalService, type CreateFestivalData } from '@/services/festivalService';

const C = {
  bg:           'oklch(0.09 0 0)',
  bgPanel:      'oklch(0.115 0 0)',
  ink:          'oklch(0.95 0.006 80)',
  inkMuted:     'oklch(0.70 0.008 80)',
  inkDim:       'oklch(0.68 0.007 80)',
  primary:      'oklch(0.72 0.165 68)',
  primaryHover: 'oklch(0.60 0.155 68)',
  accent:       'oklch(0.55 0.190 22)',
  border:       'oklch(0.20 0 0)',
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
  transition: 'border-color 0.15s',
};

const labelStyle: React.CSSProperties = {
  display: 'block',
  fontSize: '0.75rem', fontWeight: 600,
  letterSpacing: '0.08em', textTransform: 'uppercase',
  color: C.inkDim, marginBottom: '0.5rem',
};

const Field: React.FC<{
  label: string; error?: string; required?: boolean; children: React.ReactNode;
}> = ({ label, error, required, children }) => (
  <div>
    <label style={labelStyle}>
      {label} {required && <span style={{ color: C.accent }}>*</span>}
    </label>
    {children}
    {error && (
      <div style={{ marginTop: '0.375rem', fontSize: '0.8125rem', color: C.accent }}>{error}</div>
    )}
  </div>
);

export const CreateFestivalPage: React.FC = () => {
  const navigate = useNavigate();
  const [submitting, setSubmitting] = useState(false);
  const [data, setData] = useState<CreateFestivalData>({
    name: '', description: '', startDate: '', endDate: '',
    submissionDeadline: '', location: '', website: '',
    contactEmail: '', contactPhone: '', currency: 'USD',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  const set = (k: keyof CreateFestivalData, v: string | number) => {
    setData((p) => ({ ...p, [k]: v }));
    if (errors[k]) setErrors((p) => ({ ...p, [k]: '' }));
  };

  const validate = () => {
    const e: Record<string, string> = {};
    if (!data.name?.trim() || data.name.trim().length < 2) e.name = 'Name must be at least 2 characters.';
    if (data.startDate && data.endDate && new Date(data.startDate) > new Date(data.endDate)) e.endDate = 'End date must be after start date.';
    if (data.website && !data.website.match(/^https?:\/\/.+/)) e.website = 'Must start with http:// or https://';
    if (data.contactEmail && !data.contactEmail.match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)) e.contactEmail = 'Enter a valid email address.';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    setSubmitting(true);
    try {
      const res = await festivalService.createFestival({
        name: data.name!.trim(),
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
      if (res.success && res.data) {
        toast.success('Festival created');
        navigate(`/festivals/${res.data.festival.id}`);
      } else {
        throw new Error(res.message || 'Failed to create festival');
      }
    } catch (err: any) {
      toast.error(err?.response?.data?.message || err.message || 'Failed to create festival');
    } finally {
      setSubmitting(false);
    }
  };

  const focusBorder = (e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    e.currentTarget.style.borderColor = C.borderBright;
  };
  const blurBorder = (e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    e.currentTarget.style.borderColor = C.border;
  };

  return (
    <div style={{ fontFamily: "'Barlow', system-ui, sans-serif" }}>

      {/* Header */}
      <div style={{ marginBottom: '2.5rem' }}>
        <Link to="/festivals" style={{
          color: C.inkDim, textDecoration: 'none', fontSize: '0.875rem',
          fontWeight: 500, display: 'block', marginBottom: '1.25rem',
        }}>
          ← Festivals
        </Link>
        <h1 style={{
          fontFamily: "'Big Shoulders Display', sans-serif",
          fontWeight: 800,
          fontSize: 'clamp(2rem, 4vw, 2.75rem)',
          letterSpacing: '-0.01em',
          color: C.ink, lineHeight: 0.95,
        }}>
          CREATE FESTIVAL
        </h1>
      </div>

      <form onSubmit={handleSubmit}>
        <div style={{
          display: 'grid', gridTemplateColumns: '1fr 320px',
          gap: '3rem', alignItems: 'start',
        }}>

          {/* Main fields */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.75rem' }}>

            <Field label="Festival name" error={errors.name} required>
              <input type="text" style={inputStyle} value={data.name} required
                onChange={(e) => set('name', e.target.value)}
                onFocus={focusBorder} onBlur={blurBorder}
                placeholder="e.g. Spring Shorts Festival 2026" />
            </Field>

            <Field label="Description">
              <textarea rows={4} style={{ ...inputStyle, resize: 'vertical', lineHeight: 1.7 }}
                value={data.description} onChange={(e) => set('description', e.target.value)}
                onFocus={focusBorder} onBlur={blurBorder}
                placeholder="What is this festival about? Who is it for?" />
            </Field>

            <Field label="Location">
              <input type="text" style={inputStyle} value={data.location}
                onChange={(e) => set('location', e.target.value)}
                onFocus={focusBorder} onBlur={blurBorder}
                placeholder="New York City, NY" />
            </Field>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <Field label="Start date">
                <input type="date" style={inputStyle} value={data.startDate}
                  onChange={(e) => set('startDate', e.target.value)}
                  onFocus={focusBorder} onBlur={blurBorder} />
              </Field>
              <Field label="End date" error={errors.endDate}>
                <input type="date" style={{ ...inputStyle, borderColor: errors.endDate ? C.accent : C.border }}
                  value={data.endDate}
                  onChange={(e) => set('endDate', e.target.value)}
                  onFocus={focusBorder} onBlur={blurBorder} />
              </Field>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <Field label="Submission deadline">
                <input type="date" style={inputStyle} value={data.submissionDeadline}
                  onChange={(e) => set('submissionDeadline', e.target.value)}
                  onFocus={focusBorder} onBlur={blurBorder} />
              </Field>
              <Field label="Entry fee">
                <div style={{ position: 'relative' }}>
                  <span style={{
                    position: 'absolute', left: '0.875rem', top: '50%',
                    transform: 'translateY(-50%)',
                    color: C.inkDim, fontSize: '0.9375rem',
                  }}>$</span>
                  <input type="number" min="0" step="0.01"
                    style={{ ...inputStyle, paddingLeft: '1.5rem' }}
                    value={data.entryFee ?? ''} placeholder="0.00"
                    onChange={(e) => set('entryFee', e.target.value)}
                    onFocus={focusBorder} onBlur={blurBorder} />
                </div>
              </Field>
            </div>

            {/* Contact section */}
            <div>
              <div style={{
                fontFamily: "'Big Shoulders Display', sans-serif",
                fontWeight: 700, fontSize: '0.9rem', letterSpacing: '0.1em',
                textTransform: 'uppercase', color: C.inkDim,
                paddingBottom: '0.75rem', marginBottom: '1.25rem',
                borderBottom: `1px solid ${C.border}`,
              }}>
                Contact
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <Field label="Email" error={errors.contactEmail}>
                  <input type="email" style={{ ...inputStyle, borderColor: errors.contactEmail ? C.accent : C.border }}
                    value={data.contactEmail}
                    onChange={(e) => set('contactEmail', e.target.value)}
                    onFocus={focusBorder} onBlur={blurBorder}
                    placeholder="festival@example.com" />
                </Field>
                <Field label="Phone">
                  <input type="tel" style={inputStyle} value={data.contactPhone}
                    onChange={(e) => set('contactPhone', e.target.value)}
                    onFocus={focusBorder} onBlur={blurBorder}
                    placeholder="+1 (555) 123-4567" />
                </Field>
              </div>
            </div>

            <Field label="Website" error={errors.website}>
              <input type="url" style={{ ...inputStyle, borderColor: errors.website ? C.accent : C.border }}
                value={data.website}
                onChange={(e) => set('website', e.target.value)}
                onFocus={focusBorder} onBlur={blurBorder}
                placeholder="https://myfestival.com" />
            </Field>

          </div>

          {/* Sticky sidebar */}
          <div style={{ position: 'sticky', top: '5rem' }}>
            <div style={{
              background: C.bgPanel,
              border: `1px solid ${C.border}`,
              padding: '1.75rem',
            }}>
              <div style={{
                fontSize: '0.75rem', fontWeight: 600,
                letterSpacing: '0.1em', textTransform: 'uppercase',
                color: C.inkDim, marginBottom: '1rem',
              }}>
                Review &amp; submit
              </div>

              {data.name?.trim() && (
                <div style={{ marginBottom: '0.875rem', paddingBottom: '0.875rem', borderBottom: `1px solid ${C.border}` }}>
                  <div style={{ fontSize: '0.75rem', color: C.inkDim, marginBottom: '0.25rem' }}>Festival name</div>
                  <div style={{ fontSize: '0.9375rem', color: C.ink, fontWeight: 500 }}>{data.name}</div>
                </div>
              )}

              {data.startDate && (
                <div style={{ marginBottom: '0.875rem', paddingBottom: '0.875rem', borderBottom: `1px solid ${C.border}` }}>
                  <div style={{ fontSize: '0.75rem', color: C.inkDim, marginBottom: '0.25rem' }}>Dates</div>
                  <div style={{ fontSize: '0.9375rem', color: C.ink }}>
                    {new Date(data.startDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                    {data.endDate && ` — ${new Date(data.endDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`}
                  </div>
                </div>
              )}

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.625rem', marginTop: '1rem' }}>
                <button type="submit" disabled={submitting} style={{
                  width: '100%',
                  fontFamily: "'Big Shoulders Display', sans-serif",
                  fontWeight: 700, fontSize: '1rem', letterSpacing: '0.04em',
                  padding: '0.875rem',
                  background: C.primary, color: 'oklch(0.97 0 0)',
                  border: 'none', cursor: submitting ? 'not-allowed' : 'pointer',
                  opacity: submitting ? 0.6 : 1, transition: 'background 0.15s',
                }}
                onMouseEnter={(e) => { if (!submitting) e.currentTarget.style.background = C.primaryHover; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = C.primary; }}>
                  {submitting ? 'Creating…' : 'Create festival →'}
                </button>
                <Link to="/festivals" style={{
                  display: 'block', textAlign: 'center',
                  padding: '0.625rem',
                  fontSize: '0.9rem', color: C.inkDim,
                  textDecoration: 'none', border: `1px solid ${C.border}`,
                  transition: 'all 0.15s',
                }}
                onMouseEnter={(e) => { const el = e.currentTarget as HTMLElement; el.style.color = C.ink; el.style.borderColor = C.borderBright; }}
                onMouseLeave={(e) => { const el = e.currentTarget as HTMLElement; el.style.color = C.inkDim; el.style.borderColor = C.border; }}>
                  Cancel
                </Link>
              </div>
            </div>
          </div>

        </div>
      </form>
    </div>
  );
};
