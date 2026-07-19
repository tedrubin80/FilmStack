import React, { useState, useEffect } from 'react';
import api from '@/lib/api';
import {
  Search,
  Filter,
  Download,
  Edit3,
  Trash2,
  Eye,
  Clock,
  CheckCircle,
  XCircle,
  FileText,
  Calendar,
  User
} from 'lucide-react';

interface Film {
  id: number;
  title: string;
  director?: string;
  contactEmail?: string;
  status: 'pending' | 'accepted' | 'rejected' | 'withdrawn';
  submissionDate: string;
  duration?: number;
  genre?: string;
  country?: string;
  entryFeePaid: boolean;
  filmFiles: FilmFile[];
  judgeScores: JudgeScore[];
}

interface FilmFile {
  id: number;
  fileName?: string;
  fileType?: string;
  fileSize?: number;
  isPrimary: boolean;
}

interface JudgeScore {
  id: number;
  score: number;
  maxScore: number;
  criteria: string;
  judge: {
    firstName: string;
    lastName: string;
  };
}

interface FilmsManagementProps {
  festivalId: number;
  onUpdateFilmStatus: (filmId: number, status: string, notes?: string) => Promise<void>;
  onDeleteFilm: (filmId: number) => Promise<void>;
  onDownloadFile: (fileId: number) => Promise<void>;
}

