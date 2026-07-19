import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { VideoPlayer } from '../components/VideoPlayer';
import api from '../lib/api';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

interface VideoData {
  id: string | number;
  title: string;
  description?: string | null;
  thumbnail_url?: string | null;
  thumbnail?: string | null;
  hls_url?: string | null;
  video_url?: string | null;
  duration?: number | string | null;
  view_count?: number;
  views?: string;
  channel_name?: string;
  channel?: string;
  creator_name?: string;
  uploader?: string;
  genre?: string | null;
  category?: string | null;
  created_at?: string;
  uploadedAt?: string;
}

function formatViews(n?: number) {
  if (!n) return '0';
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return String(n);
}

function normalizeFilm(film: Record<string, unknown>): VideoData {
  return {
    id: film.id as string | number,
    title: film.title as string,
    description: film.description as string | null,
    thumbnail_url: (film.thumbnail_url ?? film.thumbnail) as string | null,
    video_url: film.video_url as string | null,
    duration: film.duration as string | null,
    view_count: typeof film.view_count === 'number' ? film.view_count : undefined,
    views: film.views as string | undefined,
    channel_name: (film.channel_name ?? film.channel) as string | undefined,
    creator_name: (film.creator_name ?? film.uploader ?? film.channel) as string | undefined,
    genre: (film.genre ?? film.category) as string | null,
    uploadedAt: film.uploadedAt as string | undefined,
  };
}

function normalizeVideo(video: Record<string, unknown>): VideoData {
  return {
    id: video.id as string,
    title: video.title as string,
    description: video.description as string | null,
    thumbnail_url: video.thumbnail_url as string | null,
    hls_url: video.hls_url as string | null,
    video_url: video.video_url as string | null,
    duration: video.duration as number | null,
    view_count: video.view_count as number,
    channel_name: video.channel_name as string,
    creator_name: video.uploader as string,
    genre: video.category as string | null,
    created_at: video.created_at as string,
  };
}

export default function VideoPage() {
  const { videoId } = useParams<{ videoId: string }>();
  const navigate = useNavigate();
  const [video, setVideo] = useState<VideoData | null>(null);
  const [related, setRelated] = useState<VideoData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!videoId) return;

    async function load() {
      if (!videoId) return;
      setLoading(true);
      setError('');

      try {
        const isUuid = UUID_RE.test(videoId);

        if (isUuid) {
          const [videoRes, relatedRes] = await Promise.all([
            api.get(`/videos/${videoId}`),
            api.get('/videos/search', { params: { limit: 6 } }).catch(() => null),
          ]);

          if (videoRes.data?.video) {
            setVideo(normalizeVideo(videoRes.data.video));
            api.post(`/videos/${videoId}/view`).catch(() => {});
          } else {
            setError('Video not found');
          }

          if (relatedRes?.data?.videos) {
            setRelated(
              relatedRes.data.videos
                .filter((v: { id: string }) => v.id !== videoId)
                .map(normalizeVideo)
                .slice(0, 5),
            );
          }
        } else {
          const [filmRes, filmsRes] = await Promise.all([
            api.get(`/films/${videoId}`),
            api.get('/films', { params: { limit: 6 } }).catch(() => null),
          ]);

          if (filmRes.data?.film) {
            setVideo(normalizeFilm(filmRes.data.film));
          } else {
            setError('Film not found');
          }

          if (filmsRes?.data?.films) {
            setRelated(
              filmsRes.data.films
                .filter((f: { id: number }) => String(f.id) !== videoId)
                .map(normalizeFilm)
                .slice(0, 5),
            );
          }
        }
      } catch {
        setError('Failed to load video');
      } finally {
        setLoading(false);
      }
    }

    load();
  }, [videoId]);

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="aspect-video animate-pulse rounded-lg bg-zinc-800" />
        <div className="h-8 w-2/3 animate-pulse rounded bg-zinc-800" />
        <div className="h-4 w-1/3 animate-pulse rounded bg-zinc-800" />
      </div>
    );
  }

  if (error || !video) {
    return (
      <div className="rounded-lg border border-zinc-800 p-12 text-center">
        <h2 className="text-xl font-semibold">Video not found</h2>
        <p className="mt-2 text-zinc-500">{error}</p>
        <button onClick={() => navigate('/')} className="mt-4 text-brand-400 hover:underline">
          Back to home
        </button>
      </div>
    );
  }

  const poster = video.thumbnail_url ?? video.thumbnail;
  const streamUrl = video.hls_url || video.video_url || '';
  const channel = video.channel_name || video.channel || 'Unknown';
  const creator = video.creator_name || video.uploader;
  const views = video.view_count != null ? formatViews(video.view_count) : video.views;

  return (
    <div className="grid gap-8 lg:grid-cols-[1fr_320px]">
      <div className="space-y-6">
        {streamUrl ? (
          <VideoPlayer src={streamUrl} poster={poster} title={video.title} autoplay />
        ) : (
          <div className="relative aspect-video overflow-hidden rounded-lg bg-zinc-900">
            {poster && <img src={poster} alt={video.title} className="h-full w-full object-cover opacity-60" />}
            <div className="absolute inset-0 flex items-center justify-center">
              <p className="rounded bg-black/70 px-4 py-2 text-sm text-zinc-300">Screener preview unavailable</p>
            </div>
          </div>
        )}

        <div>
          <h1 className="text-2xl font-bold">{video.title}</h1>
          <div className="mt-2 flex flex-wrap gap-4 text-sm text-zinc-500">
            {views && <span>{views} views</span>}
            {video.genre && <span>{video.genre}</span>}
            {video.duration && <span>{typeof video.duration === 'number' ? `${Math.floor(video.duration / 60)}:${(video.duration % 60).toString().padStart(2, '0')}` : video.duration}</span>}
          </div>

          <div className="mt-4 flex items-center justify-between rounded-lg border border-zinc-800 bg-zinc-900 p-4">
            <div>
              <p className="font-medium">{channel}</p>
              {creator && <p className="text-sm text-zinc-500">by {creator}</p>}
            </div>
            <Link
              to={`/watch/${videoId}/submit`}
              className="rounded bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700"
            >
              Submit to Festival
            </Link>
          </div>

          {video.description && (
            <div className="mt-4 rounded-lg border border-zinc-800 bg-zinc-900 p-4">
              <h3 className="mb-2 text-sm font-medium text-zinc-400">Description</h3>
              <p className="text-sm leading-relaxed text-zinc-300">{video.description}</p>
            </div>
          )}
        </div>
      </div>

      {related.length > 0 && (
        <aside className="space-y-3">
          <h3 className="text-sm font-medium text-zinc-400">More films</h3>
          {related.map((item) => (
            <Link
              key={item.id}
              to={`/watch/${item.id}`}
              className="flex gap-3 rounded-lg border border-zinc-800 p-2 transition hover:border-zinc-700"
            >
              <div className="h-16 w-28 flex-shrink-0 overflow-hidden rounded bg-zinc-800">
                {(item.thumbnail_url || item.thumbnail) && (
                  <img src={(item.thumbnail_url || item.thumbnail)!} alt={item.title} className="h-full w-full object-cover" />
                )}
              </div>
              <div className="min-w-0">
                <p className="line-clamp-2 text-sm font-medium leading-tight">{item.title}</p>
                <p className="mt-1 text-xs text-zinc-500">{item.channel_name || item.channel}</p>
              </div>
            </Link>
          ))}
        </aside>
      )}
    </div>
  );
}
