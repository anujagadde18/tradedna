'use client';

import { useState } from 'react';
import { suggestBetSize, getConvictionScore, saveTradeToJournal } from '@/lib/polymarket-trade';

interface TradePanelProps {
  marketUrl: string;
  marketTitle: string;
  outcomeName: string;
  marketOdds: number;
  aiConfidence: number;
  edge: number;
  tokenId?: string;
  isBinary?: boolean;
}

type WalletStatus = 'disconnected' | 'connecting' | 'connected' | 'wrong_network';
type TradeStatus  = 'idle' | 'placing' | 'success' | 'error';

export function TradePanel({
  marketUrl,
  marketTitle,
  outcomeName,
  marketOdds,
  aiConfidence,
  edge,
  tokenId,
  isBinary = false,
}: TradePanelProps) {
  const [walletStatus, setWalletStatus]     = useState<WalletStatus>('disconnected');
  const [walletAddress, setWalletAddress]   = useState<string>('');
  const [selectedAmount, setSelectedAmount] = useState<number>(25);
  const [customAmount, setCustomAmount]     = useState<string>('');
  const [tradeSide, setTradeSide]           = useState<'YES' | 'NO'>('YES');
  const [tradeStatus, setTradeStatus]       = useState<TradeStatus>('idle');
  const [tradeError, setTradeError]         = useState<string>('');
  const [txHash, setTxHash]                 = useState<string>('');

  const conviction    = getConvictionScore(aiConfidence, marketOdds, edge);
  const betSuggestion = suggestBetSize(Math.abs(edge));
  const finalAmount   = customAmount ? parseFloat(customAmount) : selectedAmount;
  const priceDecimal  = marketOdds / 100;

  const connectWallet = async () => {
    if (typeof window === 'undefined') return;
    const eth = (window as any).ethereum;

    if (!eth) {
      alert('Please install MetaMask to trade directly, or visit polymarket.com to trade there.');
      return;
    }

    try {
      setWalletStatus('connecting');
      const accounts = await eth.request({ method: 'eth_requestAccounts' });
      const chainId  = await eth.request({ method: 'eth_chainId' });

      if (parseInt(chainId, 16) !== 137) {
        try {
          await eth.request({
            method: 'wallet_switchEthereumChain',
            params: [{ chainId: '0x89' }],
          });
        } catch {
          setWalletStatus('wrong_network');
          return;
        }
      }

      setWalletAddress(accounts[0]);
      setWalletStatus('connected');
    } catch {
      setWalletStatus('disconnected');
    }
  };

  const placeTrade = async () => {
    if (!tokenId) {
      window.open(marketUrl, '_blank');
      return;
    }

    if (!walletAddress || !finalAmount || finalAmount <= 0) return;

    try {
      setTradeStatus('placing');
      setTradeError('');

      const signRes = await fetch('/api/builder-sign', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ method: 'POST', path: '/order', body: '' }),
      });
      const builderHeaders = await signRes.json();

      const orderPayload = {
        tokenID:       tokenId,
        price:         priceDecimal,
        side:          tradeSide === 'YES' ? 'BUY' : 'SELL',
        size:          finalAmount,
        orderType:     'GTC',
        funderAddress: walletAddress,
      };

      const res = await fetch('/api/trade', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderPayload, authHeaders: builderHeaders }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Order failed');

      saveTradeToJournal({
        id:              data.orderId || String(Date.now()),
        marketUrl,
        marketTitle,
        outcomeName,
        side:            tradeSide,
        price:           marketOdds,
        size:            finalAmount,
        aiConfidence,
        marketOdds,
        edge,
        convictionScore: conviction.score,
        txHash:          data.result?.transactionHash,
        timestamp:       Date.now(),
      });

      setTxHash(data.result?.transactionHash || data.orderId || '');
      setTradeStatus('success');

    } catch (err: any) {
      setTradeError(err.message || 'Trade failed');
      setTradeStatus('error');
    }
  };

  // ── SUCCESS STATE ──
  if (tradeStatus === 'success') {
    return (
      <div className="border border-green-500/30 rounded-xl p-5 bg-green-900/10">
        <div className="text-green-400 font-semibold text-base mb-2">Order placed!</div>
        <div className="text-sm text-gray-300 mb-3">
          {tradeSide} {outcomeName} &middot; ${finalAmount} at {marketOdds}%
        </div>
        <div className="text-xs text-gray-400 mb-4">
          Saved to your trade journal with AI conviction snapshot.
        </div>
        {txHash && (
          <a
            href={'https://polygonscan.com/tx/' + txHash}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-purple-400 hover:text-purple-300 underline"
          >
            View on Polygonscan &#8594;
          </a>
        )}
        <button
          onClick={() => { setTradeStatus('idle'); setTxHash(''); }}
          className="mt-3 w-full text-xs text-gray-500 hover:text-gray-400"
        >
          Place another trade
        </button>
      </div>
    );
  }

  return (
    <div className="border border-gray-700 rounded-xl overflow-hidden">

      {/* CONVICTION HEADER */}
      <div className="p-4 border-b border-gray-700 bg-gray-900/50">
        <div className="flex items-center justify-between mb-1">
          <span className="text-xs text-gray-400 uppercase tracking-wide font-medium">
            Your conviction score
          </span>
          <span className={'text-sm font-bold ' + conviction.color}>
            {conviction.label}
          </span>
        </div>

        <div className="w-full bg-gray-700 rounded-full h-2 mb-3">
          <div
            className={'h-2 rounded-full transition-all ' + (
              conviction.score >= 70 ? 'bg-green-500' :
              conviction.score >= 45 ? 'bg-yellow-500' : 'bg-red-500'
            )}
            style={{ width: conviction.score + '%' }}
          />
        </div>

        <div className="grid grid-cols-3 gap-2 text-center">
          <div>
            <div className="text-xs text-gray-500">Market</div>
            <div className="text-sm font-semibold text-white">{marketOdds}%</div>
          </div>
          <div>
            <div className="text-xs text-gray-500">AI thinks</div>
            <div className="text-sm font-semibold text-purple-400">{aiConfidence}%</div>
          </div>
          <div>
            <div className="text-xs text-gray-500">Edge</div>
            <div className={'text-sm font-bold ' + (edge > 0 ? 'text-green-400' : edge < 0 ? 'text-red-400' : 'text-gray-400')}>
              {edge > 0 ? '+' : ''}{edge}%
            </div>
          </div>
        </div>

        <div className="mt-2 text-xs text-gray-500 text-center">
          {betSuggestion.reasoning}
        </div>
      </div>

      {/* TRADE BODY */}
      <div className="p-4">

        {/* YES / NO selector or outcome display */}
        {isBinary ? (
          <div className="flex gap-2 mb-4">
            <button
              onClick={() => setTradeSide('YES')}
              className={'flex-1 py-2 rounded-lg text-sm font-semibold transition-all ' + (
                tradeSide === 'YES' ? 'bg-green-600 text-white' : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
              )}
            >
              YES &middot; {marketOdds}%
            </button>
            <button
              onClick={() => setTradeSide('NO')}
              className={'flex-1 py-2 rounded-lg text-sm font-semibold transition-all ' + (
                tradeSide === 'NO' ? 'bg-red-600 text-white' : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
              )}
            >
              NO &middot; {100 - marketOdds}%
            </button>
          </div>
        ) : (
          <div className="mb-4 p-3 bg-purple-900/20 rounded-lg border border-purple-500/30">
            <div className="text-xs text-gray-400 mb-0.5">Trading outcome</div>
            <div className="text-white font-semibold">{outcomeName} wins &middot; {marketOdds}%</div>
          </div>
        )}

        {/* Amount selector */}
        <div className="mb-4">
          <div className="text-xs text-gray-400 mb-2">
            Amount (USDC) &middot; {betSuggestion.label}
          </div>
          <div className="flex gap-2 mb-2">
            {betSuggestion.amounts.map((amount: number) => (
              <button
                key={amount}
                onClick={() => { setSelectedAmount(amount); setCustomAmount(''); }}
                className={'flex-1 py-1.5 rounded-lg text-sm font-medium transition-all ' + (
                  selectedAmount === amount && !customAmount
                    ? 'bg-purple-600 text-white'
                    : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
                )}
              >
                ${amount}
              </button>
            ))}
          </div>
          <input
            type="number"
            value={customAmount}
            onChange={e => setCustomAmount(e.target.value)}
            placeholder="Custom amount..."
            className="w-full bg-gray-800 text-white px-3 py-2 rounded-lg text-sm border border-gray-600 focus:border-purple-500 focus:outline-none"
          />
        </div>

        {/* Payout preview */}
        {finalAmount > 0 && (
          <div className="mb-4 p-3 bg-gray-800/50 rounded-lg text-xs text-gray-400">
            <div className="flex justify-between">
              <span>You invest</span>
              <span className="text-white">${finalAmount.toFixed(2)}</span>
            </div>
            <div className="flex justify-between mt-1">
              <span>If correct, you get</span>
              <span className="text-green-400">
                ${(finalAmount / priceDecimal).toFixed(2)}
              </span>
            </div>
            <div className="flex justify-between mt-1">
              <span>Potential profit</span>
              <span className="text-green-400">
                +${(finalAmount / priceDecimal - finalAmount).toFixed(2)}
              </span>
            </div>
          </div>
        )}

        {/* Error */}
        {tradeStatus === 'error' && (
          <div className="mb-3 p-3 bg-red-900/20 border border-red-500/30 rounded-lg">
            <div className="text-red-400 text-xs">{tradeError}</div>
          </div>
        )}

        {/* Wallet connect / Trade button */}
        {walletStatus === 'disconnected' || walletStatus === 'wrong_network' ? (
          <div>
            <button
              onClick={connectWallet}
              className="w-full py-3 bg-purple-600 hover:bg-purple-500 text-white rounded-lg text-sm font-semibold transition-all"
            >
              {walletStatus === 'wrong_network'
                ? 'Switch to Polygon network'
                : 'Connect wallet to trade'}
            </button>
            <div className="mt-2 text-center">
              <a
                href={marketUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-gray-500 hover:text-gray-400"
              >
                Or trade directly on Polymarket &#8594;
              </a>
            </div>
          </div>
        ) : walletStatus === 'connecting' ? (
          <button disabled className="w-full py-3 bg-gray-700 text-gray-400 rounded-lg text-sm font-semibold">
            Connecting...
          </button>
        ) : (
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-gray-400">
                Connected: {walletAddress.slice(0, 6)}...{walletAddress.slice(-4)}
              </span>
              <button
                onClick={() => { setWalletStatus('disconnected'); setWalletAddress(''); }}
                className="text-xs text-gray-600 hover:text-gray-400"
              >
                Disconnect
              </button>
            </div>
            <button
              onClick={placeTrade}
              disabled={tradeStatus === 'placing' || !finalAmount || finalAmount <= 0}
              className={'w-full py-3 rounded-lg text-sm font-semibold transition-all ' + (
                tradeStatus === 'placing'
                  ? 'bg-gray-700 text-gray-400 cursor-not-allowed'
                  : conviction.score >= 60
                  ? 'bg-green-600 hover:bg-green-500 text-white'
                  : conviction.score >= 40
                  ? 'bg-yellow-600 hover:bg-yellow-500 text-white'
                  : 'bg-gray-700 hover:bg-gray-600 text-white'
              )}
            >
              {tradeStatus === 'placing'
                ? 'Placing order...'
                : 'Trade ' + (isBinary ? tradeSide : outcomeName) + ' · $' + (finalAmount || 0)
              }
            </button>
          </div>
        )}

        <div className="mt-3 text-xs text-gray-600 text-center">
          Powered by Polymarket &middot; Not financial advice
        </div>
      </div>
    </div>
  );
}
