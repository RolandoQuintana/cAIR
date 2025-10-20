import { useState } from 'react'
import { BrowserRouter as Router } from 'react-router-dom'
import { AppProviders } from './contexts/index'
import { Dashboard } from './components/Dashboard'
import { ProjectDetail } from './components/ProjectDetail'

function App() {
  const [selectedProjectId, setSelectedProjectId] = useState<number | null>(null);

  const handleProjectSelect = (projectId: number) => {
    setSelectedProjectId(projectId);
  };

  const handleBackToDashboard = () => {
    setSelectedProjectId(null);
  };

  return (
    <AppProviders>
      <Router>
        <div className="min-h-screen bg-gray-50">
          <header className="bg-white shadow-sm">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <div className="flex justify-between items-center py-6">
                <h1 className="text-3xl font-bold text-gray-900">cAir</h1>
                <p className="text-gray-600">AI Concierge MVP</p>
              </div>
            </div>
          </header>
          
          <main>
            {selectedProjectId ? (
              <ProjectDetail 
                projectId={selectedProjectId} 
                onBack={handleBackToDashboard} 
              />
            ) : (
              <Dashboard onProjectSelect={handleProjectSelect} />
            )}
          </main>
        </div>
      </Router>
    </AppProviders>
  )
}

export default App