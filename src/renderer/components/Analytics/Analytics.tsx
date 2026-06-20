import React, { useEffect, useState } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Legend } from 'recharts';
import { useStore } from '../../store/useStore';
import { formatCurrency, formatPercent } from '../../utils/format';
import type { PortfolioHealth } from '../../../shared/types';

const COLORS = ['#22c55e', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#ec4899', '#f97316'];

export default function Analytics() {
  const { holdingsWithPrices, fetchHoldings } = useStore();
  const [allocation, setAllocation] = useState<any>(null);
  const [portfolioHealth, setPortfolioHealth] = useState<PortfolioHealth | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'allocation' | 'health' | 'performance'>('allocation');

  useEffect(() => {
    async function loadData() {
      setIsLoading(true);
      try {
        await fetchHoldings();
        const [allocationData, healthData] = await Promise.all([
          window.electronAPI.getPortfolioAllocation(),
          window.electronAPI.getPortfolioHealth(),
        ]);
        setAllocation(allocationData);
        setPortfolioHealth(healthData);
      } catch (error) {
        console.error('Failed to load analytics:', error);
      } finally {
        setIsLoading(false);
      }
    }
    loadData();
  }, []);

  if (isLoading) {
    return (
      <div className="card text-center py-12">
        <div className="animate-spin text-4xl mb-4">⏳</div>
        <p className="text-slate-400">Loading analytics...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white">Portfolio Analytics</h1>
        <p className="text-slate-400">Deep insights into your investments</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-slate-700 pb-2">
        {[
          { id: 'allocation', label: 'Allocation' },
          { id: 'health', label: 'Health Check' },
          { id: 'performance', label: 'Performance' },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`px-4 py-2 rounded-t-lg font-medium transition-colors ${
              activeTab === tab.id
                ? 'bg-slate-700 text-white'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Content */}
      {activeTab === 'allocation' && allocation && (
        <AllocationView allocation={allocation} />
      )}

      {activeTab === 'health' && portfolioHealth && (
        <HealthCheckView health={portfolioHealth} />
      )}

      {activeTab === 'performance' && (
        <PerformanceView holdings={holdingsWithPrices} />
      )}
    </div>
  );
}

function AllocationView({ allocation }: { allocation: any }) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* By Holding */}
      <div className="card">
        <h3 className="text-lg font-semibold text-white mb-4">By Holding</h3>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={allocation.byHolding?.slice(0, 8) || []}
                cx="50%"
                cy="50%"
                innerRadius={50}
                outerRadius={80}
                dataKey="value"
                nameKey="name"
              >
                {(allocation.byHolding || []).slice(0, 8).map((_: any, index: number) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #475569', borderRadius: '8px' }}
                formatter={(value: number) => formatCurrency(value)}
              />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* By Sector */}
      <div className="card">
        <h3 className="text-lg font-semibold text-white mb-4">By Sector</h3>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={allocation.bySector || []} layout="vertical">
              <XAxis type="number" tick={{ fill: '#94a3b8' }} />
              <YAxis dataKey="name" type="category" tick={{ fill: '#94a3b8' }} width={100} />
              <Tooltip
                contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #475569', borderRadius: '8px' }}
                formatter={(value: number) => `${value.toFixed(1)}%`}
              />
              <Bar dataKey="percentage" fill="#22c55e" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* By Market */}
      <div className="card">
        <h3 className="text-lg font-semibold text-white mb-4">By Market</h3>
        <div className="space-y-3">
          {(allocation.byMarket || []).map((market: any, idx: number) => (
            <div key={idx} className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div
                  className="w-4 h-4 rounded"
                  style={{ backgroundColor: COLORS[idx % COLORS.length] }}
                />
                <span className="text-slate-300">{market.name}</span>
              </div>
              <div className="text-right">
                <p className="text-white font-medium">{formatCurrency(market.value)}</p>
                <p className="text-slate-400 text-sm">{market.percentage.toFixed(1)}%</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* By Type */}
      <div className="card">
        <h3 className="text-lg font-semibold text-white mb-4">By Asset Type</h3>
        <div className="space-y-3">
          {(allocation.byType || []).map((type: any, idx: number) => (
            <div key={idx} className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div
                  className="w-4 h-4 rounded"
                  style={{ backgroundColor: COLORS[idx % COLORS.length] }}
                />
                <span className="text-slate-300">{type.name}</span>
              </div>
              <div className="text-right">
                <p className="text-white font-medium">{formatCurrency(type.value)}</p>
                <p className="text-slate-400 text-sm">{type.percentage.toFixed(1)}%</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function HealthCheckView({ health }: { health: PortfolioHealth }) {
  const getScoreColor = (score: number) => {
    if (score >= 70) return 'text-green-400';
    if (score >= 50) return 'text-yellow-400';
    return 'text-red-400';
  };

  const getScoreLabel = (score: number) => {
    if (score >= 80) return 'Excellent';
    if (score >= 60) return 'Good';
    if (score >= 40) return 'Fair';
    return 'Needs Attention';
  };

  return (
    <div className="space-y-6">
      {/* Scores */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="card text-center">
          <p className="text-slate-400 text-sm mb-2">Overall Score</p>
          <p className={`text-4xl font-bold ${getScoreColor(health.overallScore)}`}>
            {Math.round(health.overallScore)}
          </p>
          <p className={`text-sm mt-1 ${getScoreColor(health.overallScore)}`}>
            {getScoreLabel(health.overallScore)}
          </p>
        </div>
        <div className="card text-center">
          <p className="text-slate-400 text-sm mb-2">Diversification</p>
          <p className={`text-4xl font-bold ${getScoreColor(health.diversificationScore)}`}>
            {Math.round(health.diversificationScore)}
          </p>
          <p className={`text-sm mt-1 ${getScoreColor(health.diversificationScore)}`}>
            {getScoreLabel(health.diversificationScore)}
          </p>
        </div>
        <div className="card text-center">
          <p className="text-slate-400 text-sm mb-2">Risk Score</p>
          <p className={`text-4xl font-bold ${getScoreColor(health.riskScore)}`}>
            {Math.round(health.riskScore)}
          </p>
          <p className={`text-sm mt-1 ${getScoreColor(health.riskScore)}`}>
            {getScoreLabel(health.riskScore)}
          </p>
        </div>
      </div>

      {/* Warnings */}
      {health.warnings.length > 0 && (
        <div className="card bg-yellow-900/20 border-yellow-800">
          <h3 className="text-lg font-semibold text-yellow-400 mb-3">⚠️ Warnings</h3>
          <ul className="space-y-2">
            {health.warnings.map((warning, idx) => (
              <li key={idx} className="flex items-start gap-2 text-yellow-300">
                <span>•</span>
                <span>{warning}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Recommendations */}
      {health.recommendations.length > 0 && (
        <div className="card">
          <h3 className="text-lg font-semibold text-white mb-4">Corrective Actions</h3>
          <div className="space-y-4">
            {health.recommendations.map((rec, idx) => (
              <div
                key={idx}
                className={`p-4 rounded-lg border ${
                  rec.priority === 'HIGH' ? 'bg-red-900/20 border-red-800' :
                  rec.priority === 'MEDIUM' ? 'bg-yellow-900/20 border-yellow-800' :
                  'bg-slate-700/50 border-slate-600'
                }`}
              >
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`text-xs font-medium px-2 py-0.5 rounded ${
                        rec.priority === 'HIGH' ? 'bg-red-600 text-white' :
                        rec.priority === 'MEDIUM' ? 'bg-yellow-600 text-white' :
                        'bg-slate-600 text-slate-300'
                      }`}>
                        {rec.priority}
                      </span>
                      <span className="text-xs text-slate-400">{rec.type}</span>
                    </div>
                    <p className="font-medium text-white">{rec.action}</p>
                    <p className="text-sm text-slate-400 mt-1">{rec.reason}</p>
                  </div>
                  {rec.taxImplication && (
                    <div className="text-right text-sm">
                      <p className="text-slate-400">{rec.taxImplication.type}</p>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {health.recommendations.length === 0 && health.warnings.length === 0 && (
        <div className="card text-center py-8">
          <div className="text-4xl mb-4">✅</div>
          <p className="text-xl font-semibold text-green-400">Portfolio looks healthy!</p>
          <p className="text-slate-400 mt-2">No immediate actions required</p>
        </div>
      )}
    </div>
  );
}

function PerformanceView({ holdings }: { holdings: any[] }) {
  const sortedByPnL = [...holdings].sort((a, b) => b.pnlPercent - a.pnlPercent);
  const winners = sortedByPnL.filter(h => h.pnlPercent > 0);
  const losers = sortedByPnL.filter(h => h.pnlPercent < 0).reverse();

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Top Winners */}
      <div className="card">
        <h3 className="text-lg font-semibold text-green-400 mb-4">🏆 Top Winners</h3>
        {winners.length === 0 ? (
          <p className="text-slate-400 text-center py-4">No profitable holdings yet</p>
        ) : (
          <div className="space-y-3">
            {winners.slice(0, 5).map((h, idx) => (
              <div key={h.id} className="flex items-center justify-between p-3 bg-green-900/20 rounded-lg">
                <div className="flex items-center gap-3">
                  <span className="text-green-400 font-bold">{idx + 1}</span>
                  <div>
                    <p className="font-medium text-white">{h.symbol}</p>
                    <p className="text-xs text-slate-400">{h.market}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-green-400 font-medium">{formatPercent(h.pnlPercent)}</p>
                  <p className="text-xs text-slate-400">{formatCurrency(h.pnl)}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Top Losers */}
      <div className="card">
        <h3 className="text-lg font-semibold text-red-400 mb-4">📉 Top Losers</h3>
        {losers.length === 0 ? (
          <p className="text-slate-400 text-center py-4">No losing holdings</p>
        ) : (
          <div className="space-y-3">
            {losers.slice(0, 5).map((h, idx) => (
              <div key={h.id} className="flex items-center justify-between p-3 bg-red-900/20 rounded-lg">
                <div className="flex items-center gap-3">
                  <span className="text-red-400 font-bold">{idx + 1}</span>
                  <div>
                    <p className="font-medium text-white">{h.symbol}</p>
                    <p className="text-xs text-slate-400">{h.market}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-red-400 font-medium">{formatPercent(h.pnlPercent)}</p>
                  <p className="text-xs text-slate-400">{formatCurrency(h.pnl)}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Performance Distribution */}
      <div className="card lg:col-span-2">
        <h3 className="text-lg font-semibold text-white mb-4">P&L Distribution</h3>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={holdings.map(h => ({ name: h.symbol, pnl: h.pnlPercent }))}>
              <XAxis dataKey="name" tick={{ fill: '#94a3b8', fontSize: 10 }} />
              <YAxis tick={{ fill: '#94a3b8' }} />
              <Tooltip
                contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #475569', borderRadius: '8px' }}
                formatter={(value: number) => `${value.toFixed(2)}%`}
              />
              <Bar
                dataKey="pnl"
                fill="#22c55e"
                radius={[4, 4, 0, 0]}
              >
                {holdings.map((h, index) => (
                  <Cell key={`cell-${index}`} fill={h.pnlPercent >= 0 ? '#22c55e' : '#ef4444'} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
