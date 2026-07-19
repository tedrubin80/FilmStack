import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../lib/api';
import { useAuthStore } from '../stores/authStore';

interface UserFilm {
  id: string;
  title: string;
  thumbnail_url?: string | null;
  thumbnail?: string | null;
  duration?: number | string | null;
  genre?: string | null;
  view_count?: number;
  viewCount?: number;
  like_count?: number;
  likeCount?: number;
  status?: string;
  channel_name?: string;
}

interface FestivalSubmission {
  id: number;
  video_id: string;
  festival_id: number;
  status: string;
  submitted_at: string;
  video_title?: string;
  thumbnail_url?: string | null;
}

export default function DashboardPage() {
  const { isAuthenticated, user } = useAuthStore();
  const [films, setFilms] = useState<UserFilm[]>([]);
  const [submissions, setSubmissions] = useState<FestivalSubmission[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isAuthenticated) return;

    Promise.all([
      api.get('/films/user').catch(() => ({ data: { films: [] } })),
      api.get('/festivals/my-submissions').catch(() => ({ data: { data: [] } })),
    ]).then(([filmsRes, subsRes]) => {
      setFilms(filmsRes.data?.films || []);
      setSubmissions(subsRes.data?.data || []);
    }).finally(() => setLoading(false));
  }, [isAuthenticated]);

  if (!isAuthenticated) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center text-center">
        <h2 className="text-xl font-semibold">Sign in to view your dashboard</h2>
        <p className="mt-2 text-zinc-500">Track your uploads, views, and festival submissions.</p>
        <Link to="/login" className="mt-4 rounded bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700">
          Sign in
        </Link>
      </div>
    );
  }

  const totalViews = films.reduce((n, f) => n + (f.view_count ?? f.viewCount ?? 0), 0);
  const totalLikes = films.reduce((n, f) => n + (f.like_count ?? f.likeCount ?? 0), 0);

  const stats = [
    { label: 'Films', value: films.length },
    { label: 'Festival submissions', value: submissions.length },
    { label: 'Total views', value: totalViews.toLocaleString() },
    { label: 'Total likes', value: totalLikes.toLocaleString() },
  ];

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Creator dashboard</h1>
          <p className="mt-1 text-zinc-400">
            Welcome back, {user?.displayName || user?.username}
          </p>
        </div>
        <Link to="/upload" className="rounded bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700">
          Upload new film
        </Link>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((s) => (
          <div key={s.label} className="rounded-lg border border-zinc-800 bg-zinc-900 p-5">
            <p className="text-2xl font-bold">{loading ? '—' : s.value}</p>
            <p className="mt-1 text-sm text-zinc-500">{s.label}</p>
          </div>
        ))}
      </div>

      {submissions.length > 0 && (
        <section>
          <h2 className="mb-4 text-lg font-semibold">Festival submissions</h2>
          <div className="space-y-2">
            {submissions.map((s) => (
              <div key={s.id} className="flex items-center justify-between rounded-lg border border-zinc-800 bg-zinc-900 px-4 py-3">
                <div>
                  <Link to={`/watch/${s.video_id}`} className="font-medium hover:text-brand-400">
                    {s.video_title || 'Untitled film'}
                  </Link>
                  <p className="text-xs text-zinc-500">
                    Festival #{s.festival_id} · {new Date(s.submitted_at).toLocaleDateString()}
                  </p>
                </div>
                <span className="rounded-full bg-zinc-800 px-2.5 py-0.5 text-xs capitalize text-zinc-400">
                  {s.status}
                </span>
              </div>
            ))}
          </div>
        </section>
      )}

      <section>
        <h2 className="mb-4 text-lg font-semibold">Your films</h2>

        {loading ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="h-48 animate-pulse rounded-lg border border-zinc-800 bg-zinc-900" />
            ))}
          </div>
        ) : films.length === 0 ? (
          <div className="rounded-lg border border-dashed border-zinc-700 p-12 text-center">
            <p className="text-zinc-500">No films uploaded yet.</p>
            <Link to="/upload" className="mt-3 inline-block text-brand-400 hover:underline">
              Upload your first film
            </Link>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {films.map((film) => {
              const thumb = film.thumbnail_url || film.thumbnail;
              const views = film.view_count ?? film.viewCount ?? 0;
              const likes = film.like_count ?? film.likeCount ?? 0;

              return (
                <div key={film.id} className="overflow-hidden rounded-lg border border-zinc-800 bg-zinc-900">
                  <Link to={`/watch/${film.id}`} className="block">
                    <div className="aspect-video bg-zinc-800">
                      {thumb && <img src={thumb} alt={film.title} className="h-full w-full object-cover" />}
                    </div>
                  </Link>
                  <div className="p-4">
                    <Link to={`/watch/${film.id}`} className="font-medium hover:text-brand-400">
                      {film.title}
                    </Link>
                    <p className="mt-1 text-xs text-zinc-500">
                      {film.genre || 'Short film'} · {views} views · {likes} likes
                    </p>
                    <div className="mt-2 flex gap-2">
                      {film.status && (
                        <span className="inline-block rounded-full bg-zinc-800 px-2 py-0.5 text-xs text-zinc-400">
                          {film.status}
                        </span>
                      )}
                      <Link to={`/watch/${film.id}/submit`} className="text-xs text-brand-400 hover:underline">
                        Submit to festival
                      </Link>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
