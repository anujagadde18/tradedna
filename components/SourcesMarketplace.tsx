'use client';

import { useState } from 'react';

// Sources Marketplace Data - USER-FRIENDLY VERSION
export const SOURCE_MARKETPLACE = {
  news: [
    { id: 'reuters', name: 'Reuters', description: 'Global newswire coverage', url: 'https://www.reuters.com/rss', type: 'news' },
    { id: 'bloomberg', name: 'Bloomberg', description: 'Financial & markets news', url: 'https://www.bloomberg.com/feed', type: 'news' },
    { id: 'ap', name: 'Associated Press', description: 'Breaking news worldwide', url: 'https://apnews.com/rss', type: 'news' },
    { id: 'bbc', name: 'BBC News', description: 'International coverage', url: 'https://feeds.bbci.co.uk/news/rss.xml', type: 'news' },
    { id: 'guardian', name: 'The Guardian', description: 'Global news & analysis', url: 'https://www.theguardian.com/rss', type: 'news' },
    { id: 'coindesk', name: 'CoinDesk', description: 'Crypto & blockchain news', url: 'https://www.coindesk.com/arc/outboundfeeds/rss/', type: 'news' },
    { id: 'espn', name: 'ESPN', description: 'Sports news & analysis', url: 'https://www.espn.com/espn/rss/news', type: 'news' },
    { id: 'politico', name: 'Politico', description: 'Politics & policy news', url: 'https://www.politico.com/rss', type: 'news' },
    { id: 'wsj', name: 'Wall Street Journal', description: 'Business & finance news', url: 'https://feeds.a.dj.com/rss/RSSWorldNews.xml', type: 'news' },
    { id: 'ft', name: 'Financial Times', description: 'Business & finance coverage', url: 'https://www.ft.com/rss/home', type: 'news' }
  ],
  social: [
    { id: 'reddit-politics', name: 'Reddit r/politics', description: 'Political discussion', url: 'https://www.reddit.com/r/politics.json', type: 'social' },
    { id: 'reddit-investing', name: 'Reddit r/investing', description: 'Investment sentiment', url: 'https://www.reddit.com/r/investing.json', type: 'social' },
    { id: 'reddit-crypto', name: 'Reddit r/cryptocurrency', description: 'Crypto community', url: 'https://www.reddit.com/r/cryptocurrency.json', type: 'social' },
    { id: 'reddit-sports', name: 'Reddit r/sports', description: 'Sports discussion', url: 'https://www.reddit.com/r/sports.json', type: 'social' },
    { id: 'reddit-wallstreetbets', name: 'Reddit r/wallstreetbets', description: 'Trading community', url: 'https://www.reddit.com/r/wallstreetbets.json', type: 'social' },
    { id: 'stocktwits', name: 'StockTwits', description: 'Trader sentiment', url: 'https://api.stocktwits.com/api/2/trending/symbols.json', type: 'social' },
    { id: 'twitter', name: 'Twitter/X', description: 'Real-time public sentiment', url: '', type: 'social' },
    { id: 'telegram', name: 'Telegram Channel', description: 'Community channels', url: '', type: 'social' }
  ],
  technical: [
    { id: 'polymarket', name: 'Polymarket', description: 'Prediction market odds & probabilities', url: 'https://gamma-api.polymarket.com', type: 'technical' },
    { id: 'kalshi', name: 'Kalshi', description: 'Event contracts & market data', url: 'https://trading-api.kalshi.com/trade-api/v2', type: 'technical' },
    { id: 'predictit', name: 'PredictIt', description: 'Political prediction markets', url: 'https://www.predictit.org/api/marketdata/all/', type: 'technical' },
    { id: 'metaculus', name: 'Metaculus', description: 'Forecasting platform data', url: 'https://www.metaculus.com/api2/questions/', type: 'technical' },
    { id: 'manifold', name: 'Manifold Markets', description: 'Play-money prediction markets', url: 'https://api.manifold.markets/v0/markets', type: 'technical' },
    { id: 'augur', name: 'Augur', description: 'Decentralized prediction market', url: '', type: 'technical' }
  ]
};

interface SourceMarketplaceProps {
  onAddSource: (source: { id: string; name: string; url: string; type: string }) => void;
  activeSources: string[];
}

export function SourcesMarketplace({ onAddSource, activeSources }: SourceMarketplaceProps) {
  const [activeCategory, setActiveCategory] = useState<'news' | 'social' | 'technical'>('news');
  const [searchQuery, setSearchQuery] = useState('');

  const categories = [
    { id: 'news', label: ' News', icon: '' },
    { id: 'social', label: ' Social', icon: '' },
    { id: 'technical', label: ' Technical', icon: '' }
  ];

  const filteredSources = SOURCE_MARKETPLACE[activeCategory].filter(source =>
    source.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    source.description.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-xl font-bold text-white mb-4">Browse Source Marketplace</h3>
        
        <input
          type="text"
          placeholder="Search sources..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full px-4 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white text-sm mb-4 focus:outline-none focus:border-purple-500"
        />

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

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-96 overflow-y-auto pr-2">
        {filteredSources.map(source => {
          const isActive = activeSources.includes(source.id);
          
          return (
            <div
              key={source.id}
              className="p-4 bg-gray-800/50 border border-gray-700 rounded-lg hover:border-gray-600 transition-all"
            >
              <div className="flex items-start justify-between mb-2">
                <div className="flex-1">
                  <div className="text-white font-semibold mb-1">{source.name}</div>
                  <div className="text-xs text-gray-400">{source.description}</div>
                </div>
                
                <button
                  onClick={() => onAddSource(source)}
                  disabled={isActive}
                  className={`ml-3 px-4 py-2 rounded-lg font-semibold transition-all text-sm ${
                    isActive
                      ? 'bg-gray-700 text-gray-500 cursor-not-allowed'
                      : 'bg-green-600 hover:bg-green-500 text-white'
                  }`}
                >
                  {isActive ? 'ok Added' : '+ Add'}
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {filteredSources.length === 0 && (
        <div className="text-center py-8 text-gray-500">
          No sources found matching "{searchQuery}"
        </div>
      )}

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
        <div className="mt-2 text-xs text-gray-500 text-center">
          For power users: add any custom URL or data feed
        </div>
      </div>
    </div>
  );
}
