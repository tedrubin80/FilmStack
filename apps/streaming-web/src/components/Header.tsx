import { Link } from 'react-router-dom';
import { useAuthStore } from '../stores/authStore';

export function Header() {
  const { user, isAuthenticated, logout } = useAuthStore();

  return (
    <header className="border-b border-zinc-800 px-6 py-3">
      <div className="mx-auto flex max-w-7xl items-center justify-between">
        <Link to="/" className="text-xl font-semibold">
          <span className="text-brand-500">Film</span>Stack
          <span className="ml-2 text-sm text-zinc-500">Watch</span>
        </Link>

        <div className="flex items-center gap-4">
          {isAuthenticated ? (
            <>
              <Link to="/upload" className="rounded bg-brand-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-brand-700">
                Upload
              </Link>
              <Link to="/dashboard" className="text-sm text-zinc-400 hover:text-zinc-100">Dashboard</Link>
              <span className="text-sm text-zinc-500">{user?.displayName || user?.username}</span>
              <button onClick={logout} className="text-sm text-zinc-500 hover:text-zinc-300">Sign out</button>
            </>
          ) : (
            <div className="flex gap-3">
              <Link to="/login" className="text-sm text-zinc-400 hover:text-zinc-100">Sign in</Link>
              <Link to="/register" className="rounded bg-brand-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-brand-700">
                Join free
              </Link>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
