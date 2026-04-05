'use client';

import { useState, useEffect } from 'react';
import { suggestBetSize, getConvictionScore, saveTradeToJournal } from '@/lib/polymarket-trade';

interface TradePanelProps {
  marketUrl:     string;
  marketTitle:   string;
  outcomeName:   string;
  marketOdds:    number;
  aiConfidence:  number;
  edge:          number;
  tokenId?:      string;
  isBinary?:     boolean;
}

type AuthStep    = 'idle' | 'enter_email' | 'check_email' | 'authenticated';
type TradeStatus = 'idle' | 'placing' | 'success' | 'error';

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
  const [authStep, setAuthStep]           = useState<AuthStep>('idle');
  const [email, setEmail]                 = useState('');
  const [userAddress, setUserAddress]     = useState('');
  const [magic, setMagic]                 = useState<any>(null);
  const [authLoading, setAuthLoading]     = useState(false);
  const [selectedAmount, setSelectedAmount] = useState(25);
  const [customAmount, setCustomAmount]   = useState('');
  const [tradeSide, setTradeSide]         = useState<'YES' | 'NO'>('YES');
  const [tradeStatus, setTradeStatus]     = useState<TradeStatus>('idle');
  const [tradeError, setTradeError]       = useState('');
  const [txHash, setTxHash]               = useState('');
  const [wasGasless, setWasGasless]       = useState(false);

  const conviction    = getConvictionScore(aiConfidence, marketOdds, edge);
  const betSuggestion = suggestBetSize(Math.abs(edge));
  const finalAmount   = customAmount ? parseFloat(customAmount) : selectedAmount;
  const priceDecimal  = marketOdds / 100;

  // Load Magic SDK lazily - client only
  useEffect(() => {
    if (typeof window === 'undefined') return;
    import('magic-sdk').then((mod) => {
      const Magic = mod.Magic || mod.default?.Magic || mod.default;
      if (!Magic) return;
      const m = new Magic('pk_live_8621357A14A8491A', {
        network: { rpcUrl: 'https://polygon-rpc.com', chainId: 137 },
      });
      setMagic(m);
      // Check if already logged in
      m.user.isLoggedIn().then((loggedIn: boolean) => {
        if (loggedIn) {
          m.user.getMetadata().then((meta: any) => {
            setUserAddress(meta.publicAddress || '');
            setAuthStep('authenticated');
          });
        }
      }).catch(() => {});
    }).catch((err: any) => {
      console.error('Magic SDK load error:', err);
    });
  }, []);

  const handleEmailSubmit = async () => {
    if (!magic || !email.trim()) return;
    try {
      setAuthLoading(true);
      setAuthStep('check_email');
      // Sends OTP email - user clicks link in email
      await magic.auth.loginWithEmailOTP({ email: email.trim() });
      const meta = await magic.user.getMetadata();
      setUserAddress(meta.publicAddress || '');
      setAuthStep('authenticated');
    } catch (err: any) {
      console.error('Login error:', err);
      setAuthStep('enter_email');
    } finally {
      setAuthLoading(false);
    }
  };

  const handleLogout = async () => {
    if (!magic) return;
    try {
      await magic.user.logout();
      setUserAddress('');
      setAuthStep('idle');
    } catch {}
  };

  const placeTrade = async () => {
    if (!tokenId) {
      setTradeError('Market token not loaded yet. Please wait a moment and try again.');
      setTradeStatus('error');
      return;
    }
    if (!userAddress || !finalAmount || finalAmount <= 0) return;

    try {
      setTradeStatus('placing');
      setTradeError('');

      const orderPayload = {
        tokenID:       tokenId,
        price:         priceDecimal,
        side:          tradeSide === 'YES' ? 'BUY' : 'SELL',
        size:          finalAmount,
        orderType:     'GTC',
        funderAddress: userAddress,
      };

      // Trade route tries gasless relayer first, falls back to direct CLOB
      const res = await fetch('/api/trade', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ orderPayload }),
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

      setWasGasless(data.gasless === true);
      setTxHash(data.result?.transactionHash || data.orderId || '');
      setTradeStatus('success');

    } catch (err: any) {
      setTradeError(err.message || 'Trade failed');
      setTradeStatus('error');
    }
  };

  // -- SUCCESS --
  if (tradeStatus === 'success') {
    return (
      <div className="border border-green-500/30 rounded-xl p-5 bg-green-900/10">
        <div className="text-green-400 font-semibold text-base mb-2">Order placed!</div>
        {wasGasless && (
          <div className="text-xs text-purple-400 mb-2 font-medium">⚡ Gasless transaction via Polymarket relayer</div>
        )}
        <div className="text-sm text-gray-300 mb-3">
          {tradeSide} {outcomeName} - ${finalAmount} at {marketOdds}%
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
          onClick={() => { setTradeStatus('idle'); setTxHash(''); setWasGasless(false); }}
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

        {/* -- STEP 1: NOT LOGGED IN - show email input -- */}
        {authStep === 'idle' && (
          <div>
            <div className="text-sm text-gray-300 mb-4 text-center">
              Sign in with your email to trade
            </div>
            <div className="text-xs text-gray-500 text-center mb-4">
              No wallet or crypto experience needed
            </div>
            <button
              onClick={() => setAuthStep('enter_email')}
              className="w-full py-3 bg-purple-600 hover:bg-purple-500 text-white rounded-lg text-sm font-semibold transition-all"
            >
              Sign in to trade &#8594;
            </button>
            <div className="mt-3 text-center">
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
        )}

        {/* -- STEP 2: EMAIL INPUT -- */}
        {authStep === 'enter_email' && (
          <div>
            <div className="text-sm text-gray-300 mb-3 font-medium">
              Enter your email
            </div>
            <div className="text-xs text-gray-500 mb-4">
              We will send you a one-click login link. No password needed.
            </div>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleEmailSubmit()}
              placeholder="you@email.com"
              className="w-full bg-gray-800 text-white px-3 py-3 rounded-lg text-sm border border-gray-600 focus:border-purple-500 focus:outline-none mb-3"
              autoFocus
            />
            <button
              onClick={handleEmailSubmit}
              disabled={!email.trim() || authLoading}
              className="w-full py-3 bg-purple-600 hover:bg-purple-500 disabled:bg-gray-700 disabled:text-gray-500 text-white rounded-lg text-sm font-semibold transition-all"
            >
              {authLoading ? 'Sending...' : 'Send login link'}
            </button>
            <button
              onClick={() => setAuthStep('idle')}
              className="w-full mt-2 py-2 text-xs text-gray-500 hover:text-gray-400"
            >
              Cancel
            </button>
          </div>
        )}

        {/* -- STEP 3: CHECK EMAIL -- */}
        {authStep === 'check_email' && (
          <div className="text-center py-4">
            <div className="text-2xl mb-3">&#9993;</div>
            <div className="text-white font-semibold mb-2">Check your email</div>
            <div className="text-xs text-gray-400 mb-1">
              We sent a login link to
            </div>
            <div className="text-purple-400 text-sm font-medium mb-4">{email}</div>
            <div className="text-xs text-gray-500">
              Click the link in the email to continue.
              This tab will update automatically.
            </div>
            <button
              onClick={() => setAuthStep('enter_email')}
              className="mt-4 text-xs text-gray-500 hover:text-gray-400"
            >
              Use a different email
            </button>
          </div>
        )}

        {/* -- STEP 4: AUTHENTICATED - show trade UI -- */}
        {authStep === 'authenticated' && (
          <div>
            {/* Logged in indicator */}
            <div className="flex items-center justify-between mb-4 p-2 bg-gray-800/50 rounded-lg">
              <span className="text-xs text-gray-400">
                &#10003; Signed in as {userAddress.slice(0, 6)}...{userAddress.slice(-4)}
              </span>
              <button
                onClick={handleLogout}
                className="text-xs text-gray-600 hover:text-gray-400"
              >
                Sign out
              </button>
            </div>

            {/* YES / NO selector */}
            {isBinary ? (
              <div className="flex gap-2 mb-4">
                <button
                  onClick={() => setTradeSide('YES')}
                  className={'flex-1 py-2 rounded-lg text-sm font-semibold transition-all ' + (
                    tradeSide === 'YES' ? 'bg-green-600 text-white' : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
                  )}
                >
                  YES - {marketOdds}%
                </button>
                <button
                  onClick={() => setTradeSide('NO')}
                  className={'flex-1 py-2 rounded-lg text-sm font-semibold transition-all ' + (
                    tradeSide === 'NO' ? 'bg-red-600 text-white' : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
                  )}
                >
                  NO - {100 - marketOdds}%
                </button>
              </div>
            ) : (
              <div className="mb-4 p-3 bg-purple-900/20 rounded-lg border border-purple-500/30">
                <div className="text-xs text-gray-400 mb-0.5">Trading outcome</div>
                <div className="text-white font-semibold">{outcomeName} wins - {marketOdds}%</div>
              </div>
            )}

            {/* Amount selector */}
            <div className="mb-4">
              <div className="text-xs text-gray-400 mb-2">
                Amount (USDC) - {betSuggestion.label}
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
                  <span className="text-green-400">${(finalAmount / priceDecimal).toFixed(2)}</span>
                </div>
                <div className="flex justify-between mt-1">
                  <span>Potential profit</span>
                  <span className="text-green-400">+${(finalAmount / priceDecimal - finalAmount).toFixed(2)}</span>
                </div>
              </div>
            )}

            {/* Error */}
            {tradeStatus === 'error' && (
              <div className="mb-3 p-3 bg-red-900/20 border border-red-500/30 rounded-lg">
                <div className="text-red-400 text-xs">{tradeError}</div>
              </div>
            )}

            {/* Trade button */}
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
                  : 'bg-purple-600 hover:bg-purple-500 text-white'
              )}
            >
              {tradeStatus === 'placing'
                ? 'Placing order...'
                : 'Trade ' + (isBinary ? tradeSide : outcomeName) + ' - $' + (finalAmount || 0)
              }
            </button>
          </div>
        )}

        <div className="mt-3 text-xs text-gray-600 text-center">
          Powered by Polymarket - Not financial advice
        </div>
      </div>
    </div>
  );
}
