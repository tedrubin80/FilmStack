import React, { useState, useEffect } from 'react';
import {
  Star,
  Play,
  Pause,
  Volume2,
  Fullscreen,
  ChevronLeft,
  ChevronRight,
  Save,
  Send,
  FileText,
  User
} from 'lucide-react';

interface Film {
  id: number;
  title: string;
  director?: string;
  duration?: number;
  genre?: string;
  synopsis?: string;
  year?: number;
  country?: string;
  filmFiles: FilmFile[];
  judgeScores: JudgeScore[];
}

interface FilmFile {
  id: number;
  fileName?: string;
  fileType?: string;
  filePath?: string;
  isPrimary: boolean;
}

interface JudgeScore {
  id: number;
  criteria: string;
  score: number;
  maxScore: number;
  feedback?: string;
}

interface ScoreData {
  criteria: string;
  score: number;
  feedback: string;
}

interface JudgingInterfaceProps {
  judgeId: number;
  films: Film[];
  onSubmitScore: (filmId: number, scoreData: ScoreData) => Promise<void>;
  scoringCriteria: string[];
}

const JudgingInterface: React.FC<JudgingInterfaceProps> = ({
  judgeId,
  films,
  onSubmitScore,
  scoringCriteria = ['Story', 'Acting', 'Cinematography', 'Direction', 'Overall']
}) => {
  const [currentFilmIndex, setCurrentFilmIndex] = useState(0);
  const [scores, setScores] = useState<{ [criteria: string]: ScoreData }>({});
  const [isPlaying, setIsPlaying] = useState(false);
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);

  const currentFilm = films[currentFilmIndex];

  useEffect(() => {
    // Initialize scores for current film
    if (currentFilm) {
      const filmScores: { [criteria: string]: ScoreData } = {};

      scoringCriteria.forEach(criteria => {
        const existingScore = currentFilm.judgeScores.find(s => s.criteria === criteria);
        filmScores[criteria] = {
          criteria,
          score: existingScore?.score || 0,
          feedback: existingScore?.feedback || ''
        };
      });

      setScores(filmScores);
    }
  }, [currentFilmIndex, currentFilm, scoringCriteria]);

  const handleScoreChange = (criteria: string, score: number) => {
    setScores(prev => ({
      ...prev,
      [criteria]: {
        ...prev[criteria],
        score
      }
    }));
  };

  const handleFeedbackChange = (criteria: string, feedback: string) => {
    setScores(prev => ({
      ...prev,
      [criteria]: {
        ...prev[criteria],
        feedback
      }
    }));
  };

  const saveScore = async (criteria: string) => {
    if (!currentFilm || !scores[criteria]) return;

    try {
      setSaving(true);
      await onSubmitScore(currentFilm.id, scores[criteria]);
    } catch (error) {
      console.error('Error saving score:', error);
    } finally {
      setSaving(false);
    }
  };

  const saveAllScores = async () => {
    if (!currentFilm) return;

    try {
      setSaving(true);
      for (const criteria of scoringCriteria) {
        if (scores[criteria]) {
          await onSubmitScore(currentFilm.id, scores[criteria]);
        }
      }
    } catch (error) {
      console.error('Error saving scores:', error);
    } finally {
      setSaving(false);
    }
  };

  const nextFilm = () => {
    if (currentFilmIndex < films.length - 1) {
      setCurrentFilmIndex(currentFilmIndex + 1);
    }
  };

  const previousFilm = () => {
    if (currentFilmIndex > 0) {
      setCurrentFilmIndex(currentFilmIndex - 1);
    }
  };

  const renderStarRating = (criteria: string, currentScore: number) => {
    return (
      <div className="flex space-x-1">
        {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((star) => (
          <button
            key={star}
            onClick={() => handleScoreChange(criteria, star)}
            className={`w-6 h-6 ${
              star <= currentScore
                ? 'text-yellow-400 fill-current'
                : 'text-gray-300'
            } hover:text-yellow-400 transition-colors`}
          >
            <Star className="w-full h-full" />
          </button>
        ))}
      </div>
    );
  };

  const getVideoFile = (filmFiles: FilmFile[]) => {
    return filmFiles.find(file =>
      file.fileType === 'film' ||
      file.isPrimary ||
      file.fileName?.match(/\.(mp4|mov|avi|mkv|wmv)$/i)
    );
  };

  const calculateAverageScore = () => {
    const validScores = Object.values(scores).filter(s => s.score > 0);
    if (validScores.length === 0) return 0;
    return validScores.reduce((sum, s) => sum + s.score, 0) / validScores.length;
  };

  if (!currentFilm) {
    return (
      <div className="text-center py-8">
        <p className="text-gray-500">No films available for judging.</p>
      </div>
    );
  }

  const videoFile = getVideoFile(currentFilm.filmFiles);

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900">Film Judging Interface</h1>
        <div className="text-sm text-gray-500">
          Film {currentFilmIndex + 1} of {films.length}
        </div>
      </div>

      {/* Navigation */}
      <div className="flex justify-between items-center p-4 bg-gray-50 rounded-lg">
        <button
          onClick={previousFilm}
          disabled={currentFilmIndex === 0}
          className="flex items-center px-4 py-2 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <ChevronLeft className="w-4 h-4 mr-2" />
          Previous
        </button>

        <div className="text-center">
          <h2 className="text-xl font-semibold text-gray-900">{currentFilm.title}</h2>
          <p className="text-gray-600">
            {currentFilm.director && `Directed by ${currentFilm.director}`}
            {currentFilm.year && ` • ${currentFilm.year}`}
            {currentFilm.duration && ` • ${currentFilm.duration}min`}
          </p>
        </div>

        <button
          onClick={nextFilm}
          disabled={currentFilmIndex === films.length - 1}
          className="flex items-center px-4 py-2 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Next
          <ChevronRight className="w-4 h-4 ml-2" />
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Video Player */}
        <div className="space-y-4">
          <div className="bg-black rounded-lg overflow-hidden aspect-video">
            {videoFile ? (
              <video
                key={currentFilm.id}
                controls
                className="w-full h-full"
                preload="metadata"
              >
                <source src={`/api/films/files/${videoFile.id}/download`} />
                Your browser does not support the video tag.
              </video>
            ) : (
              <div className="flex items-center justify-center h-full text-white">
                <div className="text-center">
                  <FileText className="w-16 h-16 mx-auto mb-4 opacity-50" />
                  <p>No video file available</p>
                </div>
              </div>
            )}
          </div>

          {/* Film Information */}
          <div className="bg-white p-6 rounded-lg border border-gray-200">
            <h3 className="text-lg font-semibold mb-4">Film Information</h3>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="font-medium text-gray-700">Genre</p>
                <p className="text-gray-600">{currentFilm.genre || 'Not specified'}</p>
              </div>
              <div>
                <p className="font-medium text-gray-700">Country</p>
                <p className="text-gray-600">{currentFilm.country || 'Not specified'}</p>
              </div>
            </div>
            {currentFilm.synopsis && (
              <div className="mt-4">
                <p className="font-medium text-gray-700 mb-2">Synopsis</p>
                <p className="text-gray-600 text-sm leading-relaxed">{currentFilm.synopsis}</p>
              </div>
            )}
          </div>
        </div>

        {/* Scoring Panel */}
        <div className="space-y-6">
          {/* Average Score Display */}
          <div className="bg-blue-50 p-4 rounded-lg text-center">
            <p className="text-sm text-blue-600 mb-1">Current Average Score</p>
            <p className="text-3xl font-bold text-blue-700">{calculateAverageScore().toFixed(1)}/10</p>
          </div>

          {/* Scoring Criteria */}
          <div className="bg-white p-6 rounded-lg border border-gray-200">
            <h3 className="text-lg font-semibold mb-4">Scoring Criteria</h3>
            <div className="space-y-6">
              {scoringCriteria.map((criteria) => (
                <div key={criteria} className="border-b border-gray-100 pb-4 last:border-b-0">
                  <div className="flex justify-between items-center mb-2">
                    <h4 className="font-medium text-gray-900">{criteria}</h4>
                    <div className="flex items-center space-x-2">
                      <span className="text-sm text-gray-600">
                        {scores[criteria]?.score || 0}/10
                      </span>
                      <button
                        onClick={() => saveScore(criteria)}
                        disabled={saving}
                        className="p-1 text-blue-600 hover:text-blue-800 disabled:opacity-50"
                        title="Save this score"
                      >
                        <Save className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {renderStarRating(criteria, scores[criteria]?.score || 0)}

                  <textarea
                    value={scores[criteria]?.feedback || ''}
                    onChange={(e) => handleFeedbackChange(criteria, e.target.value)}
                    placeholder={`Feedback for ${criteria.toLowerCase()}...`}
                    rows={2}
                    className="mt-3 w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              ))}
            </div>
          </div>

          {/* Overall Notes */}
          <div className="bg-white p-6 rounded-lg border border-gray-200">
            <h3 className="text-lg font-semibold mb-4">Overall Notes</h3>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Overall comments about the film..."
              rows={4}
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          {/* Action Buttons */}
          <div className="flex space-x-4">
            <button
              onClick={saveAllScores}
              disabled={saving}
              className="flex-1 flex items-center justify-center px-6 py-3 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {saving ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Saving...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4 mr-2" />
                  Save All Scores
                </>
              )}
            </button>
          </div>

          {/* Progress Indicator */}
          <div className="bg-gray-50 p-4 rounded-lg">
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm font-medium text-gray-700">Judging Progress</span>
              <span className="text-sm text-gray-600">
                {films.filter(f => f.judgeScores.length > 0).length} of {films.length} films scored
              </span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                style={{
                  width: `${(films.filter(f => f.judgeScores.length > 0).length / films.length) * 100}%`
                }}
              ></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default JudgingInterface;