import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import api from '@/lib/api';
import { C } from '@/components/auth/AuthLayout';

interface PlatformStats {
  overview: {
    totalTenants: number;
    activeTenants: number;
    inactiveTenants: number;
    totalFestivals: number;
    totalFilms: number;
    totalPayments: number;
  };
  planDistribution: Record<string, number>;
  monthlySignups: Array<{ month: string; count: number }>;
  recentTenants: Array<{
    id: number;
    name: string;
    subdomain: string;
    createdAt: string;
    planType: string;
  }>;
}

const STAT_LABELS = [
  { key: 'totalTenants', label: 'Total tenants' },
  { key: 'activeTenants', label: 'Active tenants' },
  { key: 'totalFestivals', label: 'Festivals' },
  { key: 'totalFilms', label: 'Submissions' },
  { key: 'totalPayments', label: 'Payments' },
  { key: 'inactiveTenants', label: 'Inactive tenants' },
] as const;

export default function AdminDashboard() {
  const navigate = useNavigate();
  const [stats, setStats] = useState<PlatformStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/platform-admin/stats')
      .then((res) => setStats(res.data.data))
      .catch(() => toast.error('Failed to load platform statistics'))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return <p style={{ color: C.inkMuted }}>Loading platform stats...</p>;
  }

  if (!stats) return null;

  const maxSignup = Math.max(...stats.monthlySignups.map((m) => m.count), 1);

  return (
    <div style={{ fontFamily: "'Barlow', system-ui, sans-serif" }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '1.5rem', marginBottom: '2.5rem', flexWrap: 'wrap' }}>
        <div>
          <h1 style={{
            fontFamily: "'Big Shoulders Display', sans-serif",
            fontWeight: 800, fontSize: 'clamp(2rem, 4vw, 2.75rem)',
            letterSpacing: '-0.01em', lineHeight: 0.95, marginBottom: '0.5rem',
          }}>
            Platform admin.
          </h1>
          <p style={{ color: C.inkMuted, fontSize: '1rem' }}>Monitor tenants and platform health across FestScout.</p>
        </div>
        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <Link to="/admin/tenants" style={{
            background: C.primary, color: 'oklch(0.97 0 0)', textDecoration: 'none',
            fontFamily: "'Big Shoulders Display', sans-serif", fontWeight: 700,
            fontSize: '0.9375rem', letterSpacing: '0.04em', padding: '0.75rem 1.25rem',
          }}>
            Manage tenants →
          </Link>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '1px', background: C.border, marginBottom: '2.5rem' }}>
        {STAT_LABELS.map(({ key, label }) => (
          <div key={key} style={{ background: C.bgPanel, padding: '1.5rem' }}>
            <div style={{
              fontFamily: "'Big Shoulders Display', sans-serif", fontWeight: 900,
              fontSize: '2rem', color: C.ink, lineHeight: 1, marginBottom: '0.5rem',
            }}>
              {stats.overview[key].toLocaleString()}
            </div>
            <div style={{ fontSize: '0.8125rem', color: C.inkDim, letterSpacing: '0.06em', textTransform: 'uppercase' }}>
              {label}
            </div>
          </div>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem' }}>
        <section style={{ border: `1px solid ${C.border}`, background: C.bgPanel, padding: '1.5rem' }}>
          <h2 style={{
            fontFamily: "'Big Shoulders Display', sans-serif", fontWeight: 700,
            fontSize: '0.9rem', letterSpacing: '0.1em', textTransform: 'uppercase',
            color: C.inkDim, marginBottom: '1.25rem',
          }}>
            Plan distribution
          </h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.875rem' }}>
            {Object.entries(stats.planDistribution).map(([plan, count]) => (
              <div key={plan} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ textTransform: 'capitalize', color: C.inkMuted }}>{plan}</span>
                <span style={{ color: C.primary, fontWeight: 600 }}>{count}</span>
              </div>
            ))}
            {Object.keys(stats.planDistribution).length === 0 && (
              <p style={{ color: C.inkDim, fontSize: '0.875rem' }}>No tenants yet.</p>
            )}
          </div>
        </section>

        <section style={{ border: `1px solid ${C.border}`, background: C.bgPanel, padding: '1.5rem' }}>
          <h2 style={{
            fontFamily: "'Big Shoulders Display', sans-serif", fontWeight: 700,
            fontSize: '0.9rem', letterSpacing: '0.1em', textTransform: 'uppercase',
            color: C.inkDim, marginBottom: '1.25rem',
          }}>
            Recent tenants
          </h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {stats.recentTenants.map((t) => (
              <button
                key={t.id}
                onClick={() => navigate(`/admin/tenants/${t.id}`)}
                style={{
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  background: 'transparent', border: `1px solid ${C.border}`, padding: '0.875rem 1rem',
                  cursor: 'pointer', textAlign: 'left', color: C.ink,
                }}
              >
                <div>
                  <div style={{ fontWeight: 600 }}>{t.name}</div>
                  <div style={{ fontSize: '0.8125rem', color: C.inkDim }}>{t.subdomain}.{import.meta.env.VITE_ROOT_DOMAIN || 'localhost'}</div>
                </div>
                <span style={{ fontSize: '0.75rem', color: C.primary, textTransform: 'capitalize' }}>{t.planType}</span>
              </button>
            ))}
          </div>
        </section>
      </div>

      {stats.monthlySignups.length > 0 && (
        <section style={{ marginTop: '2.5rem', border: `1px solid ${C.border}`, background: C.bgPanel, padding: '1.5rem' }}>
          <h2 style={{
            fontFamily: "'Big Shoulders Display', sans-serif", fontWeight: 700,
            fontSize: '0.9rem', letterSpacing: '0.1em', textTransform: 'uppercase',
            color: C.inkDim, marginBottom: '1.5rem',
          }}>
            Monthly signups
          </h2>
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: '0.5rem', height: '10rem' }}>
            {stats.monthlySignups.map((m) => (
              <div key={m.month} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem' }}>
                <div style={{
                  width: '100%', background: C.primary,
                  height: `${(m.count / maxSignup) * 100}%`,
                  minHeight: m.count > 0 ? '4px' : 0,
                }} />
                <span style={{ fontSize: '0.6875rem', color: C.inkDim }}>
                  {new Date(m.month).toLocaleDateString('en-US', { month: 'short' })}
                </span>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
