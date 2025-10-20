// Export all context providers and hooks
export { StoryProvider, useStory, ProjectProvider, useProject } from './ProjectContext';
export { ChatProvider, useChat } from './ChatContext';
export { ChapterProvider, useChapter, ChecklistProvider, useChecklist } from './ChecklistContext';

// Combined provider component for easy setup
import { ReactNode } from 'react';
import { StoryProvider } from './ProjectContext';
import { ChatProvider } from './ChatContext';
import { ChapterProvider } from './ChecklistContext';

interface AppProvidersProps {
  children: ReactNode;
}

export function AppProviders({ children }: AppProvidersProps) {
  return (
    <StoryProvider>
      <ChatProvider>
        <ChapterProvider>
          {children}
        </ChapterProvider>
      </ChatProvider>
    </StoryProvider>
  );
}