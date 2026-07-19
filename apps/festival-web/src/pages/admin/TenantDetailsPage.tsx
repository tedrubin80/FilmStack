import React, { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import api from '@/lib/api';
import { C } from '@/components/auth/AuthLayout';

interface TenantDetails {
  id: number;
  name: string;
  subdomain: string;
  email: string;
  planType: string;
  isActive: boolean;
  createdAt: string;
  storageUsed: number;
  storageLimit: number;
  apiEnabled: boolean;
  apiRateLimit: number;
  customDomain: string | null;
  settings: string;
  securitySettings: string;
  adminUsers: Array<{
    id: number;
    username: string;
    email: string;
    firstName: string;
    lastName: string;
    role: string;
    isActive: boolean;
    lastLogin: string | null;
  }>;
  festivals: Array<{ id: number; name: string; startDate: string | null; endDate: string | null; isActive: boolean }>;
  films: Array<{ id: number; title: string; director: string; status: string; submissionDate: string }>;
  _count: { adminUsers: number; festivals: number; films: number; payments: number };
}

const TABS = ['overview', 'users', 'festivals', 'films'] as const;
type Tab = typeof TABS[number];

export default function TenantDetailsPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [tenant, setTenant] = useState<TenantDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<Tab>('overview');

  useEffect(() => {
    if (!id) return;
    api.get(`/platform-admin/tenants/${id}`)
      .then((res) => setTenant(res.data.data.tenant))
      .catch(() => { toast.error('Failed to load tenant'); navigate('/admin/tenants'); })
      .finally(() => setLoading(false));
  }, [id, navigate]);

  const toggleStatus = async () => {
    if (!tenant) return;
    try {
      await api.put(`/platform-admin/tenants/${tenant.id}`, { isActive: !tenant.isActive });
      toast.success(`Tenant ${tenant.isActive ? 'deactivated' : 'activated'}`);
      setTenant({ ...tenant, isActive: !tenant.isActive });
    } catch {
      toast.error('Failed to update tenant');
    }
  };

  if (loading) return <p style={{ color: C.inkMuted }}>Loading tenant...</p>;
  if (!tenant) return null;

  let security: Record<string, unknown> = {};
  try { security = JSON.parse(tenant.securitySettings || '{}'); } catch { /* ignore */ }

  return (
    <div style={{ fontFamily: "'Barlow', system-ui, sans-serif" }}>
      <Link to="/admin/tenants" style={{ color: C.inkDim, textDecoration: 'none', fontSize: '0.875rem', display: 'block', marginBottom: '1.25rem' }}>
        ← All tenants
      </Link>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '1.5rem', marginBottom: '2rem', flexWrap: 'wrap' }}>
        <div>
          <h1 style={{
            fontFamily: "'Big Shoulders Display', sans-serif", fontWeight: 800,
            fontSize: 'clamp(1.75rem, 4vw, 2.5rem)', lineHeight: 0.95,
          }}>
            {tenant.name}
          </h1>
          <p style={{ color: C.inkMuted, marginTop: '0.5rem' }}>{tenant.subdomain}.{import.meta.env.VITE_ROOT_DOMAIN || 'localhost'}</p>
        </div>
        <button onClick={toggleStatus} style={{
          background: 'transparent', border: `1px solid ${tenant.isActive ? 'oklch(0.55 0.19 22 / 0.5)' : C.primary}`,
          color: tenant.isActive ? 'oklch(0.75 0.16 22)' : C.primary,
          padding: '0.625rem 1.25rem', cursor: 'pointer', fontSize: '0.875rem',
        }}>
          {tenant.isActive ? 'Deactivate tenant' : 'Activate tenant'}
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: '1px', background: C.border, marginBottom: '2rem' }}>
        {[
          { label: 'Plan', value: tenant.planType },
          { label: 'Status', value: tenant.isActive ? 'Active' : 'Inactive' },
          { label: 'Users', value: String(tenant._count.adminUsers) },
          { label: 'Festivals', value: String(tenant._count.festivals) },
          { label: 'Films', value: String(tenant._count.films) },
          { label: 'Created', value: new Date(tenant.createdAt).toLocaleDateString() },
        ].map((s) => (
          <div key={s.label} style={{ background: C.bgPanel, padding: '1.25rem' }}>
            <div style={{ fontSize: '0.6875rem', color: C.inkDim, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '0.375rem' }}>{s.label}</div>
            <div style={{ fontWeight: 600, textTransform: 'capitalize' }}>{s.value}</div>
          </div>
        ))}
      </div>

      <div style={{ display: 'flex', gap: '0', borderBottom: `1px solid ${C.border}`, marginBottom: '1.5rem' }}>
        {TABS.map((t) => (
          <button key={t} onClick={() => setTab(t)} style={{
            background: 'transparent', border: 'none', cursor: 'pointer',
            padding: '0.75rem 1.25rem', fontSize: '0.875rem', fontWeight: 500,
            color: tab === t ? C.primary : C.inkDim,
            borderBottom: tab === t ? `2px solid ${C.primary}` : '2px solid transparent',
            textTransform: 'capitalize',
          }}>
            {t}
          </button>
        ))}
      </div>

      {tab === 'overview' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
          <div style={{ border: `1px solid ${C.border}`, background: C.bgPanel, padding: '1.5rem' }}>
            <h3 style={{ fontSize: '0.75rem', color: C.inkDim, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '1rem' }}>Contact</h3>
            <p style={{ marginBottom: '0.5rem' }}><span style={{ color: C.inkDim }}>Email: </span>{tenant.email}</p>
            {tenant.customDomain && <p><span style={{ color: C.inkDim }}>Domain: </span>{tenant.customDomain}</p>}
          </div>
          <div style={{ border: `1px solid ${C.border}`, background: C.bgPanel, padding: '1.5rem' }}>
            <h3 style={{ fontSize: '0.75rem', color: C.inkDim, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '1rem' }}>API & security</h3>
            <p style={{ marginBottom: '0.5rem' }}><span style={{ color: C.inkDim }}>API: </span>{tenant.apiEnabled ? 'Enabled' : 'Disabled'}</p>
            <p style={{ marginBottom: '0.5rem' }}><span style={{ color: C.inkDim }}>Rate limit: </span>{tenant.apiRateLimit}/hr</p>
            <p><span style={{ color: C.inkDim }}>2FA: </span>{security.two_factor_enabled ? 'Enabled' : 'Disabled'}</p>
          </div>
        </div>
      )}

      {tab === 'users' && (
        <div style={{ border: `1px solid ${C.border}` }}>
          {tenant.adminUsers.map((u, i) => (
            <div key={u.id} style={{
              padding: '1rem 1.25rem', background: C.bgPanel,
              borderBottom: i < tenant.adminUsers.length - 1 ? `1px solid ${C.border}` : 'none',
            }}>
              <div style={{ fontWeight: 600 }}>{u.firstName} {u.lastName}</div>
              <div style={{ fontSize: '0.8125rem', color: C.inkDim }}>{u.username} · {u.email} · {u.role}</div>
            </div>
          ))}
          {tenant.adminUsers.length === 0 && <p style={{ color: C.inkDim, padding: '2rem', textAlign: 'center' }}>No users.</p>}
        </div>
      )}

      {tab === 'festivals' && (
        <div style={{ border: `1px solid ${C.border}` }}>
          {tenant.festivals.map((f, i) => (
            <div key={f.id} style={{
              padding: '1rem 1.25rem', background: C.bgPanel,
              borderBottom: i < tenant.festivals.length - 1 ? `1px solid ${C.border}` : 'none',
              display: 'flex', justifyContent: 'space-between',
            }}>
              <span style={{ fontWeight: 600 }}>{f.name}</span>
              <span style={{ fontSize: '0.75rem', color: f.isActive ? C.primary : C.inkDim }}>{f.isActive ? 'Active' : 'Inactive'}</span>
            </div>
          ))}
          {tenant.festivals.length === 0 && <p style={{ color: C.inkDim, padding: '2rem', textAlign: 'center' }}>No festivals.</p>}
        </div>
      )}

      {tab === 'films' && (
        <div style={{ border: `1px solid ${C.border}` }}>
          {tenant.films.map((f, i) => (
            <div key={f.id} style={{
              padding: '1rem 1.25rem', background: C.bgPanel,
              borderBottom: i < tenant.films.length - 1 ? `1px solid ${C.border}` : 'none',
              display: 'flex', justifyContent: 'space-between',
            }}>
              <div>
                <div style={{ fontWeight: 600 }}>{f.title}</div>
                <div style={{ fontSize: '0.8125rem', color: C.inkDim }}>Dir. {f.director}</div>
              </div>
              <span style={{ fontSize: '0.75rem', color: C.inkDim, textTransform: 'capitalize' }}>{f.status}</span>
            </div>
          ))}
          {tenant.films.length === 0 && <p style={{ color: C.inkDim, padding: '2rem', textAlign: 'center' }}>No films.</p>}
        </div>
      )}
    </div>
  );
}
