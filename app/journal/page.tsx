'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { getTradeJournal } from '@/lib/polymarket-trade';

export default function JournalPage() {
  const router = useRouter();
  const [trades, setTrades] = useState<any[]>([]);
  const [filter, setFilter] = useState<'all' | 'open' | 'won' | 'lost'>('all');

  useEffect(() => {
    setTrades(getTradeJournal());
  }, []);

  const filtered = trades.filter(t => {
    if (filter === 'all')  return true;
    if (filter === 'open') return !t.resolved;
    if (filter === 'won')  return t.resolved && t.won;
    if (filter === 'lost') return t.resolved && !t.won;
    return true;
  });

  const resolved  = trades.filter(t => t.resolved);
  const wins      = resolved.filter(t => t.won);
  const winRate   = resolved.length > 0 ? Math.round((wins.length / resolved.length) * 100) : null;
  const totalPnl  = resolved.reduce((s: number, t: any) => {
    if (t.won) return s + (t.size / (t.price / 100) - t.size);
    return s - t.size;
  }, 0);

  const highEdgeTrades = resolved.filter((t: any) => Math.abs(t.edge) >= 5);
  const highEdgeWins   = highEdgeTrades.filter((t: any) => t.won);
  const edgeAccuracy   = highEdgeTrades.length > 0
    ? Math.round((highEdgeWins.length / highEdgeTrades.length) * 100)
    : null;

  return (
    <div className="min-h-screen bg-black text-white p-6">
      <div className="max-w-4xl mx-auto">

        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <button onClick={() => router.push('/')} className="text-gray-400 hover:text-white text-sm">
            &#8592; Back
          </button>
          <button onClick={() => router.push('/profile')} className="text-gray-400 hover:text-white text-sm">
            View Profile &#8594;
          </button>
        </div>

        <h1 className="text-2xl font-bold mb-1">Trade Journal</h1>
        <p className="text-gray-400 text-sm mb-6">
          Every trade you placed through PlayPicks - with the AI conviction that justified it
        </p>

        {/* Stats */}
        {trades.length > 0 && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
            <div className="bg-gray-900 border border-gray-700 rounded-xl p-4">
              <div className="text-xs text-gray-400 mb-1">Total trades</div>
              <div className="text-2xl font-bold text-white">{trades.length}</div>
            </div>
            <div className="bg-gray-900 border border-gray-700 rounded-xl p-4">
              <div className="text-xs text-gray-400 mb-1">Win rate</div>
              <div className={`text-2xl font-bold ${winRate !== null ? (winRate >= 50 ? 'text-green-400' : 'text-red-400') : 'text-gray-500'}`}>
                {winRate !== null ? (winRate + '%') : '-'}
              </div>
            </div>
            <div className="bg-gray-900 border border-gray-700 rounded-xl p-4">
              <div className="text-xs text-gray-400 mb-1">Total P&amp;L</div>
              <div className={`text-2xl font-bold ${totalPnl >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                {totalPnl >= 0 ? '+' : ''}${totalPnl.toFixed(2)}
              </div>
            </div>
            <div className="bg-gray-900 border border-gray-700 rounded-xl p-4">
              <div className="text-xs text-gray-400 mb-1">AI edge accuracy</div>
              <div className={`text-2xl font-bold ${edgeAccuracy !== null ? (edgeAccuracy >= 50 ? 'text-green-400' : 'text-orange-400') : 'text-gray-500'}`}>
                {edgeAccuracy !== null ? (edgeAccuracy + '%') : '-'}
              </div>
              {edgeAccuracy !== null && (
                <div className="text-xs text-gray-500 mt-0.5">when edge 5%+</div>
              )}
            </div>
          </div>
        )}

        {/* Filter tabs */}
        <div className="flex gap-2 mb-4">
          {(['all', 'open', 'won', 'lost'] as const).map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={'px-3 py-1.5 rounded-lg text-xs font-semibold capitalize ' + (filter === f ? 'bg-purple-600 text-white' : 'bg-gray-800 text-gray-400 hover:bg-gray-700')}
            >
              {f}
            </button>
          ))}
        </div>

        {/* Trade list */}
        {filtered.length === 0 ? (
          <div className="border border-gray-700 rounded-xl p-12 text-center">
            <div className="text-gray-500 text-sm mb-2">No trades yet</div>
            <p className="text-gray-600 text-xs mb-4">
              Analyze a Polymarket event and place a trade through PlayPicks - it will appear here with the full AI conviction snapshot
            </p>
            <button
              onClick={() => router.push('/')}
              className="px-4 py-2 bg-purple-600 hover:bg-purple-500 rounded-lg text-sm text-white"
            >
              Analyze a market &#8594;
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map((trade: any, idx: number) => (
              <div
                key={trade.id || idx}
                className="border border-gray-700 rounded-xl p-4 hover:border-gray-600 transition-colors"
              >
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <div className="text-white font-medium text-sm">{trade.marketTitle}</div>
                    <div className="text-gray-400 text-xs mt-0.5">
                      {new Date(trade.timestamp).toLocaleDateString('en-US', {
                        month: 'short', day: 'numeric', year: 'numeric'
                      })}
                    </div>
                  </div>
                  <div className={'text-xs px-2 py-1 rounded-full font-semibold ' + (
                    trade.resolved
                      ? trade.won
                        ? 'bg-green-900/30 text-green-400'
                        : 'bg-red-900/30 text-red-400'
                      : 'bg-gray-800 text-gray-400'
                  )}>
                    {trade.resolved ? (trade.won ? '&#10003; Won' : '&#10007; Lost') : 'Open'}
                  </div>
                </div>

                <div className="grid grid-cols-4 gap-3 text-center mb-3">
                  <div>
                    <div className="text-xs text-gray-500">Outcome</div>
                    <div className="text-sm font-medium text-white">{trade.outcomeName}</div>
                  </div>
                  <div>
                    <div className="text-xs text-gray-500">Bet</div>
                    <div className="text-sm font-medium text-white">${trade.size}</div>
                  </div>
                  <div>
                    <div className="text-xs text-gray-500">At price</div>
                    <div className="text-sm font-medium text-white">{trade.price}%</div>
                  </div>
                  <div>
                    <div className="text-xs text-gray-500">AI edge</div>
                    <div className={'text-sm font-bold ' + (
                      trade.edge > 0 ? 'text-green-400' :
                      trade.edge < 0 ? 'text-red-400' : 'text-gray-400'
                    )}>
                      {trade.edge > 0 ? '+' : ''}{trade.edge}%
                    </div>
                  </div>
                </div>

                {/* AI conviction snapshot */}
                <div className="bg-gray-900/50 rounded-lg p-2 flex items-center justify-between mb-2">
                  <div className="text-xs text-gray-500">AI conviction when traded</div>
                  <div className="flex items-center gap-3 text-xs">
                    <span className="text-gray-400">
                      Market: <span className="text-white">{trade.marketOdds}%</span>
                    </span>
                    <span className="text-gray-400">
                      AI: <span className="text-purple-400">{trade.aiConfidence}%</span>
                    </span>
                    <span className={'font-semibold ' + (
                      trade.convictionScore >= 70 ? 'text-green-400' :
                      trade.convictionScore >= 45 ? 'text-yellow-400' : 'text-orange-400'
                    )}>
                      {trade.convictionScore >= 70 ? 'High' :
                       trade.convictionScore >= 45 ? 'Medium' : 'Low'} conviction
                    </span>
                  </div>
                </div>

                {trade.marketUrl && (
                  <a
                    href={trade.marketUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-purple-400 hover:text-purple-300"
                  >
                    View on Polymarket &#8594;
                  </a>
                )}
              </div>
            ))}
          </div>
        )}

      </div>
    </div>
  );
}
