import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import api from '../lib/api';
import { useAuthStore } from '../stores/authStore';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

interface Festival {
  id: number;
  name: string;
  description: string | null;
  location: string | null;
  submissionDeadline: string | null;
  entryFee: number | null;
  earlyBirdFee: number | null;
  earlyBirdDeadline: string | null;
  currency: string;
}

interface VideoInfo {
  title: string;
  description?: string | null;
  duration?: number | string | null;
  isMock?: boolean;
}

export default function SubmitToFestivalPage() {
  const { videoId } = useParams<{ videoId: string }>();
  const navigate = useNavigate();
  const { user, isAuthenticated } = useAuthStore();
  const [festivals, setFestivals] = useState<Festival[]>([]);
  const [video, setVideo] = useState<VideoInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState<number | null>(null);
  const [submitted, setSubmitted] = useState<Set<number>>(new Set());
  const [error, setError] = useState('');

  useEffect(() => {
    const id = videoId;
    if (!id) return;

    async function load(currentVideoId: string) {
      const isUuid = UUID_RE.test(currentVideoId);

      try {
        const [festRes, videoRes] = await Promise.all([
          api.get('/festivals/available'),
          isUuid
            ? api.get(`/videos/${currentVideoId}`).catch(() => null)
            : api.get(`/films/${currentVideoId}`).catch(() => null),
        ]);

        setFestivals(festRes.data?.data || []);

        if (isUuid && videoRes?.data?.video) {
          const v = videoRes.data.video;
          setVideo({ title: v.title, description: v.description, duration: v.duration });
        } else if (!isUuid && videoRes?.data?.film) {
          const f = videoRes.data.film;
          setVideo({ title: f.title, description: f.description, duration: f.duration, isMock: true });
        }
      } catch {
        setError('Failed to load submission data');
      }
      setLoading(false);
    }

    load(id);
  }, [videoId]);

  const handleSubmit = async (festivalId: number) => {
    if (!isAuthenticated) {
      navigate('/login');
      return;
    }
    if (!video) return;

    setSubmitting(festivalId);
    setError('');

    try {
      const isUuid = videoId && UUID_RE.test(videoId);
      const payload = isUuid
        ? {
            videoId,
            festivalId,
            contactEmail: user?.email,
            director: user?.displayName || user?.username,
            synopsis: video.description,
          }
        : {
            festivalId,
            contactEmail: user?.email,
            director: user?.displayName || user?.username,
            mockTitle: video.title,
            mockDescription: video.description,
            mockDuration: typeof video.duration === 'string' ? null : video.duration,
          };

      await api.post('/festivals/submit', payload);
      setSubmitted((prev) => new Set(prev).add(festivalId));
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string; message?: string } } })?.response?.data;
      setError(msg?.error || msg?.message || 'Submission failed');
    }
    setSubmitting(null);
  };

  const isDeadlinePassed = (deadline: string | null) => {
    if (!deadline) return false;
    return new Date(deadline) < new Date();
  };

  const getCurrentFee = (f: Festival) => {
    if (f.earlyBirdDeadline && new Date(f.earlyBirdDeadline) > new Date() && f.earlyBirdFee != null) {
      return { amount: f.earlyBirdFee, label: 'Early bird' };
    }
    return { amount: f.entryFee, label: 'Standard' };
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="h-8 w-64 animate-pulse rounded bg-zinc-800" />
        <div className="space-y-3">
          {[1, 2, 3].map((i) => <div key={i} className="h-32 animate-pulse rounded-lg border border-zinc-800 bg-zinc-900" />)}
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <Link to={`/watch/${videoId}`} className="text-sm text-brand-400 hover:underline">← Back to video</Link>
        <h2 className="mt-2 text-2xl font-bold">Submit to Festival</h2>
        {video && (
          <p className="text-zinc-400">
            Submitting: <span className="text-zinc-200">{video.title}</span>
            {video.isMock && <span className="ml-2 text-xs text-zinc-600">(catalog film)</span>}
          </p>
        )}
      </div>

      {!isAuthenticated && (
        <div className="rounded border border-amber-900/50 bg-amber-950/30 px-4 py-3 text-sm text-amber-200">
          <Link to="/login" className="text-brand-400 hover:underline">Sign in</Link> to submit this film to a festival.
        </div>
      )}

      {error && (
        <div className="rounded border border-red-900 bg-red-950 px-4 py-2 text-sm text-red-400">{error}</div>
      )}

      {festivals.length === 0 ? (
        <div className="rounded-lg border border-dashed border-zinc-700 p-8 text-center text-zinc-500">
          No active festivals accepting submissions right now.
        </div>
      ) : (
        <div className="space-y-3">
          {festivals.map((f) => {
            const deadlinePassed = isDeadlinePassed(f.submissionDeadline);
            const fee = getCurrentFee(f);
            const alreadySubmitted = submitted.has(f.id);

            return (
              <div
                key={f.id}
                className={`rounded-lg border bg-zinc-900 p-5 ${deadlinePassed ? 'border-zinc-800 opacity-60' : 'border-zinc-700'}`}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold">{f.name}</h3>
                    {f.description && <p className="mt-1 text-sm text-zinc-400 line-clamp-2">{f.description}</p>}
                    <div className="mt-3 flex flex-wrap gap-4 text-xs text-zinc-500">
                      {f.location && <span>{f.location}</span>}
                      {f.submissionDeadline && (
                        <span className={deadlinePassed ? 'text-red-500' : ''}>
                          {deadlinePassed ? 'Deadline passed' : `Deadline: ${new Date(f.submissionDeadline).toLocaleDateString()}`}
                        </span>
                      )}
                      {fee.amount != null && (
                        <span>{f.currency} {fee.amount} ({fee.label})</span>
                      )}
                    </div>
                  </div>

                  <div className="flex-shrink-0">
                    {alreadySubmitted ? (
                      <span className="rounded-full bg-green-950 px-3 py-1.5 text-sm text-green-400">
                        Submitted
                      </span>
                    ) : deadlinePassed ? (
                      <span className="rounded-full bg-zinc-800 px-3 py-1.5 text-sm text-zinc-500">Closed</span>
                    ) : (
                      <button
                        onClick={() => handleSubmit(f.id)}
                        disabled={submitting === f.id || !isAuthenticated}
                        className="rounded bg-brand-600 px-4 py-1.5 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-50"
                      >
                        {submitting === f.id ? 'Submitting...' : 'Submit'}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
