import React, { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import api from '@/lib/api';
import { festivalService } from '@/services/festivalService';
import FilmSubmissionForm from '@/components/FilmSubmissionForm';
import PaymentForm from '@/components/PaymentForm';
import { useAuthStore } from '@/store/authStore';

export const FestivalSubmitPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const festivalId = parseInt(id || '0', 10);
  const { user } = useAuthStore();
  const [festival, setFestival] = useState<any>(null);
  const [submittedFilmId, setSubmittedFilmId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!festivalId) return;
    festivalService.getFestival(festivalId)
      .then((res) => setFestival(res.data?.festival))
      .catch(() => toast.error('Failed to load festival'))
      .finally(() => setLoading(false));
  }, [festivalId]);

  const handleSubmit = async (data: {
    title: string;
    director?: string;
    producer?: string;
    writer?: string;
    duration?: number;
    year?: number;
    country?: string;
    language?: string;
    subtitles?: string;
    genre?: string;
    synopsis?: string;
    screeningFormat?: string;
    aspectRatio?: string;
    soundFormat?: string;
    premiereStatus?: string;
    studentFilm: boolean;
    contactName?: string;
    contactEmail?: string;
    contactPhone?: string;
    notes?: string;
  }, files: File[]) => {
    const formData = new FormData();
    formData.append('festivalId', String(festivalId));
    Object.entries(data).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        formData.append(key, String(value));
      }
    });
    files.forEach((file) => formData.append('files', file));

    const response = await api.post('/films/submit', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });

    const film = response.data.data;
    setSubmittedFilmId(film.id);
    toast.success('Film submitted successfully');

    if (!festival?.entryFee) {
      setTimeout(() => { window.location.href = `/films/${film.id}`; }, 1500);
    }
  };

  if (loading) return <p style={{ color: 'oklch(0.70 0.008 80)' }}>Loading...</p>;
  if (!festival) return <p style={{ color: 'oklch(0.55 0.190 22)' }}>Festival not found</p>;

  const needsPayment = submittedFilmId && festival.entryFee && festival.entryFee > 0;

  return (
    <div style={{ fontFamily: "'Barlow', system-ui, sans-serif", maxWidth: '800px' }}>
      <Link to={`/festivals/${festivalId}`} style={{ color: 'oklch(0.68 0.007 80)', textDecoration: 'none', fontSize: '0.875rem', display: 'block', marginBottom: '1.25rem' }}>
        ← Back to {festival.name}
      </Link>

      <h1 style={{ fontFamily: "'Big Shoulders Display', sans-serif", fontWeight: 800, fontSize: '2.25rem', marginBottom: '1.5rem' }}>
        Submit to {festival.name}
      </h1>

      {!submittedFilmId ? (
        <FilmSubmissionForm festivalId={festivalId} onSubmit={handleSubmit} />
      ) : needsPayment ? (
        <div style={{ marginTop: '2rem' }}>
          <p style={{ marginBottom: '1rem', color: 'oklch(0.70 0.008 80)' }}>
            Your film was submitted. Complete the entry fee payment to finalize.
          </p>
          {import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY ? (
            <PaymentForm
              amount={festival.entryFee}
              currency={(festival.currency || 'USD').toLowerCase()}
              description={`Entry fee — ${festival.name}`}
              festivalId={festivalId}
              filmId={submittedFilmId}
              customerEmail={user?.email}
              customerName={user?.fullName || user?.username}
              onSuccess={() => {
                toast.success('Payment complete');
                window.location.href = `/films/${submittedFilmId}`;
              }}
              onError={(msg) => toast.error(msg)}
            />
          ) : (
            <p style={{ color: 'oklch(0.68 0.007 80)', padding: '1rem', border: '1px solid oklch(0.20 0 0)' }}>
              Payment processing is not configured yet. Your submission is saved as pending.
              <Link to={`/films/${submittedFilmId}`} style={{ display: 'block', marginTop: '0.75rem', color: 'oklch(0.72 0.165 68)' }}>
                View submission →
              </Link>
            </p>
          )}
        </div>
      ) : (
        <p style={{ color: 'oklch(0.65 0.15 145)' }}>Submission complete. Redirecting...</p>
      )}
    </div>
  );
};
