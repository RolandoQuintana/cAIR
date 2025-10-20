import axios, { AxiosResponse } from 'axios';
import { Story, Message, Chapter } from '../types';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

export const apiClient = axios.create({
  baseURL: `${API_BASE_URL}/api`,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request/Response types for API operations
export interface CreateStoryData {
  title: string;
  type: 'travel' | 'wedding';
}

export interface UpdateStoryData {
  title?: string;
  type?: 'travel' | 'wedding';
}

export interface SendMessageResponse {
  message: Message;
  chapter_updates: Chapter[];
}

export interface ApiError {
  error: {
    code: string;
    message: string;
    details?: any;
  };
}

// API Service Class
export class ApiService {
  private static instance: ApiService;

  private constructor() {}

  public static getInstance(): ApiService {
    if (!ApiService.instance) {
      ApiService.instance = new ApiService();
    }
    return ApiService.instance;
  }

  // Error handling helper
  private handleApiError(error: any): never {
    if (error.response?.data?.error) {
      throw new Error(error.response.data.error.message);
    } else if (error.response?.data?.message) {
      throw new Error(error.response.data.message);
    } else if (error.message) {
      throw new Error(error.message);
    } else {
      throw new Error('An unexpected error occurred');
    }
  }

  // Response validation helper
  private validateResponse<T>(response: AxiosResponse<T>): T {
    if (response.status >= 200 && response.status < 300) {
      return response.data;
    }
    throw new Error(`API request failed with status ${response.status}`);
  }

  // Story Management Methods
  async getStories(): Promise<Story[]> {
    try {
      const response = await apiClient.get<Story[]>('/stories/');
      return this.validateResponse(response);
    } catch (error) {
      this.handleApiError(error);
    }
  }

  async createStory(data: CreateStoryData): Promise<Story> {
    try {
      const response = await apiClient.post<Story>('/stories/', data);
      return this.validateResponse(response);
    } catch (error) {
      this.handleApiError(error);
    }
  }

  async getStory(id: number): Promise<Story> {
    try {
      const response = await apiClient.get<Story>(`/stories/${id}/`);
      return this.validateResponse(response);
    } catch (error) {
      this.handleApiError(error);
    }
  }

  async updateStory(id: number, data: UpdateStoryData): Promise<Story> {
    try {
      const response = await apiClient.put<Story>(`/stories/${id}/`, data);
      return this.validateResponse(response);
    } catch (error) {
      this.handleApiError(error);
    }
  }

  async deleteStory(id: number): Promise<void> {
    try {
      const response = await apiClient.delete(`/stories/${id}/`);
      this.validateResponse(response);
    } catch (error) {
      this.handleApiError(error);
    }
  }

  // Message Methods
  async getMessages(storyId: number): Promise<Message[]> {
    try {
      const response = await apiClient.get<Message[]>(`/stories/${storyId}/messages/`);
      return this.validateResponse(response);
    } catch (error) {
      this.handleApiError(error);
    }
  }

  async sendMessage(storyId: number, content: string): Promise<SendMessageResponse> {
    try {
      const response = await apiClient.post<SendMessageResponse>(
        `/stories/${storyId}/messages/`,
        { content }
      );
      return this.validateResponse(response);
    } catch (error) {
      this.handleApiError(error);
    }
  }

  // Chapter Methods
  async getChapters(storyId: number): Promise<Chapter[]> {
    try {
      const response = await apiClient.get<Chapter[]>(`/stories/${storyId}/chapters/`);
      return this.validateResponse(response);
    } catch (error) {
      this.handleApiError(error);
    }
  }

  async createChapter(storyId: number, title: string, description?: string): Promise<Chapter> {
    try {
      const response = await apiClient.post<Chapter>(
        `/stories/${storyId}/chapters/`,
        { title, description: description || '' }
      );
      return this.validateResponse(response);
    } catch (error) {
      this.handleApiError(error);
    }
  }

  async updateChapter(id: number, completed: boolean): Promise<Chapter> {
    try {
      const response = await apiClient.put<Chapter>(`/chapters/${id}/`, { completed });
      return this.validateResponse(response);
    } catch (error) {
      this.handleApiError(error);
    }
  }

  async deleteChapter(id: number): Promise<void> {
    try {
      const response = await apiClient.delete(`/chapters/${id}/`);
      this.validateResponse(response);
    } catch (error) {
      this.handleApiError(error);
    }
  }
}

// Export singleton instance
export const apiService = ApiService.getInstance();