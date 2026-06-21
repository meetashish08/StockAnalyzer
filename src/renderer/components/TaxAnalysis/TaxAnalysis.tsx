import React, { useState, useEffect, useCallback } from 'react';

interface Transaction {
  symbol: string;
  name: string;
  buyDate: string | null;
  sellDate: string | null;
  quantity: number;
  buyPrice: number;
  sellPrice: number;
  buyValue: number;
  sellValue: number;
  gain: number | null;
  classification: {
    holdingDays: number;
    holdingMonths: number;
    isLongTerm: boolean;
    type: 'STCG' | 'LTCG';
  } | null;
  sheet: string;
}

interface Insight {
  type: 'tax_saving' | 'warning' | 'info' | 'itr_guidance';
  title: string;
  description: string;
  impact: string;
}

interface AnalysisSummary {
  totalTransactions: number;
  stcgCount: number;
  ltcgCount: number;
  unclassifiedCount: number;
  totalGain: number;
  totalSTCG: number;
  totalLTCG: number;
  stcgProfit: number;
  stcgLoss: number;
  ltcgProfit: number;
  ltcgLoss: number;
  taxableSTCG: number;
  taxableLTCG: number;
  estimatedSTCGTax: number;
  estimatedLTCGTax: number;
  totalEstimatedTax: number;
  ltcgExemption: number;
}

interface Analysis {
  id: number;
  fileName: string;
  uploadedAt: string;
  fiscalYear: string;
  summary: AnalysisSummary;
  transactions: Transaction[];
  sheets: { name: string; rowCount: number; columns: string[] }[];
  insights: Insight[];
  topGainers: Transaction[];
  topLosers: Transaction[];
}

type TabType = 'upload' | 'summary' | 'transactions' | 'insights' | 'itr';

