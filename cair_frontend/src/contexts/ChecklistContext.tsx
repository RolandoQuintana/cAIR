import { createContext, useContext, useReducer, ReactNode } from 'react';
import { Chapter } from '../types';
import { apiService } from '../services/api';

// State interface
interface ChapterState {
  chapters: Chapter[];
  loading: boolean;
  error: string | null;
  currentStoryId: number | null;
}

// Action types
type ChapterAction =
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_ERROR'; payload: string | null }
  | { type: 'SET_CHAPTERS'; payload: Chapter[] }
  | { type: 'ADD_CHAPTER'; payload: Chapter }
  | { type: 'UPDATE_CHAPTER'; payload: Chapter }
  | { type: 'REMOVE_CHAPTER'; payload: number }
  | { type: 'SET_STORY_ID'; payload: number | null }
  | { type: 'CLEAR_CHAPTERS' };

// Context interface
interface ChapterContextType {
  state: ChapterState;
  loadChapters: (storyId: number) => Promise<void>;
  createChapter: (storyId: number, title: string, description?: string) => Promise<void>;
  updateChapter: (id: number, completed: boolean) => Promise<void>;
  deleteChapter: (id: number) => Promise<void>;
  addChapters: (chapters: Chapter[]) => void;
  setStoryId: (storyId: number | null) => void;
  clearChapters: () => void;
  clearError: () => void;
  getProgress: () => number;
}

// Initial state
const initialState: ChapterState = {
  chapters: [],
  loading: false,
  error: null,
  currentStoryId: null,
};

// Reducer function
function chapterReducer(state: ChapterState, action: ChapterAction): ChapterState {
  switch (action.type) {
    case 'SET_LOADING':
      return { ...state, loading: action.payload };
    case 'SET_ERROR':
      return { ...state, error: action.payload, loading: false };
    case 'SET_CHAPTERS':
      return { ...state, chapters: action.payload, loading: false, error: null };
    case 'ADD_CHAPTER':
      return {
        ...state,
        chapters: [...state.chapters, action.payload],
        loading: false,
        error: null,
      };
    case 'UPDATE_CHAPTER':
      return {
        ...state,
        chapters: state.chapters.map(chapter => chapter.id === action.payload.id ? action.payload : chapter),
        loading: false,
        error: null,
      };
    case 'REMOVE_CHAPTER':
      return {
        ...state,
        chapters: state.chapters.filter(chapter => chapter.id !== action.payload),
        loading: false,
        error: null,
      };
    case 'SET_STORY_ID':
      return { ...state, currentStoryId: action.payload };
    case 'CLEAR_CHAPTERS':
      return { ...state, chapters: [], error: null };
    default:
      return state;
  }
}

// Create context
const ChapterContext = createContext<ChapterContextType | undefined>(undefined);

// Provider component
interface ChapterProviderProps {
  children: ReactNode;
}

export function ChapterProvider({ children }: ChapterProviderProps) {
  const [state, dispatch] = useReducer(chapterReducer, initialState);

  // Load chapters for a story
  const loadChapters = async (storyId: number): Promise<void> => {
    try {
      dispatch({ type: 'SET_LOADING', payload: true });
      dispatch({ type: 'SET_STORY_ID', payload: storyId });
      const chapters = await apiService.getChapters(storyId);
      dispatch({ type: 'SET_CHAPTERS', payload: chapters });
    } catch (error) {
      dispatch({ type: 'SET_ERROR', payload: error instanceof Error ? error.message : 'Failed to load chapters' });
    }
  };

  // Create new chapter
  const createChapter = async (storyId: number, title: string, description?: string): Promise<void> => {
    try {
      dispatch({ type: 'SET_LOADING', payload: true });
      const chapter = await apiService.createChapter(storyId, title, description);
      dispatch({ type: 'ADD_CHAPTER', payload: chapter });
    } catch (error) {
      dispatch({ type: 'SET_ERROR', payload: error instanceof Error ? error.message : 'Failed to create chapter' });
    }
  };

  // Update chapter
  const updateChapter = async (id: number, completed: boolean): Promise<void> => {
    try {
      dispatch({ type: 'SET_LOADING', payload: true });
      const updatedChapter = await apiService.updateChapter(id, completed);
      dispatch({ type: 'UPDATE_CHAPTER', payload: updatedChapter });
    } catch (error) {
      dispatch({ type: 'SET_ERROR', payload: error instanceof Error ? error.message : 'Failed to update chapter' });
    }
  };

  // Delete chapter
  const deleteChapter = async (id: number): Promise<void> => {
    try {
      dispatch({ type: 'SET_LOADING', payload: true });
      await apiService.deleteChapter(id);
      dispatch({ type: 'REMOVE_CHAPTER', payload: id });
    } catch (error) {
      dispatch({ type: 'SET_ERROR', payload: error instanceof Error ? error.message : 'Failed to delete chapter' });
    }
  };

  // Add multiple chapters (used when AI generates new chapters)
  const addChapters = (chapters: Chapter[]): void => {
    chapters.forEach((chapter: Chapter) => {
      dispatch({ type: 'ADD_CHAPTER', payload: chapter });
    });
  };

  // Set current story ID
  const setStoryId = (storyId: number | null): void => {
    dispatch({ type: 'SET_STORY_ID', payload: storyId });
    if (storyId === null) {
      dispatch({ type: 'CLEAR_CHAPTERS' });
    }
  };

  // Clear chapters
  const clearChapters = (): void => {
    dispatch({ type: 'CLEAR_CHAPTERS' });
  };

  // Clear error
  const clearError = (): void => {
    dispatch({ type: 'SET_ERROR', payload: null });
  };

  // Calculate progress percentage
  const getProgress = (): number => {
    if (state.chapters.length === 0) return 0;
    const completedChapters = state.chapters.filter(chapter => chapter.completed).length;
    return Math.round((completedChapters / state.chapters.length) * 100);
  };

  const contextValue: ChapterContextType = {
    state,
    loadChapters,
    createChapter,
    updateChapter,
    deleteChapter,
    addChapters,
    setStoryId,
    clearChapters,
    clearError,
    getProgress,
  };

  return (
    <ChapterContext.Provider value={contextValue}>
      {children}
    </ChapterContext.Provider>
  );
}

// Custom hook to use chapter context
export function useChapter(): ChapterContextType {
  const context = useContext(ChapterContext);
  if (context === undefined) {
    throw new Error('useChapter must be used within a ChapterProvider');
  }
  return context;
}

// Keep the old exports for backward compatibility during transition
export const ChecklistProvider = ChapterProvider;
export const useChecklist = useChapter;