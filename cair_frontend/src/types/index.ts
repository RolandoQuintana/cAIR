// TypeScript interfaces will be defined here in later tasks
export interface ConciergeProject {
  id: number;
  title: string;
  type: 'travel' | 'wedding';
  progress: number;
  created_at: string;
  updated_at: string;
}

export interface Message {
  id: number;
  project: number;
  role: 'user' | 'assistant';
  content: string;
  created_at: string;
}

export interface ChecklistItem {
  id: number;
  project: number;
  description: string;
  completed: boolean;
  created_at: string;
  updated_at: string;
}