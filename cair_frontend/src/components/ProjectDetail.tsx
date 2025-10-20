import { useState, useEffect } from 'react';
import { useProject } from '../contexts';
import { StoryType } from '../types';
import { ChatInterface } from './ChatInterface';
import { ChecklistComponent } from './ChecklistComponent';

interface ProjectDetailProps {
  storyId: number;
  onBack: () => void;
}

type ViewMode = 'chat' | 'chapters';

export function ProjectDetail({ storyId, onBack }: ProjectDetailProps) {
  const { state, selectStory, updateStory, clearError } = useProject();
  const [viewMode, setViewMode] = useState<ViewMode>('chat');
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState({
    title: '',
    type: 'travel' as StoryType
  });

  // Load story on mount
  useEffect(() => {
    selectStory(storyId);
  }, [storyId]);

  // Update edit form when story loads
  useEffect(() => {
    if (state.currentStory) {
      setEditForm({
        title: state.currentStory.title,
        type: state.currentStory.type
      });
    }
  }, [state.currentStory]);

  // Handle story update
  const handleUpdateStory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!state.currentStory || !editForm.title.trim()) return;

    try {
      await updateStory(state.currentStory.id, {
        title: editForm.title.trim(),
        type: editForm.type
      });
      setIsEditing(false);
    } catch (error) {
      // Error is handled by context
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
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (state.loading && !state.currentStory) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="text-center py-12">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <p className="mt-4 text-gray-600">Loading story...</p>
        </div>
      </div>
    );
  }

  if (!state.currentStory && !state.loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="text-center py-12">
          <div className="mx-auto h-24 w-24 text-gray-400 mb-4">
            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">Story not found</h3>
          <p className="text-gray-600 mb-6">The story you're looking for doesn't exist or couldn't be loaded.</p>
          <button
            onClick={onBack}
            className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-medium transition-colors"
          >
            Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  const story = state.currentStory!;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center mb-4">
          <button
            onClick={onBack}
            className="mr-4 p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <div className="flex-1">
            {isEditing ? (
              <form onSubmit={handleUpdateStory} className="flex items-center space-x-4">
                <input
                  type="text"
                  value={editForm.title}
                  onChange={(e) => setEditForm({ ...editForm, title: e.target.value })}
                  className="text-2xl font-bold text-gray-900 bg-transparent border-b-2 border-blue-600 focus:outline-none focus:border-blue-700"
                  required
                />
                <select
                  value={editForm.type}
                  onChange={(e) => setEditForm({ ...editForm, type: e.target.value as StoryType })}
                  className="text-sm text-gray-600 bg-transparent border-b border-gray-300 focus:outline-none focus:border-blue-600"
                >
                  <option value="travel">Travel Story</option>
                  <option value="wedding">Wedding Story</option>
                </select>
                <div className="flex space-x-2">
                  <button
                    type="submit"
                    className="text-green-600 hover:text-green-700 p-1"
                    title="Save changes"
                  >
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setIsEditing(false);
                      setEditForm({
                        title: story.title,
                        type: story.type
                      });
                    }}
                    className="text-red-600 hover:text-red-700 p-1"
                    title="Cancel editing"
                  >
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                    </svg>
                  </button>
                </div>
              </form>
            ) : (
              <div className="flex items-center justify-between">
                <div>
                  <div className="flex items-center space-x-4">
                    <h1 className="text-3xl font-bold text-gray-900">{story.title}</h1>
                    <button
                      onClick={() => setIsEditing(true)}
                      className="text-gray-400 hover:text-gray-600 p-1"
                      title="Edit story"
                    >
                      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                        <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
                      </svg>
                    </button>
                  </div>
                  <p className="text-gray-600 mt-1">{getStoryTypeDisplay(story.type)}</p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Progress Bar */}
        <div className="mb-6">
          <div className="flex justify-between items-center mb-2">
            <span className="text-sm font-medium text-gray-700">Overall Progress</span>
            <span className="text-sm text-gray-600">{Math.round(story.progress * 100)}%</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-3">
            <div
              className="bg-blue-600 h-3 rounded-full transition-all duration-300"
              style={{ width: `${story.progress * 100}%` }}
            ></div>
          </div>
        </div>

        {/* Story Metadata */}
        <div className="text-sm text-gray-600 mb-6">
          <p>Created: {formatDate(story.created_at)}</p>
          {story.updated_at !== story.created_at && (
            <p>Last updated: {formatDate(story.updated_at)}</p>
          )}
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

      {/* Navigation Tabs */}
      <div className="border-b border-gray-200 mb-8">
        <nav className="-mb-px flex space-x-8">
          <button
            onClick={() => setViewMode('chat')}
            className={`py-2 px-1 border-b-2 font-medium text-sm transition-colors ${
              viewMode === 'chat'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            <div className="flex items-center space-x-2">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
              <span>Chat</span>
            </div>
          </button>
          <button
            onClick={() => setViewMode('chapters')}
            className={`py-2 px-1 border-b-2 font-medium text-sm transition-colors ${
              viewMode === 'chapters'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            <div className="flex items-center space-x-2">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
              </svg>
              <span>Chapters</span>
            </div>
          </button>
        </nav>
      </div>

      {/* Content Area */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200" style={{ height: '600px' }}>
        {viewMode === 'chat' ? (
          <ChatInterface storyId={story.id} />
        ) : (
          <ChecklistComponent storyId={story.id} />
        )}
      </div>
    </div>
  );
}