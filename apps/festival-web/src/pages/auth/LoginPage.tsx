import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/store/authStore';
import {
  AuthLayout,
  AuthLabel,
  AuthError,
  AuthButton,
  authLinkStyle,
  inputStyle,
  onInputFocus,
  onInputBlur,
} from '@/components/auth/AuthLayout';

export const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const { login } = useAuthStore();
  const [subdomain, setSubdomain] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await login({ username, password, tenantSubdomain: subdomain });
      navigate('/dashboard');
    } catch {
      setError('Invalid credentials. Check your subdomain, username, and password.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout
      title="Sign in."
      subtitle={<>No account? <Link to="/register" style={authLinkStyle}>Create one</Link></>}
    >
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
        {error && <AuthError message={error} />}

        <div>
          <AuthLabel>Festival subdomain</AuthLabel>
          <input
            id="subdomain"
            type="text"
            required
            style={inputStyle}
            placeholder="yourfestival"
            value={subdomain}
            onChange={(e) => setSubdomain(e.target.value.toLowerCase())}
            onFocus={onInputFocus}
            onBlur={onInputBlur}
          />
        </div>

        <div>
          <AuthLabel>Username</AuthLabel>
          <input
            id="username"
            type="text"
            autoComplete="username"
            required
            style={inputStyle}
            placeholder="admin"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            onFocus={onInputFocus}
            onBlur={onInputBlur}
          />
        </div>

        <div>
          <AuthLabel>Password</AuthLabel>
          <input
            id="password"
            type="password"
            autoComplete="current-password"
            required
            style={inputStyle}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            onFocus={onInputFocus}
            onBlur={onInputBlur}
          />
        </div>

        <AuthButton loading={loading} loadingText="Signing in...">
          Sign in →
        </AuthButton>
      </form>
    </AuthLayout>
  );
};
