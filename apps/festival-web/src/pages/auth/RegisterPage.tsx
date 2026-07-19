import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/store/authStore';
import {
  AuthLayout,
  AuthLabel,
  AuthError,
  AuthButton,
  authLinkStyle,
  C,
  inputStyle,
  onInputFocus,
  onInputBlur,
} from '@/components/auth/AuthLayout';

export const RegisterPage: React.FC = () => {
  const navigate = useNavigate();
  const { register } = useAuthStore();
  const [formData, setFormData] = useState({
    tenantName: '',
    subdomain: '',
    email: '',
    adminName: '',
    adminUsername: '',
    adminPassword: '',
    confirmPassword: '',
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (formData.adminPassword !== formData.confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    setLoading(true);

    try {
      await register({
        tenantName: formData.tenantName,
        subdomain: formData.subdomain,
        email: formData.email,
        adminName: formData.adminName || formData.tenantName,
        adminUsername: formData.adminUsername || formData.subdomain.replace(/-/g, '_'),
        adminPassword: formData.adminPassword,
      });
      navigate('/dashboard');
    } catch {
      setError('Registration failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const update = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  return (
    <AuthLayout
      wide
      title="Run a festival."
      subtitle={<>Already have an account? <Link to="/login" style={authLinkStyle}>Sign in</Link></>}
    >
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
        {error && <AuthError message={error} />}

        <div>
          <AuthLabel>Festival name</AuthLabel>
          <input
            id="tenantName"
            type="text"
            required
            style={inputStyle}
            placeholder="e.g. Indie Film Festival 2026"
            value={formData.tenantName}
            onChange={(e) => update('tenantName', e.target.value)}
            onFocus={onInputFocus}
            onBlur={onInputBlur}
          />
        </div>

        <div>
          <AuthLabel>Subdomain</AuthLabel>
          <div style={{ display: 'flex' }}>
            <input
              id="subdomain"
              type="text"
              required
              style={{ ...inputStyle, borderRight: 'none', flex: 1 }}
              placeholder="yourfestival"
              value={formData.subdomain}
              onChange={(e) => update('subdomain', e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
              onFocus={onInputFocus}
              onBlur={onInputBlur}
            />
            <span style={{
              display: 'flex',
              alignItems: 'center',
              padding: '0 1rem',
              background: C.bgRaised,
              border: `1px solid ${C.border}`,
              borderLeft: 'none',
              color: C.inkDim,
              fontSize: '0.875rem',
              whiteSpace: 'nowrap',
            }}>
              .{import.meta.env.VITE_ROOT_DOMAIN || 'localhost'}
            </span>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
          <div>
            <AuthLabel>Your name</AuthLabel>
            <input
              id="adminName"
              type="text"
              style={inputStyle}
              placeholder="Jane Director"
              value={formData.adminName}
              onChange={(e) => update('adminName', e.target.value)}
              onFocus={onInputFocus}
              onBlur={onInputBlur}
            />
          </div>
          <div>
            <AuthLabel>Username</AuthLabel>
            <input
              id="adminUsername"
              type="text"
              style={inputStyle}
              placeholder="admin"
              value={formData.adminUsername}
              onChange={(e) => update('adminUsername', e.target.value)}
              onFocus={onInputFocus}
              onBlur={onInputBlur}
            />
          </div>
        </div>

        <div>
          <AuthLabel>Email</AuthLabel>
          <input
            id="email"
            type="email"
            autoComplete="email"
            required
            style={inputStyle}
            placeholder="admin@yourfestival.com"
            value={formData.email}
            onChange={(e) => update('email', e.target.value)}
            onFocus={onInputFocus}
            onBlur={onInputBlur}
          />
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
          <div>
            <AuthLabel>Password</AuthLabel>
            <input
              id="adminPassword"
              type="password"
              autoComplete="new-password"
              required
              style={inputStyle}
              value={formData.adminPassword}
              onChange={(e) => update('adminPassword', e.target.value)}
              onFocus={onInputFocus}
              onBlur={onInputBlur}
            />
          </div>
          <div>
            <AuthLabel>Confirm</AuthLabel>
            <input
              id="confirmPassword"
              type="password"
              autoComplete="new-password"
              required
              style={inputStyle}
              value={formData.confirmPassword}
              onChange={(e) => update('confirmPassword', e.target.value)}
              onFocus={onInputFocus}
              onBlur={onInputBlur}
            />
          </div>
        </div>

        <AuthButton loading={loading} loadingText="Creating festival...">
          Create festival →
        </AuthButton>
      </form>
    </AuthLayout>
  );
};
