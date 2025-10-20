import { useState, useEffect } from 'react';
import { useChecklist } from '../contexts';
import { Chapter } from '../types';

interface ChecklistComponentProps {
  storyId: number;
}

export function ChecklistComponent({ storyId }: ChecklistComponentProps) {
  const { state: chapterState, loadChapters, updateChapter, deleteChapter, createChapter, setStoryId, clearError } = useChecklist();
  const [showAddForm, setShowAddForm] = useState(false);
  const [newChapterTitle, setNewChapterTitle] = useState('');
  const [newChapterDescription, setNewChapterDescription] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Load chapters when story changes
  useEffect(() => {
    if (storyId) {
      setStoryId(storyId);
      loadChapters(storyId);
    }
  }, [storyId]);

  // Note: Story progress should be calculated by the backend based on chapter completion

  const handleToggleChapter = async (chapter: Chapter) => {
    try {
      await updateChapter(chapter.id, !chapter.completed);
    } catch (error) {
      // Error is handled by context
    }
  };

  const handleDeleteChapter = async (chapter: Chapter) => {
    if (window.confirm(`Are you sure you want to delete "${chapter.title}"?`)) {
      try {
        await deleteChapter(chapter.id);
      } catch (error) {
        // Error is handled by context
      }
    }
  };

  const handleAddChapter = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newChapterTitle.trim()) return;

    setIsSubmitting(true);
    try {
      await createChapter(storyId, newChapterTitle.trim(), newChapterDescription.trim());
      setNewChapterTitle('');
      setNewChapterDescription('');
      setShowAddForm(false);
    } catch (error) {
      // Error is handled by context
    } finally {
      setIsSubmitting(false);
    }
  };

  const getProgress = (): { completed: number; total: number; percentage: number } => {
    const total = chapterState.chapters.length;
    const completed = chapterState.chapters.filter(chapter => chapter.completed).length;
    const percentage = total > 0 ? Math.round((completed / total) * 100) : 0;
    return { completed, total, percentage };
  };

  const formatDate = (dateString: string): string => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric'
    });
  };

  const progress = getProgress();

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="p-6 border-b border-gray-200">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold text-gray-900">Story Chapters</h2>
          <button
            onClick={() => setShowAddForm(true)}
            className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded-lg text-sm font-medium transition-colors"
          >
            Add Chapter
          </button>
        </div>

        {/* Progress Summary */}
        <div className="mb-4">
          <div className="flex justify-between items-center mb-2">
            <span className="text-sm font-medium text-gray-700">
              Progress: {progress.completed} of {progress.total} completed
            </span>
            <span className="text-sm text-gray-600">{progress.percentage}%</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className="bg-green-600 h-2 rounded-full transition-all duration-300"
              style={{ width: `${progress.percentage}%` }}
            ></div>
          </div>
        </div>
      </div>

      {/* Error Display */}
      {chapterState.error && (
        <div className="mx-6 mt-4 bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex justify-between items-center">
            <div className="flex items-center">
              <div className="text-red-600 mr-3">
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
              </div>
              <p className="text-red-800">{chapterState.error}</p>
            </div>
            <button
              onClick={clearError}
              className="text-red-600 hover:text-red-800"
            >
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
              </svg>
            </button>
          </div>
        </div>
      )}

      {/* Add Chapter Form */}
      {showAddForm && (
        <div className="mx-6 mt-4 bg-gray-50 border border-gray-200 rounded-lg p-4">
          <h3 className="text-sm font-medium text-gray-900 mb-3">Add New Chapter</h3>
          <form onSubmit={handleAddChapter}>
            <div className="mb-3">
              <input
                type="text"
                value={newChapterTitle}
                onChange={(e) => setNewChapterTitle(e.target.value)}
                placeholder="Enter chapter title..."
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
                disabled={isSubmitting}
              />
            </div>
            <div className="mb-3">
              <textarea
                value={newChapterDescription}
                onChange={(e) => setNewChapterDescription(e.target.value)}
                placeholder="Enter chapter description (optional)..."
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                rows={2}
                disabled={isSubmitting}
              />
            </div>
            <div className="flex justify-end space-x-2">
              <button
                type="button"
                onClick={() => {
                  setShowAddForm(false);
                  setNewChapterTitle('');
                  setNewChapterDescription('');
                }}
                className="px-3 py-1 text-gray-700 bg-gray-200 hover:bg-gray-300 rounded-lg text-sm font-medium transition-colors"
                disabled={isSubmitting}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={isSubmitting || !newChapterTitle.trim()}
              >
                {isSubmitting ? 'Adding...' : 'Add Chapter'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Chapters */}
      <div className="flex-1 overflow-y-auto p-6">
        {/* Loading State */}
        {chapterState.loading && chapterState.chapters.length === 0 && (
          <div className="text-center py-8">
            <div className="inline-block animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
            <p className="mt-2 text-gray-600">Loading chapters...</p>
          </div>
        )}

        {/* Empty State */}
        {!chapterState.loading && chapterState.chapters.length === 0 && (
          <div className="text-center py-12">
            <div className="mx-auto h-16 w-16 text-gray-400 mb-4">
              <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
              </svg>
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">No chapters yet</h3>
            <p className="text-gray-600 mb-6">
              Start chatting with your AI concierge to get personalized recommendations and chapters.
            </p>
            <button
              onClick={() => setShowAddForm(true)}
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition-colors"
            >
              Add Your First Chapter
            </button>
          </div>
        )}

        {/* Chapters List */}
        {chapterState.chapters.length > 0 && (
          <div className="space-y-3">
            {chapterState.chapters.map((chapter) => (
              <div
                key={chapter.id}
                className={`flex items-start space-x-3 p-4 rounded-lg border transition-colors ${
                  chapter.completed
                    ? 'bg-green-50 border-green-200'
                    : 'bg-white border-gray-200 hover:border-gray-300'
                }`}
              >
                {/* Checkbox */}
                <button
                  onClick={() => handleToggleChapter(chapter)}
                  className={`flex-shrink-0 w-5 h-5 rounded border-2 flex items-center justify-center transition-colors ${
                    chapter.completed
                      ? 'bg-green-600 border-green-600 text-white'
                      : 'border-gray-300 hover:border-gray-400'
                  }`}
                >
                  {chapter.completed && (
                    <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  )}
                </button>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <h4 className={`text-sm font-medium ${
                    chapter.completed
                      ? 'text-green-800 line-through'
                      : 'text-gray-900'
                  }`}>
                    {chapter.title}
                  </h4>
                  {chapter.description && (
                    <p className={`text-sm mt-1 ${
                      chapter.completed
                        ? 'text-green-700 line-through'
                        : 'text-gray-600'
                    }`}>
                      {chapter.description}
                    </p>
                  )}
                  <div className="flex items-center justify-between mt-2">
                    <p className="text-xs text-gray-500">
                      Added {formatDate(chapter.created_at)}
                      {chapter.updated_at !== chapter.created_at && (
                        <span> • Updated {formatDate(chapter.updated_at)}</span>
                      )}
                    </p>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex-shrink-0">
                  <button
                    onClick={() => handleDeleteChapter(chapter)}
                    className="text-gray-400 hover:text-red-600 transition-colors p-1"
                    title="Delete chapter"
                  >
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M9 2a1 1 0 000 2h2a1 1 0 100-2H9zM4 5a2 2 0 012-2h8a2 2 0 012 2v10a2 2 0 01-2 2H6a2 2 0 01-2-2V5zm3 4a1 1 0 012 0v4a1 1 0 11-2 0V9zm4 0a1 1 0 012 0v4a1 1 0 11-2 0V9z" clipRule="evenodd" />
                    </svg>
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}