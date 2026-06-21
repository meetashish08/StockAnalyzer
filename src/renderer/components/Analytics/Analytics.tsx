import React, { useEffect, useState } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Legend, LineChart, Line, Area, AreaChart, RadialBarChart, RadialBar } from 'recharts';
import { useStore } from '../../store/useStore';
import { formatCurrency, formatPercent } from '../../utils/format';
import type { PortfolioHealth } from '../../../shared/types';

const COLORS = ['#22c55e', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#ec4899', '#f97316', '#84cc16', '#14b8a6'];

export default function Analytics() {
  const { holdingsWithPrices, fetchHoldings } = useStore();
  const [allocation, setAllocation] = useState<any>(null);
  const [portfolioHealth, setPortfolioHealth] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'overview' | 'allocation' | 'health' | 'performance'>('overview');

  useEffect(() => {
    async function loadData() {
      setIsLoading(true);
      try {
        await fetchHoldings();
        const [allocationData, healthData] = await Promise.all([
          fetch('/api/portfolio/allocation').then(r => r.json()),
          fetch('/api/portfolio/health').then(r => r.json()),
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
        <p className="text-slate-400">Analyzing your portfolio...</p>
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
      <div className="flex gap-2 border-b border-slate-700 pb-2 overflow-x-auto">
        {[
          { id: 'overview', label: 'Overview', icon: '📊' },
          { id: 'allocation', label: 'Allocation', icon: '🥧' },
          { id: 'health', label: 'Health Check', icon: '🏥' },
          { id: 'performance', label: 'Performance', icon: '📈' },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`px-4 py-2 rounded-t-lg font-medium transition-colors whitespace-nowrap ${
              activeTab === tab.id
                ? 'bg-slate-700 text-white'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            {tab.icon} {tab.label}
          </button>
        ))}
      </div>

      {/* Content */}
      {activeTab === 'overview' && portfolioHealth && (
        <OverviewTab health={portfolioHealth} allocation={allocation} />
      )}

      {activeTab === 'allocation' && allocation && (
        <AllocationView allocation={allocation} />
      )}

      {activeTab === 'health' && portfolioHealth && (
        <HealthCheckView health={portfolioHealth} />
      )}

      {activeTab === 'performance' && portfolioHealth && (
        <PerformanceView health={portfolioHealth} />
      )}
    </div>
  );
}

function OverviewTab({ health, allocation }: { health: any; allocation: any }) {
  const metrics = health.metrics || {};

  const scoreData = [
    { name: 'Overall', value: health.overallScore, fill: getScoreColorHex(health.overallScore) },
    { name: 'Diversification', value: health.diversificationScore, fill: getScoreColorHex(health.diversificationScore) },
    { name: 'Risk', value: health.riskScore, fill: getScoreColorHex(health.riskScore) },
  ];

  return (
    <div className="space-y-6">
      {/* Key Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <MetricCard
          title="Portfolio Value"
          value={formatCurrency(metrics.totalValue || 0)}
          subtitle={`Invested: ${formatCurrency(metrics.totalInvested || 0)}`}
          icon="💰"
        />
        <MetricCard
          title="Total P&L"
          value={formatCurrency(metrics.totalPnL || 0)}
          subtitle={formatPercent(metrics.totalPnLPercent || 0)}
          icon={metrics.totalPnL >= 0 ? '📈' : '📉'}
          valueColor={metrics.totalPnL >= 0 ? 'text-green-400' : 'text-red-400'}
        />
        <MetricCard
          title="Holdings"
          value={metrics.numHoldings || 0}
          subtitle={`${metrics.numWinners || 0} winners, ${metrics.numLosers || 0} losers`}
          icon="📋"
        />
        <MetricCard
          title="Avg Position"
          value={formatCurrency(metrics.avgHoldingSize || 0)}
          subtitle={`Max weight: ${(metrics.maxWeight || 0).toFixed(1)}%`}
          icon="⚖️"
        />
      </div>

      {/* Score Gauges */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {scoreData.map((score) => (
          <div key={score.name} className="card text-center">
            <p className="text-slate-400 text-sm mb-2">{score.name} Score</p>
            <div className="relative w-32 h-32 mx-auto">
              <svg className="w-full h-full transform -rotate-90">
                <circle
                  cx="64"
                  cy="64"
                  r="56"
                  fill="none"
                  stroke="#334155"
                  strokeWidth="12"
                />
                <circle
                  cx="64"
                  cy="64"
                  r="56"
                  fill="none"
                  stroke={score.fill}
                  strokeWidth="12"
                  strokeLinecap="round"
                  strokeDasharray={`${(score.value / 100) * 352} 352`}
                />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-3xl font-bold text-white">{score.value}</span>
              </div>
            </div>
            <p className={`text-sm mt-2 ${getScoreColor(score.value)}`}>
              {getScoreLabel(score.value)}
            </p>
          </div>
        ))}
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Best Performer */}
        {metrics.biggestWinner && metrics.biggestWinner.symbol && (
          <div className="card bg-green-900/20 border border-green-800">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-green-400 text-sm mb-1">Best Performer</p>
                <p className="text-xl font-bold text-white">{metrics.biggestWinner.symbol}</p>
              </div>
              <div className="text-right">
                <p className="text-2xl font-bold text-green-400">
                  +{(metrics.biggestWinner.pnlPercent || 0).toFixed(1)}%
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Worst Performer */}
        {metrics.biggestLoser && metrics.biggestLoser.symbol && (
          <div className="card bg-red-900/20 border border-red-800">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-red-400 text-sm mb-1">Worst Performer</p>
                <p className="text-xl font-bold text-white">{metrics.biggestLoser.symbol}</p>
              </div>
              <div className="text-right">
                <p className="text-2xl font-bold text-red-400">
                  {(metrics.biggestLoser.pnlPercent || 0).toFixed(1)}%
                </p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Warnings Summary */}
      {health.warnings && health.warnings.length > 0 && (
        <div className="card bg-yellow-900/20 border border-yellow-800">
          <h3 className="text-lg font-semibold text-yellow-400 mb-3">⚠️ Attention Required ({health.warnings.length})</h3>
          <ul className="space-y-2">
            {health.warnings.slice(0, 3).map((warning: string, idx: number) => (
              <li key={idx} className="flex items-start gap-2 text-yellow-300">
                <span>•</span>
                <span>{warning}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

function MetricCard({ title, value, subtitle, icon, valueColor = 'text-white' }: {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: string;
  valueColor?: string;
}) {
  return (
    <div className="card">
      <div className="flex items-start justify-between mb-2">
        <p className="text-slate-400 text-sm">{title}</p>
        <span className="text-xl">{icon}</span>
      </div>
      <p className={`text-2xl font-bold ${valueColor}`}>{value}</p>
      {subtitle && <p className="text-slate-400 text-sm mt-1">{subtitle}</p>}
    </div>
  );
}

function AllocationView({ allocation }: { allocation: any }) {
  const topHoldings = (allocation.byHolding || []).slice(0, 10);
  const otherHoldings = (allocation.byHolding || []).slice(10);
  const otherValue = otherHoldings.reduce((sum: number, h: any) => sum + h.value, 0);
  const otherPercent = otherHoldings.reduce((sum: number, h: any) => sum + h.percentage, 0);

  const pieData = otherHoldings.length > 0
    ? [...topHoldings, { name: `Others (${otherHoldings.length})`, value: otherValue, percentage: otherPercent }]
    : topHoldings;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* By Holding - Pie Chart */}
      <div className="card">
        <h3 className="text-lg font-semibold text-white mb-4">Portfolio Composition</h3>
        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={pieData}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={100}
                dataKey="value"
                nameKey="name"
                label={({ name, percentage }) => `${name} (${percentage.toFixed(1)}%)`}
                labelLine={false}
              >
                {pieData.map((_: any, index: number) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #475569', borderRadius: '8px' }}
                formatter={(value: number) => formatCurrency(value)}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Holdings Table */}
      <div className="card">
        <h3 className="text-lg font-semibold text-white mb-4">Top Holdings by Value</h3>
        <div className="space-y-2 max-h-80 overflow-y-auto">
          {(allocation.byHolding || []).slice(0, 15).map((holding: any, idx: number) => (
            <div key={idx} className="flex items-center gap-3">
              <div
                className="w-3 h-3 rounded-full flex-shrink-0"
                style={{ backgroundColor: COLORS[idx % COLORS.length] }}
              />
              <div className="flex-1 min-w-0">
                <div className="flex justify-between items-center">
                  <span className="text-white font-medium truncate">{holding.name}</span>
                  <span className="text-slate-400 text-sm ml-2">{holding.percentage.toFixed(1)}%</span>
                </div>
                <div className="w-full bg-slate-700 rounded-full h-2 mt-1">
                  <div
                    className="h-2 rounded-full"
                    style={{
                      width: `${Math.min(holding.percentage, 100)}%`,
                      backgroundColor: COLORS[idx % COLORS.length],
                    }}
                  />
                </div>
              </div>
              <span className="text-white text-sm font-medium w-24 text-right">
                {formatCurrency(holding.value)}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* By Market */}
      <div className="card">
        <h3 className="text-lg font-semibold text-white mb-4">By Market</h3>
        {(allocation.byMarket || []).length === 0 ? (
          <p className="text-slate-400 text-center py-4">No market data available</p>
        ) : (
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={allocation.byMarket}
                  cx="50%"
                  cy="50%"
                  outerRadius={80}
                  dataKey="value"
                  nameKey="name"
                  label={({ name, percentage }) => `${name}: ${percentage.toFixed(1)}%`}
                >
                  {(allocation.byMarket || []).map((_: any, index: number) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #475569', borderRadius: '8px' }}
                  formatter={(value: number) => formatCurrency(value)}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      {/* By Type */}
      <div className="card">
        <h3 className="text-lg font-semibold text-white mb-4">By Asset Type</h3>
        {(allocation.byType || []).length === 0 ? (
          <p className="text-slate-400 text-center py-4">No type data available</p>
        ) : (
          <div className="space-y-4">
            {(allocation.byType || []).map((type: any, idx: number) => (
              <div key={idx}>
                <div className="flex justify-between mb-1">
                  <span className="text-slate-300">{type.name}</span>
                  <span className="text-white font-medium">{type.percentage.toFixed(1)}%</span>
                </div>
                <div className="w-full bg-slate-700 rounded-full h-3">
                  <div
                    className="h-3 rounded-full transition-all"
                    style={{
                      width: `${type.percentage}%`,
                      backgroundColor: COLORS[idx % COLORS.length],
                    }}
                  />
                </div>
                <p className="text-slate-400 text-sm mt-1">{formatCurrency(type.value)}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function HealthCheckView({ health }: { health: any }) {
  return (
    <div className="space-y-6">
      {/* Scores */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <ScoreCard
          title="Overall Score"
          score={health.overallScore}
          description="Combined portfolio health rating"
        />
        <ScoreCard
          title="Diversification"
          score={health.diversificationScore}
          description="How well spread your investments are"
        />
        <ScoreCard
          title="Risk Score"
          score={health.riskScore}
          description="Lower risk = higher score"
        />
      </div>

      {/* Metrics Details */}
      {health.metrics && (
        <div className="card">
          <h3 className="text-lg font-semibold text-white mb-4">Portfolio Metrics</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center p-3 bg-slate-700/50 rounded-lg">
              <p className="text-2xl font-bold text-white">{health.metrics.numHoldings}</p>
              <p className="text-slate-400 text-sm">Total Holdings</p>
            </div>
            <div className="text-center p-3 bg-slate-700/50 rounded-lg">
              <p className="text-2xl font-bold text-green-400">{health.metrics.numWinners}</p>
              <p className="text-slate-400 text-sm">Profitable</p>
            </div>
            <div className="text-center p-3 bg-slate-700/50 rounded-lg">
              <p className="text-2xl font-bold text-red-400">{health.metrics.numLosers}</p>
              <p className="text-slate-400 text-sm">In Loss</p>
            </div>
            <div className="text-center p-3 bg-slate-700/50 rounded-lg">
              <p className="text-2xl font-bold text-white">{(health.metrics.top5Weight || 0).toFixed(1)}%</p>
              <p className="text-slate-400 text-sm">Top 5 Concentration</p>
            </div>
          </div>
        </div>
      )}

      {/* Warnings */}
      {health.warnings && health.warnings.length > 0 && (
        <div className="card bg-yellow-900/20 border-yellow-800">
          <h3 className="text-lg font-semibold text-yellow-400 mb-3">⚠️ Warnings ({health.warnings.length})</h3>
          <ul className="space-y-2">
            {health.warnings.map((warning: string, idx: number) => (
              <li key={idx} className="flex items-start gap-2 text-yellow-300">
                <span className="text-yellow-500">•</span>
                <span>{warning}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Recommendations */}
      {health.recommendations && health.recommendations.length > 0 && (
        <div className="card">
          <h3 className="text-lg font-semibold text-white mb-4">📋 Recommended Actions ({health.recommendations.length})</h3>
          <div className="space-y-4">
            {health.recommendations.map((rec: any, idx: number) => (
              <div
                key={idx}
                className={`p-4 rounded-lg border ${
                  rec.priority === 'HIGH' ? 'bg-red-900/20 border-red-800' :
                  rec.priority === 'MEDIUM' ? 'bg-yellow-900/20 border-yellow-800' :
                  'bg-slate-700/50 border-slate-600'
                }`}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`text-xs font-medium px-2 py-0.5 rounded ${
                        rec.priority === 'HIGH' ? 'bg-red-600 text-white' :
                        rec.priority === 'MEDIUM' ? 'bg-yellow-600 text-white' :
                        'bg-slate-600 text-slate-300'
                      }`}>
                        {rec.priority}
                      </span>
                      <span className="text-xs text-slate-400 uppercase">{rec.type}</span>
                    </div>
                    <p className="font-medium text-white">{rec.action}</p>
                    <p className="text-sm text-slate-400 mt-1">{rec.reason}</p>
                  </div>
                  {rec.taxImplication && (
                    <div className="text-right text-sm bg-slate-800 px-3 py-2 rounded">
                      <p className="text-slate-400">{rec.taxImplication.type}</p>
                      <p className="text-white font-medium">{formatCurrency(rec.taxImplication.amount)}</p>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {(!health.recommendations || health.recommendations.length === 0) &&
       (!health.warnings || health.warnings.length === 0) && (
        <div className="card text-center py-8">
          <div className="text-4xl mb-4">✅</div>
          <p className="text-xl font-semibold text-green-400">Portfolio looks healthy!</p>
          <p className="text-slate-400 mt-2">No immediate actions required</p>
        </div>
      )}
    </div>
  );
}

function ScoreCard({ title, score, description }: { title: string; score: number; description: string }) {
  return (
    <div className="card text-center">
      <p className="text-slate-400 text-sm mb-2">{title}</p>
      <div className="relative w-24 h-24 mx-auto mb-2">
        <svg className="w-full h-full transform -rotate-90">
          <circle cx="48" cy="48" r="40" fill="none" stroke="#334155" strokeWidth="8" />
          <circle
            cx="48"
            cy="48"
            r="40"
            fill="none"
            stroke={getScoreColorHex(score)}
            strokeWidth="8"
            strokeLinecap="round"
            strokeDasharray={`${(score / 100) * 251} 251`}
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className={`text-2xl font-bold ${getScoreColor(score)}`}>{Math.round(score)}</span>
        </div>
      </div>
      <p className={`text-sm font-medium ${getScoreColor(score)}`}>{getScoreLabel(score)}</p>
      <p className="text-xs text-slate-500 mt-1">{description}</p>
    </div>
  );
}

function PerformanceView({ health }: { health: any }) {
  const holdings = health.holdings || [];
  const sortedByPnL = [...holdings].sort((a: any, b: any) => b.pnlPercent - a.pnlPercent);
  const winners = sortedByPnL.filter((h: any) => h.pnlPercent > 0);
  const losers = sortedByPnL.filter((h: any) => h.pnlPercent < 0).reverse();

  const chartData = holdings
    .sort((a: any, b: any) => b.currentValue - a.currentValue)
    .slice(0, 20)
    .map((h: any) => ({
      name: h.symbol,
      pnl: h.pnlPercent,
      value: h.currentValue,
    }));

  return (
    <div className="space-y-6">
      {/* P&L Distribution Chart */}
      <div className="card">
        <h3 className="text-lg font-semibold text-white mb-4">P&L Distribution (Top 20 by Value)</h3>
        {chartData.length === 0 ? (
          <p className="text-slate-400 text-center py-8">No holdings data available</p>
        ) : (
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} layout="vertical" margin={{ left: 80 }}>
                <XAxis
                  type="number"
                  tick={{ fill: '#94a3b8' }}
                  tickFormatter={(v) => `${v}%`}
                />
                <YAxis
                  dataKey="name"
                  type="category"
                  tick={{ fill: '#94a3b8', fontSize: 11 }}
                  width={75}
                />
                <Tooltip
                  contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #475569', borderRadius: '8px' }}
                  formatter={(value: number) => [`${value.toFixed(2)}%`, 'P&L']}
                />
                <Bar dataKey="pnl" radius={[0, 4, 4, 0]}>
                  {chartData.map((entry: any, index: number) => (
                    <Cell key={`cell-${index}`} fill={entry.pnl >= 0 ? '#22c55e' : '#ef4444'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Winners */}
        <div className="card">
          <h3 className="text-lg font-semibold text-green-400 mb-4">🏆 Top Winners ({winners.length})</h3>
          {winners.length === 0 ? (
            <p className="text-slate-400 text-center py-4">No profitable holdings yet</p>
          ) : (
            <div className="space-y-3 max-h-80 overflow-y-auto">
              {winners.slice(0, 10).map((h: any, idx: number) => (
                <div key={idx} className="flex items-center justify-between p-3 bg-green-900/20 rounded-lg">
                  <div className="flex items-center gap-3">
                    <span className="text-green-400 font-bold w-6">{idx + 1}</span>
                    <div>
                      <p className="font-medium text-white">{h.symbol}</p>
                      <p className="text-xs text-slate-400">{formatCurrency(h.currentValue)}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-green-400 font-medium">+{h.pnlPercent.toFixed(2)}%</p>
                    <p className="text-xs text-green-400/70">{formatCurrency(h.pnl)}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Top Losers */}
        <div className="card">
          <h3 className="text-lg font-semibold text-red-400 mb-4">📉 Top Losers ({losers.length})</h3>
          {losers.length === 0 ? (
            <p className="text-slate-400 text-center py-4">No losing holdings</p>
          ) : (
            <div className="space-y-3 max-h-80 overflow-y-auto">
              {losers.slice(0, 10).map((h: any, idx: number) => (
                <div key={idx} className="flex items-center justify-between p-3 bg-red-900/20 rounded-lg">
                  <div className="flex items-center gap-3">
                    <span className="text-red-400 font-bold w-6">{idx + 1}</span>
                    <div>
                      <p className="font-medium text-white">{h.symbol}</p>
                      <p className="text-xs text-slate-400">{formatCurrency(h.currentValue)}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-red-400 font-medium">{h.pnlPercent.toFixed(2)}%</p>
                    <p className="text-xs text-red-400/70">{formatCurrency(h.pnl)}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Holdings by Weight */}
      <div className="card">
        <h3 className="text-lg font-semibold text-white mb-4">Holdings by Portfolio Weight</h3>
        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={holdings.sort((a: any, b: any) => b.weight - a.weight).slice(0, 15)}
              layout="vertical"
              margin={{ left: 80 }}
            >
              <XAxis
                type="number"
                tick={{ fill: '#94a3b8' }}
                tickFormatter={(v) => `${v}%`}
              />
              <YAxis
                dataKey="symbol"
                type="category"
                tick={{ fill: '#94a3b8', fontSize: 11 }}
                width={75}
              />
              <Tooltip
                contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #475569', borderRadius: '8px' }}
                formatter={(value: number, name: string) => [
                  name === 'weight' ? `${value.toFixed(2)}%` : formatCurrency(value),
                  name === 'weight' ? 'Weight' : 'Value'
                ]}
              />
              <Bar dataKey="weight" fill="#3b82f6" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}

function getScoreColor(score: number) {
  if (score >= 70) return 'text-green-400';
  if (score >= 50) return 'text-yellow-400';
  return 'text-red-400';
}

function getScoreColorHex(score: number) {
  if (score >= 70) return '#22c55e';
  if (score >= 50) return '#f59e0b';
  return '#ef4444';
}

function getScoreLabel(score: number) {
  if (score >= 80) return 'Excellent';
  if (score >= 60) return 'Good';
  if (score >= 40) return 'Fair';
  return 'Needs Attention';
}
