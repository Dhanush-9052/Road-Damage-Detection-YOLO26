import React, { useState, useEffect } from 'react';
import { Sidebar } from './components/Sidebar';
import { Header } from './components/Header';
import { DashboardPage } from './pages/DashboardPage';
import { ImageInspectionPage } from './pages/ImageInspectionPage';
import { VideoInspectionPage } from './pages/VideoInspectionPage';
import { InspectionDetailPage } from './pages/InspectionDetailPage';
import { AnalyticsPage } from './pages/AnalyticsPage';
import { HistoryPage } from './pages/HistoryPage';
import { AboutPage } from './pages/AboutPage';

import { api } from './services/api';
import type { ModelInfo } from './types';

export const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<string>('dashboard');
  const [sidebarCollapsed, setSidebarCollapsed] = useState<boolean>(false);
  const [selectedInspectionId, setSelectedInspectionId] = useState<string | null>(null);
  const [modelInfo, setModelInfo] = useState<ModelInfo | null>(null);
  const [backendError, setBackendError] = useState<string | null>(null);

  useEffect(() => {
    const fetchModel = async () => {
      try {
        const info = await api.getModelInfo();
        setModelInfo(info);
      } catch (err: any) {
        setBackendError('Backend service unreachable. Ensure FastAPI server is running on port 8000.');
      }
    };
    fetchModel();
  }, []);

  const handleSelectInspection = (id: string) => {
    setSelectedInspectionId(id);
    setActiveTab('detail');
  };

  const handleBackToHistory = () => {
    setSelectedInspectionId(null);
    setActiveTab('history');
  };

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-slate-100 text-slate-900">
      {/* Sidebar Navigation */}
      <Sidebar
        activeTab={activeTab === 'detail' ? 'history' : activeTab}
        setActiveTab={(tab) => {
          setSelectedInspectionId(null);
          setActiveTab(tab);
        }}
        collapsed={sidebarCollapsed}
        setCollapsed={setSidebarCollapsed}
        modelInfo={modelInfo}
      />

      {/* Main Content Area */}
      <div className="flex flex-1 flex-col overflow-hidden">
        <Header
          activeTab={activeTab}
          setActiveTab={(tab) => {
            setSelectedInspectionId(null);
            setActiveTab(tab);
          }}
          modelInfo={modelInfo}
        />

        {backendError && (
          <div className="bg-amber-50 border-b border-amber-200 px-6 py-2.5 text-xs text-amber-800 flex items-center justify-between">
            <span>⚠️ {backendError}</span>
            <button
              onClick={() => window.location.reload()}
              className="rounded-md bg-amber-600 px-2.5 py-1 font-bold text-white hover:bg-amber-500 transition-colors"
            >
              Retry Connection
            </button>
          </div>
        )}

        <main className="flex-1 overflow-y-auto">
          {activeTab === 'dashboard' && (
            <DashboardPage
              onSelectInspection={handleSelectInspection}
              onNavigate={setActiveTab}
            />
          )}

          {activeTab === 'image-inspect' && <ImageInspectionPage />}

          {activeTab === 'video-inspect' && (
            <VideoInspectionPage onSelectInspection={handleSelectInspection} />
          )}

          {activeTab === 'history' && (
            <HistoryPage
              onSelectInspection={handleSelectInspection}
              onNavigate={setActiveTab}
            />
          )}

          {activeTab === 'analytics' && (
            <AnalyticsPage
              onSelectInspection={handleSelectInspection}
              onNavigate={setActiveTab}
            />
          )}

          {activeTab === 'about' && <AboutPage />}

          {activeTab === 'detail' && selectedInspectionId && (
            <InspectionDetailPage
              inspectionId={selectedInspectionId}
              onBack={handleBackToHistory}
            />
          )}
        </main>
      </div>
    </div>
  );
};

export default App;
