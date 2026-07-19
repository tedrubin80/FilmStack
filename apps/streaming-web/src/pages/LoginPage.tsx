import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuthStore } from '../stores/authStore';

export default function LoginPage() {
  const navigate = useNavigate();
  const { login, isLoading } = useAuthStore();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    try {
      await login(email, password);
      navigate('/');
    } catch (err: any) {
      setError(err.response?.data?.message || err.response?.data?.error || 'Login failed');
    }
  };

  return (
    <div className="flex min-h-[80vh] items-center justify-center">
      <div className="w-full max-w-sm space-y-6">
        <div className="text-center">
          <h1 className="text-2xl font-bold"><span className="text-brand-500">Film</span>Stack</h1>
          <p className="mt-2 text-zinc-400">Sign in to your account</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 rounded-lg border border-zinc-800 bg-zinc-900 p-6">
          {error && (
            <div className="rounded border border-red-900 bg-red-950 px-4 py-2 text-sm text-red-400">{error}</div>
          )}
          <div>
            <label className="block text-sm text-zinc-400">Email</label>
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)}
              className="mt-1 w-full rounded border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none" required />
          </div>
          <div>
            <label className="block text-sm text-zinc-400">Password</label>
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)}
              className="mt-1 w-full rounded border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none" required />
          </div>
          <button type="submit" disabled={isLoading}
            className="w-full rounded bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-50">
            {isLoading ? 'Signing in...' : 'Sign In'}
          </button>
          <p className="text-center text-sm text-zinc-500">
            New here? <Link to="/register" className="text-brand-400 hover:underline">Create account</Link>
          </p>
        </form>
      </div>
    </div>
  );
}
