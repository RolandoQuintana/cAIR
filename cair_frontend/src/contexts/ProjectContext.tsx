import { createContext, useContext, useReducer, ReactNode } from 'react';
import { Story, CreateStoryRequest, UpdateStoryRequest } from '../types';
import { apiService } from '../services/api';

// State interface
interface StoryState {
  stories: Story[];
  currentStory: Story | null;
  loading: boolean;
  error: string | null;
}

// Action types
type StoryAction =
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_ERROR'; payload: string | null }
  | { type: 'SET_STORIES'; payload: Story[] }
  | { type: 'SET_CURRENT_STORY'; payload: Story | null }
  | { type: 'ADD_STORY'; payload: Story }
  | { type: 'UPDATE_STORY'; payload: Story }
  | { type: 'REMOVE_STORY'; payload: number };

// Context interface
interface StoryContextType {
  state: StoryState;
  loadStories: () => Promise<void>;
  createStory: (data: CreateStoryRequest) => Promise<Story>;
  selectStory: (id: number) => Promise<void>;
  updateStory: (id: number, data: UpdateStoryRequest) => Promise<void>;
  deleteStory: (id: number) => Promise<void>;
  clearCurrentStory: () => void;
  clearError: () => void;
}

// Initial state
const initialState: StoryState = {
  stories: [],
  currentStory: null,
  loading: false,
  error: null,
};

// Reducer function
function storyReducer(state: StoryState, action: StoryAction): StoryState {
  switch (action.type) {
    case 'SET_LOADING':
      return { ...state, loading: action.payload };
    case 'SET_ERROR':
      return { ...state, error: action.payload, loading: false };
    case 'SET_STORIES':
      return { ...state, stories: action.payload, loading: false, error: null };
    case 'SET_CURRENT_STORY':
      return { ...state, currentStory: action.payload, loading: false, error: null };
    case 'ADD_STORY':
      return {
        ...state,
        stories: [...state.stories, action.payload],
        loading: false,
        error: null,
      };
    case 'UPDATE_STORY':
      return {
        ...state,
        stories: state.stories.map(s => s.id === action.payload.id ? action.payload : s),
        currentStory: state.currentStory?.id === action.payload.id ? action.payload : state.currentStory,
        loading: false,
        error: null,
      };
    case 'REMOVE_STORY':
      return {
        ...state,
        stories: state.stories.filter(s => s.id !== action.payload),
        currentStory: state.currentStory?.id === action.payload ? null : state.currentStory,
        loading: false,
        error: null,
      };
    default:
      return state;
  }
}

// Create context
const StoryContext = createContext<StoryContextType | undefined>(undefined);

// Provider component
interface StoryProviderProps {
  children: ReactNode;
}

export function StoryProvider({ children }: StoryProviderProps) {
  const [state, dispatch] = useReducer(storyReducer, initialState);

  // Load all stories
  const loadStories = async (): Promise<void> => {
    try {
      dispatch({ type: 'SET_LOADING', payload: true });
      const stories = await apiService.getStories();
      dispatch({ type: 'SET_STORIES', payload: stories });
    } catch (error) {
      dispatch({ type: 'SET_ERROR', payload: error instanceof Error ? error.message : 'Failed to load stories' });
    }
  };

  // Create new story
  const createStory = async (data: CreateStoryRequest): Promise<Story> => {
    try {
      dispatch({ type: 'SET_LOADING', payload: true });
      const story = await apiService.createStory(data);
      dispatch({ type: 'ADD_STORY', payload: story });
      return story;
    } catch (error) {
      dispatch({ type: 'SET_ERROR', payload: error instanceof Error ? error.message : 'Failed to create story' });
      throw error;
    }
  };

  // Select and load a specific story
  const selectStory = async (id: number): Promise<void> => {
    try {
      dispatch({ type: 'SET_LOADING', payload: true });
      const story = await apiService.getStory(id);
      dispatch({ type: 'SET_CURRENT_STORY', payload: story });
    } catch (error) {
      dispatch({ type: 'SET_ERROR', payload: error instanceof Error ? error.message : 'Failed to load story' });
    }
  };

  // Update story
  const updateStory = async (id: number, data: UpdateStoryRequest): Promise<void> => {
    try {
      dispatch({ type: 'SET_LOADING', payload: true });
      const updatedStory = await apiService.updateStory(id, data);
      dispatch({ type: 'UPDATE_STORY', payload: updatedStory });
    } catch (error) {
      dispatch({ type: 'SET_ERROR', payload: error instanceof Error ? error.message : 'Failed to update story' });
    }
  };

  // Delete story
  const deleteStory = async (id: number): Promise<void> => {
    try {
      dispatch({ type: 'SET_LOADING', payload: true });
      await apiService.deleteStory(id);
      dispatch({ type: 'REMOVE_STORY', payload: id });
    } catch (error) {
      dispatch({ type: 'SET_ERROR', payload: error instanceof Error ? error.message : 'Failed to delete story' });
    }
  };

  // Clear current story
  const clearCurrentStory = (): void => {
    dispatch({ type: 'SET_CURRENT_STORY', payload: null });
  };

  // Clear error
  const clearError = (): void => {
    dispatch({ type: 'SET_ERROR', payload: null });
  };

  const contextValue: StoryContextType = {
    state,
    loadStories,
    createStory,
    selectStory,
    updateStory,
    deleteStory,
    clearCurrentStory,
    clearError,
  };

  return (
    <StoryContext.Provider value={contextValue}>
      {children}
    </StoryContext.Provider>
  );
}

// Custom hook to use story context
export function useStory(): StoryContextType {
  const context = useContext(StoryContext);
  if (context === undefined) {
    throw new Error('useStory must be used within a StoryProvider');
  }
  return context;
}

// Keep the old exports for backward compatibility during transition
export const ProjectProvider = StoryProvider;
export const useProject = useStory;