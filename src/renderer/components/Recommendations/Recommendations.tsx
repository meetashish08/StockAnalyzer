import React, { useEffect, useState, useRef } from 'react';
import { formatCurrency } from '../../utils/format';

type TabType = 'portfolio' | 'sectors' | 'alerts' | 'bookmarks';

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

interface Bookmark {
  id: number;
  type: string;
  symbol: string | null;
  data: any;
  notes: string;
  market: string;
  createdAt: string;
}

// LocalStorage keys for persistence
const STORAGE_KEYS = {
  recommendations: 'rec_recommendations',
  sectors: 'rec_sectors',
  alerts: 'rec_alerts',
  lastRefresh: 'rec_lastRefresh',
  market: 'rec_market',
};

export default function Recommendations() {
  const [activeTab, setActiveTab] = useState<TabType>('portfolio');
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [previousRecommendations, setPreviousRecommendations] = useState<Recommendation[] | null>(null);
  const [sectors, setSectors] = useState<{ sectors: SectorData[]; gaps: any[]; overweight: SectorData[]; underweight: SectorData[] }>({ sectors: [], gaps: [], overweight: [], underweight: [] });
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [bookmarks, setBookmarks] = useState<Bookmark[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedStock, setSelectedStock] = useState<Recommendation | null>(null);
  const [market, setMarket] = useState<'NSE' | 'NYSE'>('NSE');
  const [lastRefreshTime, setLastRefreshTime] = useState<Date | null>(null);
  const [showExportMenu, setShowExportMenu] = useState(false);
  const [showBookmarkModal, setShowBookmarkModal] = useState(false);
  const [bookmarkNotes, setBookmarkNotes] = useState('');
  const [bookmarkType, setBookmarkType] = useState<'portfolio' | 'stock'>('portfolio');
  const [showChanges, setShowChanges] = useState(true);
  const [refreshStatus, setRefreshStatus] = useState('');
  const [viewingBookmark, setViewingBookmark] = useState<Bookmark | null>(null);
  const exportMenuRef = useRef<HTMLDivElement>(null);
  const tableContainerRef = useRef<HTMLDivElement>(null);

  // Load persisted data on mount
  useEffect(() => {
    const savedMarket = localStorage.getItem(STORAGE_KEYS.market);
    if (savedMarket === 'NSE' || savedMarket === 'NYSE') {
      setMarket(savedMarket);
    }

    const savedRecommendations = localStorage.getItem(STORAGE_KEYS.recommendations);
    const savedSectors = localStorage.getItem(STORAGE_KEYS.sectors);
    const savedAlerts = localStorage.getItem(STORAGE_KEYS.alerts);
    const savedLastRefresh = localStorage.getItem(STORAGE_KEYS.lastRefresh);

    if (savedRecommendations) {
      try {
        const parsed = JSON.parse(savedRecommendations);
        setRecommendations(parsed);
        if (parsed.length > 0) setSelectedStock(parsed[0]);
      } catch {}
    }
    if (savedSectors) {
      try { setSectors(JSON.parse(savedSectors)); } catch {}
    }
    if (savedAlerts) {
      try { setAlerts(JSON.parse(savedAlerts)); } catch {}
    }
    if (savedLastRefresh) {
      setLastRefreshTime(new Date(savedLastRefresh));
    }

    fetchBookmarks();
  }, []);

  // Save data to localStorage when it changes
  useEffect(() => {
    if (recommendations.length > 0) {
      localStorage.setItem(STORAGE_KEYS.recommendations, JSON.stringify(recommendations));
    }
  }, [recommendations]);

  useEffect(() => {
    if (sectors.sectors.length > 0) {
      localStorage.setItem(STORAGE_KEYS.sectors, JSON.stringify(sectors));
    }
  }, [sectors]);

  useEffect(() => {
    if (alerts.length > 0) {
      localStorage.setItem(STORAGE_KEYS.alerts, JSON.stringify(alerts));
    }
  }, [alerts]);

  useEffect(() => {
    if (lastRefreshTime) {
      localStorage.setItem(STORAGE_KEYS.lastRefresh, lastRefreshTime.toISOString());
    }
  }, [lastRefreshTime]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.market, market);
  }, [market]);

  const fetchRecommendations = async (storePrevious = true) => {
    if (storePrevious && recommendations.length > 0) {
      setPreviousRecommendations([...recommendations]);
    }
    setIsLoading(true);
    setViewingBookmark(null);
    try {
      const response = await fetch(`/api/top-picks/${market}`);
      const data = await response.json();
      setRecommendations(data);
      if (data.length > 0) setSelectedStock(data[0]);
      setLastRefreshTime(new Date());
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

  const fetchBookmarks = async () => {
    try {
      const response = await fetch('/api/recommendations/bookmarks');
      const data = await response.json();
      setBookmarks(data);
    } catch (error) {
      console.error('Failed to fetch bookmarks:', error);
    }
  };

  // Close export menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (exportMenuRef.current && !exportMenuRef.current.contains(event.target as Node)) {
        setShowExportMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleRefresh = async () => {
    setRefreshStatus('Refreshing...');
    const prevRecs = [...recommendations];
    await fetchRecommendations(true);
    await fetchSectors();
    await fetchAlerts();

    // Count signal changes
    if (prevRecs.length > 0) {
      const changes = recommendations.filter(r => {
        const prev = prevRecs.find(p => p.symbol === r.symbol);
        return prev && prev.signal !== r.signal;
      }).length;
      setRefreshStatus(changes > 0 ? `Updated - ${changes} signal(s) changed` : 'Updated');
    } else {
      setRefreshStatus('Updated');
    }
    setTimeout(() => setRefreshStatus(''), 3000);
  };

  const handleExport = async (format: 'csv' | 'excel', type?: string) => {
    setShowExportMenu(false);
    if (format === 'excel') {
      window.open(`/api/recommendations/export/excel?market=${market}`, '_blank');
    } else if (format === 'csv' && type) {
      window.open(`/api/recommendations/export/csv/${type}?market=${market}`, '_blank');
    }
  };

  const handleSaveBookmark = async () => {
    try {
      const bookmarkData = bookmarkType === 'portfolio'
        ? { recommendations, sectors, alerts, summary: { total: recommendations.length, market } }
        : selectedStock;

      await fetch('/api/recommendations/bookmarks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: bookmarkType,
          symbol: bookmarkType === 'stock' ? selectedStock?.symbol : null,
          data: bookmarkData,
          notes: bookmarkNotes,
          market,
        }),
      });

      await fetchBookmarks();
      setShowBookmarkModal(false);
      setBookmarkNotes('');
      setRefreshStatus('Bookmark saved');
      setTimeout(() => setRefreshStatus(''), 2000);
    } catch (error) {
      console.error('Failed to save bookmark:', error);
    }
  };

  const handleDeleteBookmark = async (id: number) => {
    if (!window.confirm('Delete this bookmark?')) return;
    try {
      await fetch(`/api/recommendations/bookmarks/${id}`, { method: 'DELETE' });
      await fetchBookmarks();
      if (viewingBookmark?.id === id) {
        setViewingBookmark(null);
      }
    } catch (error) {
      console.error('Failed to delete bookmark:', error);
    }
  };

  const handleViewBookmark = (bookmark: Bookmark) => {
    if (bookmark.type === 'portfolio' && bookmark.data.recommendations) {
      setViewingBookmark(bookmark);
      setRecommendations(bookmark.data.recommendations);
      if (bookmark.data.sectors) setSectors(bookmark.data.sectors);
      if (bookmark.data.alerts) setAlerts(bookmark.data.alerts);
      if (bookmark.data.recommendations.length > 0) {
        setSelectedStock(bookmark.data.recommendations[0]);
      }
      setActiveTab('portfolio');
    } else if (bookmark.type === 'stock' && bookmark.data) {
      setViewingBookmark(bookmark);
      setSelectedStock(bookmark.data);
      setActiveTab('portfolio');
    }
  };

  const handleExitBookmarkView = () => {
    setViewingBookmark(null);
    // Reload from localStorage
    const savedRecommendations = localStorage.getItem(STORAGE_KEYS.recommendations);
    const savedSectors = localStorage.getItem(STORAGE_KEYS.sectors);
    const savedAlerts = localStorage.getItem(STORAGE_KEYS.alerts);

    if (savedRecommendations) {
      try {
        const parsed = JSON.parse(savedRecommendations);
        setRecommendations(parsed);
        if (parsed.length > 0) setSelectedStock(parsed[0]);
      } catch {}
    }
    if (savedSectors) {
      try { setSectors(JSON.parse(savedSectors)); } catch {}
    }
    if (savedAlerts) {
      try { setAlerts(JSON.parse(savedAlerts)); } catch {}
    }
  };

  const getScoreDelta = (symbol: string, field: keyof Recommendation): number | null => {
    if (!previousRecommendations || !showChanges) return null;
    const prev = previousRecommendations.find(p => p.symbol === symbol);
    const curr = recommendations.find(r => r.symbol === symbol);
    if (!prev || !curr) return null;
    const prevVal = prev[field] as number;
    const currVal = curr[field] as number;
    if (typeof prevVal !== 'number' || typeof currVal !== 'number') return null;
    const delta = currVal - prevVal;
    return Math.abs(delta) > 0.5 ? delta : null;
  };

  const getSignalChange = (symbol: string): string | null => {
    if (!previousRecommendations || !showChanges) return null;
    const prev = previousRecommendations.find(p => p.symbol === symbol);
    const curr = recommendations.find(r => r.symbol === symbol);
    if (!prev || !curr || prev.signal === curr.signal) return null;
    return `${prev.signal} → ${curr.signal}`;
  };

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

  const formatTimeAgo = (date: Date) => {
    const seconds = Math.floor((new Date().getTime() - date.getTime()) / 1000);
    if (seconds < 60) return 'Just now';
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes} min ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours} hr ago`;
    const days = Math.floor(hours / 24);
    return `${days} day${days > 1 ? 's' : ''} ago`;
  };

  const DeltaIndicator = ({ value }: { value: number | null }) => {
    if (value === null) return null;
    const isPositive = value > 0;
    return (
      <span className={`text-xs ml-1 ${isPositive ? 'text-green-400' : 'text-red-400'}`}>
        {isPositive ? '↑' : '↓'}{Math.abs(value).toFixed(0)}
      </span>
    );
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Recommendations</h1>
          <p className="text-slate-400">Portfolio insights, sector analysis & alerts</p>
        </div>

        <div className="flex items-center gap-3">
          {/* Last Updated */}
          {lastRefreshTime && !viewingBookmark && (
            <span className="text-xs text-slate-500">
              Updated: {formatTimeAgo(lastRefreshTime)}
            </span>
          )}

          {/* Viewing Bookmark Banner */}
          {viewingBookmark && (
            <div className="flex items-center gap-2 px-3 py-1 bg-blue-900/30 rounded-lg">
              <span className="text-sm text-blue-400">
                Viewing: {viewingBookmark.type === 'portfolio' ? 'Saved snapshot' : viewingBookmark.symbol}
                <span className="text-xs text-slate-500 ml-2">
                  ({new Date(viewingBookmark.createdAt).toLocaleDateString()})
                </span>
              </span>
              <button
                onClick={handleExitBookmarkView}
                className="text-xs text-blue-300 hover:text-white underline"
              >
                Exit
              </button>
            </div>
          )}

          {/* Refresh Button */}
          <button
            onClick={handleRefresh}
            disabled={isLoading}
            className="btn-secondary flex items-center gap-2 text-sm"
          >
            <span className={isLoading ? 'animate-spin' : ''}>🔄</span>
            Refresh
          </button>

          {/* Export Dropdown */}
          <div className="relative" ref={exportMenuRef}>
            <button
              onClick={() => setShowExportMenu(!showExportMenu)}
              className="btn-secondary flex items-center gap-2 text-sm"
            >
              <span>⬇️</span>
              Export
              <span className="text-xs">▼</span>
            </button>

            {showExportMenu && (
              <div className="absolute right-0 mt-2 w-48 bg-slate-800 border border-slate-700 rounded-lg shadow-xl z-50">
                <div className="p-2">
                  <button
                    onClick={() => handleExport('excel')}
                    className="w-full text-left px-3 py-2 text-sm text-slate-300 hover:bg-slate-700 rounded flex items-center gap-2"
                  >
                    📊 Excel Report (.xlsx)
                  </button>
                  <button
                    onClick={() => handleExport('csv', 'portfolio')}
                    className="w-full text-left px-3 py-2 text-sm text-slate-300 hover:bg-slate-700 rounded flex items-center gap-2"
                  >
                    📋 Portfolio CSV
                  </button>
                  <button
                    onClick={() => handleExport('csv', 'sectors')}
                    className="w-full text-left px-3 py-2 text-sm text-slate-300 hover:bg-slate-700 rounded flex items-center gap-2"
                  >
                    📋 Sectors CSV
                  </button>
                  <button
                    onClick={() => handleExport('csv', 'alerts')}
                    className="w-full text-left px-3 py-2 text-sm text-slate-300 hover:bg-slate-700 rounded flex items-center gap-2"
                  >
                    📋 Alerts CSV
                  </button>
                  <div className="border-t border-slate-700 my-2"></div>
                  <button
                    onClick={() => { setShowExportMenu(false); setBookmarkType('portfolio'); setShowBookmarkModal(true); }}
                    className="w-full text-left px-3 py-2 text-sm text-slate-300 hover:bg-slate-700 rounded flex items-center gap-2"
                  >
                    🔖 Save Bookmark
                  </button>
                </div>
              </div>
            )}
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
      </div>

      {/* Status Message */}
      {refreshStatus && (
        <div className="p-2 bg-green-900/30 text-green-400 rounded-lg text-sm text-center">
          {refreshStatus}
        </div>
      )}

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
        <button
          onClick={() => setActiveTab('bookmarks')}
          className={`px-4 py-2 rounded-t-lg font-medium transition-colors flex items-center gap-2 ${
            activeTab === 'bookmarks'
              ? 'bg-slate-700 text-white'
              : 'text-slate-400 hover:text-white hover:bg-slate-700/50'
          }`}
        >
          <span>🔖</span>
          <span>Bookmarks</span>
          {bookmarks.length > 0 && (
            <span className="text-xs bg-slate-600 px-2 py-0.5 rounded-full">
              {bookmarks.length}
            </span>
          )}
        </button>

        {/* Show Changes Toggle */}
        {activeTab === 'portfolio' && previousRecommendations && (
          <div className="ml-auto flex items-center gap-2">
            <label className="text-sm text-slate-400 flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={showChanges}
                onChange={(e) => setShowChanges(e.target.checked)}
                className="w-4 h-4 rounded border-slate-500 bg-slate-700 text-green-500"
              />
              Show changes
            </label>
          </div>
        )}
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
              <p className="text-slate-400 mb-4">Add holdings to your portfolio to see recommendations.</p>
              <button onClick={handleRefresh} className="btn-primary">
                Load Recommendations
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Stock List with Sticky Header */}
              <div className="lg:col-span-2">
                <div
                  ref={tableContainerRef}
                  className="card p-0 overflow-auto max-h-[calc(100vh-280px)]"
                >
                  <table className="w-full">
                    <thead className="sticky top-0 z-10 bg-slate-800">
                      <tr className="bg-slate-700/50 text-left">
                        <th className="p-3 text-slate-300 font-medium">Stock</th>
                        <th className="p-3 text-slate-300 font-medium text-center">Signal</th>
                        <th className="p-3 text-slate-300 font-medium text-right">Score</th>
                        <th className="p-3 text-slate-300 font-medium text-right">P&L</th>
                        <th className="p-3 text-slate-300 font-medium text-right">Tax</th>
                        <th className="p-3 text-slate-300 font-medium text-center">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {recommendations.map((stock) => {
                        const signalChange = getSignalChange(stock.symbol);
                        const scoreDelta = getScoreDelta(stock.symbol, 'overallScore');

                        return (
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
                            <td className="p-3">
                              <div className="flex flex-col items-center justify-center">
                                <span className={`inline-flex items-center justify-center px-2 py-1 rounded text-xs font-medium whitespace-nowrap min-w-[90px] ${getSignalColor(stock.signal)}`}>
                                  {stock.signal.replace('_', ' ')}
                                </span>
                                {signalChange && (
                                  <p className="text-xs text-yellow-400 mt-1 text-center">{signalChange}</p>
                                )}
                              </div>
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
                                <DeltaIndicator value={scoreDelta} />
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
                            <td className="p-3 text-center">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setSelectedStock(stock);
                                  setBookmarkType('stock');
                                  setShowBookmarkModal(true);
                                }}
                                className="text-slate-400 hover:text-yellow-400 transition-colors"
                                title="Bookmark this stock"
                              >
                                🔖
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Stock Details - Sticky */}
              <div className="lg:col-span-1">
                <div className="sticky top-4">
                  {selectedStock ? (
                    <div className="card space-y-4 max-h-[calc(100vh-280px)] overflow-auto">
                      <div className="flex items-center justify-between">
                        <div>
                          <h3 className="text-xl font-bold text-white">{selectedStock.symbol}</h3>
                          <p className="text-slate-400 text-sm">{selectedStock.market} • {selectedStock.daysHeld} days held</p>
                        </div>
                        <span className={`inline-flex items-center justify-center px-3 py-1 rounded text-sm font-medium whitespace-nowrap min-w-[90px] ${getSignalColor(selectedStock.signal)}`}>
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
                          <ScoreCard label="Trend" score={selectedStock.technicalScore} delta={getScoreDelta(selectedStock.symbol, 'technicalScore')} />
                          <ScoreCard label="Momentum" score={selectedStock.momentumScore} delta={getScoreDelta(selectedStock.symbol, 'momentumScore')} />
                          <ScoreCard label="Value" score={selectedStock.valueScore} delta={getScoreDelta(selectedStock.symbol, 'valueScore')} />
                          <ScoreCard label="Overall" score={selectedStock.overallScore} delta={getScoreDelta(selectedStock.symbol, 'overallScore')} highlight />
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

      {/* Bookmarks Tab */}
      {activeTab === 'bookmarks' && (
        <div className="space-y-4">
          {bookmarks.length === 0 ? (
            <div className="card text-center py-12">
              <div className="text-6xl mb-4">🔖</div>
              <h3 className="text-xl font-semibold text-white mb-2">No Bookmarks Yet</h3>
              <p className="text-slate-400">Save portfolio snapshots or individual stock analyses for future reference.</p>
              <button
                onClick={() => { setBookmarkType('portfolio'); setShowBookmarkModal(true); }}
                className="btn-primary mt-4"
              >
                Save Current Analysis
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {bookmarks.map((bookmark) => (
                <div key={bookmark.id} className="card hover:bg-slate-700/50 transition-colors">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <span className={`text-xs px-2 py-0.5 rounded ${
                        bookmark.type === 'portfolio' ? 'bg-blue-900/50 text-blue-400' : 'bg-green-900/50 text-green-400'
                      }`}>
                        {bookmark.type === 'portfolio' ? 'Portfolio Snapshot' : `Stock: ${bookmark.symbol}`}
                      </span>
                      <p className="text-xs text-slate-500 mt-1">
                        {new Date(bookmark.createdAt).toLocaleString()}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleViewBookmark(bookmark)}
                        className="text-blue-400 hover:text-blue-300 transition-colors text-sm"
                        title="View this bookmark"
                      >
                        👁️ View
                      </button>
                      <button
                        onClick={() => handleDeleteBookmark(bookmark.id)}
                        className="text-slate-400 hover:text-red-400 transition-colors"
                        title="Delete bookmark"
                      >
                        🗑️
                      </button>
                    </div>
                  </div>

                  {bookmark.type === 'portfolio' && bookmark.data.summary && (
                    <div className="text-sm text-slate-300 mb-2">
                      <p>{bookmark.data.summary.total} holdings ({bookmark.data.summary.market})</p>
                      {bookmark.data.recommendations && (
                        <p className="text-xs text-slate-500 mt-1">
                          {bookmark.data.recommendations.filter((r: any) => r.signal?.includes('BUY')).length} BUY signals
                        </p>
                      )}
                    </div>
                  )}

                  {bookmark.type === 'stock' && bookmark.data && (
                    <div className="text-sm mb-2">
                      <p className="text-white font-medium">{bookmark.data.symbol}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <span className={`inline-flex items-center justify-center px-2 py-0.5 rounded text-xs font-medium ${getSignalColor(bookmark.data.signal || 'HOLD')}`}>
                          {(bookmark.data.signal || 'HOLD').replace('_', ' ')}
                        </span>
                        <span className="text-slate-400 text-xs">Score: {bookmark.data.overallScore}</span>
                      </div>
                    </div>
                  )}

                  {bookmark.notes && (
                    <p className="text-sm text-slate-400 italic border-t border-slate-700 pt-2 mt-2">
                      "{bookmark.notes}"
                    </p>
                  )}

                  {/* Quick View Button */}
                  <button
                    onClick={() => handleViewBookmark(bookmark)}
                    className="w-full mt-3 py-2 bg-slate-700 hover:bg-slate-600 rounded text-sm text-slate-300 transition-colors"
                  >
                    Open in Portfolio Insights
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Bookmark Modal */}
      {showBookmarkModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-slate-800 rounded-lg p-6 w-full max-w-md mx-4">
            <h3 className="text-lg font-semibold text-white mb-4">
              {bookmarkType === 'portfolio' ? 'Save Portfolio Snapshot' : `Bookmark ${selectedStock?.symbol}`}
            </h3>

            <div className="space-y-4">
              <div>
                <label className="block text-sm text-slate-400 mb-1">Notes (optional)</label>
                <textarea
                  value={bookmarkNotes}
                  onChange={(e) => setBookmarkNotes(e.target.value)}
                  placeholder="Add notes about this snapshot..."
                  className="input w-full h-24 resize-none"
                />
              </div>

              <div className="text-sm text-slate-400">
                {bookmarkType === 'portfolio' ? (
                  <p>This will save the current analysis of {recommendations.length} holdings with all scores and signals.</p>
                ) : (
                  <p>This will save the current analysis of {selectedStock?.symbol} including technical scores and rationale.</p>
                )}
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => { setShowBookmarkModal(false); setBookmarkNotes(''); }}
                  className="btn-secondary flex-1"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveBookmark}
                  className="btn-primary flex-1"
                >
                  Save Bookmark
                </button>
              </div>
            </div>
          </div>
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

function ScoreCard({ label, score, delta, highlight }: { label: string; score: number; delta?: number | null; highlight?: boolean }) {
  const getScoreColor = (score: number) => {
    if (score >= 70) return 'text-green-400';
    if (score >= 50) return 'text-yellow-400';
    return 'text-red-400';
  };

  return (
    <div className={`p-2 rounded-lg ${highlight ? 'bg-slate-600' : 'bg-slate-700/50'}`}>
      <p className="text-xs text-slate-400">{label}</p>
      <div className="flex items-center gap-1">
        <p className={`text-lg font-bold ${getScoreColor(score)}`}>
          {Math.round(score)}
        </p>
        {delta !== null && delta !== undefined && Math.abs(delta) > 0.5 && (
          <span className={`text-xs ${delta > 0 ? 'text-green-400' : 'text-red-400'}`}>
            {delta > 0 ? '↑' : '↓'}{Math.abs(delta).toFixed(0)}
          </span>
        )}
      </div>
    </div>
  );
}
