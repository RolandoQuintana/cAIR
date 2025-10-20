// Core data model interfaces
export interface Story {
  id: number;
  title: string;
  type: 'travel' | 'wedding';
  progress: number;
  created_at: string;
  updated_at: string;
}

export interface Message {
  id: number;
  story: number;
  role: 'user' | 'assistant';
  content: string;
  created_at: string;
}

export interface Chapter {
  id: number;
  story: number;
  title: string;
  description: string;
  completed: boolean;
  order: number;
  created_at: string;
  updated_at: string;
}

// Story type options
export type StoryType = 'travel' | 'wedding';

// Message role types
export type MessageRole = 'user' | 'assistant';

// API operation types
export interface CreateStoryRequest {
  title: string;
  type: StoryType;
}

export interface UpdateStoryRequest {
  title?: string;
  type?: StoryType;
}

export interface SendMessageRequest {
  content: string;
}

export interface UpdateChapterRequest {
  completed: boolean;
}

export interface CreateChapterRequest {
  title: string;
  description?: string;
  order?: number;
}

// API response types
export interface SendMessageResponse {
  message: Message;
  chapter_updates: Chapter[];
}

// Error handling types
export interface ApiErrorResponse {
  error: {
    code: string;
    message: string;
    details?: Record<string, any>;
  };
}

// Loading and error state types for components
export interface LoadingState {
  loading: boolean;
  error: string | null;
}

// Form validation types
export interface ValidationError {
  field: string;
  message: string;
}