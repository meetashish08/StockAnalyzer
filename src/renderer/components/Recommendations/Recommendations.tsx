import React, { useEffect, useState } from 'react';
import { useStore } from '../../store/useStore';
import { formatCurrency, formatNumber, getSignalBadgeClass } from '../../utils/format';
import type { StockScore, Market } from '../../../shared/types';

export default function Recommendations() {
  const { topPicks, isLoadingPicks, fetchTopPicks } = useStore();
  const [selectedMarket, setSelectedMarket] = useState<Market>('NSE');
  const [selectedStock, setSelectedStock] = useState<StockScore | null>(null);

  useEffect(() => {
    fetchTopPicks(selectedMarket, 10);
  }, [selectedMarket]);

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Stock Recommendations</h1>
          <p className="text-slate-400">AI-powered stock analysis and recommendations</p>
        </div>

        {/* Market Toggle */}
        <div className="flex bg-slate-700 rounded-lg p-1">
          {(['NSE', 'NYSE'] as Market[]).map((market) => (
            <button
              key={market}
              onClick={() => setSelectedMarket(market)}
              className={`px-4 py-2 rounded-md font-medium transition-colors ${
                selectedMarket === market
                  ? 'bg-green-600 text-white'
                  : 'text-slate-300 hover:text-white'
              }`}
            >
              {market === 'NSE' ? '🇮🇳 India' : '🇺🇸 US'}
            </button>
          ))}
        </div>
      </div>

      {/* Loading State */}
      {isLoadingPicks ? (
        <div className="card text-center py-12">
          <div className="animate-spin text-4xl mb-4">⏳</div>
          <p className="text-slate-400">Analyzing stocks...</p>
          <p className="text-slate-500 text-sm mt-2">This may take a minute</p>
        </div>
      ) : topPicks.length === 0 ? (
        <div className="card text-center py-12">
          <div className="text-6xl mb-4">📊</div>
          <h3 className="text-xl font-semibold text-white mb-2">No Recommendations Available</h3>
          <p className="text-slate-400">Unable to fetch market data. Try again later.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Stock List */}
          <div className="lg:col-span-2">
            <div className="card p-0 overflow-hidden">
              <table className="w-full">
                <thead>
                  <tr className="bg-slate-700/50 text-left">
                    <th className="p-4 text-slate-300 font-medium">Rank</th>
                    <th className="p-4 text-slate-300 font-medium">Stock</th>
                    <th className="p-4 text-slate-300 font-medium text-center">Signal</th>
                    <th className="p-4 text-slate-300 font-medium text-right">Score</th>
                    <th className="p-4 text-slate-300 font-medium text-right">Confidence</th>
                  </tr>
                </thead>
                <tbody>
                  {topPicks.map((stock, index) => (
                    <tr
                      key={stock.symbol}
                      onClick={() => setSelectedStock(stock)}
                      className={`border-t border-slate-700 cursor-pointer transition-colors ${
                        selectedStock?.symbol === stock.symbol
                          ? 'bg-slate-700'
                          : 'hover:bg-slate-700/50'
                      }`}
                    >
                      <td className="p-4">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm ${
                          index < 3 ? 'bg-yellow-600 text-white' : 'bg-slate-600 text-slate-300'
                        }`}>
                          {index + 1}
                        </div>
                      </td>
                      <td className="p-4">
                        <p className="font-medium text-white">{stock.symbol}</p>
                        <p className="text-xs text-slate-400 truncate max-w-[200px]">{stock.name}</p>
                      </td>
                      <td className="p-4 text-center">
                        <span className={`${getSignalBadgeClass(stock.signal)}`}>
                          {stock.signal.replace('_', ' ')}
                        </span>
                      </td>
                      <td className="p-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <div className="w-20 h-2 bg-slate-600 rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full ${
                                stock.overallScore >= 70 ? 'bg-green-500' :
                                stock.overallScore >= 50 ? 'bg-yellow-500' : 'bg-red-500'
                              }`}
                              style={{ width: `${stock.overallScore}%` }}
                            />
                          </div>
                          <span className="text-white font-medium w-8">{Math.round(stock.overallScore)}</span>
                        </div>
                      </td>
                      <td className="p-4 text-right text-slate-300">
                        {stock.confidence}%
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
                    <p className="text-slate-400 text-sm">{selectedStock.market}</p>
                  </div>
                  <span className={`text-lg ${getSignalBadgeClass(selectedStock.signal)}`}>
                    {selectedStock.signal.replace('_', ' ')}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <ScoreCard label="Technical" score={selectedStock.technicalScore} />
                  <ScoreCard label="Fundamental" score={selectedStock.fundamentalScore} />
                  <ScoreCard label="Momentum" score={selectedStock.momentumScore} />
                  <ScoreCard label="Value" score={selectedStock.valueScore} />
                </div>

                <div className="pt-2 border-t border-slate-700">
                  <p className="text-sm font-medium text-slate-300 mb-2">Analysis</p>
                  <ul className="space-y-2">
                    {selectedStock.rationale.map((reason, idx) => (
                      <li key={idx} className="flex items-start gap-2 text-sm text-slate-400">
                        <span className="text-green-500 mt-1">•</span>
                        {reason}
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="pt-2">
                  <p className="text-xs text-slate-500">
                    Last updated: {new Date(selectedStock.lastUpdated).toLocaleString()}
                  </p>
                </div>
              </div>
            ) : (
              <div className="card text-center py-12">
                <div className="text-4xl mb-4">👆</div>
                <p className="text-slate-400">Select a stock to view details</p>
              </div>
            )}

            {/* Disclaimer */}
            <div className="card mt-4 bg-yellow-900/20 border-yellow-800">
              <p className="text-xs text-yellow-400">
                <strong>Disclaimer:</strong> These recommendations are generated algorithmically
                and should not be considered financial advice. Always do your own research
                before making investment decisions.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function ScoreCard({ label, score }: { label: string; score: number }) {
  const getScoreColor = (score: number) => {
    if (score >= 70) return 'text-green-400';
    if (score >= 50) return 'text-yellow-400';
    return 'text-red-400';
  };

  return (
    <div className="p-3 bg-slate-700/50 rounded-lg">
      <p className="text-xs text-slate-400 mb-1">{label}</p>
      <p className={`text-xl font-bold ${getScoreColor(score)}`}>
        {Math.round(score)}
      </p>
    </div>
  );
}
