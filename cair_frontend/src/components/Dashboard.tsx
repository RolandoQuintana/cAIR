import { useState, useEffect } from 'react';
import { useProject } from '../contexts';
import { StoryType } from '../types';

interface NewStoryFormData {
  title: string;
  type: StoryType;
}

interface DashboardProps {
  onStorySelect: (storyId: number) => void;
}

export function Dashboard({ onStorySelect }: DashboardProps) {
  const { state, loadStories, createStory, deleteStory, clearError } = useProject();
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [formData, setFormData] = useState<NewStoryFormData>({
    title: '',
    type: 'travel'
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Load stories on component mount
  useEffect(() => {
    loadStories();
  }, []);

  // Handle form submission
  const handleCreateStory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title.trim()) return;

    setIsSubmitting(true);
    try {
      await createStory({
        title: formData.title.trim(),
        type: formData.type
      });
      setFormData({ title: '', type: 'travel' });
      setShowCreateForm(false);
    } catch (error) {
      // Error is handled by context
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle story deletion
  const handleDeleteStory = async (id: number, title: string) => {
    if (window.confirm(`Are you sure you want to delete "${title}"? This action cannot be undone.`)) {
      try {
        await deleteStory(id);
      } catch (error) {
        // Error is handled by context
      }
    }
  };

  // Get story type display name
  const getStoryTypeDisplay = (type: StoryType): string => {
    switch (type) {
      case 'travel':
        return 'Travel Story';
      case 'wedding':
        return 'Wedding Story';
      default:
        return type;
    }
  };

  // Format date for display
  const formatDate = (dateString: string): string => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="mb-8">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Your Stories</h1>
            <p className="mt-2 text-gray-600">
              Manage your AI concierge stories and track your progress
            </p>
          </div>
          <button
            onClick={() => setShowCreateForm(true)}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition-colors"
          >
            New Story
          </button>
        </div>
      </div>

      {/* Error Display */}
      {state.error && (
        <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex justify-between items-center">
            <div className="flex items-center">
              <div className="text-red-600 mr-3">
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
              </div>
              <p className="text-red-800">{state.error}</p>
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

      {/* Create Story Form Modal */}
      {showCreateForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Create New Story</h2>
            <form onSubmit={handleCreateStory}>
              <div className="mb-4">
                <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-2">
                  Story Title
                </label>
                <input
                  type="text"
                  id="title"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Enter story title..."
                  required
                  disabled={isSubmitting}
                />
              </div>
              <div className="mb-6">
                <label htmlFor="type" className="block text-sm font-medium text-gray-700 mb-2">
                  Story Type
                </label>
                <select
                  id="type"
                  value={formData.type}
                  onChange={(e) => setFormData({ ...formData, type: e.target.value as StoryType })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  disabled={isSubmitting}
                >
                  <option value="travel">Travel Story</option>
                  <option value="wedding">Wedding Story</option>
                </select>
              </div>
              <div className="flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => {
                    setShowCreateForm(false);
                    setFormData({ title: '', type: 'travel' });
                  }}
                  className="px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg font-medium transition-colors"
                  disabled={isSubmitting}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  disabled={isSubmitting || !formData.title.trim()}
                >
                  {isSubmitting ? 'Creating...' : 'Create Story'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Loading State */}
      {state.loading && state.stories.length === 0 && (
        <div className="text-center py-12">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <p className="mt-4 text-gray-600">Loading stories...</p>
        </div>
      )}

      {/* Empty State */}
      {!state.loading && state.stories.length === 0 && !state.error && (
        <div className="text-center py-12">
          <div className="mx-auto h-24 w-24 text-gray-400 mb-4">
            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
            </svg>
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">No stories yet</h3>
          <p className="text-gray-600 mb-6">Get started by creating your first AI concierge story</p>
          <button
            onClick={() => setShowCreateForm(true)}
            className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-medium transition-colors"
          >
            Create Your First Story
          </button>
        </div>
      )}

      {/* Stories Grid */}
      {state.stories.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {state.stories.map((story) => (
            <div
              key={story.id}
              className="bg-white rounded-lg shadow-sm border border-gray-200 hover:shadow-md transition-shadow"
            >
              <div className="p-6">
                <div className="flex justify-between items-start mb-4">
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-gray-900 mb-1">
                      {story.title}
                    </h3>
                    <p className="text-sm text-gray-600">
                      {getStoryTypeDisplay(story.type)}
                    </p>
                  </div>
                  <button
                    onClick={() => handleDeleteStory(story.id, story.title)}
                    className="text-gray-400 hover:text-red-600 transition-colors"
                    title="Delete story"
                  >
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M9 2a1 1 0 000 2h2a1 1 0 100-2H9zM4 5a2 2 0 012-2h8a2 2 0 012 2v10a2 2 0 01-2 2H6a2 2 0 01-2-2V5zm3 4a1 1 0 012 0v4a1 1 0 11-2 0V9zm4 0a1 1 0 012 0v4a1 1 0 11-2 0V9z" clipRule="evenodd" />
                    </svg>
                  </button>
                </div>

                {/* Progress Bar */}
                <div className="mb-4">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm font-medium text-gray-700">Progress</span>
                    <span className="text-sm text-gray-600">{Math.round(story.progress * 100)}%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                      style={{ width: `${story.progress * 100}%` }}
                    ></div>
                  </div>
                </div>

                {/* Story Info */}
                <div className="text-sm text-gray-600 mb-4">
                  <p>Created: {formatDate(story.created_at)}</p>
                  {story.updated_at !== story.created_at && (
                    <p>Updated: {formatDate(story.updated_at)}</p>
                  )}
                </div>

                {/* Action Button */}
                <button
                  onClick={() => onStorySelect(story.id)}
                  className="w-full bg-gray-50 hover:bg-gray-100 text-gray-700 py-2 px-4 rounded-lg font-medium transition-colors"
                >
                  Open Story
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}