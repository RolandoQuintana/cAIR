import { useState } from 'react'
import { BrowserRouter as Router } from 'react-router-dom'
import { AppProviders } from './contexts/index'
import { Dashboard } from './components/Dashboard'
import { ProjectDetail } from './components/ProjectDetail'

function App() {
  const [selectedStoryId, setSelectedStoryId] = useState<number | null>(null);

  const handleStorySelect = (storyId: number) => {
    setSelectedStoryId(storyId);
  };

  const handleBackToDashboard = () => {
    setSelectedStoryId(null);
  };

  return (
    <AppProviders>
      <Router>
        <div className="min-h-screen bg-gray-50">
          {/* Responsive Header */}
          <header className="bg-white shadow-sm sticky top-0 z-40">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <div className="flex justify-between items-center py-4 sm:py-6">
                <div className="flex items-center space-x-4">
                  {selectedStoryId && (
                    <button
                      onClick={handleBackToDashboard}
                      className="sm:hidden p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
                      aria-label="Back to dashboard"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                      </svg>
                    </button>
                  )}
                  <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">cAir</h1>
                </div>
                <p className="hidden sm:block text-gray-600">AI Concierge MVP</p>
                <div className="sm:hidden">
                  <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center">
                    <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M3.172 5.172a4 4 0 015.656 0L10 6.343l1.172-1.171a4 4 0 115.656 5.656L10 17.657l-6.828-6.829a4 4 0 010-5.656z" clipRule="evenodd" />
                    </svg>
                  </div>
                </div>
              </div>
            </div>
          </header>
          
          {/* Main Content */}
          <main className="flex-1">
            {selectedStoryId ? (
              <ProjectDetail 
                storyId={selectedStoryId} 
                onBack={handleBackToDashboard} 
              />
            ) : (
              <Dashboard onStorySelect={handleStorySelect} />
            )}
          </main>
        </div>
      </Router>
    </AppProviders>
  )
}

export default App