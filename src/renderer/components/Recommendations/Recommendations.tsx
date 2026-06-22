import React, { useEffect, useState } from 'react';
import { formatCurrency, formatPercent } from '../../utils/format';

type TabType = 'portfolio' | 'sectors' | 'alerts';

interface Recommendation {
  symbol: string;
  name: string;
  market: string;
  quantity: number;
  avgPrice: number;
  currentPrice: number;
  pnl: number;
  pnlPercent: number;
  technicalScore: number;
  fundamentalScore: number;
  momentumScore: number;
  valueScore: number;
  overallScore: number;
  signal: string;
  confidence: number;
  rationale: string[];
  high52Week: number;
  low52Week: number;
  ma50: number;
  ma200: number;
  daysHeld: number;
  taxStatus: string;
  lastUpdated: string;
}

interface SectorData {
  name: string;
  value: number;
  percentage: number;
  benchmark: number;
}

interface Alert {
  type: string;
  priority: string;
  symbol: string;
  message: string;
  value: number;
}

export default function Recommendations() {
  const [activeTab, setActiveTab] = useState<TabType>('portfolio');
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [sectors, setSectors] = useState<{ sectors: SectorData[]; gaps: any[]; overweight: SectorData[]; underweight: SectorData[] }>({ sectors: [], gaps: [], overweight: [], underweight: [] });
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedStock, setSelectedStock] = useState<Recommendation | null>(null);
  const [market, setMarket] = useState<'NSE' | 'NYSE'>('NSE');

  const fetchRecommendations = async () => {
    setIsLoading(true);
    try {
      const response = await fetch(`/api/top-picks/${market}`);
      const data = await response.json();
      setRecommendations(data);
      if (data.length > 0) setSelectedStock(data[0]);
    } catch (error) {
      console.error('Failed to fetch recommendations:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchSectors = async () => {
    try {
      const response = await fetch('/api/recommendations/sectors');
      const data = await response.json();
      setSectors(data);
    } catch (error) {
      console.error('Failed to fetch sectors:', error);
    }
  };

  const fetchAlerts = async () => {
    try {
      const response = await fetch('/api/recommendations/alerts');
      const data = await response.json();
      setAlerts(data);
    } catch (error) {
      console.error('Failed to fetch alerts:', error);
    }
  };

  useEffect(() => {
    fetchRecommendations();
    fetchSectors();
    fetchAlerts();
  }, [market]);

  const getSignalColor = (signal: string) => {
    switch (signal) {
      case 'STRONG_BUY': return 'bg-green-600 text-white';
      case 'BUY': return 'bg-green-500/20 text-green-400 border border-green-500';
      case 'HOLD': return 'bg-yellow-500/20 text-yellow-400 border border-yellow-500';
      case 'SELL': return 'bg-red-500/20 text-red-400 border border-red-500';
      case 'STRONG_SELL': return 'bg-red-600 text-white';
      default: return 'bg-slate-600 text-slate-300';
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 70) return 'text-green-400';
    if (score >= 50) return 'text-yellow-400';
    return 'text-red-400';
  };

  const getScoreBarColor = (score: number) => {
    if (score >= 70) return 'bg-green-500';
    if (score >= 50) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'HIGH': return 'bg-red-500/20 text-red-400 border-red-500';
      case 'MEDIUM': return 'bg-yellow-500/20 text-yellow-400 border-yellow-500';
      case 'LOW': return 'bg-green-500/20 text-green-400 border-green-500';
      default: return 'bg-slate-600 text-slate-300';
    }
  };

  const getAlertIcon = (type: string) => {
    switch (type) {
      case 'SURGE': return '📈';
      case 'DROP': return '📉';
      case 'CONCENTRATION': return '⚠️';
      case 'LOSS': return '🔴';
      case 'PROFIT': return '💰';
      case 'TAX': return '📅';
      default: return '📋';
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Recommendations</h1>
          <p className="text-slate-400">Portfolio insights, sector analysis & alerts</p>
        </div>

        {/* Market Toggle */}
        <div className="flex bg-slate-700 rounded-lg p-1">
          {(['NSE', 'NYSE'] as const).map((m) => (
            <button
              key={m}
              onClick={() => setMarket(m)}
              className={`px-4 py-2 rounded-md font-medium transition-colors ${
                market === m
                  ? 'bg-green-600 text-white'
                  : 'text-slate-300 hover:text-white'
              }`}
            >
              {m === 'NSE' ? '🇮🇳 India' : '🇺🇸 US'}
            </button>
          ))}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-slate-700 pb-2">
        <button
          onClick={() => setActiveTab('portfolio')}
          className={`px-4 py-2 rounded-t-lg font-medium transition-colors flex items-center gap-2 ${
            activeTab === 'portfolio'
              ? 'bg-slate-700 text-white'
              : 'text-slate-400 hover:text-white hover:bg-slate-700/50'
          }`}
        >
          <span>📊</span>
          <span>Portfolio Insights</span>
          <span className="text-xs bg-slate-600 px-2 py-0.5 rounded-full">
            {recommendations.length}
          </span>
        </button>
        <button
          onClick={() => setActiveTab('sectors')}
          className={`px-4 py-2 rounded-t-lg font-medium transition-colors flex items-center gap-2 ${
            activeTab === 'sectors'
              ? 'bg-slate-700 text-white'
              : 'text-slate-400 hover:text-white hover:bg-slate-700/50'
          }`}
        >
          <span>🥧</span>
          <span>Sector Analysis</span>
        </button>
        <button
          onClick={() => setActiveTab('alerts')}
          className={`px-4 py-2 rounded-t-lg font-medium transition-colors flex items-center gap-2 ${
            activeTab === 'alerts'
              ? 'bg-slate-700 text-white'
              : 'text-slate-400 hover:text-white hover:bg-slate-700/50'
          }`}
        >
          <span>🔔</span>
          <span>Alerts</span>
          {alerts.length > 0 && (
            <span className="text-xs bg-red-600 px-2 py-0.5 rounded-full">
              {alerts.length}
            </span>
          )}
        </button>
      </div>

      {/* Portfolio Insights Tab */}
      {activeTab === 'portfolio' && (
        <>
          {isLoading ? (
            <div className="card text-center py-12">
              <div className="animate-spin text-4xl mb-4">⏳</div>
              <p className="text-slate-400">Analyzing your portfolio...</p>
              <p className="text-slate-500 text-sm mt-2">Fetching technical indicators</p>
            </div>
          ) : recommendations.length === 0 ? (
            <div className="card text-center py-12">
              <div className="text-6xl mb-4">📊</div>
              <h3 className="text-xl font-semibold text-white mb-2">No Holdings Found</h3>
              <p className="text-slate-400">Add holdings to your portfolio to see recommendations.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Stock List */}
              <div className="lg:col-span-2">
                <div className="card p-0 overflow-hidden">
                  <table className="w-full">
                    <thead>
                      <tr className="bg-slate-700/50 text-left">
                        <th className="p-3 text-slate-300 font-medium">Stock</th>
                        <th className="p-3 text-slate-300 font-medium text-center">Signal</th>
                        <th className="p-3 text-slate-300 font-medium text-right">Score</th>
                        <th className="p-3 text-slate-300 font-medium text-right">P&L</th>
                        <th className="p-3 text-slate-300 font-medium text-right">Tax</th>
                      </tr>
                    </thead>
                    <tbody>
                      {recommendations.map((stock) => (
                        <tr
                          key={stock.symbol}
                          onClick={() => setSelectedStock(stock)}
                          className={`border-t border-slate-700 cursor-pointer transition-colors ${
                            selectedStock?.symbol === stock.symbol
                              ? 'bg-slate-700'
                              : 'hover:bg-slate-700/50'
                          }`}
                        >
                          <td className="p-3">
                            <p className="font-medium text-white">{stock.symbol}</p>
                            <p className="text-xs text-slate-400 truncate max-w-[150px]">{stock.name}</p>
                          </td>
                          <td className="p-3 text-center">
                            <span className={`px-2 py-1 rounded text-xs font-medium ${getSignalColor(stock.signal)}`}>
                              {stock.signal.replace('_', ' ')}
                            </span>
                          </td>
                          <td className="p-3 text-right">
                            <div className="flex items-center justify-end gap-2">
                              <div className="w-16 h-2 bg-slate-600 rounded-full overflow-hidden">
                                <div
                                  className={`h-full rounded-full ${getScoreBarColor(stock.overallScore)}`}
                                  style={{ width: `${stock.overallScore}%` }}
                                />
                              </div>
                              <span className={`font-medium w-6 ${getScoreColor(stock.overallScore)}`}>
                                {stock.overallScore}
                              </span>
                            </div>
                          </td>
                          <td className="p-3 text-right">
                            <p className={`font-medium ${stock.pnlPercent >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                              {stock.pnlPercent >= 0 ? '+' : ''}{stock.pnlPercent.toFixed(1)}%
                            </p>
                          </td>
                          <td className="p-3 text-right">
                            <span className={`text-xs px-2 py-0.5 rounded ${
                              stock.taxStatus === 'LTCG' ? 'bg-green-900/50 text-green-400' : 'bg-yellow-900/50 text-yellow-400'
                            }`}>
                              {stock.taxStatus}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Stock Details */}
              <div className="lg:col-span-1">
                {selectedStock ? (
                  <div className="card space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="text-xl font-bold text-white">{selectedStock.symbol}</h3>
                        <p className="text-slate-400 text-sm">{selectedStock.market} • {selectedStock.daysHeld} days held</p>
                      </div>
                      <span className={`px-3 py-1 rounded text-sm font-medium ${getSignalColor(selectedStock.signal)}`}>
                        {selectedStock.signal.replace('_', ' ')}
                      </span>
                    </div>

                    {/* Price Info */}
                    <div className="grid grid-cols-2 gap-3 p-3 bg-slate-700/50 rounded-lg">
                      <div>
                        <p className="text-xs text-slate-400">Avg Price</p>
                        <p className="text-white font-medium">{formatCurrency(selectedStock.avgPrice, 'INR')}</p>
                      </div>
                      <div>
                        <p className="text-xs text-slate-400">Current Price</p>
                        <p className="text-white font-medium">{formatCurrency(selectedStock.currentPrice, 'INR')}</p>
                      </div>
                      <div>
                        <p className="text-xs text-slate-400">52W Low</p>
                        <p className="text-slate-300">{formatCurrency(selectedStock.low52Week, 'INR')}</p>
                      </div>
                      <div>
                        <p className="text-xs text-slate-400">52W High</p>
                        <p className="text-slate-300">{formatCurrency(selectedStock.high52Week, 'INR')}</p>
                      </div>
                    </div>

                    {/* Score Breakdown */}
                    <div>
                      <p className="text-sm font-medium text-slate-300 mb-2">Score Breakdown</p>
                      <div className="grid grid-cols-2 gap-2">
                        <ScoreCard label="Trend" score={selectedStock.technicalScore} />
                        <ScoreCard label="Momentum" score={selectedStock.momentumScore} />
                        <ScoreCard label="Value" score={selectedStock.valueScore} />
                        <ScoreCard label="Overall" score={selectedStock.overallScore} highlight />
                      </div>
                    </div>

                    {/* Moving Averages */}
                    <div className="p-3 bg-slate-700/50 rounded-lg">
                      <p className="text-xs text-slate-400 mb-2">Moving Averages</p>
                      <div className="space-y-1 text-sm">
                        <div className="flex justify-between">
                          <span className="text-slate-400">50 DMA</span>
                          <span className={selectedStock.currentPrice > selectedStock.ma50 ? 'text-green-400' : 'text-red-400'}>
                            {formatCurrency(selectedStock.ma50, 'INR')}
                            {selectedStock.currentPrice > selectedStock.ma50 ? ' ↑' : ' ↓'}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-400">200 DMA</span>
                          <span className={selectedStock.currentPrice > selectedStock.ma200 ? 'text-green-400' : 'text-red-400'}>
                            {formatCurrency(selectedStock.ma200, 'INR')}
                            {selectedStock.currentPrice > selectedStock.ma200 ? ' ↑' : ' ↓'}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Analysis */}
                    <div className="pt-2 border-t border-slate-700">
                      <p className="text-sm font-medium text-slate-300 mb-2">Analysis</p>
                      <ul className="space-y-2">
                        {selectedStock.rationale.map((reason, idx) => (
                          <li key={idx} className="flex items-start gap-2 text-sm text-slate-400">
                            <span className="text-green-500 mt-0.5">•</span>
                            {reason}
                          </li>
                        ))}
                      </ul>
                    </div>

                    {/* P&L Summary */}
                    <div className={`p-3 rounded-lg ${selectedStock.pnl >= 0 ? 'bg-green-900/20' : 'bg-red-900/20'}`}>
                      <div className="flex justify-between items-center">
                        <span className="text-slate-400">P&L</span>
                        <span className={`font-bold ${selectedStock.pnl >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                          {selectedStock.pnl >= 0 ? '+' : ''}{formatCurrency(selectedStock.pnl, 'INR')}
                          <span className="text-sm ml-1">({selectedStock.pnlPercent >= 0 ? '+' : ''}{selectedStock.pnlPercent.toFixed(1)}%)</span>
                        </span>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="card text-center py-12">
                    <div className="text-4xl mb-4">👆</div>
                    <p className="text-slate-400">Select a stock to view details</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </>
      )}

      {/* Sector Analysis Tab */}
      {activeTab === 'sectors' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Sector Allocation */}
          <div className="card">
            <h3 className="text-lg font-semibold text-white mb-4">Sector Allocation</h3>
            {sectors.sectors.length === 0 ? (
              <p className="text-slate-400">No holdings to analyze</p>
            ) : (
              <div className="space-y-3">
                {sectors.sectors
                  .sort((a, b) => b.percentage - a.percentage)
                  .map((sector) => (
                    <div key={sector.name}>
                      <div className="flex justify-between text-sm mb-1">
                        <span className="text-slate-300">{sector.name}</span>
                        <span className="text-white font-medium">{sector.percentage.toFixed(1)}%</span>
                      </div>
                      <div className="h-3 bg-slate-700 rounded-full overflow-hidden relative">
                        <div
                          className="h-full bg-green-500 rounded-full"
                          style={{ width: `${Math.min(100, sector.percentage)}%` }}
                        />
                        {/* Benchmark marker */}
                        <div
                          className="absolute top-0 h-full w-0.5 bg-yellow-400"
                          style={{ left: `${Math.min(100, sector.benchmark)}%` }}
                          title={`Benchmark: ${sector.benchmark}%`}
                        />
                      </div>
                      <p className="text-xs text-slate-500 mt-0.5">
                        Benchmark: {sector.benchmark}%
                        {sector.percentage > sector.benchmark * 1.5 && <span className="text-yellow-400 ml-2">Overweight</span>}
                        {sector.percentage < sector.benchmark * 0.5 && <span className="text-blue-400 ml-2">Underweight</span>}
                      </p>
                    </div>
                  ))}
              </div>
            )}
          </div>

          {/* Insights */}
          <div className="space-y-4">
            {/* Overweight Sectors */}
            {sectors.overweight.length > 0 && (
              <div className="card border-l-4 border-yellow-500">
                <h3 className="text-lg font-semibold text-yellow-400 mb-3">⚠️ Overweight Sectors</h3>
                <div className="space-y-2">
                  {sectors.overweight.map((s) => (
                    <div key={s.name} className="flex justify-between items-center p-2 bg-yellow-900/20 rounded">
                      <span className="text-white">{s.name}</span>
                      <span className="text-yellow-400 font-medium">
                        {s.percentage.toFixed(1)}% (target: {s.benchmark}%)
                      </span>
                    </div>
                  ))}
                </div>
                <p className="text-sm text-slate-400 mt-3">Consider reducing exposure to balance risk.</p>
              </div>
            )}

            {/* Underweight Sectors */}
            {sectors.underweight.length > 0 && (
              <div className="card border-l-4 border-blue-500">
                <h3 className="text-lg font-semibold text-blue-400 mb-3">📉 Underweight Sectors</h3>
                <div className="space-y-2">
                  {sectors.underweight.map((s) => (
                    <div key={s.name} className="flex justify-between items-center p-2 bg-blue-900/20 rounded">
                      <span className="text-white">{s.name}</span>
                      <span className="text-blue-400 font-medium">
                        {s.percentage.toFixed(1)}% (target: {s.benchmark}%)
                      </span>
                    </div>
                  ))}
                </div>
                <p className="text-sm text-slate-400 mt-3">Consider adding exposure for better diversification.</p>
              </div>
            )}

            {/* Missing Sectors */}
            {sectors.gaps.length > 0 && (
              <div className="card border-l-4 border-slate-500">
                <h3 className="text-lg font-semibold text-slate-300 mb-3">🔍 Missing Sectors</h3>
                <div className="flex flex-wrap gap-2">
                  {sectors.gaps.map((g) => (
                    <span key={g.sector} className="px-3 py-1 bg-slate-700 rounded-full text-sm text-slate-300">
                      {g.sector}
                    </span>
                  ))}
                </div>
                <p className="text-sm text-slate-400 mt-3">These sectors are in the benchmark but not in your portfolio.</p>
              </div>
            )}

            {/* All Good */}
            {sectors.overweight.length === 0 && sectors.underweight.length === 0 && sectors.gaps.length === 0 && sectors.sectors.length > 0 && (
              <div className="card border-l-4 border-green-500">
                <h3 className="text-lg font-semibold text-green-400 mb-2">✅ Well Diversified</h3>
                <p className="text-slate-400">Your portfolio sector allocation is balanced.</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Alerts Tab */}
      {activeTab === 'alerts' && (
        <div className="space-y-4">
          {alerts.length === 0 ? (
            <div className="card text-center py-12">
              <div className="text-6xl mb-4">✅</div>
              <h3 className="text-xl font-semibold text-white mb-2">No Active Alerts</h3>
              <p className="text-slate-400">Your portfolio is looking good!</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {alerts.map((alert, idx) => (
                <div
                  key={`${alert.symbol}-${alert.type}-${idx}`}
                  className={`card border-l-4 ${
                    alert.priority === 'HIGH' ? 'border-red-500' :
                    alert.priority === 'MEDIUM' ? 'border-yellow-500' : 'border-green-500'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <span className="text-2xl">{getAlertIcon(alert.type)}</span>
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-1">
                        <h4 className="font-semibold text-white">{alert.symbol}</h4>
                        <span className={`px-2 py-0.5 rounded text-xs font-medium border ${getPriorityColor(alert.priority)}`}>
                          {alert.priority}
                        </span>
                      </div>
                      <p className="text-slate-300">{alert.message}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Alert Legend */}
          {alerts.length > 0 && (
            <div className="card bg-slate-800/50">
              <h4 className="text-sm font-medium text-slate-400 mb-2">Alert Types</h4>
              <div className="flex flex-wrap gap-4 text-sm">
                <span className="flex items-center gap-1"><span>📈</span> Large gain today</span>
                <span className="flex items-center gap-1"><span>📉</span> Large drop today</span>
                <span className="flex items-center gap-1"><span>⚠️</span> High concentration</span>
                <span className="flex items-center gap-1"><span>🔴</span> Significant loss</span>
                <span className="flex items-center gap-1"><span>💰</span> Profit booking opportunity</span>
                <span className="flex items-center gap-1"><span>📅</span> Tax status change approaching</span>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Disclaimer */}
      <div className="card bg-yellow-900/20 border-yellow-800">
        <p className="text-xs text-yellow-400">
          <strong>Disclaimer:</strong> These recommendations are generated algorithmically based on technical indicators
          and should not be considered financial advice. Always do your own research before making investment decisions.
        </p>
      </div>
    </div>
  );
}

function ScoreCard({ label, score, highlight }: { label: string; score: number; highlight?: boolean }) {
  const getScoreColor = (score: number) => {
    if (score >= 70) return 'text-green-400';
    if (score >= 50) return 'text-yellow-400';
    return 'text-red-400';
  };

  return (
    <div className={`p-2 rounded-lg ${highlight ? 'bg-slate-600' : 'bg-slate-700/50'}`}>
      <p className="text-xs text-slate-400">{label}</p>
      <p className={`text-lg font-bold ${getScoreColor(score)}`}>
        {Math.round(score)}
      </p>
    </div>
  );
}
