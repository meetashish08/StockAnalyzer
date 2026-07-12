import React, { useEffect, useState } from 'react';
import { formatCurrency } from '../../utils/format';
import { useStore } from '../../store/useStore';
import ClickableStock from '../common/ClickableStock';

type TabType = 'recommended' | 'gaps' | 'mutualFunds' | 'screener';
type RiskProfile = 'conservative' | 'moderate' | 'aggressive';
type InvestmentGoal = 'growth' | 'income' | 'balanced';
type TimeHorizon = '1year' | '3years' | '5years' | '10years+';

interface StockRecommendation {
  symbol: string;
  name: string;
  market: string;
  currentPrice: number;
  targetPrice: number;
  upside: number;
  rating: 'STRONG_BUY' | 'BUY' | 'HOLD';
  rationale: string[];
  technicals: {
    pe: number;
    trend: string;
    rsi: number;
    above200DMA: boolean;
  };
  risk: 'LOW' | 'MEDIUM' | 'HIGH';
  sector: string;
  investmentRange: { min: number; max: number };
}

interface PortfolioGap {
  sector: string;
  current: number;
  benchmark: number;
  gap: number;
  status: 'MISSING' | 'UNDERWEIGHT' | 'OVERWEIGHT' | 'OPTIMAL';
  recommendations: string[];
}

interface MutualFundRecommendation {
  schemeCode: string;
  schemeName: string;
  category: string;
  fundHouse: string;
  nav: number;
  returns: {
    oneYear: number;
    threeYear: number;
    fiveYear: number;
  };
  expenseRatio: number;
  aum: number;
  rating: number;
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH';
}

interface ScreenerFilters {
  marketCap: 'ALL' | 'LARGE' | 'MID' | 'SMALL';
  sector: string;
  peRatio: 'ALL' | '<15' | '15-25' | '>25';
  dividendYield: 'ALL' | '>2%' | '>4%';
  roe: 'ALL' | '>15%' | '>20%';
  performance52w: 'ALL' | 'NEAR_HIGH' | 'NEAR_LOW';
  ma: 'ALL' | 'ABOVE_50' | 'ABOVE_200';
}

