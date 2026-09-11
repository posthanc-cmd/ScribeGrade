import React, { useState, useEffect } from 'react';
import { ApiKeyModal } from './components/ApiKeyModal';
import { PWAInstallButton } from './components/PWAInstallButton';
import { Scanner } from './components/Scanner';
import { Report } from './components/Report';
import { HistoryList } from './components/HistoryList';
import { GraduationCap, LayoutDashboard, History, Loader2 } from 'lucide-react';
import { HistoryItem, GradeResult } from './types';

export default function App() {
  const [apiKey, setApiKey] = useState<string | null>(null);
  const [activeView, setActiveView] = useState<'scanner' | 'report' | 'history'>('scanner');
  const [currentReport, setCurrentReport] = useState<GradeResult | null>(null);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const storedKey = localStorage.getItem('gemini_api_key');
    if (storedKey) setApiKey(storedKey);

    const storedHistory = localStorage.getItem('scribegrade_history');
    if (storedHistory) {
      try {
        setHistory(JSON.parse(storedHistory));
      } catch (e) {
        console.error('Failed to parse history', e);
      }
    }
  }, []);

  const handleSaveApiKey = (key: string) => {
    localStorage.setItem('gemini_api_key', key);
    setApiKey(key);
  };

  const handleLogout = () => {
    localStorage.removeItem('gemini_api_key');
    setApiKey(null);
    setCurrentReport(null);
    setActiveView('scanner');
  };

  const saveToHistory = (result: GradeResult) => {
    const newItem: HistoryItem = {
      id: crypto.randomUUID(),
      date: new Date().toISOString(),
      title: `Workbook Grade - ${new Date().toLocaleDateString()}`,
      result
    };
    const newHistory = [newItem, ...history];
    setHistory(newHistory);
    localStorage.setItem('scribegrade_history', JSON.stringify(newHistory));
  };

  const deleteHistoryItem = (id: string) => {
    const newHistory = history.filter(item => item.id !== id);
    setHistory(newHistory);
    localStorage.setItem('scribegrade_history', JSON.stringify(newHistory));
    if (activeView === 'report') {
      setActiveView('history');
      setCurrentReport(null);
    }
  };

  const [progressInfo, setProgressInfo] = useState<string | null>(null);

  const handleGrade = async (images: string[], language: string) => {
    if (!apiKey) return;
    
    setIsLoading(true);
    setError(null);
    setProgressInfo('Preparing images for grading...');
    
    try {
      const BATCH_SIZE = 2;
      const chunks = [];
      for (let i = 0; i < images.length; i += BATCH_SIZE) {
        chunks.push(images.slice(i, i + BATCH_SIZE));
      }

      let allSections: any[] = [];
      let totalScore = 0;
      let scoreCount = 0;
      let combinedFeedback = "";

      for (let i = 0; i < chunks.length; i++) {
        if (chunks.length > 1) {
          setProgressInfo(`Processing batch ${i + 1} of ${chunks.length} (Pages ${i * BATCH_SIZE + 1}-${Math.min((i + 1) * BATCH_SIZE, images.length)})...`);
        } else {
          setProgressInfo('Analyzing Workbook...');
        }
        
        const chunk = chunks[i];
        const response = await fetch('/api/grade', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-api-key': apiKey,
          },
          body: JSON.stringify({ images: chunk, language }),
        });
        
        const isJson = response.headers.get('content-type')?.includes('application/json');
        let data;
        
        if (isJson) {
          data = await response.json();
        } else {
          const textError = await response.text();
          const previewText = textError.substring(0, 100).replace(/\n/g, ' ');
          throw new Error(response.status === 504 || response.status === 502 ? "The server timed out while grading. Please try uploading fewer pages at a time." : `Received an invalid response from the server (Status: ${response.status}). Details: ${previewText}`);
        }
        
        if (!response.ok) {
          throw new Error(data?.error || `Failed to grade batch ${i + 1}`);
        }

        if (data.sections && Array.isArray(data.sections)) {
          allSections = [...allSections, ...data.sections];
        }
        
        if (data.overallScore !== undefined) {
          totalScore += data.overallScore;
          scoreCount++;
        }
        
        if (data.feedbackSummary) {
          combinedFeedback += (chunks.length > 1 ? `**Part ${i + 1}:** ` : '') + data.feedbackSummary + "\n\n";
        }
      }

      const finalResult: GradeResult = {
        overallScore: scoreCount > 0 ? Number((totalScore / scoreCount).toFixed(1)) : 0,
        feedbackSummary: combinedFeedback.trim(),
        sections: allSections,
      };
      
      saveToHistory(finalResult);
      setCurrentReport(finalResult);
      setActiveView('report');
    } catch (err: any) {
      let cleanMessage = err.message || 'An unexpected error occurred';
      if (cleanMessage.includes("Failed to fetch")) {
        cleanMessage = "Could not connect to the server. Please check your internet connection and try again.";
      } else if (cleanMessage.includes("{") || cleanMessage.includes("ApiError")) {
        cleanMessage = "An unexpected error occurred while processing the workbook. Please try again.";
      }
      setError(cleanMessage);
    } finally {
      setIsLoading(false);
      setProgressInfo(null);
    }
  };

  if (!apiKey) {
    return (
      <div className="min-h-screen bg-stone-50 relative">
        <ApiKeyModal onSave={handleSaveApiKey} />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-stone-50 flex flex-col font-sans text-stone-900">
      <header className="bg-white border-b border-stone-200 sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-3">
              <div className="bg-indigo-600 p-2 rounded-lg shadow-sm">
                <GraduationCap className="w-5 h-5 text-white" />
              </div>
              <h1 className="text-xl font-bold text-stone-900 tracking-tight hidden sm:block">ScribeGrade</h1>
            </div>
            
            <div className="flex bg-stone-100 p-1 rounded-lg">
              <button
                onClick={() => { setActiveView('scanner'); setCurrentReport(null); }}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${activeView === 'scanner' || activeView === 'report' ? 'bg-white text-stone-900 shadow-sm' : 'text-stone-500 hover:text-stone-700'}`}
              >
                <LayoutDashboard className="w-4 h-4" />
                <span className="hidden sm:inline">Scanner</span>
              </button>
              <button
                onClick={() => { setActiveView('history'); setCurrentReport(null); }}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${activeView === 'history' ? 'bg-white text-stone-900 shadow-sm' : 'text-stone-500 hover:text-stone-700'}`}
              >
                <History className="w-4 h-4" />
                <span className="hidden sm:inline">History</span>
              </button>
            </div>
          </div>
          
          <div className="flex items-center gap-4">
            <PWAInstallButton />
            <button
              onClick={handleLogout}
              className="text-sm font-medium text-stone-500 hover:text-stone-900 transition-colors"
            >
              Change Key
            </button>
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-12 w-full">
        {error && (
          <div className="mb-8 bg-red-50 border-l-4 border-red-500 p-4 rounded-r-lg shadow-sm">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <p className="text-sm text-red-700 font-medium">
                  {error}
                </p>
              </div>
            </div>
          </div>
        )}

        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-20 bg-white rounded-2xl shadow-sm border border-stone-200">
            <div className="relative mb-6">
              <Loader2 className="w-12 h-12 text-indigo-600 animate-spin" />
              <div className="absolute inset-0 bg-indigo-100 rounded-full blur-xl opacity-50 -z-10 animate-pulse"></div>
            </div>
            <h3 className="text-xl font-bold text-stone-900 mb-2 tracking-tight">{progressInfo || 'Analyzing Workbook...'}</h3>
            <p className="text-stone-500 text-sm max-w-sm text-center leading-relaxed">
              Currently processing the pages, reading handwritten text, and grading the answers against the standard rubric. This might take a few moments.
            </p>
          </div>
        ) : activeView === 'scanner' ? (
          <Scanner onImagesReady={handleGrade} isLoading={isLoading} />
        ) : null}
        
        {activeView === 'report' && currentReport && !isLoading && (
          <Report 
            result={currentReport} 
            onReset={() => {
              setActiveView('history');
              setCurrentReport(null);
            }} 
          />
        )}

        {activeView === 'history' && (
          <HistoryList 
            history={history} 
            onSelect={(item) => {
              setCurrentReport(item.result);
              setActiveView('report');
            }} 
            onDelete={deleteHistoryItem}
          />
        )}
      </main>
    </div>
  );
}
