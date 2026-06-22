import React, { useState, useEffect, useCallback } from 'react';

interface ColumnMapping {
  index: number;
  rawHeader: string;
  semantic: string;
  confidence: number;
  reason?: string;
}

interface AIMapping {
  sheetType: string;
  transactionModel: string;
  sourceGuess: string;
  confidence: number;
  columns: ColumnMapping[];
  derivedFields?: { field: string; formula: string; reason: string }[];
  warnings?: string[];
  notes?: string;
  fromTemplate?: boolean;
}

interface SheetStructure {
  name: string;
  headerRowIndex: number;
  dataStartRow: number;
  dataEndRow: number;
  totalRows: number;
  columns: {
    index: number;
    rawHeader: string;
    sampleValues: any[];
    dataType: string;
    nullPercentage: number;
  }[];
  detectedType: string;
  rawHeaders: string[];
}

interface Transaction {
  symbol: string;
  name: string;
  isin?: string;
  buyDate: string | null;
  sellDate: string | null;
  quantity: number;
  buyPrice: number;
  sellPrice: number;
  buyValue: number;
  sellValue: number;
  gain: number | null;
  stt?: number;
  brokerage?: number;
  exchange?: string;
  classification: {
    holdingDays: number;
    holdingMonths: number;
    isLongTerm: boolean;
    type: 'STCG' | 'LTCG';
  } | null;
  sheet: string;
  sourceRow: number;
  confidence: number;
}

interface Insight {
  type: 'tax_saving' | 'warning' | 'info' | 'itr_guidance' | 'optimization';
  priority: number;
  title: string;
  description: string;
  details?: any;
  impact: string;
}

interface AnalysisSummary {
  totalTransactions: number;
  stcgCount: number;
  ltcgCount: number;
  unclassifiedCount: number;
  totalBuyValue: number;
  totalSellValue: number;
  totalGain: number;
  totalSTCG: number;
  totalLTCG: number;
  stcgProfit: number;
  stcgLoss: number;
  ltcgProfit: number;
  ltcgLoss: number;
  netSTCG: number;
  netLTCG: number;
  taxableSTCG: number;
  taxableLTCG: number;
  estimatedSTCGTax: number;
  estimatedLTCGTax: number;
  totalEstimatedTax: number;
  ltcgExemption: number;
  stcgLossCarryForward: number;
  ltcgLossCarryForward: number;
  totalSTT: number;
  totalBrokerage: number;
}

interface Analysis {
  id: number;
  fileName: string;
  uploadedAt: string;
  processedAt?: string;
  fiscalYear: string;
  summary: AnalysisSummary;
  transactions: Transaction[];
  sheets: { name: string; rowCount: number; sourceGuess: string; confidence: number }[];
  insights: Insight[];
  topGainers: Transaction[];
  topLosers: Transaction[];
  aiMappings?: Record<string, AIMapping>;
  structure?: { sheets: SheetStructure[] };
}

interface PendingAnalysis {
  pendingId: string;
  fileName: string;
  structure: { sheets: SheetStructure[] };
  columnMappings: Record<string, AIMapping>;
  requiresConfirmation: boolean;
  lowConfidenceSheets: string[];
}

type TabType = 'upload' | 'mapping' | 'summary' | 'transactions' | 'insights' | 'itr';
type UploadMode = 'excel' | 'ais';

const SEMANTIC_OPTIONS = [
  'SYMBOL', 'ISIN', 'SECURITY_NAME', 'TRANSACTION_TYPE',
  'QUANTITY', 'BUY_DATE', 'SELL_DATE', 'TRADE_DATE',
  'BUY_PRICE', 'SELL_PRICE', 'BUY_VALUE', 'SELL_VALUE',
  'GAIN_LOSS', 'GAIN_LOSS_PERCENT', 'STT', 'BROKERAGE',
  'EXCHANGE', 'FOLIO', 'NAV', 'HOLDING_PERIOD', 'ASSET_TYPE', 'IGNORE'
];

