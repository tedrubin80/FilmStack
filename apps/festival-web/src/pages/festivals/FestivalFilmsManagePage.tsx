import React from 'react';
import { Link, useParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import api from '@/lib/api';
import FilmsManagement from '@/components/FilmsManagement';

export const FestivalFilmsManagePage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const festivalId = parseInt(id || '0', 10);

  const updateStatus = async (filmId: number, status: string, notes?: string) => {
    await api.put(`/films/${filmId}/status`, { status, notes });
    toast.success(`Film marked as ${status}`);
  };

  const deleteFilm = async (filmId: number) => {
    await api.delete(`/films/${filmId}`);
    toast.success('Film removed');
  };

  const downloadFile = async (fileId: number) => {
    const response = await api.get(`/films/files/${fileId}/download`, { responseType: 'blob' });
    const url = window.URL.createObjectURL(response.data);
    const a = document.createElement('a');
    a.href = url;
    a.download = `film-file-${fileId}`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  if (!festivalId) return null;

  return (
    <div style={{ fontFamily: "'Barlow', system-ui, sans-serif" }}>
      <Link to={`/festivals/${festivalId}`} style={{ color: 'oklch(0.68 0.007 80)', textDecoration: 'none', fontSize: '0.875rem', display: 'block', marginBottom: '1.25rem' }}>
        ← Back to festival
      </Link>
      <FilmsManagement
        festivalId={festivalId}
        onUpdateFilmStatus={updateStatus}
        onDeleteFilm={deleteFilm}
        onDownloadFile={downloadFile}
      />
    </div>
  );
};
