'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

interface SavedAnalysis {
  id: string;
  event: string;
  direction: 'YES' | 'NO';
  confidence: number;
  timestamp: number;
  polymarketOdds: number | null;
}

export default function ProfilePage() {
  const router = useRouter();
  const [savedAnalyses, setSavedAnalyses] = useState<SavedAnalysis[]>([]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem('savedAnalyses');
        if (saved) {
          setSavedAnalyses(JSON.parse(saved));
        }
      } catch {}
    }
  }, []);

  const deleteAnalysis = (id: string) => {
    const updated = savedAnalyses.filter(a => a.id !== id);
    setSavedAnalyses(updated);
    
    if (typeof window !== 'undefined') {
      localStorage.setItem('savedAnalyses', JSON.stringify(updated));
    }
  };

  const viewAnalysis = (event: string) => {
    router.push(`/scores?event=${encodeURIComponent(event)}`);
  };

  const formatDate = (timestamp: number) => {
    const date = new Date(timestamp);
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric', 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  return (
    <div className="min-h-screen bg-black text-white p-6">
      <div className="max-w-5xl mx-auto">
        
        {/* HEADER */}
        <div className="mb-8">
          <button
            onClick={() => router.push('/')}
            className="mb-4 text-gray-400 hover:text-white flex items-center gap-2 transition-colors"
          >
             Back to Home
          </button>
          
          <h1 className="text-4xl font-bold mb-2">Your Profile</h1>
          <p className="text-gray-400">
            Saved analyses and prediction history
          </p>
        </div>

        {/* SAVED ANALYSES */}
        <div className="bg-gradient-to-br from-purple-900/20 to-black border border-purple-500/30 rounded-xl p-6">
          <h2 className="text-2xl font-bold mb-6">Saved Analyses</h2>
          
          {savedAnalyses.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-6xl mb-4"></div>
              <p className="text-gray-400 mb-4">No saved analyses yet</p>
              <button
                onClick={() => router.push('/')}
                className="px-6 py-3 bg-purple-600 hover:bg-purple-500 rounded-lg font-semibold transition-all"
              >
                Analyze Your First Event
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              {savedAnalyses.map((analysis) => (
                <div
                  key={analysis.id}
                  className="p-4 bg-black/40 border border-gray-700 rounded-lg hover:border-purple-500/50 transition-all"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <span className={`text-2xl font-bold ${
                          analysis.direction === 'YES' ? 'text-green-400' : 'text-red-400'
                        }`}>
                          {analysis.direction}
                        </span>
                        <span className="text-xl font-semibold text-white">
                          {analysis.confidence}%
                        </span>
                        {analysis.polymarketOdds !== null && (
                          <span className="text-sm text-gray-400">
                            vs Market: {analysis.polymarketOdds}%
                          </span>
                        )}
                      </div>
                      
                      <p className="text-gray-300 mb-2">{analysis.event}</p>
                      
                      <div className="text-xs text-gray-500">
                        {formatDate(analysis.timestamp)}
                      </div>
                    </div>

                    <div className="flex gap-2">
                      <button
                        onClick={() => viewAnalysis(analysis.event)}
                        className="px-4 py-2 bg-blue-600 hover:bg-blue-500 rounded-lg text-sm font-semibold transition-all"
                      >
                        View
                      </button>
                      <button
                        onClick={() => deleteAnalysis(analysis.id)}
                        className="px-4 py-2 bg-red-600 hover:bg-red-500 rounded-lg text-sm font-semibold transition-all"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* STATS */}
        {savedAnalyses.length > 0 && (
          <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 bg-gradient-to-br from-green-900/20 to-black border border-green-500/30 rounded-xl">
              <div className="text-sm text-gray-400 mb-1">Total Analyses</div>
              <div className="text-3xl font-bold text-white">{savedAnalyses.length}</div>
            </div>

            <div className="p-4 bg-gradient-to-br from-blue-900/20 to-black border border-blue-500/30 rounded-xl">
              <div className="text-sm text-gray-400 mb-1">YES Predictions</div>
              <div className="text-3xl font-bold text-white">
                {savedAnalyses.filter(a => a.direction === 'YES').length}
              </div>
            </div>

            <div className="p-4 bg-gradient-to-br from-purple-900/20 to-black border border-purple-500/30 rounded-xl">
              <div className="text-sm text-gray-400 mb-1">NO Predictions</div>
              <div className="text-3xl font-bold text-white">
                {savedAnalyses.filter(a => a.direction === 'NO').length}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
