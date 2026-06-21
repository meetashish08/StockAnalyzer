import React, { useState, useRef, useEffect } from 'react';
import { useStore } from '../../store/useStore';
import type { ImportedTransaction } from '../../../shared/types';

interface ImportRecord {
  id: number;
  source: string;
  filename: string;
  holdingsCount: number;
  totalInvested: number;
  totalValue: number;
  totalPnL: number;
  importedAt: string;
}

export default function ImportData() {
  const { fetchHoldings } = useStore();
  const [activeTab, setActiveTab] = useState<'file' | 'email' | 'history'>('file');
  const [importedData, setImportedData] = useState<ImportedTransaction[]>([]);
  const [emailText, setEmailText] = useState('');
  const [selectedBroker, setSelectedBroker] = useState('auto');
  const [isImporting, setIsImporting] = useState(false);
  const [importStatus, setImportStatus] = useState<string>('');
  const [importHistory, setImportHistory] = useState<ImportRecord[]>([]);
  const [pendingFilename, setPendingFilename] = useState<string>('');
  const [pendingSource, setPendingSource] = useState<string>('');
  const [showReplaceDialog, setShowReplaceDialog] = useState(false);
  const [existingImport, setExistingImport] = useState<ImportRecord | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    loadImportHistory();
  }, []);

  const loadImportHistory = async () => {
    try {
      const res = await fetch('/api/import-history');
      const history = await res.json();
      setImportHistory(history);
    } catch (error) {
      console.error('Failed to load import history:', error);
    }
  };

  const detectSource = (filename: string): string => {
    const lower = filename.toLowerCase();
    if (lower.includes('groww')) return 'Groww';
    if (lower.includes('zerodha') || lower.includes('kite')) return 'Zerodha';
    if (lower.includes('indmoney')) return 'INDmoney';
    if (lower.includes('upstox')) return 'Upstox';
    if (lower.includes('angelone') || lower.includes('angel')) return 'AngelOne';
    return 'Manual';
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const filename = file.name;
    const source = detectSource(filename);
    setPendingFilename(filename);
    setPendingSource(source);

    // Check for existing import from same source
    try {
      const checkRes = await fetch(`/api/import-history/check?source=${encodeURIComponent(source)}&filename=${encodeURIComponent(filename)}`);
      const { exists, import: existingImp } = await checkRes.json();

      if (exists && existingImp) {
        setExistingImport(existingImp);
        setShowReplaceDialog(true);
        // Store file for later processing
        return;
      }
    } catch (error) {
      console.error('Check failed:', error);
    }

    // No existing import, proceed normally
    await processFile(file, source);
  };

  const processFile = async (file: File, source: string) => {
    setIsImporting(true);
    setImportStatus('Reading file...');
    setShowReplaceDialog(false);

    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch('/api/import', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error('Import failed');
      }

      const transactions = await response.json();
      setImportedData(transactions.map((tx: any) => ({ ...tx, source })));
      setImportStatus(`Found ${transactions.length} holdings from ${source}`);
    } catch (error) {
      console.error('Import failed:', error);
      setImportStatus('Import failed. Please check the file format.');
    } finally {
      setIsImporting(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleReplaceExisting = async () => {
    if (existingImport) {
      // Delete existing import first
      await fetch(`/api/import-history/${existingImport.id}`, { method: 'DELETE' });
      await loadImportHistory();
    }

    // Now process the file
    if (fileInputRef.current?.files?.[0]) {
      await processFile(fileInputRef.current.files[0], pendingSource);
    }
    setShowReplaceDialog(false);
  };

  const handleKeepBoth = async () => {
    if (fileInputRef.current?.files?.[0]) {
      await processFile(fileInputRef.current.files[0], pendingSource);
    }
    setShowReplaceDialog(false);
  };

  const handleEmailParse = async () => {
    if (!emailText.trim()) return;

    setIsImporting(true);
    setImportStatus('Parsing email...');

    try {
      const response = await fetch('/api/parse-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ emailText, broker: selectedBroker }),
      });

      const transactions = await response.json();
      const source = selectedBroker === 'auto' ? 'Email' : selectedBroker;
      setImportedData(transactions.map((tx: any) => ({ ...tx, source })));
      setPendingSource(source);
      setImportStatus(`Found ${transactions.length} transactions`);
    } catch (error) {
      console.error('Parse failed:', error);
      setImportStatus('Failed to parse email. Try selecting a specific broker.');
    } finally {
      setIsImporting(false);
    }
  };

  const handleImportSelected = async (selectedIds: Set<number>, replaceExisting: boolean = false) => {
    setIsImporting(true);
    setImportStatus('Importing holdings...');

    try {
      const selectedTransactions = importedData.filter((_, idx: number) => selectedIds.has(idx));
      const source = pendingSource || selectedTransactions[0]?.source || 'Import';

      // Create import record first
      const importRecord = {
        id: Date.now(),
        source,
        filename: pendingFilename || 'manual',
        holdingsCount: selectedTransactions.length,
        totalInvested: selectedTransactions.reduce((sum: number, tx: any) => sum + (tx.buyValue || 0), 0),
        totalValue: selectedTransactions.reduce((sum: number, tx: any) => sum + (tx.closingValue || 0), 0),
        totalPnL: selectedTransactions.reduce((sum: number, tx: any) => sum + (tx.unrealisedPnL || 0), 0),
        importedAt: new Date().toISOString(),
      };

      // Store import history
      await fetch('/api/import-history', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(importRecord),
      });

      for (const tx of selectedTransactions as any[]) {
        // Check if holding already exists
        const holdingsRes = await fetch('/api/holdings');
        const holdings = await holdingsRes.json();
        let holding = holdings.find((h: any) =>
          h.symbol.toUpperCase() === tx.symbol.toUpperCase()
        );

        // Determine asset type
        let assetType = 'STOCK';
        const nameLower = (tx.name || '').toLowerCase();
        if (nameLower.includes('etf') || nameLower.includes('bees') ||
            tx.symbol.includes('ETF') || tx.symbol.includes('BEES')) {
          assetType = 'ETF';
        } else if (nameLower.includes('reit')) {
          assetType = 'REIT';
        } else if (nameLower.includes('fund') || nameLower.includes('amc')) {
          assetType = 'MUTUAL_FUND';
        }

        if (!holding) {
          // Create new holding
          const createRes = await fetch('/api/holdings', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              symbol: tx.symbol,
              name: tx.name || tx.symbol,
              isin: tx.isin || '',
              market: 'NSE',
              type: assetType,
              quantity: tx.quantity,
              avgPrice: tx.price,
              currentPrice: tx.closingPrice || 0,
              purchaseDate: tx.date,
              importId: importRecord.id,
            }),
          });
          holding = await createRes.json();
        } else {
          // Update existing holding
          await fetch(`/api/holdings/${holding.id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              quantity: tx.quantity,
              avgPrice: tx.price,
              currentPrice: tx.closingPrice || holding.currentPrice,
              importId: importRecord.id,
            }),
          });
        }

        // Add transaction (skip holding update since we already set correct quantity)
        await fetch('/api/transactions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            holdingId: holding.id,
            type: tx.type || 'BUY',
            quantity: tx.quantity,
            price: tx.price,
            date: tx.date,
            fees: tx.fees || 0,
            source: source,
            notes: `Imported from ${source}. P&L: ₹${tx.unrealisedPnL?.toFixed(2) || 0}`,
            skipHoldingUpdate: true, // Holding already has correct quantity from import
          }),
        });
      }

      await fetchHoldings();
      await loadImportHistory();

      const totalInvested = selectedTransactions.reduce((sum: number, tx: any) => sum + (tx.buyValue || 0), 0);
      const totalValue = selectedTransactions.reduce((sum: number, tx: any) => sum + (tx.closingValue || 0), 0);
      const totalPnL = selectedTransactions.reduce((sum: number, tx: any) => sum + (tx.unrealisedPnL || 0), 0);

      setImportStatus(
        `Successfully imported ${selectedTransactions.length} holdings from ${source}! ` +
        `Invested: ₹${totalInvested.toLocaleString('en-IN')}, ` +
        `Current: ₹${totalValue.toLocaleString('en-IN')}, ` +
        `P&L: ${totalPnL >= 0 ? '+' : ''}₹${totalPnL.toLocaleString('en-IN')}`
      );
      setImportedData([]);
      setPendingFilename('');
      setPendingSource('');
    } catch (error) {
      console.error('Import failed:', error);
      setImportStatus('Failed to import some holdings');
    } finally {
      setIsImporting(false);
    }
  };

  const handleDeleteImport = async (importId: number) => {
    if (!confirm('Delete this import and all associated holdings?')) return;

    try {
      const res = await fetch(`/api/import-history/${importId}`, { method: 'DELETE' });
      const result = await res.json();
      setImportStatus(`Deleted import with ${result.deletedHoldings} holdings`);
      await loadImportHistory();
      await fetchHoldings();
    } catch (error) {
      console.error('Delete failed:', error);
      setImportStatus('Failed to delete import');
    }
  };

  const handleClearAll = async () => {
    if (!confirm('This will delete ALL holdings and import history. Are you sure?')) return;

    try {
      await fetch('/api/clear-all', { method: 'DELETE' });
      setImportStatus('All data cleared');
      await loadImportHistory();
      await fetchHoldings();
    } catch (error) {
      console.error('Clear failed:', error);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Replace Dialog */}
      {showReplaceDialog && existingImport && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="card max-w-md mx-4">
            <h3 className="text-lg font-semibold text-white mb-4">Duplicate Import Detected</h3>
            <p className="text-slate-300 mb-4">
              An import from <strong className="text-white">{existingImport.source}</strong> already exists
              (imported on {new Date(existingImport.importedAt).toLocaleDateString()}).
            </p>
            <p className="text-slate-400 text-sm mb-4">
              {existingImport.holdingsCount} holdings, ₹{existingImport.totalInvested.toLocaleString('en-IN')} invested
            </p>
            <div className="flex gap-3">
              <button
                onClick={handleReplaceExisting}
                className="btn-primary flex-1"
              >
                Replace Existing
              </button>
              <button
                onClick={handleKeepBoth}
                className="btn-secondary flex-1"
              >
                Keep Both
              </button>
              <button
                onClick={() => {
                  setShowReplaceDialog(false);
                  if (fileInputRef.current) fileInputRef.current.value = '';
                }}
                className="btn-secondary"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white">Import Data</h1>
        <p className="text-slate-400">Import transactions from files or broker emails</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-2">
        <button
          onClick={() => setActiveTab('file')}
          className={`px-4 py-2 rounded-lg font-medium transition-colors ${
            activeTab === 'file'
              ? 'bg-green-600 text-white'
              : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
          }`}
        >
          📁 File Import
        </button>
        <button
          onClick={() => setActiveTab('email')}
          className={`px-4 py-2 rounded-lg font-medium transition-colors ${
            activeTab === 'email'
              ? 'bg-green-600 text-white'
              : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
          }`}
        >
          📧 Email Parser
        </button>
        <button
          onClick={() => { setActiveTab('history'); loadImportHistory(); }}
          className={`px-4 py-2 rounded-lg font-medium transition-colors ${
            activeTab === 'history'
              ? 'bg-green-600 text-white'
              : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
          }`}
        >
          📜 Import History ({importHistory.length})
        </button>
      </div>

      {/* File Import */}
      {activeTab === 'file' && (
        <div className="card">
          <h3 className="text-lg font-semibold text-white mb-4">Import from CSV/Excel</h3>
          <p className="text-slate-400 mb-4">
            Upload a CSV or Excel file with your holdings. Supports Groww, Zerodha, and other broker formats.
          </p>

          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileSelect}
            accept=".csv,.xlsx,.xls"
            className="hidden"
          />

          <div
            onClick={() => fileInputRef.current?.click()}
            className="border-2 border-dashed border-slate-600 rounded-xl p-8 text-center cursor-pointer hover:border-slate-500 transition-colors"
          >
            <div className="text-4xl mb-4">📄</div>
            <p className="text-slate-300 mb-4">
              Click to select a file or drag and drop
            </p>
            <button disabled={isImporting} className="btn-primary">
              {isImporting ? 'Importing...' : 'Select File'}
            </button>
          </div>

          <div className="mt-4 p-3 bg-slate-700/50 rounded-lg">
            <p className="text-sm text-slate-400">
              <strong>Supported brokers:</strong> Groww, Zerodha, INDmoney, Upstox, AngelOne
            </p>
            <p className="text-sm text-slate-400 mt-1">
              <strong>Supported formats:</strong> CSV, XLSX, XLS
            </p>
          </div>
        </div>
      )}

      {/* Email Parser */}
      {activeTab === 'email' && (
        <div className="card">
          <h3 className="text-lg font-semibold text-white mb-4">Parse Broker Emails</h3>
          <p className="text-slate-400 mb-4">
            Paste the content of your broker contract note or transaction email below.
          </p>

          <div className="mb-4">
            <label className="label">Select Broker</label>
            <select
              value={selectedBroker}
              onChange={(e) => setSelectedBroker(e.target.value)}
              className="select w-full"
            >
              <option value="auto">Auto-detect</option>
              <option value="Zerodha">Zerodha</option>
              <option value="Groww">Groww</option>
              <option value="INDmoney">INDmoney</option>
            </select>
          </div>

          <div>
            <label className="label">Email Content</label>
            <textarea
              value={emailText}
              onChange={(e) => setEmailText(e.target.value)}
              placeholder="Paste your broker email content here..."
              className="input h-40 font-mono text-sm"
            />
          </div>

          <button
            onClick={handleEmailParse}
            disabled={isImporting || !emailText.trim()}
            className="btn-primary mt-4"
          >
            {isImporting ? 'Parsing...' : 'Parse Email'}
          </button>
        </div>
      )}

      {/* Import History */}
      {activeTab === 'history' && (
        <div className="card">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-semibold text-white">Import History</h3>
            {importHistory.length > 0 && (
              <button onClick={handleClearAll} className="text-red-400 hover:text-red-300 text-sm">
                Clear All Data
              </button>
            )}
          </div>

          {importHistory.length === 0 ? (
            <p className="text-slate-400 text-center py-8">No imports yet</p>
          ) : (
            <div className="space-y-3">
              {importHistory.map((imp) => (
                <div key={imp.id} className="p-4 bg-slate-700/50 rounded-lg">
                  <div className="flex justify-between items-start">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-lg font-medium text-white">{imp.source}</span>
                        <span className="text-xs bg-slate-600 px-2 py-0.5 rounded text-slate-300">
                          {imp.holdingsCount} holdings
                        </span>
                      </div>
                      <p className="text-sm text-slate-400">{imp.filename}</p>
                      <p className="text-xs text-slate-500 mt-1">
                        Imported: {new Date(imp.importedAt).toLocaleString()}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-slate-300">
                        Invested: ₹{imp.totalInvested.toLocaleString('en-IN')}
                      </p>
                      <p className={`text-sm font-medium ${imp.totalPnL >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                        P&L: {imp.totalPnL >= 0 ? '+' : ''}₹{imp.totalPnL.toLocaleString('en-IN')}
                      </p>
                      <button
                        onClick={() => handleDeleteImport(imp.id)}
                        className="text-red-400 hover:text-red-300 text-xs mt-2"
                      >
                        Delete Import
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Status */}
      {importStatus && (
        <div className={`p-3 rounded-lg ${
          importStatus.includes('Failed') ? 'bg-red-900/30 text-red-400' :
          importStatus.includes('Success') || importStatus.includes('Deleted') ? 'bg-green-900/30 text-green-400' :
          'bg-slate-700 text-slate-300'
        }`}>
          {importStatus}
        </div>
      )}

      {/* Preview Table */}
      {importedData.length > 0 && (
        <ImportPreview
          transactions={importedData}
          onImport={handleImportSelected}
          isImporting={isImporting}
          source={pendingSource}
        />
      )}
    </div>
  );
}

