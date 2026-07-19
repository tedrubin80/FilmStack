import { useCallback, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { Link, useNavigate } from 'react-router-dom';
import api from '../lib/api';
import { useAuthStore } from '../stores/authStore';

const GENRES = ['drama', 'comedy', 'documentary', 'experimental', 'animation', 'horror', 'romance', 'thriller'];

export default function UploadPage() {
  const navigate = useNavigate();
  const { isAuthenticated, user } = useAuthStore();
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const [form, setForm] = useState({
    title: '',
    director: '',
    duration: '',
    description: '',
    genre: '',
    year: new Date().getFullYear(),
    email: user?.email || '',
  });

  const onDrop = useCallback((accepted: File[]) => {
    if (accepted[0]) setFile(accepted[0]);
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'video/*': ['.mp4', '.mov', '.avi', '.mkv'] },
    maxFiles: 1,
    disabled: uploading,
  });

  const update = (field: string, value: string | number) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) {
      setError('Please select a video file');
      return;
    }

    setUploading(true);
    setError('');

    try {
      const data = new FormData();
      data.append('video', file);
      Object.entries(form).forEach(([key, val]) => data.append(key, String(val)));

      const res = await api.post('/upload/film', data, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      if (res.data?.success) {
        navigate('/dashboard');
      } else {
        setError(res.data?.message || 'Upload failed');
      }
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      setError(msg || 'Upload failed. Please try again.');
    } finally {
      setUploading(false);
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center text-center">
        <h2 className="text-xl font-semibold">Sign in to upload</h2>
        <p className="mt-2 text-zinc-500">You need an account to share your films.</p>
        <Link to="/login" className="mt-4 rounded bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700">
          Sign in
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl space-y-8">
      <div>
        <h1 className="text-2xl font-bold">Upload your film</h1>
        <p className="mt-1 text-zinc-400">Share your short with filmmakers and festival programmers worldwide.</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {error && (
          <div className="rounded border border-red-900 bg-red-950 px-4 py-2 text-sm text-red-400">{error}</div>
        )}

        <div
          {...getRootProps()}
          className={`cursor-pointer rounded-lg border-2 border-dashed p-10 text-center transition ${
            isDragActive ? 'border-brand-500 bg-brand-950/30' : 'border-zinc-700 hover:border-zinc-500'
          }`}
        >
          <input {...getInputProps()} />
          {file ? (
            <div>
              <p className="font-medium text-brand-400">{file.name}</p>
              <p className="mt-1 text-sm text-zinc-500">{(file.size / (1024 * 1024)).toFixed(1)} MB</p>
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); setFile(null); }}
                className="mt-3 text-sm text-zinc-400 hover:text-zinc-200"
              >
                Choose different file
              </button>
            </div>
          ) : (
            <div>
              <p className="text-lg font-medium">{isDragActive ? 'Drop it here' : 'Drop your film here'}</p>
              <p className="mt-1 text-sm text-zinc-500">or click to browse — MP4, MOV, AVI (max 2GB)</p>
            </div>
          )}
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <label className="block text-sm text-zinc-400">Title *</label>
            <input required value={form.title} onChange={(e) => update('title', e.target.value)}
              className="mt-1 w-full rounded border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none" />
          </div>
          <div>
            <label className="block text-sm text-zinc-400">Director *</label>
            <input required value={form.director} onChange={(e) => update('director', e.target.value)}
              className="mt-1 w-full rounded border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none" />
          </div>
          <div>
            <label className="block text-sm text-zinc-400">Duration *</label>
            <input required value={form.duration} onChange={(e) => update('duration', e.target.value)} placeholder="mm:ss"
              className="mt-1 w-full rounded border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none" />
          </div>
          <div>
            <label className="block text-sm text-zinc-400">Genre *</label>
            <select required value={form.genre} onChange={(e) => update('genre', e.target.value)}
              className="mt-1 w-full rounded border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none">
              <option value="">Select genre</option>
              {GENRES.map((g) => <option key={g} value={g}>{g.charAt(0).toUpperCase() + g.slice(1)}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm text-zinc-400">Year *</label>
            <input required type="number" min={2000} max={new Date().getFullYear()} value={form.year}
              onChange={(e) => update('year', parseInt(e.target.value))}
              className="mt-1 w-full rounded border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none" />
          </div>
          <div className="sm:col-span-2">
            <label className="block text-sm text-zinc-400">Synopsis *</label>
            <textarea required rows={4} value={form.description} onChange={(e) => update('description', e.target.value)}
              className="mt-1 w-full rounded border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none" />
          </div>
          <div className="sm:col-span-2">
            <label className="block text-sm text-zinc-400">Contact email *</label>
            <input required type="email" value={form.email} onChange={(e) => update('email', e.target.value)}
              className="mt-1 w-full rounded border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none" />
          </div>
        </div>

        <button
          type="submit"
          disabled={uploading || !file}
          className="w-full rounded bg-brand-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-50"
        >
          {uploading ? 'Uploading...' : 'Upload film'}
        </button>
      </form>
    </div>
  );
}
