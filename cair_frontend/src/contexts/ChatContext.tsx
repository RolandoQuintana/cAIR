import { createContext, useContext, useReducer, ReactNode } from 'react';
import { Message, Chapter, SendMessageResponse } from '../types';
import { apiService } from '../services/api';

// State interface
interface ChatState {
  messages: Message[];
  loading: boolean;
  error: string | null;
  currentStoryId: number | null;
}

// Action types
type ChatAction =
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_ERROR'; payload: string | null }
  | { type: 'SET_MESSAGES'; payload: Message[] }
  | { type: 'ADD_MESSAGE'; payload: Message }
  | { type: 'SET_STORY_ID'; payload: number | null }
  | { type: 'CLEAR_MESSAGES' };

// Context interface
interface ChatContextType {
  state: ChatState;
  loadMessages: (storyId: number) => Promise<void>;
  sendMessage: (content: string) => Promise<Chapter[]>;
  setStoryId: (storyId: number | null) => void;
  clearMessages: () => void;
  clearError: () => void;
}

// Initial state
const initialState: ChatState = {
  messages: [],
  loading: false,
  error: null,
  currentStoryId: null,
};

// Reducer function
function chatReducer(state: ChatState, action: ChatAction): ChatState {
  switch (action.type) {
    case 'SET_LOADING':
      return { ...state, loading: action.payload };
    case 'SET_ERROR':
      return { ...state, error: action.payload, loading: false };
    case 'SET_MESSAGES':
      return { ...state, messages: action.payload, loading: false, error: null };
    case 'ADD_MESSAGE':
      return {
        ...state,
        messages: [...state.messages, action.payload],
        loading: false,
        error: null,
      };
    case 'SET_STORY_ID':
      return { ...state, currentStoryId: action.payload };
    case 'CLEAR_MESSAGES':
      return { ...state, messages: [], error: null };
    default:
      return state;
  }
}

// Create context
const ChatContext = createContext<ChatContextType | undefined>(undefined);

// Provider component
interface ChatProviderProps {
  children: ReactNode;
}

export function ChatProvider({ children }: ChatProviderProps) {
  const [state, dispatch] = useReducer(chatReducer, initialState);

  // Load messages for a story
  const loadMessages = async (storyId: number): Promise<void> => {
    try {
      dispatch({ type: 'SET_LOADING', payload: true });
      dispatch({ type: 'SET_STORY_ID', payload: storyId });
      const messages = await apiService.getMessages(storyId);
      dispatch({ type: 'SET_MESSAGES', payload: messages });
    } catch (error) {
      dispatch({ type: 'SET_ERROR', payload: error instanceof Error ? error.message : 'Failed to load messages' });
    }
  };

  // Send message and get AI response
  const sendMessage = async (content: string): Promise<Chapter[]> => {
    if (!state.currentStoryId) {
      throw new Error('No story selected');
    }

    try {
      dispatch({ type: 'SET_LOADING', payload: true });
      
      // Add user message immediately to the UI
      const userMessage: Message = {
        id: Date.now(), // Temporary ID, will be replaced by server response
        story: state.currentStoryId,
        role: 'user',
        content,
        created_at: new Date().toISOString(),
      };
      dispatch({ type: 'ADD_MESSAGE', payload: userMessage });

      // Send message to API and get response
      const response: SendMessageResponse = await apiService.sendMessage(state.currentStoryId, content);
      
      // Replace temporary user message with server response
      const messages = await apiService.getMessages(state.currentStoryId);
      dispatch({ type: 'SET_MESSAGES', payload: messages });
      
      return response.chapter_updates;
    } catch (error) {
      dispatch({ type: 'SET_ERROR', payload: error instanceof Error ? error.message : 'Failed to send message' });
      throw error;
    }
  };

  // Set current story ID
  const setStoryId = (storyId: number | null): void => {
    dispatch({ type: 'SET_STORY_ID', payload: storyId });
    if (storyId === null) {
      dispatch({ type: 'CLEAR_MESSAGES' });
    }
  };

  // Clear messages
  const clearMessages = (): void => {
    dispatch({ type: 'CLEAR_MESSAGES' });
  };

  // Clear error
  const clearError = (): void => {
    dispatch({ type: 'SET_ERROR', payload: null });
  };

  const contextValue: ChatContextType = {
    state,
    loadMessages,
    sendMessage,
    setStoryId,
    clearMessages,
    clearError,
  };

  return (
    <ChatContext.Provider value={contextValue}>
      {children}
    </ChatContext.Provider>
  );
}

// Custom hook to use chat context
export function useChat(): ChatContextType {
  const context = useContext(ChatContext);
  if (context === undefined) {
    throw new Error('useChat must be used within a ChatProvider');
  }
  return context;
}