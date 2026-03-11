'use client';

import { useState, useEffect } from 'react';

interface Props {
  userQuestion: string;
  aiPrediction: number;
}

export function PolymarketComparison({ userQuestion, aiPrediction }: Props) {
  const [debugInfo, setDebugInfo] = useState<string>('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function debugFetch() {
      setLoading(true);
      
      try {
        // Direct API call to see EXACT response
        const response = await fetch(
          `/api/polymarket?endpoint=markets&query=${encodeURIComponent(userQuestion)}&limit=3`
        );
        
        const status = response.status;
        const data = await response.json();
        
        // LOG EVERYTHING
        const debugOutput = JSON.stringify({
          status,
          responseType: typeof data,
          isArray: Array.isArray(data),
          dataKeys: Object.keys(data || {}),
          fullResponse: data,
          firstItem: Array.isArray(data) ? data[0] : data.markets?.[0] || data.data?.[0] || null
        }, null, 2);
        
        console.log('=== POLYMARKET DEBUG ===');
        console.log(debugOutput);
        console.log('========================');
        
        setDebugInfo(debugOutput);
        
      } catch (error: any) {
        console.error('Debug fetch error:', error);
        setDebugInfo(`ERROR: ${error.message}\n\n${error.stack}`);
      } finally {
        setLoading(false);
      }
    }
    
    debugFetch();
  }, [userQuestion]);

  if (loading) {
    return (
      <div className="border border-purple-500/20 rounded-lg p-6 bg-black/40">
        <div className="flex items-center gap-2 text-purple-400">
          <div className="w-4 h-4 border-2 border-purple-400 border-t-transparent rounded-full animate-spin" />
          <span>Fetching Polymarket data...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="border border-yellow-500/30 rounded-lg p-6 bg-black/40">
      <div className="text-sm font-bold text-yellow-400 mb-4">
        🔍 POLYMARKET API DEBUG OUTPUT
      </div>
      <div className="text-xs text-gray-300 mb-4">
        Check your browser console (F12) for the full output
      </div>
      <pre className="text-xs text-gray-400 bg-black/60 p-4 rounded overflow-auto max-h-96">
        {debugInfo}
      </pre>
      <div className="text-xs text-gray-500 mt-4">
        Share this output with me so I can fix the parsing!
      </div>
    </div>
  );
}
