import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../lib/api';

interface Film {
  id: string;
  title: string;
  thumbnail_url: string | null;
  duration: number | null;
  genre: string | null;
  view_count: number;
  like_count: number;
  creator_name: string;
  channel_name: string;
}

const CATEGORIES = ['All', 'Drama', 'Documentary', 'Comedy', 'Horror', 'Experimental', 'Animation', 'Music'];

export default function HomePage() {
  const [films, setFilms] = useState<Film[]>([]);
  const [loading, setLoading] = useState(true);
  const [category, setCategory] = useState('All');

  useEffect(() => {
    const params: Record<string, string> = { limit: '12' };
    if (category !== 'All') params.category = category.toLowerCase();

    api.get('/films', { params })
      .then((res) => {
        const raw = res.data.films || res.data.data || [];
        const films = raw.map((f: Record<string, unknown>) => ({
          id: String(f.id),
          title: f.title as string,
          thumbnail_url: (f.thumbnail_url ?? f.thumbnail) as string | null,
          duration: null,
          genre: (f.genre ?? f.category) as string | null,
          view_count: (f.view_count as number) ?? 0,
          like_count: 0,
          creator_name: (f.creator_name ?? f.channel_name ?? f.channel) as string,
          channel_name: (f.channel_name ?? f.channel) as string,
        }));
        setFilms(films);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [category]);

  const formatViews = (n: number) => {
    if (n >= 1000000) return `${(n / 1000000).toFixed(1)}M`;
    if (n >= 1000) return `${(n / 1000).toFixed(1)}K`;
    return String(n);
  };

  const formatDuration = (seconds: number | null) => {
    if (!seconds) return '';
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <div className="space-y-6">
      <section>
        <h2 className="text-3xl font-bold">Discover Short Films</h2>
        <p className="mt-1 text-zinc-400">Award-winning shorts from filmmakers around the world</p>
      </section>

      <div className="flex gap-2 overflow-x-auto pb-2">
        {CATEGORIES.map((cat) => (
          <button
            key={cat}
            onClick={() => { setCategory(cat); setLoading(true); }}
            className={`whitespace-nowrap rounded-full px-4 py-1.5 text-sm transition ${
              category === cat
                ? 'bg-brand-600 text-white'
                : 'border border-zinc-700 text-zinc-400 hover:border-zinc-500'
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="overflow-hidden rounded-lg border border-zinc-800">
              <div className="aspect-video animate-pulse bg-zinc-800" />
              <div className="space-y-2 p-4">
                <div className="h-4 w-3/4 animate-pulse rounded bg-zinc-800" />
                <div className="h-3 w-1/2 animate-pulse rounded bg-zinc-800" />
              </div>
            </div>
          ))}
        </div>
      ) : films.length === 0 ? (
        <div className="rounded-lg border border-dashed border-zinc-700 p-12 text-center text-zinc-500">
          No films found{category !== 'All' ? ` in ${category}` : ''}. Be the first to{' '}
          <Link to="/upload" className="text-brand-400 hover:underline">upload one</Link>.
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {films.map((film) => (
            <Link
              key={film.id}
              to={`/watch/${film.id}`}
              className="group overflow-hidden rounded-lg border border-zinc-800 bg-zinc-900 transition hover:border-zinc-700"
            >
              <div className="relative aspect-video bg-zinc-800">
                {film.thumbnail_url && (
                  <img src={film.thumbnail_url} alt={film.title} className="h-full w-full object-cover" />
                )}
                {film.duration && (
                  <span className="absolute bottom-2 right-2 rounded bg-black/80 px-1.5 py-0.5 text-xs">
                    {formatDuration(film.duration)}
                  </span>
                )}
              </div>
              <div className="p-4">
                <h3 className="font-medium leading-tight group-hover:text-brand-400 line-clamp-2">
                  {film.title}
                </h3>
                <p className="mt-1.5 text-sm text-zinc-500">
                  {film.creator_name || film.channel_name}
                </p>
                <p className="mt-0.5 text-xs text-zinc-600">
                  {formatViews(film.view_count)} views · {film.genre || 'Short Film'}
                </p>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
