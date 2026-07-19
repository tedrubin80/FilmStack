import React, { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import api from '@/lib/api';
import JudgingInterface from '@/components/JudgingInterface';

export const FestivalJudgingPage: React.FC = () => {
  const { id, judgeId } = useParams<{ id: string; judgeId: string }>();
  const festivalId = parseInt(id || '0', 10);
  const judgeIdNum = parseInt(judgeId || '0', 10);
  const [films, setFilms] = useState<any[]>([]);
  const [judgeName, setJudgeName] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!festivalId || !judgeIdNum) return;

    Promise.all([
      api.get(`/films/festival/${festivalId}?limit=100`),
      api.get(`/judges/festival/${festivalId}`),
    ])
      .then(([filmsRes, judgesRes]) => {
        setFilms(filmsRes.data.data || []);
        const judge = (judgesRes.data.data || []).find((j: any) => j.id === judgeIdNum);
        if (judge) setJudgeName(`${judge.firstName} ${judge.lastName}`);
      })
      .catch(() => toast.error('Failed to load judging data'))
      .finally(() => setLoading(false));
  }, [festivalId, judgeIdNum]);

  const submitScore = async (filmId: number, scoreData: { criteria: string; score: number; feedback: string }) => {
    await api.post(`/judges/${judgeIdNum}/scores`, {
      filmId,
      criteria: scoreData.criteria,
      score: scoreData.score,
      maxScore: 10,
      feedback: scoreData.feedback,
    });
    toast.success(`${scoreData.criteria} score saved`);
  };

  if (loading) return <p style={{ color: 'oklch(0.70 0.008 80)' }}>Loading judging panel...</p>;

  return (
    <div style={{ fontFamily: "'Barlow', system-ui, sans-serif" }}>
      <Link to={`/festivals/${festivalId}/judges`} style={{ color: 'oklch(0.68 0.007 80)', textDecoration: 'none', fontSize: '0.875rem', display: 'block', marginBottom: '1.25rem' }}>
        ← Back to judges
      </Link>
      {judgeName && (
        <p style={{ color: 'oklch(0.68 0.007 80)', marginBottom: '1rem' }}>
          Judging as <strong style={{ color: 'oklch(0.95 0.006 80)' }}>{judgeName}</strong>
        </p>
      )}
      <JudgingInterface
        judgeId={judgeIdNum}
        films={films}
        onSubmitScore={submitScore}
        scoringCriteria={['Story', 'Acting', 'Cinematography', 'Direction', 'Overall']}
      />
    </div>
  );
};
