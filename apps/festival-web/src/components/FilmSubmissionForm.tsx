import React, { useState, useRef } from 'react';
import { useForm, FieldError } from 'react-hook-form';
import { Upload, X, Film, User, Calendar, Globe, FileText } from 'lucide-react';

interface FormData {
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
}

interface FilmSubmissionFormProps {
  festivalId: number;
  onSubmit: (data: FormData, files: File[]) => Promise<void>;
  isLoading?: boolean;
}

const FilmSubmissionForm: React.FC<FilmSubmissionFormProps> = ({
  festivalId,
  onSubmit,
  isLoading = false
}) => {
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [uploadProgress, setUploadProgress] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset
  } = useForm<FormData>({
    defaultValues: {
      studentFilm: false
    }
  });

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    setSelectedFiles(prev => [...prev, ...files]);
  };

  const removeFile = (index: number) => {
    setSelectedFiles(prev => prev.filter((_, i) => i !== index));
  };

  const handleFormSubmit = async (data: FormData) => {
    try {
      await onSubmit(data, selectedFiles);
      reset();
      setSelectedFiles([]);
      setUploadProgress(0);
    } catch (error) {
      console.error('Form submission error:', error);
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getFileTypeIcon = (fileName: string) => {
    const extension = fileName.split('.').pop()?.toLowerCase();
    if (['mp4', 'mov', 'avi', 'mkv', 'wmv'].includes(extension || '')) {
      return <Film className="w-4 h-4" />;
    }
    if (['jpg', 'jpeg', 'png', 'gif', 'bmp'].includes(extension || '')) {
      return <img className="w-4 h-4" />;
    }
    return <FileText className="w-4 h-4" />;
  };

  const renderError = (error: FieldError | undefined) => {
    if (!error) return null;
    return <p className="mt-1 text-sm text-red-600">{error.message}</p>;
  };

  return (
    <div className="max-w-4xl mx-auto p-6 bg-white rounded-lg shadow-md">
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Film Submission</h2>
        <p className="text-gray-600">
          Submit your film for consideration. Please fill out all required fields and upload your film files.
        </p>
      </div>

      <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-8">
        {/* Basic Film Information */}
        <div className="bg-gray-50 p-6 rounded-lg">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
            <Film className="w-5 h-5 mr-2" />
            Basic Information
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Film Title *
              </label>
              <input
                {...register('title', { required: 'Title is required' })}
                type="text"
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Enter film title"
              />
              {renderError(errors.title)}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Director
              </label>
              <input
                {...register('director')}
                type="text"
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Director name"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Producer
              </label>
              <input
                {...register('producer')}
                type="text"
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Producer name"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Writer
              </label>
              <input
                {...register('writer')}
                type="text"
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Writer name"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Duration (minutes)
              </label>
              <input
                {...register('duration', {
                  valueAsNumber: true,
                  min: { value: 1, message: 'Duration must be at least 1 minute' }
                })}
                type="number"
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Film duration"
              />
              {renderError(errors.duration)}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Year
              </label>
              <input
                {...register('year', {
                  valueAsNumber: true,
                  min: { value: 1900, message: 'Year must be 1900 or later' },
                  max: { value: new Date().getFullYear() + 1, message: 'Year cannot be in the future' }
                })}
                type="number"
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Production year"
              />
              {renderError(errors.year)}
            </div>
          </div>
        </div>

        {/* Production Details */}
        <div className="bg-gray-50 p-6 rounded-lg">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
            <Globe className="w-5 h-5 mr-2" />
            Production Details
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Country
              </label>
              <input
                {...register('country')}
                type="text"
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Country of production"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Language
              </label>
              <input
                {...register('language')}
                type="text"
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Primary language"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Genre
              </label>
              <select
                {...register('genre')}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">Select genre</option>
                <option value="drama">Drama</option>
                <option value="comedy">Comedy</option>
                <option value="documentary">Documentary</option>
                <option value="thriller">Thriller</option>
                <option value="horror">Horror</option>
                <option value="animation">Animation</option>
                <option value="experimental">Experimental</option>
                <option value="short">Short</option>
                <option value="other">Other</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Screening Format
              </label>
              <select
                {...register('screeningFormat')}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">Select format</option>
                <option value="DCP">DCP</option>
                <option value="ProRes">ProRes</option>
                <option value="MP4">MP4</option>
                <option value="MOV">MOV</option>
                <option value="AVI">AVI</option>
                <option value="Other">Other</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Aspect Ratio
              </label>
              <select
                {...register('aspectRatio')}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">Select aspect ratio</option>
                <option value="16:9">16:9</option>
                <option value="4:3">4:3</option>
                <option value="21:9">21:9</option>
                <option value="1.85:1">1.85:1</option>
                <option value="2.35:1">2.35:1</option>
                <option value="Other">Other</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Premiere Status
              </label>
              <select
                {...register('premiereStatus')}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">Select premiere status</option>
                <option value="world_premiere">World Premiere</option>
                <option value="international_premiere">International Premiere</option>
                <option value="national_premiere">National Premiere</option>
                <option value="regional_premiere">Regional Premiere</option>
                <option value="not_premiere">Not a Premiere</option>
              </select>
            </div>

            <div className="flex items-center">
              <input
                {...register('studentFilm')}
                type="checkbox"
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
              <label className="ml-2 block text-sm text-gray-900">
                Student Film
              </label>
            </div>
          </div>

          <div className="mt-6">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Synopsis
            </label>
            <textarea
              {...register('synopsis')}
              rows={4}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="Brief description of your film"
            />
          </div>
        </div>

        {/* Contact Information */}
        <div className="bg-gray-50 p-6 rounded-lg">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
            <User className="w-5 h-5 mr-2" />
            Contact Information
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Contact Name
              </label>
              <input
                {...register('contactName')}
                type="text"
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Contact person name"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Contact Email
              </label>
              <input
                {...register('contactEmail', {
                  pattern: {
                    value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                    message: 'Invalid email address'
                  }
                })}
                type="email"
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Contact email"
              />
              {renderError(errors.contactEmail)}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Contact Phone
              </label>
              <input
                {...register('contactPhone')}
                type="tel"
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Contact phone number"
              />
            </div>
          </div>
        </div>

        {/* File Upload */}
        <div className="bg-gray-50 p-6 rounded-lg">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
            <Upload className="w-5 h-5 mr-2" />
            File Upload
          </h3>

          <div className="mb-4">
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept=".mp4,.mov,.avi,.mkv,.wmv,.flv,.webm,.jpg,.jpeg,.png,.gif,.bmp,.pdf,.doc,.docx,.txt"
              onChange={handleFileSelect}
              className="hidden"
            />

            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="flex items-center justify-center w-full px-6 py-4 border-2 border-dashed border-gray-300 rounded-lg text-gray-600 hover:text-gray-900 hover:border-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
            >
              <Upload className="w-8 h-8 mr-3" />
              <span className="text-lg">Click to select files or drag and drop</span>
            </button>

            <p className="text-sm text-gray-500 mt-2">
              Supported formats: MP4, MOV, AVI, MKV, WMV, Images, PDFs, Documents
            </p>
          </div>

          {selectedFiles.length > 0 && (
            <div className="space-y-2">
              <h4 className="text-sm font-medium text-gray-900">Selected Files:</h4>
              {selectedFiles.map((file, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between p-3 bg-white border border-gray-200 rounded-md"
                >
                  <div className="flex items-center space-x-3">
                    {getFileTypeIcon(file.name)}
                    <div>
                      <p className="text-sm font-medium text-gray-900">{file.name}</p>
                      <p className="text-xs text-gray-500">{formatFileSize(file.size)}</p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => removeFile(index)}
                    className="text-red-600 hover:text-red-800"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Additional Notes */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Additional Notes
          </label>
          <textarea
            {...register('notes')}
            rows={3}
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            placeholder="Any additional information or special requirements"
          />
        </div>

        {/* Submit Button */}
        <div className="flex justify-end space-x-4">
          <button
            type="button"
            onClick={() => {
              reset();
              setSelectedFiles([]);
            }}
            className="px-6 py-2 border border-gray-300 rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            Reset
          </button>

          <button
            type="submit"
            disabled={isLoading}
            className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
          >
            {isLoading ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                Submitting...
              </>
            ) : (
              'Submit Film'
            )}
          </button>
        </div>
      </form>
    </div>
  );
};

export default FilmSubmissionForm;