function ImportPreview({
  transactions,
  onImport,
  isImporting,
  source,
}: {
  transactions: any[];
  onImport: (selected: Set<number>) => void;
  isImporting: boolean;
  source: string;
}) {
  const [selected, setSelected] = useState<Set<number>>(new Set(transactions.map((_, i) => i)));

  const toggleAll = () => {
    if (selected.size === transactions.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(transactions.map((_, i) => i)));
    }
  };

  const toggle = (idx: number) => {
    const newSelected = new Set(selected);
    if (newSelected.has(idx)) {
      newSelected.delete(idx);
    } else {
      newSelected.add(idx);
    }
    setSelected(newSelected);
  };

  return (
    <div className="card p-0 overflow-hidden">
      <div className="p-4 bg-slate-700/50 flex items-center justify-between">
        <div>
          <h3 className="font-semibold text-white">
            Preview ({selected.size} of {transactions.length} selected)
          </h3>
          {source && <p className="text-sm text-slate-400">Source: {source}</p>}
        </div>
        <div className="flex gap-2">
          <button onClick={toggleAll} className="btn-secondary text-sm">
            {selected.size === transactions.length ? 'Deselect All' : 'Select All'}
          </button>
          <button
            onClick={() => onImport(selected)}
            disabled={isImporting || selected.size === 0}
            className="btn-primary text-sm"
          >
            {isImporting ? 'Importing...' : `Import ${selected.size} Holdings`}
          </button>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="bg-slate-700/30 text-left">
              <th className="p-3 text-slate-300 font-medium w-10">
                <input
                  type="checkbox"
                  checked={selected.size === transactions.length}
                  onChange={toggleAll}
                  className="rounded"
                />
              </th>
              <th className="p-3 text-slate-300 font-medium">Symbol</th>
              <th className="p-3 text-slate-300 font-medium text-right">Qty</th>
              <th className="p-3 text-slate-300 font-medium text-right">Avg Buy Price</th>
              <th className="p-3 text-slate-300 font-medium text-right">Invested</th>
              <th className="p-3 text-slate-300 font-medium text-right">Current Price</th>
              <th className="p-3 text-slate-300 font-medium text-right">Current Value</th>
              <th className="p-3 text-slate-300 font-medium text-right">P&L</th>
            </tr>
          </thead>
          <tbody>
            {transactions.map((tx: any, idx) => (
              <tr
                key={idx}
                className={`border-t border-slate-700 ${
                  selected.has(idx) ? 'bg-green-900/20' : 'hover:bg-slate-700/30'
                }`}
              >
                <td className="p-3">
                  <input
                    type="checkbox"
                    checked={selected.has(idx)}
                    onChange={() => toggle(idx)}
                    className="rounded"
                  />
                </td>
                <td className="p-3">
                  <p className="font-medium text-white">{tx.symbol}</p>
                  {tx.name && tx.name !== tx.symbol && (
                    <p className="text-xs text-slate-400 truncate max-w-[200px]">{tx.name}</p>
                  )}
                </td>
                <td className="p-3 text-right text-white">{tx.quantity}</td>
                <td className="p-3 text-right text-white">₹{tx.price?.toLocaleString('en-IN', {maximumFractionDigits: 2}) || 0}</td>
                <td className="p-3 text-right text-slate-300">₹{tx.buyValue?.toLocaleString('en-IN', {maximumFractionDigits: 2}) || 0}</td>
                <td className="p-3 text-right text-white">₹{tx.closingPrice?.toLocaleString('en-IN', {maximumFractionDigits: 2}) || '-'}</td>
                <td className="p-3 text-right text-white">₹{tx.closingValue?.toLocaleString('en-IN', {maximumFractionDigits: 2}) || '-'}</td>
                <td className="p-3 text-right">
                  <div className={tx.unrealisedPnL >= 0 ? 'text-green-400' : 'text-red-400'}>
                    <p className="font-medium">
                      {tx.unrealisedPnL >= 0 ? '+' : ''}₹{tx.unrealisedPnL?.toLocaleString('en-IN', {maximumFractionDigits: 2}) || 0}
                    </p>
                    <p className="text-xs">
                      ({tx.pnlPercent >= 0 ? '+' : ''}{tx.pnlPercent?.toFixed(2) || 0}%)
                    </p>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Summary */}
      {transactions.length > 0 && (
        <div className="p-4 bg-slate-700/30 border-t border-slate-700">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
            <div>
              <p className="text-slate-400 text-sm">Total Invested</p>
              <p className="text-white font-bold">
                ₹{transactions.reduce((sum: number, tx: any) => sum + (tx.buyValue || 0), 0).toLocaleString('en-IN', {maximumFractionDigits: 2})}
              </p>
            </div>
            <div>
              <p className="text-slate-400 text-sm">Current Value</p>
              <p className="text-white font-bold">
                ₹{transactions.reduce((sum: number, tx: any) => sum + (tx.closingValue || 0), 0).toLocaleString('en-IN', {maximumFractionDigits: 2})}
              </p>
            </div>
            <div>
              <p className="text-slate-400 text-sm">Total P&L</p>
              {(() => {
                const totalPnL = transactions.reduce((sum: number, tx: any) => sum + (tx.unrealisedPnL || 0), 0);
                return (
                  <p className={`font-bold ${totalPnL >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                    {totalPnL >= 0 ? '+' : ''}₹{totalPnL.toLocaleString('en-IN', {maximumFractionDigits: 2})}
                  </p>
                );
              })()}
            </div>
            <div>
              <p className="text-slate-400 text-sm">P&L %</p>
              {(() => {
                const totalInvested = transactions.reduce((sum: number, tx: any) => sum + (tx.buyValue || 0), 0);
                const totalPnL = transactions.reduce((sum: number, tx: any) => sum + (tx.unrealisedPnL || 0), 0);
                const pnlPercent = totalInvested > 0 ? (totalPnL / totalInvested) * 100 : 0;
                return (
                  <p className={`font-bold ${pnlPercent >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                    {pnlPercent >= 0 ? '+' : ''}{pnlPercent.toFixed(2)}%
                  </p>
                );
              })()}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
