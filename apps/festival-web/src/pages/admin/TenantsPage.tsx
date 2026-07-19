import React, { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import api from '@/lib/api';
import { C, inputStyle, onInputBlur, onInputFocus } from '@/components/auth/AuthLayout';

interface Tenant {
  id: number;
  name: string;
  subdomain: string;
  email: string;
  planType: string;
  isActive: boolean;
  createdAt: string;
  storageUsed: number;
  storageLimit: number;
  _count: { adminUsers: number; festivals: number; films: number };
}

interface PaginationInfo {
  page: number;
  limit: number;
  totalCount: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

function formatStorage(used: number, limit: number) {
  const usedGB = (used / (1024 ** 3)).toFixed(1);
  const limitGB = (limit / (1024 ** 3)).toFixed(1);
  const pct = limit > 0 ? Math.min((used / limit) * 100, 100) : 0;
  return { label: `${usedGB} / ${limitGB} GB`, pct };
}

export default function TenantsPage() {
  const navigate = useNavigate();
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [planFilter, setPlanFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [pagination, setPagination] = useState<PaginationInfo>({
    page: 1, limit: 10, totalCount: 0, totalPages: 0, hasNext: false, hasPrev: false,
  });

  const fetchTenants = useCallback(async () => {
    try {
      setLoading(true);
      const params: Record<string, string> = {
        page: String(pagination.page),
        limit: String(pagination.limit),
      };
      if (search) params.search = search;
      if (planFilter) params.planType = planFilter;
      if (statusFilter) params.isActive = statusFilter;

      const res = await api.get('/platform-admin/tenants', { params });
      setTenants(res.data.data.tenants);
      setPagination(res.data.data.pagination);
    } catch {
      toast.error('Failed to load tenants');
    } finally {
      setLoading(false);
    }
  }, [pagination.page, pagination.limit, search, planFilter, statusFilter]);

  useEffect(() => { fetchTenants(); }, [fetchTenants]);

  const toggleStatus = async (id: number, isActive: boolean) => {
    try {
      await api.put(`/platform-admin/tenants/${id}`, { isActive: !isActive });
      toast.success(`Tenant ${isActive ? 'deactivated' : 'activated'}`);
      fetchTenants();
    } catch {
      toast.error('Failed to update tenant');
    }
  };

  return (
    <div style={{ fontFamily: "'Barlow', system-ui, sans-serif" }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 style={{
            fontFamily: "'Big Shoulders Display', sans-serif", fontWeight: 800,
            fontSize: 'clamp(2rem, 4vw, 2.75rem)', lineHeight: 0.95,
          }}>
            Tenants.
          </h1>
          <p style={{ color: C.inkMuted, marginTop: '0.5rem' }}>{pagination.totalCount} organizations on the platform</p>
        </div>
        <Link to="/admin" style={{ color: C.inkDim, textDecoration: 'none', fontSize: '0.875rem' }}>← Platform admin</Link>
      </div>

      <div style={{
        display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
        gap: '0.75rem', marginBottom: '1.5rem', padding: '1.25rem',
        border: `1px solid ${C.border}`, background: C.bgPanel,
      }}>
        <input
          placeholder="Search name, subdomain, email..."
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPagination((p) => ({ ...p, page: 1 })); }}
          style={inputStyle}
          onFocus={onInputFocus}
          onBlur={onInputBlur}
        />
        <select value={planFilter} onChange={(e) => { setPlanFilter(e.target.value); setPagination((p) => ({ ...p, page: 1 })); }}
          style={inputStyle}>
          <option value="">All plans</option>
          <option value="starter">Starter</option>
          <option value="professional">Professional</option>
          <option value="enterprise">Enterprise</option>
        </select>
        <select value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value); setPagination((p) => ({ ...p, page: 1 })); }}
          style={inputStyle}>
          <option value="">All status</option>
          <option value="true">Active</option>
          <option value="false">Inactive</option>
        </select>
      </div>

      {loading ? (
        <p style={{ color: C.inkMuted }}>Loading tenants...</p>
      ) : tenants.length === 0 ? (
        <p style={{ color: C.inkDim, textAlign: 'center', padding: '3rem', border: `1px dashed ${C.border}` }}>No tenants found.</p>
      ) : (
        <div style={{ border: `1px solid ${C.border}` }}>
          {tenants.map((t, i) => {
            const storage = formatStorage(t.storageUsed, t.storageLimit);
            return (
              <div key={t.id} style={{
                display: 'grid', gridTemplateColumns: '1fr auto auto',
                gap: '1rem', alignItems: 'center', padding: '1.25rem 1.5rem',
                borderBottom: i < tenants.length - 1 ? `1px solid ${C.border}` : 'none',
                background: C.bgPanel,
              }}>
                <div>
                  <button onClick={() => navigate(`/admin/tenants/${t.id}`)} style={{
                    background: 'none', border: 'none', padding: 0, cursor: 'pointer',
                    fontWeight: 600, color: C.ink, fontSize: '1rem', textAlign: 'left',
                  }}>
                    {t.name}
                  </button>
                  <div style={{ fontSize: '0.8125rem', color: C.inkDim, marginTop: '0.25rem' }}>
                    {t.subdomain}.{import.meta.env.VITE_ROOT_DOMAIN || 'localhost'} · {t.email}
                  </div>
                  <div style={{ fontSize: '0.75rem', color: C.inkDim, marginTop: '0.375rem' }}>
                    {t._count.adminUsers} users · {t._count.festivals} festivals · {t._count.films} films · {storage.label}
                  </div>
                </div>

                <div style={{ textAlign: 'right' }}>
                  <span style={{
                    fontSize: '0.6875rem', fontWeight: 600, letterSpacing: '0.08em',
                    textTransform: 'uppercase',
                    color: t.isActive ? C.primary : 'oklch(0.60 0.19 22)',
                  }}>
                    {t.isActive ? 'Active' : 'Inactive'}
                  </span>
                  <div style={{ fontSize: '0.75rem', color: C.inkDim, marginTop: '0.25rem', textTransform: 'capitalize' }}>
                    {t.planType}
                  </div>
                </div>

                <button onClick={() => toggleStatus(t.id, t.isActive)} style={{
                  background: 'transparent', border: `1px solid ${C.border}`,
                  color: C.inkDim, padding: '0.375rem 0.75rem', fontSize: '0.75rem',
                  cursor: 'pointer', whiteSpace: 'nowrap',
                }}>
                  {t.isActive ? 'Deactivate' : 'Activate'}
                </button>
              </div>
            );
          })}
        </div>
      )}

      {pagination.totalPages > 1 && (
        <div style={{ display: 'flex', justifyContent: 'center', gap: '1rem', marginTop: '1.5rem', alignItems: 'center' }}>
          <button disabled={!pagination.hasPrev} onClick={() => setPagination((p) => ({ ...p, page: p.page - 1 }))}
            style={{ background: 'transparent', border: `1px solid ${C.border}`, color: C.inkMuted, padding: '0.5rem 1rem', cursor: pagination.hasPrev ? 'pointer' : 'not-allowed', opacity: pagination.hasPrev ? 1 : 0.4 }}>
            Previous
          </button>
          <span style={{ fontSize: '0.875rem', color: C.inkDim }}>Page {pagination.page} of {pagination.totalPages}</span>
          <button disabled={!pagination.hasNext} onClick={() => setPagination((p) => ({ ...p, page: p.page + 1 }))}
            style={{ background: 'transparent', border: `1px solid ${C.border}`, color: C.inkMuted, padding: '0.5rem 1rem', cursor: pagination.hasNext ? 'pointer' : 'not-allowed', opacity: pagination.hasNext ? 1 : 0.4 }}>
            Next
          </button>
        </div>
      )}
    </div>
  );
}
