'use client';

import { useState } from 'react';

// Sources Marketplace Data
export const SOURCE_MARKETPLACE = {
  news: [
    { id: 'reuters', name: 'Reuters', url: 'https://www.reuters.com/rss', type: 'news' },
    { id: 'bloomberg', name: 'Bloomberg', url: 'https://www.bloomberg.com/feed', type: 'news' },
    { id: 'ap', name: 'Associated Press', url: 'https://apnews.com/rss', type: 'news' },
    { id: 'bbc', name: 'BBC News', url: 'https://feeds.bbci.co.uk/news/rss.xml', type: 'news' },
    { id: 'guardian', name: 'The Guardian', url: 'https://www.theguardian.com/rss', type: 'news' },
    { id: 'coindesk', name: 'CoinDesk (Crypto)', url: 'https://www.coindesk.com/arc/outboundfeeds/rss/', type: 'news' },
    { id: 'espn', name: 'ESPN (Sports)', url: 'https://www.espn.com/espn/rss/news', type: 'news' },
    { id: 'politico', name: 'Politico', url: 'https://www.politico.com/rss', type: 'news' },
    { id: 'wsj', name: 'Wall Street Journal', url: 'https://feeds.a.dj.com/rss/RSSWorldNews.xml', type: 'news' },
    { id: 'ft', name: 'Financial Times', url: 'https://www.ft.com/rss/home', type: 'news' }
  ],
  social: [
    { id: 'reddit-politics', name: 'r/politics', url: 'https://www.reddit.com/r/politics.json', type: 'social' },
    { id: 'reddit-crypto', name: 'r/cryptocurrency', url: 'https://www.reddit.com/r/cryptocurrency.json', type: 'social' },
    { id: 'reddit-nba', name: 'r/nba', url: 'https://www.reddit.com/r/nba.json', type: 'social' },
    { id: 'reddit-wallstreetbets', name: 'r/wallstreetbets', url: 'https://www.reddit.com/r/wallstreetbets.json', type: 'social' },
    { id: 'stocktwits', name: 'StockTwits', url: 'https://api.stocktwits.com/api/2/trending/symbols.json', type: 'social' },
    { id: 'twitter', name: 'Twitter/X Feed', url: '', type: 'social' }, // User configures
    { id: 'discord', name: 'Discord Community', url: '', type: 'social' },
    { id: 'telegram', name: 'Telegram Channel', url: '', type: 'social' }
  ],
  technical: [
    { id: 'polymarket', name: 'Polymarket', url: 'https://gamma-api.polymarket.com', type: 'technical' },
    { id: 'kalshi', name: 'Kalshi', url: 'https://trading-api.kalshi.com/trade-api/v2', type: 'technical' },
    { id: 'predictit', name: 'PredictIt', url: 'https://www.predictit.org/api/marketdata/all/', type: 'technical' },
    { id: 'metaculus', name: 'Metaculus', url: 'https://www.metaculus.com/api2/questions/', type: 'technical' },
    { id: 'manifold', name: 'Manifold Markets', url: 'https://api.manifold.markets/v0/markets', type: 'technical' },
    { id: 'augur', name: 'Augur', url: '', type: 'technical' }
  ]
};

// Component for Sources Marketplace UI
interface SourceMarketplaceProps {
  onAddSource: (source: { id: string; name: string; url: string; type: string }) => void;
  activeSources: string[]; // IDs of already added sources
}

export function SourcesMarketplace({ onAddSource, activeSources }: SourceMarketplaceProps) {
  const [activeCategory, setActiveCategory] = useState<'news' | 'social' | 'technical'>('news');
  const [searchQuery, setSearchQuery] = useState('');

  const categories = [
    { id: 'news', label: '📰 News', icon: '📰' },
    { id: 'social', label: '💬 Social', icon: '💬' },
    { id: 'technical', label: '📊 Technical', icon: '📊' }
  ];

  const filteredSources = SOURCE_MARKETPLACE[activeCategory].filter(source =>
    source.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-xl font-bold text-white mb-4">Browse Source Marketplace</h3>
        
        {/* Search */}
        <input
          type="text"
          placeholder="Search sources..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full px-4 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white text-sm mb-4"
        />

        {/* Category Tabs */}
        <div className="flex gap-2 mb-4">
          {categories.map(cat => (
            <button
              key={cat.id}
              onClick={() => setActiveCategory(cat.id as any)}
              className={`flex-1 px-4 py-3 rounded-lg font-semibold transition-all ${
                activeCategory === cat.id
                  ? 'bg-purple-600 text-white'
                  : 'bg-gray-800 text-gray-400 hover:text-white hover:bg-gray-700'
              }`}
            >
              {cat.icon} {cat.label.split(' ')[1]}
            </button>
          ))}
        </div>
      </div>

      {/* Sources Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-96 overflow-y-auto">
        {filteredSources.map(source => {
          const isActive = activeSources.includes(source.id);
          
          return (
            <div
              key={source.id}
              className="p-4 bg-gray-800 border border-gray-700 rounded-lg flex items-center justify-between"
            >
              <div className="flex-1">
                <div className="text-white font-semibold">{source.name}</div>
                {source.url && (
                  <div className="text-xs text-gray-500 truncate">{source.url}</div>
                )}
              </div>
              
              <button
                onClick={() => onAddSource(source)}
                disabled={isActive}
                className={`ml-3 px-4 py-2 rounded-lg font-semibold transition-all ${
                  isActive
                    ? 'bg-gray-700 text-gray-500 cursor-not-allowed'
                    : 'bg-green-600 hover:bg-green-500 text-white'
                }`}
              >
                {isActive ? '✓ Added' : '+ Add'}
              </button>
            </div>
          );
        })}
      </div>

      {/* Custom Source Option */}
      <div className="pt-4 border-t border-gray-700">
        <button
          onClick={() => onAddSource({ 
            id: `custom-${Date.now()}`, 
            name: 'Custom Source', 
            url: '', 
            type: activeCategory 
          })}
          className="w-full px-4 py-3 bg-blue-600 hover:bg-blue-500 rounded-lg font-semibold text-white transition-all"
        >
          + Add Custom {activeCategory === 'news' ? 'RSS Feed' : activeCategory === 'social' ? 'Social URL' : 'Data Feed'}
        </button>
      </div>
    </div>
  );
}