const FilmsManagement: React.FC<FilmsManagementProps> = ({
  festivalId,
  onUpdateFilmStatus,
  onDeleteFilm,
  onDownloadFile
}) => {
  const [films, setFilms] = useState<Film[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [selectedFilm, setSelectedFilm] = useState<Film | null>(null);
  const [showDetails, setShowDetails] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  useEffect(() => {
    fetchFilms();
  }, [festivalId, currentPage, statusFilter]);

  const fetchFilms = async () => {
    try {
      setLoading(true);
      // Mock API call - replace with actual API
      const response = await api.get(
        `/films/festival/${festivalId}?page=${currentPage}${statusFilter ? `&status=${statusFilter}` : ''}`
      );
      const data = response.data;

      if (data.success) {
        setFilms(data.data);
        setTotalPages(Math.ceil(data.pagination.total / data.pagination.limit));
      }
    } catch (error) {
      console.error('Error fetching films:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredFilms = films.filter(film =>
    film.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    film.director?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    film.contactEmail?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending':
        return <Clock className="w-4 h-4 text-yellow-500" />;
      case 'accepted':
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'rejected':
        return <XCircle className="w-4 h-4 text-red-500" />;
      case 'withdrawn':
        return <XCircle className="w-4 h-4 text-gray-500" />;
      default:
        return <Clock className="w-4 h-4 text-gray-400" />;
    }
  };

  const getStatusBadge = (status: string) => {
    const baseClasses = "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium";

    switch (status) {
      case 'pending':
        return `${baseClasses} bg-yellow-100 text-yellow-800`;
      case 'accepted':
        return `${baseClasses} bg-green-100 text-green-800`;
      case 'rejected':
        return `${baseClasses} bg-red-100 text-red-800`;
      case 'withdrawn':
        return `${baseClasses} bg-gray-100 text-gray-800`;
      default:
        return `${baseClasses} bg-gray-100 text-gray-800`;
    }
  };

  const formatFileSize = (bytes?: number): string => {
    if (!bytes) return 'Unknown';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const calculateAverageScore = (scores: JudgeScore[]): number => {
    if (scores.length === 0) return 0;
    const total = scores.reduce((sum, score) => sum + score.score, 0);
    return total / scores.length;
  };

  const handleStatusChange = async (film: Film, newStatus: string) => {
    const notes = prompt(`Add notes for status change to "${newStatus}":`);
    try {
      await onUpdateFilmStatus(film.id, newStatus, notes || undefined);
      fetchFilms(); // Refresh the list
    } catch (error) {
      console.error('Error updating film status:', error);
    }
  };

  const handleDeleteFilm = async (film: Film) => {
    if (window.confirm(`Are you sure you want to delete "${film.title}"? This action cannot be undone.`)) {
      try {
        await onDeleteFilm(film.id);
        fetchFilms(); // Refresh the list
      } catch (error) {
        console.error('Error deleting film:', error);
      }
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h2 className="text-2xl font-bold text-gray-900">Film Submissions</h2>

        {/* Search and Filter */}
        <div className="flex flex-col sm:flex-row gap-4 w-full sm:w-auto">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-3 text-gray-400" />
            <input
              type="text"
              placeholder="Search films..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="">All Status</option>
            <option value="pending">Pending</option>
            <option value="accepted">Accepted</option>
            <option value="rejected">Rejected</option>
            <option value="withdrawn">Withdrawn</option>
          </select>
        </div>
      </div>

      {/* Films Table */}
      <div className="bg-white shadow-md rounded-lg overflow-hidden">
        {loading ? (
          <div className="p-8 text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-2 text-gray-600">Loading films...</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full table-auto">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Film
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Director
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Submitted
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Payment
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Score
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredFilms.map((film) => (
                  <tr key={film.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <div>
                        <div className="text-sm font-medium text-gray-900">{film.title}</div>
                        <div className="text-sm text-gray-500">
                          {film.duration && `${film.duration}min`}
                          {film.genre && ` • ${film.genre}`}
                          {film.country && ` • ${film.country}`}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-gray-900">{film.director || 'Not specified'}</div>
                      <div className="text-sm text-gray-500">{film.contactEmail}</div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={getStatusBadge(film.status)}>
                        {getStatusIcon(film.status)}
                        <span className="ml-1 capitalize">{film.status}</span>
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500">
                      {new Date(film.submissionDate).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        film.entryFeePaid
                          ? 'bg-green-100 text-green-800'
                          : 'bg-red-100 text-red-800'
                      }`}>
                        {film.entryFeePaid ? 'Paid' : 'Unpaid'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900">
                      {film.judgeScores.length > 0
                        ? `${calculateAverageScore(film.judgeScores).toFixed(1)}/10`
                        : 'Not scored'
                      }
                    </td>
                    <td className="px-6 py-4 text-right text-sm font-medium space-x-2">
                      <button
                        onClick={() => {
                          setSelectedFilm(film);
                          setShowDetails(true);
                        }}
                        className="text-blue-600 hover:text-blue-900"
                        title="View Details"
                      >
                        <Eye className="w-4 h-4" />
                      </button>

                      <select
                        onChange={(e) => handleStatusChange(film, e.target.value)}
                        value=""
                        className="text-sm border border-gray-300 rounded px-2 py-1"
                      >
                        <option value="" disabled>Change Status</option>
                        <option value="pending">Pending</option>
                        <option value="accepted">Accept</option>
                        <option value="rejected">Reject</option>
                        <option value="withdrawn">Withdraw</option>
                      </select>

                      <button
                        onClick={() => handleDeleteFilm(film)}
                        className="text-red-600 hover:text-red-900"
                        title="Delete Film"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {filteredFilms.length === 0 && (
              <div className="text-center py-8 text-gray-500">
                No films found matching your criteria.
              </div>
            )}
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="bg-white px-4 py-3 flex items-center justify-between border-t border-gray-200">
            <div className="flex-1 flex justify-between sm:hidden">
              <button
                onClick={() => setCurrentPage(page => Math.max(1, page - 1))}
                disabled={currentPage === 1}
                className="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
              >
                Previous
              </button>
              <button
                onClick={() => setCurrentPage(page => Math.min(totalPages, page + 1))}
                disabled={currentPage === totalPages}
                className="ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
              >
                Next
              </button>
            </div>
            <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
              <div>
                <p className="text-sm text-gray-700">
                  Page <span className="font-medium">{currentPage}</span> of{' '}
                  <span className="font-medium">{totalPages}</span>
                </p>
              </div>
              <div>
                <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px">
                  {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                    <button
                      key={page}
                      onClick={() => setCurrentPage(page)}
                      className={`relative inline-flex items-center px-4 py-2 border text-sm font-medium ${
                        page === currentPage
                          ? 'z-10 bg-blue-50 border-blue-500 text-blue-600'
                          : 'bg-white border-gray-300 text-gray-500 hover:bg-gray-50'
                      }`}
                    >
                      {page}
                    </button>
                  ))}
                </nav>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Film Details Modal */}
      {showDetails && selectedFilm && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-11/12 max-w-4xl shadow-lg rounded-md bg-white">
            <div className="flex justify-between items-start mb-4">
              <h3 className="text-lg font-bold text-gray-900">{selectedFilm.title}</h3>
              <button
                onClick={() => setShowDetails(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <XCircle className="w-6 h-6" />
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Basic Info */}
              <div className="space-y-4">
                <h4 className="font-semibold text-gray-900">Basic Information</h4>
                <div className="space-y-2">
                  <p><span className="font-medium">Director:</span> {selectedFilm.director || 'Not specified'}</p>
                  <p><span className="font-medium">Duration:</span> {selectedFilm.duration ? `${selectedFilm.duration} minutes` : 'Not specified'}</p>
                  <p><span className="font-medium">Genre:</span> {selectedFilm.genre || 'Not specified'}</p>
                  <p><span className="font-medium">Country:</span> {selectedFilm.country || 'Not specified'}</p>
                  <p><span className="font-medium">Contact:</span> {selectedFilm.contactEmail || 'Not specified'}</p>
                  <p><span className="font-medium">Entry Fee:</span>
                    <span className={selectedFilm.entryFeePaid ? 'text-green-600' : 'text-red-600'}>
                      {selectedFilm.entryFeePaid ? ' Paid' : ' Unpaid'}
                    </span>
                  </p>
                </div>
              </div>

              {/* Files */}
              <div className="space-y-4">
                <h4 className="font-semibold text-gray-900">Uploaded Files</h4>
                <div className="space-y-2">
                  {selectedFilm.filmFiles.map((file) => (
                    <div key={file.id} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                      <div>
                        <p className="text-sm font-medium">{file.fileName}</p>
                        <p className="text-xs text-gray-500">
                          {file.fileType} • {formatFileSize(file.fileSize)} {file.isPrimary && '• Primary'}
                        </p>
                      </div>
                      <button
                        onClick={() => onDownloadFile(file.id)}
                        className="text-blue-600 hover:text-blue-800"
                      >
                        <Download className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              {/* Judge Scores */}
              {selectedFilm.judgeScores.length > 0 && (
                <div className="col-span-2 space-y-4">
                  <h4 className="font-semibold text-gray-900">Judge Scores</h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {selectedFilm.judgeScores.map((score) => (
                      <div key={score.id} className="p-3 bg-gray-50 rounded">
                        <div className="flex justify-between items-center">
                          <p className="font-medium">{score.criteria}</p>
                          <p className="text-lg font-bold">{score.score}/{score.maxScore}</p>
                        </div>
                        <p className="text-sm text-gray-600">
                          by {score.judge.firstName} {score.judge.lastName}
                        </p>
                      </div>
                    ))}
                  </div>
                  <div className="text-center p-3 bg-blue-50 rounded">
                    <p className="text-lg font-bold text-blue-600">
                      Average Score: {calculateAverageScore(selectedFilm.judgeScores).toFixed(1)}/10
                    </p>
                  </div>
                </div>
              )}
            </div>

            <div className="mt-6 flex justify-end">
              <button
                onClick={() => setShowDetails(false)}
                className="px-4 py-2 bg-gray-300 text-gray-700 rounded hover:bg-gray-400"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default FilmsManagement;