export default function StockPickerPage() {
  const [activeTab, setActiveTab] = useState<TabType>('recommended');
  const [riskProfile, setRiskProfile] = useState<RiskProfile>('moderate');
  const [investmentGoal, setInvestmentGoal] = useState<InvestmentGoal>('growth');
  const [timeHorizon, setTimeHorizon] = useState<TimeHorizon>('5years');

  const [recommendations, setRecommendations] = useState<StockRecommendation[]>([]);
  const [gaps, setGaps] = useState<PortfolioGap[]>([]);
  const [mutualFunds, setMutualFunds] = useState<MutualFundRecommendation[]>([]);
  const [screenerResults, setScreenerResults] = useState<any[]>([]);

  const [isLoading, setIsLoading] = useState(false);
  const [selectedMarket, setSelectedMarket] = useState<'NSE' | 'NYSE'>('NSE');
  const [selectedFundCategory, setSelectedFundCategory] = useState<string>('ALL');

  const [screenerFilters, setScreenerFilters] = useState<ScreenerFilters>({
    marketCap: 'ALL',
    sector: 'ALL',
    peRatio: 'ALL',
    dividendYield: 'ALL',
    roe: 'ALL',
    performance52w: 'ALL',
    ma: 'ALL',
  });

  const holdings = useStore((state) => state.holdings);

  useEffect(() => {
    if (activeTab === 'recommended') {
      fetchRecommendations();
    } else if (activeTab === 'gaps') {
      fetchPortfolioGaps();
    } else if (activeTab === 'mutualFunds') {
      fetchMutualFunds();
    }
  }, [activeTab, riskProfile, investmentGoal, timeHorizon, selectedMarket]);

  const fetchRecommendations = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/stock-recommendations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          currentHoldings: holdings.map(h => ({ symbol: h.symbol, market: h.market, sector: h.sector })),
          riskProfile,
          investmentGoal,
          timeHorizon,
          market: selectedMarket,
        }),
      });
      const data = await response.json();
      setRecommendations(data);
    } catch (error) {
      console.error('Failed to fetch recommendations:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchPortfolioGaps = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/portfolio-gaps', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          currentHoldings: holdings.map(h => ({
            symbol: h.symbol,
            market: h.market,
            sector: h.sector,
            value: (h.quantity * (h.currentPrice || h.avgPrice))
          })),
          market: selectedMarket,
        }),
      });
      const data = await response.json();
      setGaps(data);
    } catch (error) {
      console.error('Failed to fetch portfolio gaps:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchMutualFunds = async () => {
    setIsLoading(true);
    try {
      const response = await fetch(`/api/mutual-funds?category=${selectedFundCategory}&riskProfile=${riskProfile}`);
      const data = await response.json();
      setMutualFunds(data);
    } catch (error) {
      console.error('Failed to fetch mutual funds:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleScreenerSearch = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/stock-screener', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ filters: screenerFilters, market: selectedMarket }),
      });
      const data = await response.json();
      setScreenerResults(data);
    } catch (error) {
      console.error('Failed to run screener:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const getRatingColor = (rating: string) => {
    switch (rating) {
      case 'STRONG_BUY': return 'bg-green-600 text-white';
      case 'BUY': return 'bg-green-500/20 text-green-400 border border-green-500';
      case 'HOLD': return 'bg-yellow-500/20 text-yellow-400 border border-yellow-500';
      default: return 'bg-slate-600 text-slate-300';
    }
  };

  const getRiskColor = (risk: string) => {
    switch (risk) {
      case 'LOW': return 'text-green-400';
      case 'MEDIUM': return 'text-yellow-400';
      case 'HIGH': return 'text-red-400';
      default: return 'text-slate-400';
    }
  };

  const getGapStatusColor = (status: string) => {
    switch (status) {
      case 'MISSING': return 'border-red-500 bg-red-900/10';
      case 'UNDERWEIGHT': return 'border-yellow-500 bg-yellow-900/10';
      case 'OVERWEIGHT': return 'border-orange-500 bg-orange-900/10';
      case 'OPTIMAL': return 'border-green-500 bg-green-900/10';
      default: return 'border-slate-500';
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <span className="text-3xl">🎯</span>
            Stock Picker
          </h1>
          <p className="text-slate-400">AI-powered stock recommendations & portfolio optimization</p>
        </div>

        <div className="flex items-center gap-3">
          {/* Market Toggle */}
          <div className="flex bg-slate-700 rounded-lg p-1">
            {(['NSE', 'NYSE'] as const).map((m) => (
              <button
                key={m}
                onClick={() => setSelectedMarket(m)}
                className={`px-4 py-2 rounded-md font-medium transition-colors ${
                  selectedMarket === m
                    ? 'bg-green-600 text-white'
                    : 'text-slate-300 hover:text-white'
                }`}
              >
                {m === 'NSE' ? '🇮🇳 India' : '🇺🇸 US'}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* User Profile Settings */}
      <div className="card">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm text-slate-400 mb-2">Risk Profile</label>
            <select
              value={riskProfile}
              onChange={(e) => setRiskProfile(e.target.value as RiskProfile)}
              className="input w-full"
            >
              <option value="conservative">Conservative - Low Risk</option>
              <option value="moderate">Moderate - Balanced Risk</option>
              <option value="aggressive">Aggressive - High Growth</option>
            </select>
          </div>
          <div>
            <label className="block text-sm text-slate-400 mb-2">Investment Goal</label>
            <select
              value={investmentGoal}
              onChange={(e) => setInvestmentGoal(e.target.value as InvestmentGoal)}
              className="input w-full"
            >
              <option value="growth">Growth - Capital Appreciation</option>
              <option value="income">Income - Dividends</option>
              <option value="balanced">Balanced - Mix of Both</option>
            </select>
          </div>
          <div>
            <label className="block text-sm text-slate-400 mb-2">Time Horizon</label>
            <select
              value={timeHorizon}
              onChange={(e) => setTimeHorizon(e.target.value as TimeHorizon)}
              className="input w-full"
            >
              <option value="1year">1 Year - Short Term</option>
              <option value="3years">3 Years - Medium Term</option>
              <option value="5years">5 Years - Long Term</option>
              <option value="10years+">10+ Years - Very Long Term</option>
            </select>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-slate-700 pb-2">
        <button
          onClick={() => setActiveTab('recommended')}
          className={`px-4 py-2 rounded-t-lg font-medium transition-colors flex items-center gap-2 ${
            activeTab === 'recommended'
              ? 'bg-slate-700 text-white'
              : 'text-slate-400 hover:text-white hover:bg-slate-700/50'
          }`}
        >
          <span>✨</span>
          <span>Recommended Stocks</span>
        </button>
        <button
          onClick={() => setActiveTab('gaps')}
          className={`px-4 py-2 rounded-t-lg font-medium transition-colors flex items-center gap-2 ${
            activeTab === 'gaps'
              ? 'bg-slate-700 text-white'
              : 'text-slate-400 hover:text-white hover:bg-slate-700/50'
          }`}
        >
          <span>📊</span>
          <span>Portfolio Gaps</span>
        </button>
        <button
          onClick={() => setActiveTab('mutualFunds')}
          className={`px-4 py-2 rounded-t-lg font-medium transition-colors flex items-center gap-2 ${
            activeTab === 'mutualFunds'
              ? 'bg-slate-700 text-white'
              : 'text-slate-400 hover:text-white hover:bg-slate-700/50'
          }`}
        >
          <span>🏦</span>
          <span>Mutual Funds</span>
        </button>
        <button
          onClick={() => setActiveTab('screener')}
          className={`px-4 py-2 rounded-t-lg font-medium transition-colors flex items-center gap-2 ${
            activeTab === 'screener'
              ? 'bg-slate-700 text-white'
              : 'text-slate-400 hover:text-white hover:bg-slate-700/50'
          }`}
        >
          <span>🔍</span>
          <span>Market Screener</span>
        </button>
      </div>

      {/* Tab Content */}
      {/* Recommended Stocks Tab */}
      {activeTab === 'recommended' && (
        <div className="space-y-4">
          {isLoading ? (
            <div className="card text-center py-12">
              <div className="animate-spin text-4xl mb-4">⏳</div>
              <p className="text-slate-400">Analyzing market opportunities...</p>
            </div>
          ) : recommendations.length === 0 ? (
            <div className="card text-center py-12">
              <div className="text-6xl mb-4">🎯</div>
              <h3 className="text-xl font-semibold text-white mb-2">No Recommendations Yet</h3>
              <p className="text-slate-400 mb-4">Adjust your profile settings and click refresh to get personalized stock picks.</p>
              <button onClick={fetchRecommendations} className="btn-primary">
                Get Recommendations
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {recommendations.map((stock) => (
                <div key={stock.symbol} className="card hover:bg-slate-700/50 transition-colors">
                  {/* Stock Header */}
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <ClickableStock
                        symbol={stock.symbol}
                        market={stock.market}
                        name={stock.name}
                        className="text-xl font-bold block"
                      />
                      <p className="text-sm text-slate-400">{stock.name}</p>
                      <p className="text-xs text-slate-500 mt-1">{stock.sector} • {stock.market}</p>
                    </div>
                    <span className={`px-3 py-1 rounded-lg text-sm font-medium ${getRatingColor(stock.rating)}`}>
                      {stock.rating.replace('_', ' ')}
                    </span>
                  </div>

                  {/* Price & Target */}
                  <div className="grid grid-cols-2 gap-3 p-3 bg-slate-800/50 rounded-lg mb-3">
                    <div>
                      <p className="text-xs text-slate-400">Current Price</p>
                      <p className="text-lg font-semibold text-white">{formatCurrency(stock.currentPrice, selectedMarket === 'NSE' ? 'INR' : 'USD')}</p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-400">Target Price</p>
                      <p className="text-lg font-semibold text-green-400">{formatCurrency(stock.targetPrice, selectedMarket === 'NSE' ? 'INR' : 'USD')}</p>
                      <p className="text-xs text-green-300">+{stock.upside.toFixed(1)}% upside</p>
                    </div>
                  </div>

                  {/* Why we recommend */}
                  <div className="mb-3">
                    <p className="text-sm font-medium text-slate-300 mb-2">Why we recommend:</p>
                    <ul className="space-y-1">
                      {stock.rationale.map((reason, idx) => (
                        <li key={idx} className="flex items-start gap-2 text-sm text-slate-400">
                          <span className="text-green-500 mt-0.5">•</span>
                          {reason}
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* Technical Details */}
                  <div className="grid grid-cols-2 gap-2 p-2 bg-slate-700/30 rounded text-xs mb-3">
                    <div>
                      <span className="text-slate-400">P/E Ratio: </span>
                      <span className="text-white">{stock.technicals.pe.toFixed(1)}</span>
                    </div>
                    <div>
                      <span className="text-slate-400">Trend: </span>
                      <span className={stock.technicals.above200DMA ? 'text-green-400' : 'text-yellow-400'}>
                        {stock.technicals.trend}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-400">RSI: </span>
                      <span className="text-white">{stock.technicals.rsi.toFixed(0)}</span>
                    </div>
                    <div>
                      <span className="text-slate-400">Risk: </span>
                      <span className={getRiskColor(stock.risk)}>{stock.risk}</span>
                    </div>
                  </div>

                  {/* Investment Range */}
                  <div className="border-t border-slate-700 pt-3">
                    <p className="text-xs text-slate-400 mb-1">Suggested Investment</p>
                    <p className="text-sm text-white font-medium">
                      {formatCurrency(stock.investmentRange.min, selectedMarket === 'NSE' ? 'INR' : 'USD')} - {formatCurrency(stock.investmentRange.max, selectedMarket === 'NSE' ? 'INR' : 'USD')}
                    </p>
                    <p className="text-xs text-slate-500 mt-1">Time Horizon: {timeHorizon.replace('years', ' years').replace('+', '+')}</p>
                  </div>

                  {/* Action Buttons */}
                  <div className="grid grid-cols-2 gap-2 mt-3">
                    <button className="btn-secondary text-sm">Add to Watchlist</button>
                    <button className="btn-primary text-sm">Buy Now →</button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Portfolio Gaps Tab */}
      {activeTab === 'gaps' && (
        <div className="space-y-4">
          {isLoading ? (
            <div className="card text-center py-12">
              <div className="animate-spin text-4xl mb-4">⏳</div>
              <p className="text-slate-400">Analyzing portfolio allocation...</p>
            </div>
          ) : gaps.length === 0 ? (
            <div className="card text-center py-12">
              <div className="text-6xl mb-4">📊</div>
              <h3 className="text-xl font-semibold text-white mb-2">Add Holdings to See Gaps</h3>
              <p className="text-slate-400">We'll analyze your portfolio against market benchmarks.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4">
              {gaps.map((gap) => (
                <div key={gap.sector} className={`card border-l-4 ${getGapStatusColor(gap.status)}`}>
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <h3 className="text-lg font-semibold text-white">{gap.sector}</h3>
                      <p className="text-sm text-slate-400">
                        {gap.status === 'MISSING' && '⚠️ Not in your portfolio'}
                        {gap.status === 'UNDERWEIGHT' && '📉 Below benchmark allocation'}
                        {gap.status === 'OVERWEIGHT' && '📈 Above benchmark allocation'}
                        {gap.status === 'OPTIMAL' && '✅ Well balanced'}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-slate-400">Your allocation</p>
                      <p className="text-2xl font-bold text-white">{gap.current.toFixed(1)}%</p>
                      <p className="text-xs text-slate-500">Benchmark: {gap.benchmark.toFixed(1)}%</p>
                    </div>
                  </div>

                  {/* Progress Bar */}
                  <div className="h-3 bg-slate-700 rounded-full overflow-hidden relative mb-3">
                    <div
                      className={`h-full rounded-full ${
                        gap.status === 'OPTIMAL' ? 'bg-green-500' :
                        gap.status === 'UNDERWEIGHT' ? 'bg-yellow-500' :
                        gap.status === 'OVERWEIGHT' ? 'bg-orange-500' :
                        'bg-red-500'
                      }`}
                      style={{ width: `${Math.min(100, gap.current)}%` }}
                    />
                    <div
                      className="absolute top-0 h-full w-0.5 bg-white"
                      style={{ left: `${Math.min(100, gap.benchmark)}%` }}
                      title={`Benchmark: ${gap.benchmark}%`}
                    />
                  </div>

                  {/* Recommendations */}
                  {gap.recommendations.length > 0 && (
                    <div className="bg-slate-800/50 p-3 rounded-lg">
                      <p className="text-sm font-medium text-slate-300 mb-2">Recommended Actions:</p>
                      <ul className="space-y-1">
                        {gap.recommendations.map((rec, idx) => (
                          <li key={idx} className="flex items-start gap-2 text-sm text-slate-400">
                            <span className="text-blue-400 mt-0.5">→</span>
                            {rec}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Mutual Funds Tab */}
      {activeTab === 'mutualFunds' && (
        <div className="space-y-4">
          {/* Category Filter */}
          <div className="card">
            <label className="block text-sm text-slate-400 mb-2">Fund Category</label>
            <select
              value={selectedFundCategory}
              onChange={(e) => setSelectedFundCategory(e.target.value)}
              className="input w-full max-w-md"
            >
              <option value="ALL">All Categories</option>
              <option value="LARGE_CAP">Large Cap Funds</option>
              <option value="MID_CAP">Mid Cap Funds</option>
              <option value="SMALL_CAP">Small Cap Funds</option>
              <option value="DEBT">Debt Funds</option>
              <option value="HYBRID">Hybrid Funds</option>
              <option value="INDEX">Index Funds</option>
              <option value="SECTORAL">Sectoral Funds</option>
            </select>
          </div>

          {isLoading ? (
            <div className="card text-center py-12">
              <div className="animate-spin text-4xl mb-4">⏳</div>
              <p className="text-slate-400">Loading top-rated mutual funds...</p>
            </div>
          ) : mutualFunds.length === 0 ? (
            <div className="card text-center py-12">
              <div className="text-6xl mb-4">🏦</div>
              <h3 className="text-xl font-semibold text-white mb-2">Select a Category</h3>
              <p className="text-slate-400">Choose a fund category to see our top picks.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4">
              {mutualFunds.map((fund) => (
                <div key={fund.schemeCode} className="card hover:bg-slate-700/50 transition-colors">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <h3 className="text-lg font-semibold text-white mb-1">{fund.schemeName}</h3>
                      <p className="text-sm text-slate-400">{fund.fundHouse}</p>
                      <div className="flex items-center gap-3 mt-2">
                        <span className="text-xs px-2 py-1 bg-blue-900/30 text-blue-400 rounded">{fund.category}</span>
                        <span className={`text-xs px-2 py-1 rounded ${
                          fund.riskLevel === 'LOW' ? 'bg-green-900/30 text-green-400' :
                          fund.riskLevel === 'MEDIUM' ? 'bg-yellow-900/30 text-yellow-400' :
                          'bg-red-900/30 text-red-400'
                        }`}>
                          {fund.riskLevel} Risk
                        </span>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-slate-400">Current NAV</p>
                      <p className="text-2xl font-bold text-white">{formatCurrency(fund.nav, 'INR')}</p>
                    </div>
                  </div>

                  {/* Returns */}
                  <div className="grid grid-cols-3 gap-3 p-3 bg-slate-800/50 rounded-lg mb-3">
                    <div className="text-center">
                      <p className="text-xs text-slate-400">1 Year</p>
                      <p className={`text-lg font-semibold ${fund.returns.oneYear >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                        {fund.returns.oneYear.toFixed(1)}%
                      </p>
                    </div>
                    <div className="text-center">
                      <p className="text-xs text-slate-400">3 Year</p>
                      <p className={`text-lg font-semibold ${fund.returns.threeYear >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                        {fund.returns.threeYear.toFixed(1)}%
                      </p>
                    </div>
                    <div className="text-center">
                      <p className="text-xs text-slate-400">5 Year</p>
                      <p className={`text-lg font-semibold ${fund.returns.fiveYear >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                        {fund.returns.fiveYear.toFixed(1)}%
                      </p>
                    </div>
                  </div>

                  {/* Fund Details */}
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <span className="text-slate-400">Expense Ratio: </span>
                      <span className="text-white">{fund.expenseRatio.toFixed(2)}%</span>
                    </div>
                    <div>
                      <span className="text-slate-400">AUM: </span>
                      <span className="text-white">{formatCurrency(fund.aum, 'INR')}</span>
                    </div>
                  </div>

                  {/* Rating */}
                  <div className="mt-3 pt-3 border-t border-slate-700">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <span key={star} className={star <= fund.rating ? 'text-yellow-400' : 'text-slate-600'}>
                            ★
                          </span>
                        ))}
                      </div>
                      <button className="btn-primary text-sm">Start SIP →</button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Market Screener Tab */}
      {activeTab === 'screener' && (
        <div className="space-y-4">
          {/* Filters */}
          <div className="card">
            <h3 className="text-lg font-semibold text-white mb-4">Screening Criteria</h3>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              <div>
                <label className="block text-sm text-slate-400 mb-2">Market Cap</label>
                <select
                  value={screenerFilters.marketCap}
                  onChange={(e) => setScreenerFilters({ ...screenerFilters, marketCap: e.target.value as any })}
                  className="input w-full"
                >
                  <option value="ALL">All</option>
                  <option value="LARGE">Large Cap</option>
                  <option value="MID">Mid Cap</option>
                  <option value="SMALL">Small Cap</option>
                </select>
              </div>
              <div>
                <label className="block text-sm text-slate-400 mb-2">Sector</label>
                <select
                  value={screenerFilters.sector}
                  onChange={(e) => setScreenerFilters({ ...screenerFilters, sector: e.target.value })}
                  className="input w-full"
                >
                  <option value="ALL">All Sectors</option>
                  <option value="Banking">Banking</option>
                  <option value="IT">Information Technology</option>
                  <option value="Pharma">Pharmaceuticals</option>
                  <option value="Auto">Automobile</option>
                  <option value="FMCG">FMCG</option>
                  <option value="Energy">Energy</option>
                  <option value="Metals">Metals</option>
                </select>
              </div>
              <div>
                <label className="block text-sm text-slate-400 mb-2">P/E Ratio</label>
                <select
                  value={screenerFilters.peRatio}
                  onChange={(e) => setScreenerFilters({ ...screenerFilters, peRatio: e.target.value as any })}
                  className="input w-full"
                >
                  <option value="ALL">All</option>
                  <option value="<15">Less than 15</option>
                  <option value="15-25">15 to 25</option>
                  <option value=">25">More than 25</option>
                </select>
              </div>
              <div>
                <label className="block text-sm text-slate-400 mb-2">Dividend Yield</label>
                <select
                  value={screenerFilters.dividendYield}
                  onChange={(e) => setScreenerFilters({ ...screenerFilters, dividendYield: e.target.value as any })}
                  className="input w-full"
                >
                  <option value="ALL">All</option>
                  <option value=">2%">Greater than 2%</option>
                  <option value=">4%">Greater than 4%</option>
                </select>
              </div>
              <div>
                <label className="block text-sm text-slate-400 mb-2">ROE</label>
                <select
                  value={screenerFilters.roe}
                  onChange={(e) => setScreenerFilters({ ...screenerFilters, roe: e.target.value as any })}
                  className="input w-full"
                >
                  <option value="ALL">All</option>
                  <option value=">15%">Greater than 15%</option>
                  <option value=">20%">Greater than 20%</option>
                </select>
              </div>
              <div>
                <label className="block text-sm text-slate-400 mb-2">52-Week Performance</label>
                <select
                  value={screenerFilters.performance52w}
                  onChange={(e) => setScreenerFilters({ ...screenerFilters, performance52w: e.target.value as any })}
                  className="input w-full"
                >
                  <option value="ALL">All</option>
                  <option value="NEAR_HIGH">Near 52W High</option>
                  <option value="NEAR_LOW">Near 52W Low</option>
                </select>
              </div>
              <div>
                <label className="block text-sm text-slate-400 mb-2">Moving Average</label>
                <select
                  value={screenerFilters.ma}
                  onChange={(e) => setScreenerFilters({ ...screenerFilters, ma: e.target.value as any })}
                  className="input w-full"
                >
                  <option value="ALL">All</option>
                  <option value="ABOVE_50">Above 50 DMA</option>
                  <option value="ABOVE_200">Above 200 DMA</option>
                </select>
              </div>
              <div className="flex items-end">
                <button onClick={handleScreenerSearch} className="btn-primary w-full">
                  🔍 Search
                </button>
              </div>
            </div>
          </div>

          {/* Results */}
          {isLoading ? (
            <div className="card text-center py-12">
              <div className="animate-spin text-4xl mb-4">⏳</div>
              <p className="text-slate-400">Screening stocks...</p>
            </div>
          ) : screenerResults.length === 0 ? (
            <div className="card text-center py-12">
              <div className="text-6xl mb-4">🔍</div>
              <h3 className="text-xl font-semibold text-white mb-2">No Results Yet</h3>
              <p className="text-slate-400">Set your criteria and click Search to find stocks.</p>
            </div>
          ) : (
            <div className="card p-0">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-slate-700/50">
                    <tr className="text-left">
                      <th className="p-3 text-slate-300 font-medium">Stock</th>
                      <th className="p-3 text-slate-300 font-medium">Sector</th>
                      <th className="p-3 text-slate-300 font-medium text-right">Price</th>
                      <th className="p-3 text-slate-300 font-medium text-right">P/E</th>
                      <th className="p-3 text-slate-300 font-medium text-right">Div Yield</th>
                      <th className="p-3 text-slate-300 font-medium text-right">ROE</th>
                      <th className="p-3 text-slate-300 font-medium text-right">52W %</th>
                      <th className="p-3 text-slate-300 font-medium text-center">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {screenerResults.map((stock, idx) => (
                      <tr key={idx} className="border-t border-slate-700 hover:bg-slate-700/30">
                        <td className="p-3">
                          <p className="font-medium text-white">{stock.symbol}</p>
                          <p className="text-xs text-slate-400">{stock.name}</p>
                        </td>
                        <td className="p-3 text-slate-300">{stock.sector}</td>
                        <td className="p-3 text-right text-white">{formatCurrency(stock.price, selectedMarket === 'NSE' ? 'INR' : 'USD')}</td>
                        <td className="p-3 text-right text-slate-300">{stock.pe?.toFixed(1) || '-'}</td>
                        <td className="p-3 text-right text-slate-300">{stock.dividendYield?.toFixed(2) || '-'}%</td>
                        <td className="p-3 text-right text-slate-300">{stock.roe?.toFixed(1) || '-'}%</td>
                        <td className={`p-3 text-right font-medium ${stock.performance52w >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                          {stock.performance52w >= 0 ? '+' : ''}{stock.performance52w?.toFixed(1) || '-'}%
                        </td>
                        <td className="p-3 text-center">
                          <button className="text-blue-400 hover:text-blue-300 text-sm">View</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Disclaimer */}
      <div className="card bg-yellow-900/20 border-yellow-800">
        <p className="text-xs text-yellow-400">
          <strong>Disclaimer:</strong> These recommendations are AI-generated based on algorithmic analysis
          and should not be considered financial advice. Always conduct your own research and consult with a
          certified financial advisor before making investment decisions.
        </p>
      </div>
    </div>
  );
}