export default function TaxAnalysis() {
  const [analyses, setAnalyses] = useState<Analysis[]>([]);
  const [currentAnalysis, setCurrentAnalysis] = useState<Analysis | null>(null);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<TabType>('upload');
  const [dragActive, setDragActive] = useState(false);
  const [itrReport, setItrReport] = useState<any>(null);

  const fetchAnalyses = useCallback(async () => {
    try {
      const res = await fetch('/api/tax/analyses');
      const data = await res.json();
      setAnalyses(data);
    } catch (err) {
      console.error('Failed to fetch analyses:', err);
    }
  }, []);

  useEffect(() => {
    fetchAnalyses();
  }, [fetchAnalyses]);

  const handleFileUpload = async (file: File) => {
    if (!file) return;

    const validExtensions = ['.xlsx', '.xls', '.csv'];
    const ext = file.name.toLowerCase().slice(file.name.lastIndexOf('.'));
    if (!validExtensions.includes(ext)) {
      setError('Please upload an Excel file (.xlsx, .xls) or CSV file');
      return;
    }

    setUploading(true);
    setError(null);

    const formData = new FormData();
    formData.append('file', file);

    try {
      const res = await fetch('/api/tax/analyze', {
        method: 'POST',
        body: formData,
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || 'Upload failed');
      }

      const analysis = await res.json();
      setCurrentAnalysis(analysis);
      setActiveTab('summary');
      fetchAnalyses();
    } catch (err: any) {
      setError(err.message || 'Failed to analyze file');
    } finally {
      setUploading(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileUpload(e.dataTransfer.files[0]);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(true);
  };

  const handleDragLeave = () => {
    setDragActive(false);
  };

  const loadAnalysis = async (id: number) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/tax/analyses/${id}`);
      const data = await res.json();
      setCurrentAnalysis(data);
      setActiveTab('summary');
    } catch (err) {
      setError('Failed to load analysis');
    } finally {
      setLoading(false);
    }
  };

  const deleteAnalysis = async (id: number) => {
    if (!confirm('Delete this analysis?')) return;
    try {
      await fetch(`/api/tax/analyses/${id}`, { method: 'DELETE' });
      fetchAnalyses();
      if (currentAnalysis?.id === id) {
        setCurrentAnalysis(null);
        setActiveTab('upload');
      }
    } catch (err) {
      setError('Failed to delete analysis');
    }
  };

  const loadITRReport = async () => {
    if (!currentAnalysis) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/tax/itr-report/${currentAnalysis.id}`);
      const data = await res.json();
      setItrReport(data);
      setActiveTab('itr');
    } catch (err) {
      setError('Failed to generate ITR report');
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    const absAmount = Math.abs(amount);
    const sign = amount < 0 ? '-' : '';
    return sign + '₹' + absAmount.toLocaleString('en-IN', { maximumFractionDigits: 0 });
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  };

  const getInsightIcon = (type: string) => {
    switch (type) {
      case 'tax_saving': return '💰';
      case 'warning': return '⚠️';
      case 'itr_guidance': return '📋';
      default: return 'ℹ️';
    }
  };

  const getInsightColor = (type: string) => {
    switch (type) {
      case 'tax_saving': return 'bg-green-900/50 border-green-500';
      case 'warning': return 'bg-yellow-900/50 border-yellow-500';
      case 'itr_guidance': return 'bg-blue-900/50 border-blue-500';
      default: return 'bg-slate-700/50 border-slate-500';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Tax Analysis</h1>
          <p className="text-slate-400 mt-1">Upload financial data to calculate capital gains for ITR filing</p>
        </div>
        {currentAnalysis && (
          <div className="text-right">
            <p className="text-sm text-slate-400">Analyzing: {currentAnalysis.fileName}</p>
            <p className="text-sm text-green-400">FY {currentAnalysis.fiscalYear}</p>
          </div>
        )}
      </div>

      {/* Error Display */}
      {error && (
        <div className="bg-red-900/50 border border-red-500 rounded-lg p-4 flex items-center justify-between">
          <span className="text-red-200">{error}</span>
          <button onClick={() => setError(null)} className="text-red-300 hover:text-white">✕</button>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-2 border-b border-slate-700 pb-2">
        {[
          { id: 'upload', label: 'Upload', icon: '📤' },
          { id: 'summary', label: 'Summary', icon: '📊', disabled: !currentAnalysis },
          { id: 'transactions', label: 'Transactions', icon: '📑', disabled: !currentAnalysis },
          { id: 'insights', label: 'Tax Insights', icon: '💡', disabled: !currentAnalysis },
          { id: 'itr', label: 'ITR Report', icon: '📋', disabled: !currentAnalysis },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => {
              if (tab.id === 'itr' && currentAnalysis && !itrReport) {
                loadITRReport();
              } else {
                setActiveTab(tab.id as TabType);
              }
            }}
            disabled={tab.disabled}
            className={`px-4 py-2 rounded-lg flex items-center gap-2 transition-colors ${
              activeTab === tab.id
                ? 'bg-green-600 text-white'
                : tab.disabled
                ? 'bg-slate-800 text-slate-500 cursor-not-allowed'
                : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
            }`}
          >
            <span>{tab.icon}</span>
            <span>{tab.label}</span>
          </button>
        ))}
      </div>

      {/* Upload Tab */}
      {activeTab === 'upload' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Upload Area */}
          <div
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            className={`border-2 border-dashed rounded-xl p-12 text-center transition-colors ${
              dragActive
                ? 'border-green-500 bg-green-900/20'
                : 'border-slate-600 hover:border-slate-500 bg-slate-800/50'
            }`}
          >
            {uploading ? (
              <div className="space-y-4">
                <div className="animate-spin text-4xl">⏳</div>
                <p className="text-slate-300">Analyzing your file...</p>
              </div>
            ) : (
              <>
                <div className="text-5xl mb-4">📊</div>
                <h3 className="text-xl font-semibold text-white mb-2">Upload Financial Data</h3>
                <p className="text-slate-400 mb-4">
                  Drag and drop your Excel file or click to browse
                </p>
                <input
                  type="file"
                  accept=".xlsx,.xls,.csv"
                  onChange={(e) => e.target.files?.[0] && handleFileUpload(e.target.files[0])}
                  className="hidden"
                  id="file-upload"
                />
                <label
                  htmlFor="file-upload"
                  className="inline-block bg-green-600 hover:bg-green-500 text-white px-6 py-3 rounded-lg cursor-pointer transition-colors"
                >
                  Select File
                </label>
                <p className="text-sm text-slate-500 mt-4">
                  Supported: .xlsx, .xls, .csv
                </p>
              </>
            )}
          </div>

          {/* Expected Format */}
          <div className="bg-slate-800 rounded-xl p-6 space-y-4">
            <h3 className="text-lg font-semibold text-white flex items-center gap-2">
              <span>📋</span> Expected Excel Format
            </h3>
            <p className="text-slate-400 text-sm">
              Your Excel should contain columns similar to:
            </p>
            <div className="bg-slate-900 rounded-lg p-4 overflow-x-auto">
              <table className="text-sm text-slate-300 w-full">
                <thead>
                  <tr className="text-slate-400 border-b border-slate-700">
                    <th className="text-left py-2 px-2">Symbol</th>
                    <th className="text-left py-2 px-2">Name</th>
                    <th className="text-left py-2 px-2">Buy Date</th>
                    <th className="text-left py-2 px-2">Sell Date</th>
                    <th className="text-right py-2 px-2">Qty</th>
                    <th className="text-right py-2 px-2">Buy Price</th>
                    <th className="text-right py-2 px-2">Sell Price</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-b border-slate-800">
                    <td className="py-2 px-2">RELIANCE</td>
                    <td className="py-2 px-2">Reliance Industries</td>
                    <td className="py-2 px-2">15-Jan-2023</td>
                    <td className="py-2 px-2">20-Mar-2024</td>
                    <td className="py-2 px-2 text-right">10</td>
                    <td className="py-2 px-2 text-right">2450</td>
                    <td className="py-2 px-2 text-right">2890</td>
                  </tr>
                </tbody>
              </table>
            </div>
            <div className="text-sm text-slate-400 space-y-2">
              <p><strong>Auto-detected columns:</strong></p>
              <ul className="list-disc list-inside space-y-1 text-slate-500">
                <li>Symbol / Script / Scrip / ISIN</li>
                <li>Buy Date / Purchase Date</li>
                <li>Sell Date / Sale Date</li>
                <li>Quantity / Qty / Units</li>
                <li>Buy Price / Purchase Price</li>
                <li>Sell Price / Sale Price</li>
                <li>Gain / Profit / P&L (optional)</li>
              </ul>
            </div>
          </div>

          {/* Previous Analyses */}
          {analyses.length > 0 && (
            <div className="lg:col-span-2 bg-slate-800 rounded-xl p-6">
              <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                <span>📁</span> Previous Analyses
              </h3>
              <div className="space-y-3">
                {analyses.map((a) => (
                  <div
                    key={a.id}
                    className="bg-slate-700 rounded-lg p-4 flex items-center justify-between hover:bg-slate-600 transition-colors"
                  >
                    <div className="flex items-center gap-4">
                      <span className="text-2xl">📄</span>
                      <div>
                        <p className="text-white font-medium">{a.fileName}</p>
                        <p className="text-sm text-slate-400">
                          FY {a.fiscalYear} • {a.summary.totalTransactions} transactions •{' '}
                          {new Date(a.uploadedAt).toLocaleDateString('en-IN')}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <p className={`font-semibold ${a.summary.totalGain >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                          {formatCurrency(a.summary.totalGain)}
                        </p>
                        <p className="text-sm text-slate-400">
                          Tax: {formatCurrency(a.summary.totalEstimatedTax)}
                        </p>
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => loadAnalysis(a.id)}
                          className="p-2 bg-green-600 hover:bg-green-500 rounded-lg text-white"
                          title="View"
                        >
                          👁️
                        </button>
                        <button
                          onClick={() => deleteAnalysis(a.id)}
                          className="p-2 bg-red-600 hover:bg-red-500 rounded-lg text-white"
                          title="Delete"
                        >
                          🗑️
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Summary Tab */}
      {activeTab === 'summary' && currentAnalysis && (
        <div className="space-y-6">
          {/* Key Metrics */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-slate-800 rounded-xl p-6">
              <p className="text-slate-400 text-sm">Total Transactions</p>
              <p className="text-3xl font-bold text-white mt-1">{currentAnalysis.summary.totalTransactions}</p>
            </div>
            <div className="bg-slate-800 rounded-xl p-6">
              <p className="text-slate-400 text-sm">Net Capital Gain/Loss</p>
              <p className={`text-3xl font-bold mt-1 ${currentAnalysis.summary.totalGain >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                {formatCurrency(currentAnalysis.summary.totalGain)}
              </p>
            </div>
            <div className="bg-slate-800 rounded-xl p-6">
              <p className="text-slate-400 text-sm">Estimated Tax</p>
              <p className="text-3xl font-bold text-yellow-400 mt-1">
                {formatCurrency(currentAnalysis.summary.totalEstimatedTax)}
              </p>
            </div>
            <div className="bg-slate-800 rounded-xl p-6">
              <p className="text-slate-400 text-sm">Fiscal Year</p>
              <p className="text-3xl font-bold text-blue-400 mt-1">{currentAnalysis.fiscalYear}</p>
            </div>
          </div>

          {/* STCG vs LTCG */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* STCG */}
            <div className="bg-slate-800 rounded-xl p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-white">Short Term Capital Gains (STCG)</h3>
                <span className="bg-orange-600/20 text-orange-400 px-3 py-1 rounded-full text-sm">
                  Tax @ 20%
                </span>
              </div>
              <div className="space-y-4">
                <div className="flex justify-between">
                  <span className="text-slate-400">Transactions</span>
                  <span className="text-white">{currentAnalysis.summary.stcgCount}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Profit</span>
                  <span className="text-green-400">{formatCurrency(currentAnalysis.summary.stcgProfit)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Loss</span>
                  <span className="text-red-400">{formatCurrency(currentAnalysis.summary.stcgLoss)}</span>
                </div>
                <hr className="border-slate-700" />
                <div className="flex justify-between font-semibold">
                  <span className="text-slate-300">Net STCG</span>
                  <span className={currentAnalysis.summary.totalSTCG >= 0 ? 'text-green-400' : 'text-red-400'}>
                    {formatCurrency(currentAnalysis.summary.totalSTCG)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Taxable Amount</span>
                  <span className="text-yellow-400">{formatCurrency(currentAnalysis.summary.taxableSTCG)}</span>
                </div>
                <div className="flex justify-between font-semibold bg-slate-700 -mx-6 px-6 py-3">
                  <span className="text-slate-300">Estimated Tax</span>
                  <span className="text-yellow-400">{formatCurrency(currentAnalysis.summary.estimatedSTCGTax)}</span>
                </div>
              </div>
            </div>

            {/* LTCG */}
            <div className="bg-slate-800 rounded-xl p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-white">Long Term Capital Gains (LTCG)</h3>
                <span className="bg-green-600/20 text-green-400 px-3 py-1 rounded-full text-sm">
                  Tax @ 12.5%
                </span>
              </div>
              <div className="space-y-4">
                <div className="flex justify-between">
                  <span className="text-slate-400">Transactions</span>
                  <span className="text-white">{currentAnalysis.summary.ltcgCount}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Profit</span>
                  <span className="text-green-400">{formatCurrency(currentAnalysis.summary.ltcgProfit)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Loss</span>
                  <span className="text-red-400">{formatCurrency(currentAnalysis.summary.ltcgLoss)}</span>
                </div>
                <hr className="border-slate-700" />
                <div className="flex justify-between font-semibold">
                  <span className="text-slate-300">Net LTCG</span>
                  <span className={currentAnalysis.summary.totalLTCG >= 0 ? 'text-green-400' : 'text-red-400'}>
                    {formatCurrency(currentAnalysis.summary.totalLTCG)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Exemption (₹1.25L)</span>
                  <span className="text-blue-400">-{formatCurrency(Math.min(currentAnalysis.summary.ltcgExemption, Math.max(0, currentAnalysis.summary.totalLTCG)))}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Taxable Amount</span>
                  <span className="text-yellow-400">{formatCurrency(currentAnalysis.summary.taxableLTCG)}</span>
                </div>
                <div className="flex justify-between font-semibold bg-slate-700 -mx-6 px-6 py-3">
                  <span className="text-slate-300">Estimated Tax</span>
                  <span className="text-yellow-400">{formatCurrency(currentAnalysis.summary.estimatedLTCGTax)}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Top Gainers & Losers */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Top Gainers */}
            <div className="bg-slate-800 rounded-xl p-6">
              <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                <span>📈</span> Top Gainers
              </h3>
              <div className="space-y-3">
                {currentAnalysis.topGainers.length > 0 ? (
                  currentAnalysis.topGainers.map((t, i) => (
                    <div key={i} className="flex items-center justify-between bg-slate-700/50 rounded-lg p-3">
                      <div>
                        <p className="text-white font-medium">{t.name || t.symbol}</p>
                        <p className="text-sm text-slate-400">
                          {t.classification?.type || 'N/A'} • {t.classification?.holdingMonths || 0} months
                        </p>
                      </div>
                      <span className="text-green-400 font-semibold">{formatCurrency(t.gain || 0)}</span>
                    </div>
                  ))
                ) : (
                  <p className="text-slate-400">No profitable transactions</p>
                )}
              </div>
            </div>

            {/* Top Losers */}
            <div className="bg-slate-800 rounded-xl p-6">
              <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                <span>📉</span> Top Losers
              </h3>
              <div className="space-y-3">
                {currentAnalysis.topLosers.length > 0 ? (
                  currentAnalysis.topLosers.map((t, i) => (
                    <div key={i} className="flex items-center justify-between bg-slate-700/50 rounded-lg p-3">
                      <div>
                        <p className="text-white font-medium">{t.name || t.symbol}</p>
                        <p className="text-sm text-slate-400">
                          {t.classification?.type || 'N/A'} • {t.classification?.holdingMonths || 0} months
                        </p>
                      </div>
                      <span className="text-red-400 font-semibold">{formatCurrency(t.gain || 0)}</span>
                    </div>
                  ))
                ) : (
                  <p className="text-slate-400">No loss-making transactions</p>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Transactions Tab */}
      {activeTab === 'transactions' && currentAnalysis && (
        <div className="bg-slate-800 rounded-xl overflow-hidden">
          <div className="max-h-[600px] overflow-auto">
            <table className="w-full">
              <thead className="bg-slate-900 sticky top-0 z-10">
                <tr className="text-left text-slate-400 text-sm">
                  <th className="px-4 py-3">Stock</th>
                  <th className="px-4 py-3">Buy Date</th>
                  <th className="px-4 py-3">Sell Date</th>
                  <th className="px-4 py-3 text-right">Qty</th>
                  <th className="px-4 py-3 text-right">Buy Value</th>
                  <th className="px-4 py-3 text-right">Sell Value</th>
                  <th className="px-4 py-3 text-right">Gain/Loss</th>
                  <th className="px-4 py-3 text-center">Type</th>
                  <th className="px-4 py-3 text-center">Holding</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-700">
                {currentAnalysis.transactions.map((t, i) => (
                  <tr key={i} className="hover:bg-slate-700/50">
                    <td className="px-4 py-3">
                      <p className="text-white font-medium">{t.symbol || '-'}</p>
                      <p className="text-sm text-slate-400">{t.name !== t.symbol ? t.name : ''}</p>
                    </td>
                    <td className="px-4 py-3 text-slate-300">{formatDate(t.buyDate)}</td>
                    <td className="px-4 py-3 text-slate-300">{formatDate(t.sellDate)}</td>
                    <td className="px-4 py-3 text-right text-slate-300">{t.quantity}</td>
                    <td className="px-4 py-3 text-right text-slate-300">{formatCurrency(t.buyValue)}</td>
                    <td className="px-4 py-3 text-right text-slate-300">{formatCurrency(t.sellValue)}</td>
                    <td className={`px-4 py-3 text-right font-semibold ${(t.gain || 0) >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                      {formatCurrency(t.gain || 0)}
                    </td>
                    <td className="px-4 py-3 text-center">
                      {t.classification ? (
                        <span className={`px-2 py-1 rounded text-xs font-medium ${
                          t.classification.type === 'LTCG'
                            ? 'bg-green-600/20 text-green-400'
                            : 'bg-orange-600/20 text-orange-400'
                        }`}>
                          {t.classification.type}
                        </span>
                      ) : (
                        <span className="text-slate-500">-</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-center text-slate-400">
                      {t.classification ? `${t.classification.holdingMonths}m` : '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Insights Tab */}
      {activeTab === 'insights' && currentAnalysis && (
        <div className="space-y-4">
          {currentAnalysis.insights.map((insight, i) => (
            <div
              key={i}
              className={`border-l-4 rounded-lg p-6 ${getInsightColor(insight.type)}`}
            >
              <div className="flex items-start gap-4">
                <span className="text-2xl">{getInsightIcon(insight.type)}</span>
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-white">{insight.title}</h3>
                  <p className="text-slate-300 mt-2">{insight.description}</p>
                  <p className="text-sm text-slate-400 mt-2 italic">{insight.impact}</p>
                </div>
              </div>
            </div>
          ))}

          {/* Tax Saving Tips */}
          <div className="bg-slate-800 rounded-xl p-6 mt-6">
            <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
              <span>💡</span> Tax Saving Tips
            </h3>
            <ul className="space-y-3 text-slate-300">
              <li className="flex items-start gap-3">
                <span className="text-green-400">•</span>
                <span>Hold equity investments for more than 12 months to qualify for LTCG (12.5% tax) instead of STCG (20% tax).</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="text-green-400">•</span>
                <span>LTCG up to ₹1,25,000 per year is exempt from tax. Plan your exits accordingly.</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="text-green-400">•</span>
                <span>Harvest losses strategically to offset gains. STCG losses can offset both STCG and LTCG.</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="text-green-400">•</span>
                <span>Capital losses can be carried forward for 8 years to set off against future gains.</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="text-green-400">•</span>
                <span>Keep all contract notes and transaction statements for ITR documentation.</span>
              </li>
            </ul>
          </div>
        </div>
      )}

      {/* ITR Report Tab */}
      {activeTab === 'itr' && itrReport && (
        <div className="space-y-6">
          <div className="bg-blue-900/30 border border-blue-500 rounded-xl p-6">
            <h3 className="text-lg font-semibold text-white flex items-center gap-2">
              <span>📋</span> ITR Schedule CG - Capital Gains
            </h3>
            <p className="text-slate-400 mt-2">
              Use this data to fill Schedule CG in your {itrReport.formRequired} for FY {itrReport.fiscalYear}
            </p>
          </div>

          {/* STCG Section 111A */}
          <div className="bg-slate-800 rounded-xl p-6">
            <h4 className="text-white font-semibold mb-4">Section 111A - Short Term Capital Gains (Listed Equity with STT)</h4>
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-slate-700 rounded-lg p-4">
                <p className="text-slate-400 text-sm">Full Value of Consideration</p>
                <p className="text-white text-lg font-semibold">{formatCurrency(itrReport.scheduleCG.shortTermCapitalGains.section111A.fullValue)}</p>
              </div>
              <div className="bg-slate-700 rounded-lg p-4">
                <p className="text-slate-400 text-sm">Cost of Acquisition</p>
                <p className="text-white text-lg font-semibold">{formatCurrency(itrReport.scheduleCG.shortTermCapitalGains.section111A.deductions)}</p>
              </div>
              <div className="bg-slate-700 rounded-lg p-4">
                <p className="text-slate-400 text-sm">Capital Gains</p>
                <p className="text-yellow-400 text-lg font-semibold">{formatCurrency(itrReport.scheduleCG.shortTermCapitalGains.section111A.capitalGains)}</p>
              </div>
              <div className="bg-slate-700 rounded-lg p-4">
                <p className="text-slate-400 text-sm">Tax Rate</p>
                <p className="text-orange-400 text-lg font-semibold">{itrReport.scheduleCG.shortTermCapitalGains.section111A.taxRate}</p>
              </div>
            </div>
          </div>

          {/* LTCG Section 112A */}
          <div className="bg-slate-800 rounded-xl p-6">
            <h4 className="text-white font-semibold mb-4">Section 112A - Long Term Capital Gains (Listed Equity/MF with STT)</h4>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              <div className="bg-slate-700 rounded-lg p-4">
                <p className="text-slate-400 text-sm">Full Value of Consideration</p>
                <p className="text-white text-lg font-semibold">{formatCurrency(itrReport.scheduleCG.longTermCapitalGains.section112A.fullValue)}</p>
              </div>
              <div className="bg-slate-700 rounded-lg p-4">
                <p className="text-slate-400 text-sm">Cost of Acquisition</p>
                <p className="text-white text-lg font-semibold">{formatCurrency(itrReport.scheduleCG.longTermCapitalGains.section112A.deductions)}</p>
              </div>
              <div className="bg-slate-700 rounded-lg p-4">
                <p className="text-slate-400 text-sm">Exemption u/s 112A</p>
                <p className="text-green-400 text-lg font-semibold">{formatCurrency(itrReport.scheduleCG.longTermCapitalGains.section112A.exemptionClaimed)}</p>
              </div>
              <div className="bg-slate-700 rounded-lg p-4">
                <p className="text-slate-400 text-sm">Taxable LTCG</p>
                <p className="text-yellow-400 text-lg font-semibold">{formatCurrency(itrReport.scheduleCG.longTermCapitalGains.section112A.taxableGains)}</p>
              </div>
              <div className="bg-slate-700 rounded-lg p-4">
                <p className="text-slate-400 text-sm">Tax Rate</p>
                <p className="text-green-400 text-lg font-semibold">{itrReport.scheduleCG.longTermCapitalGains.section112A.taxRate}</p>
              </div>
            </div>
          </div>

          {/* Loss Carry Forward */}
          {(itrReport.scheduleCG.lossBroughtForward.stcgLoss > 0 || itrReport.scheduleCG.lossBroughtForward.ltcgLoss > 0) && (
            <div className="bg-slate-800 rounded-xl p-6">
              <h4 className="text-white font-semibold mb-4">Losses Available for Carry Forward</h4>
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-red-900/30 border border-red-500 rounded-lg p-4">
                  <p className="text-slate-400 text-sm">STCG Loss</p>
                  <p className="text-red-400 text-lg font-semibold">{formatCurrency(itrReport.scheduleCG.lossBroughtForward.stcgLoss)}</p>
                </div>
                <div className="bg-red-900/30 border border-red-500 rounded-lg p-4">
                  <p className="text-slate-400 text-sm">LTCG Loss</p>
                  <p className="text-red-400 text-lg font-semibold">{formatCurrency(itrReport.scheduleCG.lossBroughtForward.ltcgLoss)}</p>
                </div>
              </div>
              <p className="text-slate-400 text-sm mt-4">
                These losses can be carried forward for {itrReport.scheduleCG.lossBroughtForward.yearsRemaining} assessment years.
              </p>
            </div>
          )}

          {/* Notes */}
          <div className="bg-slate-800 rounded-xl p-6">
            <h4 className="text-white font-semibold mb-4">Important Notes for ITR Filing</h4>
            <ul className="space-y-2">
              {itrReport.notes.map((note: string, i: number) => (
                <li key={i} className="flex items-start gap-3 text-slate-300">
                  <span className="text-blue-400">•</span>
                  <span>{note}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}

      {/* Loading State */}
      {loading && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-slate-800 rounded-xl p-8 text-center">
            <div className="animate-spin text-4xl mb-4">⏳</div>
            <p className="text-white">Loading...</p>
          </div>
        </div>
      )}
    </div>
  );
}