export default function TaxAnalysis() {
  const [analyses, setAnalyses] = useState<Analysis[]>([]);
  const [currentAnalysis, setCurrentAnalysis] = useState<Analysis | null>(null);
  const [pendingAnalysis, setPendingAnalysis] = useState<PendingAnalysis | null>(null);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<TabType>('upload');
  const [dragActive, setDragActive] = useState(false);
  const [itrReport, setItrReport] = useState<any>(null);
  const [editedMappings, setEditedMappings] = useState<Record<string, AIMapping>>({});
  const [uploadMode, setUploadMode] = useState<UploadMode>('excel');
  const [showExportMenu, setShowExportMenu] = useState(false);
  const [exporting, setExporting] = useState(false);

  const handleExport = async (format: 'excel' | 'csv' | 'md') => {
    if (!currentAnalysis) return;
    setExporting(true);
    setShowExportMenu(false);
    try {
      const timestamp = new Date().toISOString().split('T')[0];
      const response = await fetch(`/api/tax/export/${format}/${currentAnalysis.id}`);
      if (!response.ok) throw new Error('Export failed');
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      const ext = format === 'excel' ? 'xlsx' : format;
      a.download = `tax_analysis_${currentAnalysis.fiscalYear}_${timestamp}.${ext}`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Export error:', error);
      alert('Export failed. Please try again.');
    } finally {
      setExporting(false);
    }
  };

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

    const validExtensions = uploadMode === 'ais' ? ['.csv'] : ['.xlsx', '.xls', '.csv'];
    const ext = file.name.toLowerCase().slice(file.name.lastIndexOf('.'));
    if (!validExtensions.includes(ext)) {
      setError(uploadMode === 'ais'
        ? 'Please upload an AIS CSV file (exported from Income Tax portal)'
        : 'Please upload an Excel file (.xlsx, .xls) or CSV file');
      return;
    }

    setUploading(true);
    setError(null);

    const formData = new FormData();
    formData.append('file', file);

    try {
      // Use AIS import endpoint or quick analyze endpoint
      const endpoint = uploadMode === 'ais' ? '/api/tax/import-ais' : '/api/tax/analyze';
      const res = await fetch(endpoint, {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Upload failed');
      }

      // Check if we got a full analysis or need confirmation
      if (data.pendingId) {
        setPendingAnalysis(data);
        setEditedMappings(data.columnMappings);
        setActiveTab('mapping');
      } else {
        setCurrentAnalysis(data);
        setActiveTab('summary');
        fetchAnalyses();
      }
    } catch (err: any) {
      setError(err.message || 'Failed to analyze file');
    } finally {
      setUploading(false);
    }
  };

  const handleProcessPending = async () => {
    if (!pendingAnalysis) return;

    setProcessing(true);
    setError(null);

    try {
      // First confirm mappings if edited
      if (Object.keys(editedMappings).length > 0) {
        await fetch('/api/tax/confirm-mapping', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            pendingId: pendingAnalysis.pendingId,
            columnMappings: editedMappings,
          }),
        });
      }

      // Process the file
      const res = await fetch('/api/tax/process', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pendingId: pendingAnalysis.pendingId }),
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || 'Processing failed');
      }

      const analysis = await res.json();
      setCurrentAnalysis(analysis);
      setPendingAnalysis(null);
      setActiveTab('summary');
      fetchAnalyses();
    } catch (err: any) {
      setError(err.message || 'Failed to process file');
    } finally {
      setProcessing(false);
    }
  };

  const updateColumnMapping = (sheetName: string, colIndex: number, semantic: string) => {
    setEditedMappings(prev => {
      const updated = { ...prev };
      if (!updated[sheetName]) {
        updated[sheetName] = { ...pendingAnalysis?.columnMappings[sheetName] } as AIMapping;
      }
      const colMapping = updated[sheetName].columns.find(c => c.index === colIndex);
      if (colMapping) {
        colMapping.semantic = semantic;
        colMapping.confidence = 1.0; // User confirmed
      }
      return updated;
    });
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileUpload(e.dataTransfer.files[0]);
    }
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

  const saveAsTemplate = async () => {
    if (!currentAnalysis) return;
    const name = prompt('Enter template name (e.g., "Zerodha P&L Report")');
    if (!name) return;

    try {
      await fetch('/api/tax/save-template', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ analysisId: currentAnalysis.id, templateName: name }),
      });
      alert('Template saved! Future files with similar structure will be processed faster.');
    } catch (err) {
      setError('Failed to save template');
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
      case 'optimization': return '🎯';
      default: return 'ℹ️';
    }
  };

  const getInsightColor = (type: string) => {
    switch (type) {
      case 'tax_saving': return 'bg-green-900/50 border-green-500';
      case 'warning': return 'bg-yellow-900/50 border-yellow-500';
      case 'itr_guidance': return 'bg-blue-900/50 border-blue-500';
      case 'optimization': return 'bg-purple-900/50 border-purple-500';
      default: return 'bg-slate-700/50 border-slate-500';
    }
  };

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 0.9) return 'text-green-400';
    if (confidence >= 0.7) return 'text-yellow-400';
    return 'text-red-400';
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <span>🧾</span> Intelligent Tax Analysis
          </h1>
          <p className="text-slate-400 mt-1">AI-powered Excel analysis for ITR filing</p>
        </div>
        <div className="flex items-center gap-4">
          {currentAnalysis && (
            <div className="relative">
              <button
                onClick={() => setShowExportMenu(!showExportMenu)}
                disabled={exporting}
                className="flex items-center gap-2 px-4 py-2 bg-slate-700 hover:bg-slate-600 rounded-lg text-white text-sm font-medium transition-colors"
              >
                {exporting ? (
                  <><span className="animate-spin">⏳</span> Exporting...</>
                ) : (
                  <>📥 Export</>
                )}
              </button>
              {showExportMenu && (
                <div className="absolute right-0 mt-2 w-48 bg-slate-800 border border-slate-600 rounded-lg shadow-xl z-50">
                  <button onClick={() => handleExport('excel')} className="w-full text-left px-4 py-3 hover:bg-slate-700 text-white flex items-center gap-2 rounded-t-lg">
                    📊 Excel (.xlsx)
                  </button>
                  <button onClick={() => handleExport('csv')} className="w-full text-left px-4 py-3 hover:bg-slate-700 text-white flex items-center gap-2">
                    📄 CSV (.csv)
                  </button>
                  <button onClick={() => handleExport('md')} className="w-full text-left px-4 py-3 hover:bg-slate-700 text-white flex items-center gap-2 rounded-b-lg">
                    📝 Markdown (.md)
                  </button>
                </div>
              )}
            </div>
          )}
          {currentAnalysis && (
            <div className="text-right">
              <p className="text-sm text-slate-400">{currentAnalysis.fileName}</p>
              <p className="text-sm text-green-400">FY {currentAnalysis.fiscalYear}</p>
              {currentAnalysis.sheets[0]?.sourceGuess && (
                <p className="text-xs text-blue-400">Detected: {currentAnalysis.sheets[0].sourceGuess}</p>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <div className="bg-red-900/50 border border-red-500 rounded-lg p-4 flex items-center justify-between">
          <span className="text-red-200">{error}</span>
          <button onClick={() => setError(null)} className="text-red-300 hover:text-white">✕</button>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-2 border-b border-slate-700 pb-2 overflow-x-auto">
        {[
          { id: 'upload', label: 'Upload', icon: '📤' },
          { id: 'mapping', label: 'AI Mapping', icon: '🔍', disabled: !pendingAnalysis },
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
            className={`px-4 py-2 rounded-lg flex items-center gap-2 transition-colors whitespace-nowrap ${
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
          {/* Upload Mode Selector */}
          <div className="lg:col-span-2 flex gap-4 justify-center">
            <button
              onClick={() => setUploadMode('excel')}
              className={`px-6 py-3 rounded-lg flex items-center gap-2 transition-colors ${
                uploadMode === 'excel'
                  ? 'bg-green-600 text-white'
                  : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
              }`}
            >
              <span>📊</span>
              <span>Broker Excel/CSV</span>
            </button>
            <button
              onClick={() => setUploadMode('ais')}
              className={`px-6 py-3 rounded-lg flex items-center gap-2 transition-colors ${
                uploadMode === 'ais'
                  ? 'bg-blue-600 text-white'
                  : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
              }`}
            >
              <span>🏛️</span>
              <span>Income Tax AIS</span>
            </button>
          </div>

          {/* Upload Area */}
          <div
            onDrop={handleDrop}
            onDragOver={(e) => { e.preventDefault(); setDragActive(true); }}
            onDragLeave={() => setDragActive(false)}
            className={`border-2 border-dashed rounded-xl p-12 text-center transition-colors ${
              dragActive
                ? uploadMode === 'ais' ? 'border-blue-500 bg-blue-900/20' : 'border-green-500 bg-green-900/20'
                : 'border-slate-600 hover:border-slate-500 bg-slate-800/50'
            }`}
          >
            {uploading ? (
              <div className="space-y-4">
                <div className="animate-spin text-4xl">{uploadMode === 'ais' ? '🏛️' : '🔍'}</div>
                <p className="text-slate-300">
                  {uploadMode === 'ais' ? 'Processing AIS data...' : 'AI is analyzing your file...'}
                </p>
                <p className="text-sm text-slate-500">
                  {uploadMode === 'ais' ? 'Extracting capital gains from AIS' : 'Detecting columns and data structure'}
                </p>
              </div>
            ) : uploadMode === 'ais' ? (
              <>
                <div className="text-5xl mb-4">🏛️</div>
                <h3 className="text-xl font-semibold text-white mb-2">Import AIS CSV</h3>
                <p className="text-slate-400 mb-4">
                  Upload CSV export from Income Tax AIS portal
                </p>
                <input
                  type="file"
                  accept=".csv"
                  onChange={(e) => e.target.files?.[0] && handleFileUpload(e.target.files[0])}
                  className="hidden"
                  id="ais-upload"
                />
                <label
                  htmlFor="ais-upload"
                  className="inline-block bg-blue-600 hover:bg-blue-500 text-white px-6 py-3 rounded-lg cursor-pointer transition-colors"
                >
                  Select AIS CSV
                </label>
                <p className="text-sm text-slate-500 mt-4">
                  Pre-calculated STCG/LTCG values from government records
                </p>
              </>
            ) : (
              <>
                <div className="text-5xl mb-4">🤖</div>
                <h3 className="text-xl font-semibold text-white mb-2">Smart Excel Upload</h3>
                <p className="text-slate-400 mb-4">
                  AI automatically detects columns from any broker format
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
                  Supports: Zerodha, Groww, ICICI Direct, HDFC, NSDL CAS, and more
                </p>
              </>
            )}
          </div>

          {/* Features */}
          <div className="bg-slate-800 rounded-xl p-6 space-y-4">
            <h3 className="text-lg font-semibold text-white flex items-center gap-2">
              <span>✨</span> {uploadMode === 'ais' ? 'AIS Import Features' : 'AI-Powered Features'}
            </h3>
            {uploadMode === 'ais' ? (
              <ul className="space-y-3 text-slate-300">
                <li className="flex items-start gap-3">
                  <span className="text-blue-400 mt-1">✓</span>
                  <div>
                    <strong className="text-white">Official AIS Data</strong>
                    <p className="text-sm text-slate-400">Pre-calculated values from Income Tax portal</p>
                  </div>
                </li>
                <li className="flex items-start gap-3">
                  <span className="text-blue-400 mt-1">✓</span>
                  <div>
                    <strong className="text-white">Schedule 112A Ready</strong>
                    <p className="text-sm text-slate-400">LTCG values with Fair Market Value (31-Jan-2018)</p>
                  </div>
                </li>
                <li className="flex items-start gap-3">
                  <span className="text-blue-400 mt-1">✓</span>
                  <div>
                    <strong className="text-white">10% Tax Option Detection</strong>
                    <p className="text-sm text-slate-400">Identifies pre-July 2024 eligible transactions</p>
                  </div>
                </li>
                <li className="flex items-start gap-3">
                  <span className="text-blue-400 mt-1">✓</span>
                  <div>
                    <strong className="text-white">All Security Types</strong>
                    <p className="text-sm text-slate-400">Equity, Mutual Funds, ETFs from depository data</p>
                  </div>
                </li>
                <li className="flex items-start gap-3">
                  <span className="text-blue-400 mt-1">✓</span>
                  <div>
                    <strong className="text-white">High Accuracy</strong>
                    <p className="text-sm text-slate-400">Direct from CDSL/NSDL records - 95%+ accuracy</p>
                  </div>
                </li>
              </ul>
            ) : (
              <ul className="space-y-3 text-slate-300">
                <li className="flex items-start gap-3">
                  <span className="text-green-400 mt-1">✓</span>
                  <div>
                    <strong className="text-white">Auto Column Detection</strong>
                    <p className="text-sm text-slate-400">AI understands any column naming convention</p>
                  </div>
                </li>
                <li className="flex items-start gap-3">
                  <span className="text-green-400 mt-1">✓</span>
                  <div>
                    <strong className="text-white">Multi-Broker Support</strong>
                    <p className="text-sm text-slate-400">Works with Zerodha, Groww, ICICI, HDFC, Angel, etc.</p>
                  </div>
                </li>
                <li className="flex items-start gap-3">
                  <span className="text-green-400 mt-1">✓</span>
                  <div>
                    <strong className="text-white">STCG/LTCG Classification</strong>
                    <p className="text-sm text-slate-400">Automatic 12-month holding period detection</p>
                  </div>
                </li>
                <li className="flex items-start gap-3">
                  <span className="text-green-400 mt-1">✓</span>
                  <div>
                    <strong className="text-white">Loss Set-off Optimization</strong>
                    <p className="text-sm text-slate-400">Maximizes tax savings with intelligent set-off</p>
                  </div>
                </li>
                <li className="flex items-start gap-3">
                  <span className="text-green-400 mt-1">✓</span>
                  <div>
                    <strong className="text-white">ITR Schedule CG Ready</strong>
                    <p className="text-sm text-slate-400">Direct copy-paste values for ITR-2/3</p>
                  </div>
                </li>
              </ul>
            )}

            {/* How to get AIS CSV */}
            {uploadMode === 'ais' && (
              <div className="mt-6 p-4 bg-blue-900/30 border border-blue-500 rounded-lg">
                <h4 className="text-white font-medium mb-2">How to download AIS CSV:</h4>
                <ol className="text-sm text-slate-300 space-y-1 list-decimal list-inside">
                  <li>Login to incometax.gov.in</li>
                  <li>Go to e-File → View AIS</li>
                  <li>Click "Download" → Select CSV format</li>
                  <li>Choose "SecData" or "Schedule 112A Details"</li>
                </ol>
              </div>
            )}
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
                        {a.sheets?.[0]?.sourceGuess && (
                          <p className={`text-xs ${a.sheets[0].sourceGuess === 'Income Tax AIS' ? 'text-blue-400' : 'text-green-400'}`}>
                            {a.sheets[0].sourceGuess === 'Income Tax AIS' ? '🏛️ ' : ''}{a.sheets[0].sourceGuess}
                          </p>
                        )}
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

      {/* Mapping Tab */}
      {activeTab === 'mapping' && pendingAnalysis && (
        <div className="space-y-6">
          <div className="bg-blue-900/30 border border-blue-500 rounded-xl p-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-white font-semibold">AI Column Mapping</h3>
                <p className="text-sm text-slate-400">
                  Review and adjust the detected column mappings before processing
                </p>
              </div>
              <button
                onClick={handleProcessPending}
                disabled={processing}
                className="bg-green-600 hover:bg-green-500 disabled:bg-slate-600 text-white px-6 py-2 rounded-lg flex items-center gap-2"
              >
                {processing ? (
                  <>
                    <span className="animate-spin">⏳</span> Processing...
                  </>
                ) : (
                  <>
                    <span>✓</span> Process File
                  </>
                )}
              </button>
            </div>
          </div>

          {pendingAnalysis.structure.sheets.map((sheet) => {
            const mapping = editedMappings[sheet.name] || pendingAnalysis.columnMappings[sheet.name];
            if (!mapping) return null;

            return (
              <div key={sheet.name} className="bg-slate-800 rounded-xl p-6">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h4 className="text-white font-semibold">{sheet.name}</h4>
                    <p className="text-sm text-slate-400">
                      {sheet.totalRows} rows • {sheet.detectedType}
                      {mapping.sourceGuess && ` • Detected: ${mapping.sourceGuess}`}
                    </p>
                  </div>
                  <div className={`text-sm ${getConfidenceColor(mapping.confidence)}`}>
                    Confidence: {Math.round(mapping.confidence * 100)}%
                  </div>
                </div>

                {mapping.warnings && mapping.warnings.length > 0 && (
                  <div className="bg-yellow-900/30 border border-yellow-500 rounded-lg p-3 mb-4">
                    <p className="text-yellow-400 text-sm">
                      ⚠️ {mapping.warnings.join(', ')}
                    </p>
                  </div>
                )}

                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-slate-900">
                      <tr className="text-left text-slate-400 text-sm">
                        <th className="px-4 py-2">#</th>
                        <th className="px-4 py-2">Column Header</th>
                        <th className="px-4 py-2">Sample Values</th>
                        <th className="px-4 py-2">Detected Type</th>
                        <th className="px-4 py-2">Mapped To</th>
                        <th className="px-4 py-2">Confidence</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-700">
                      {sheet.columns.map((col) => {
                        const colMapping = mapping.columns?.find(c => c.index === col.index);
                        return (
                          <tr key={col.index} className="hover:bg-slate-700/50">
                            <td className="px-4 py-2 text-slate-500">{col.index + 1}</td>
                            <td className="px-4 py-2 text-white font-medium">{col.rawHeader}</td>
                            <td className="px-4 py-2 text-slate-400 text-sm max-w-xs truncate">
                              {col.sampleValues.slice(0, 2).join(', ')}
                            </td>
                            <td className="px-4 py-2">
                              <span className={`px-2 py-1 rounded text-xs ${
                                col.dataType === 'date' ? 'bg-blue-600/30 text-blue-400' :
                                col.dataType === 'currency' ? 'bg-green-600/30 text-green-400' :
                                col.dataType === 'number' ? 'bg-purple-600/30 text-purple-400' :
                                'bg-slate-600/30 text-slate-400'
                              }`}>
                                {col.dataType}
                              </span>
                            </td>
                            <td className="px-4 py-2">
                              <select
                                value={colMapping?.semantic || 'IGNORE'}
                                onChange={(e) => updateColumnMapping(sheet.name, col.index, e.target.value)}
                                className="bg-slate-700 text-white px-3 py-1 rounded border border-slate-600 text-sm"
                              >
                                {SEMANTIC_OPTIONS.map(opt => (
                                  <option key={opt} value={opt}>{opt}</option>
                                ))}
                              </select>
                            </td>
                            <td className="px-4 py-2">
                              <span className={`text-sm ${getConfidenceColor(colMapping?.confidence || 0)}`}>
                                {colMapping ? `${Math.round(colMapping.confidence * 100)}%` : '-'}
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {mapping.derivedFields && mapping.derivedFields.length > 0 && (
                  <div className="mt-4 p-3 bg-slate-700/50 rounded-lg">
                    <p className="text-sm text-slate-400">
                      <strong>Derived Fields:</strong>{' '}
                      {mapping.derivedFields.map(f => `${f.field} = ${f.formula}`).join('; ')}
                    </p>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Summary Tab */}
      {activeTab === 'summary' && currentAnalysis && (
        <div className="space-y-6">
          {/* Source Detection Banner */}
          {currentAnalysis.sheets[0]?.sourceGuess && (
            <div className="bg-blue-900/30 border border-blue-500 rounded-lg p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="text-2xl">🔍</span>
                <div>
                  <p className="text-white font-medium">
                    Detected Source: {currentAnalysis.sheets[0].sourceGuess}
                  </p>
                  <p className="text-sm text-slate-400">
                    AI Confidence: {Math.round((currentAnalysis.sheets[0].confidence || 0.5) * 100)}%
                  </p>
                </div>
              </div>
              <button
                onClick={saveAsTemplate}
                className="bg-slate-700 hover:bg-slate-600 text-white px-4 py-2 rounded-lg text-sm"
              >
                Save as Template
              </button>
            </div>
          )}

          {/* Key Metrics */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-slate-800 rounded-xl p-6">
              <p className="text-slate-400 text-sm">Total Transactions</p>
              <p className="text-3xl font-bold text-white mt-1">{currentAnalysis.summary.totalTransactions}</p>
              <p className="text-xs text-slate-500 mt-1">
                STCG: {currentAnalysis.summary.stcgCount} | LTCG: {currentAnalysis.summary.ltcgCount}
              </p>
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
                <h3 className="text-lg font-semibold text-white">Short Term Capital Gains</h3>
                <span className="bg-orange-600/20 text-orange-400 px-3 py-1 rounded-full text-sm">
                  Tax @ 20%
                </span>
              </div>
              <div className="space-y-3">
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
                  <span className={currentAnalysis.summary.netSTCG >= 0 ? 'text-green-400' : 'text-red-400'}>
                    {formatCurrency(currentAnalysis.summary.netSTCG)}
                  </span>
                </div>
                <div className="flex justify-between font-semibold bg-slate-700 -mx-6 px-6 py-3">
                  <span className="text-slate-300">Tax Payable</span>
                  <span className="text-yellow-400">{formatCurrency(currentAnalysis.summary.estimatedSTCGTax)}</span>
                </div>
              </div>
            </div>

            {/* LTCG */}
            <div className="bg-slate-800 rounded-xl p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-white">Long Term Capital Gains</h3>
                <span className="bg-green-600/20 text-green-400 px-3 py-1 rounded-full text-sm">
                  Tax @ 12.5%
                </span>
              </div>
              <div className="space-y-3">
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
                  <span className={currentAnalysis.summary.netLTCG >= 0 ? 'text-green-400' : 'text-red-400'}>
                    {formatCurrency(currentAnalysis.summary.netLTCG)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Exemption (₹1.25L)</span>
                  <span className="text-blue-400">
                    -{formatCurrency(Math.min(currentAnalysis.summary.ltcgExemption, Math.max(0, currentAnalysis.summary.netLTCG)))}
                  </span>
                </div>
                <div className="flex justify-between font-semibold bg-slate-700 -mx-6 px-6 py-3">
                  <span className="text-slate-300">Tax Payable</span>
                  <span className="text-yellow-400">{formatCurrency(currentAnalysis.summary.estimatedLTCGTax)}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Top Gainers & Losers */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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
                          {t.classification?.type || 'N/A'} • {t.classification?.holdingMonths || 0}m
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
                          {t.classification?.type || 'N/A'} • {t.classification?.holdingMonths || 0}m
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
                  <th className="px-4 py-3 text-center">Conf.</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-700">
                {currentAnalysis.transactions.map((t, i) => (
                  <tr key={i} className="hover:bg-slate-700/50">
                    <td className="px-4 py-3">
                      <p className="text-white font-medium">{t.symbol || '-'}</p>
                      {t.name !== t.symbol && <p className="text-sm text-slate-400">{t.name}</p>}
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
                    <td className="px-4 py-3 text-center">
                      <span className={`text-xs ${getConfidenceColor(t.confidence)}`}>
                        {Math.round(t.confidence * 100)}%
                      </span>
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
                  {insight.details && (
                    <div className="mt-3 p-3 bg-black/20 rounded-lg text-sm">
                      <pre className="text-slate-400">{JSON.stringify(insight.details, null, 2)}</pre>
                    </div>
                  )}
                  <p className="text-sm text-slate-400 mt-2 italic">{insight.impact}</p>
                </div>
              </div>
            </div>
          ))}
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

          {/* Section 111A - STCG */}
          <div className="bg-slate-800 rounded-xl p-6">
            <h4 className="text-white font-semibold mb-4">
              Section 111A - Short Term Capital Gains (Listed Equity with STT)
            </h4>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              <div className="bg-slate-700 rounded-lg p-4">
                <p className="text-slate-400 text-sm">Full Value of Consideration</p>
                <p className="text-white text-lg font-semibold">
                  {itrReport.scheduleCG.shortTermCapitalGains.section111A.currency === 'USD' ? '$' : '₹'}
                  {itrReport.scheduleCG.shortTermCapitalGains.section111A.fullValue.toLocaleString('en-IN', { maximumFractionDigits: 2 })}
                </p>
              </div>
              <div className="bg-slate-700 rounded-lg p-4">
                <p className="text-slate-400 text-sm">Cost of Acquisition</p>
                <p className="text-white text-lg font-semibold">
                  {itrReport.scheduleCG.shortTermCapitalGains.section111A.currency === 'USD' ? '$' : '₹'}
                  {itrReport.scheduleCG.shortTermCapitalGains.section111A.costOfAcquisition.toLocaleString('en-IN', { maximumFractionDigits: 2 })}
                </p>
              </div>
              <div className="bg-slate-700 rounded-lg p-4">
                <p className="text-slate-400 text-sm">Capital Gains (INR)</p>
                <p className="text-yellow-400 text-lg font-semibold">
                  {formatCurrency(itrReport.scheduleCG.shortTermCapitalGains.section111A.capitalGains)}
                </p>
              </div>
              <div className="bg-slate-700 rounded-lg p-4">
                <p className="text-slate-400 text-sm">Tax Rate</p>
                <p className="text-orange-400 text-lg font-semibold">
                  {itrReport.scheduleCG.shortTermCapitalGains.section111A.taxRate}
                </p>
              </div>
              <div className="bg-slate-700 rounded-lg p-4">
                <p className="text-slate-400 text-sm">Tax Payable</p>
                <p className="text-yellow-400 text-lg font-semibold">
                  {formatCurrency(itrReport.scheduleCG.shortTermCapitalGains.section111A.taxPayable)}
                </p>
              </div>
            </div>
          </div>

          {/* Section 112A - LTCG */}
          <div className="bg-slate-800 rounded-xl p-6">
            <h4 className="text-white font-semibold mb-4">
              Section 112A - Long Term Capital Gains (Listed Equity/MF with STT)
            </h4>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              <div className="bg-slate-700 rounded-lg p-4">
                <p className="text-slate-400 text-sm">Full Value of Consideration</p>
                <p className="text-white text-lg font-semibold">
                  {itrReport.scheduleCG.longTermCapitalGains.section112A.currency === 'USD' ? '$' : '₹'}
                  {itrReport.scheduleCG.longTermCapitalGains.section112A.fullValue.toLocaleString('en-IN', { maximumFractionDigits: 2 })}
                </p>
              </div>
              <div className="bg-slate-700 rounded-lg p-4">
                <p className="text-slate-400 text-sm">Cost of Acquisition</p>
                <p className="text-white text-lg font-semibold">
                  {itrReport.scheduleCG.longTermCapitalGains.section112A.currency === 'USD' ? '$' : '₹'}
                  {itrReport.scheduleCG.longTermCapitalGains.section112A.costOfAcquisition.toLocaleString('en-IN', { maximumFractionDigits: 2 })}
                </p>
              </div>
              <div className="bg-slate-700 rounded-lg p-4">
                <p className="text-slate-400 text-sm">Gross Gains (INR)</p>
                <p className="text-white text-lg font-semibold">
                  {formatCurrency(itrReport.scheduleCG.longTermCapitalGains.section112A.grossGains)}
                </p>
              </div>
              <div className="bg-slate-700 rounded-lg p-4">
                <p className="text-slate-400 text-sm">Exemption u/s 112A</p>
                <p className="text-green-400 text-lg font-semibold">
                  {formatCurrency(itrReport.scheduleCG.longTermCapitalGains.section112A.exemptionUnder112A)}
                </p>
              </div>
              <div className="bg-slate-700 rounded-lg p-4">
                <p className="text-slate-400 text-sm">Taxable LTCG</p>
                <p className="text-yellow-400 text-lg font-semibold">
                  {formatCurrency(itrReport.scheduleCG.longTermCapitalGains.section112A.taxableGains)}
                </p>
              </div>
              <div className="bg-slate-700 rounded-lg p-4">
                <p className="text-slate-400 text-sm">Tax Payable</p>
                <p className="text-yellow-400 text-lg font-semibold">
                  {formatCurrency(itrReport.scheduleCG.longTermCapitalGains.section112A.taxPayable)}
                </p>
              </div>
            </div>
          </div>

          {/* Loss Carry Forward */}
          {(itrReport.scheduleCG.lossCarryForward.stcgLoss > 0 || itrReport.scheduleCG.lossCarryForward.ltcgLoss > 0) && (
            <div className="bg-slate-800 rounded-xl p-6">
              <h4 className="text-white font-semibold mb-4">Losses Available for Carry Forward</h4>
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-red-900/30 border border-red-500 rounded-lg p-4">
                  <p className="text-slate-400 text-sm">STCG Loss</p>
                  <p className="text-red-400 text-lg font-semibold">
                    {formatCurrency(itrReport.scheduleCG.lossCarryForward.stcgLoss)}
                  </p>
                </div>
                <div className="bg-red-900/30 border border-red-500 rounded-lg p-4">
                  <p className="text-slate-400 text-sm">LTCG Loss</p>
                  <p className="text-red-400 text-lg font-semibold">
                    {formatCurrency(itrReport.scheduleCG.lossCarryForward.ltcgLoss)}
                  </p>
                </div>
              </div>
              <p className="text-slate-400 text-sm mt-4">
                Can be carried forward for {itrReport.scheduleCG.lossCarryForward.yearsRemaining} assessment years
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

      {/* Loading Overlay */}
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
