import React, { useState } from 'react';
import { useStore } from '../../store/useStore';
import type { ImportedTransaction } from '../../../shared/types';

export default function ImportData() {
  const { addHolding, addTransaction, fetchHoldings } = useStore();
  const [activeTab, setActiveTab] = useState<'file' | 'email'>('file');
  const [importedData, setImportedData] = useState<ImportedTransaction[]>([]);
  const [emailText, setEmailText] = useState('');
  const [selectedBroker, setSelectedBroker] = useState('auto');
  const [isImporting, setIsImporting] = useState(false);
  const [importStatus, setImportStatus] = useState<string>('');

  const handleFileImport = async () => {
    try {
      const filePath = await window.electronAPI.openFileDialog({
        filters: [
          { name: 'Spreadsheets', extensions: ['csv', 'xlsx', 'xls'] },
        ],
      });

      if (!filePath) return;

      setIsImporting(true);
      setImportStatus('Reading file...');

      let transactions: ImportedTransaction[];
      if (filePath.endsWith('.csv')) {
        transactions = await window.electronAPI.importCSV(filePath);
      } else {
        transactions = await window.electronAPI.importExcel(filePath);
      }

      setImportedData(transactions);
      setImportStatus(`Found ${transactions.length} transactions`);
    } catch (error) {
      console.error('Import failed:', error);
      setImportStatus('Import failed. Please check the file format.');
    } finally {
      setIsImporting(false);
    }
  };

  const handleEmailParse = async () => {
    if (!emailText.trim()) return;

    setIsImporting(true);
    setImportStatus('Parsing email...');

    try {
      const transactions = await window.electronAPI.parseEmailText(emailText, selectedBroker);
      setImportedData(transactions);
      setImportStatus(`Found ${transactions.length} transactions`);
    } catch (error) {
      console.error('Parse failed:', error);
      setImportStatus('Failed to parse email. Try selecting a specific broker.');
    } finally {
      setIsImporting(false);
    }
  };

  const handleImportSelected = async (selectedIds: Set<number>) => {
    setIsImporting(true);
    setImportStatus('Importing transactions...');

    try {
      const selectedTransactions = importedData.filter((_, idx) => selectedIds.has(idx));

      for (const tx of selectedTransactions) {
        // First, try to find or create the holding
        const holdings = await window.electronAPI.getHoldings();
        let holding = holdings.find((h: any) =>
          h.symbol.toUpperCase() === tx.symbol.toUpperCase()
        );

        if (!holding) {
          // Create new holding
          holding = await window.electronAPI.addHolding({
            symbol: tx.symbol,
            name: tx.name || tx.symbol,
            market: tx.symbol.length <= 5 ? 'NSE' : 'NYSE', // Simple heuristic
            type: 'STOCK',
            quantity: tx.type === 'BUY' || tx.type === 'SIP' ? tx.quantity : 0,
            avgPrice: tx.price,
            purchaseDate: tx.date,
          });
        }

        // Add transaction
        await window.electronAPI.addTransaction({
          holdingId: holding.id,
          type: tx.type,
          quantity: tx.quantity,
          price: tx.price,
          date: tx.date,
          fees: tx.fees || 0,
          source: 'IMPORT',
        });
      }

      await fetchHoldings();
      setImportStatus(`Successfully imported ${selectedTransactions.length} transactions!`);
      setImportedData([]);
    } catch (error) {
      console.error('Import failed:', error);
      setImportStatus('Failed to import some transactions');
    } finally {
      setIsImporting(false);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
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
      </div>

      {/* File Import */}
      {activeTab === 'file' && (
        <div className="card">
          <h3 className="text-lg font-semibold text-white mb-4">Import from CSV/Excel</h3>
          <p className="text-slate-400 mb-4">
            Upload a CSV or Excel file with your transaction history.
            Supported columns: symbol, quantity, price, date, type (BUY/SELL)
          </p>

          <div className="border-2 border-dashed border-slate-600 rounded-xl p-8 text-center">
            <div className="text-4xl mb-4">📄</div>
            <p className="text-slate-300 mb-4">
              Click to select a file or drag and drop
            </p>
            <button
              onClick={handleFileImport}
              disabled={isImporting}
              className="btn-primary"
            >
              {isImporting ? 'Importing...' : 'Select File'}
            </button>
          </div>

          <div className="mt-4 p-3 bg-slate-700/50 rounded-lg">
            <p className="text-sm text-slate-400">
              <strong>Tip:</strong> Your existing portfolio tracker file at{' '}
              <code className="text-green-400">Investment-Portfolio-Tracker.xlsx</code>{' '}
              should work directly!
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
              <option value="zerodha">Zerodha</option>
              <option value="groww">Groww</option>
              <option value="indmoney">INDmoney</option>
            </select>
          </div>

          <div>
            <label className="label">Email Content</label>
            <textarea
              value={emailText}
              onChange={(e) => setEmailText(e.target.value)}
              placeholder="Paste your broker email content here...

Example formats:
- Zerodha: 'RELIANCE | 10 | 2450.50 | BUY'
- Groww: 'Your order to buy 5 units of Axis Bluechip Fund at NAV ₹52.34'
- INDmoney: 'Bought 10 shares of TCS at ₹3500'"
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

      {/* Status */}
      {importStatus && (
        <div className={`p-3 rounded-lg ${
          importStatus.includes('Failed') ? 'bg-red-900/30 text-red-400' :
          importStatus.includes('Success') ? 'bg-green-900/30 text-green-400' :
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
        />
      )}
    </div>
  );
}

function ImportPreview({
  transactions,
  onImport,
  isImporting,
}: {
  transactions: ImportedTransaction[];
  onImport: (selected: Set<number>) => void;
  isImporting: boolean;
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
        <h3 className="font-semibold text-white">
          Preview ({selected.size} of {transactions.length} selected)
        </h3>
        <div className="flex gap-2">
          <button onClick={toggleAll} className="btn-secondary text-sm">
            {selected.size === transactions.length ? 'Deselect All' : 'Select All'}
          </button>
          <button
            onClick={() => onImport(selected)}
            disabled={isImporting || selected.size === 0}
            className="btn-primary text-sm"
          >
            {isImporting ? 'Importing...' : `Import ${selected.size} Transactions`}
          </button>
        </div>
      </div>

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
            <th className="p-3 text-slate-300 font-medium">Type</th>
            <th className="p-3 text-slate-300 font-medium text-right">Qty</th>
            <th className="p-3 text-slate-300 font-medium text-right">Price</th>
            <th className="p-3 text-slate-300 font-medium">Date</th>
            <th className="p-3 text-slate-300 font-medium">Source</th>
          </tr>
        </thead>
        <tbody>
          {transactions.map((tx, idx) => (
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
                {tx.name && <p className="text-xs text-slate-400 truncate max-w-[150px]">{tx.name}</p>}
              </td>
              <td className="p-3">
                <span className={`badge ${
                  tx.type === 'BUY' || tx.type === 'SIP' ? 'badge-green' : 'badge-red'
                }`}>
                  {tx.type}
                </span>
              </td>
              <td className="p-3 text-right text-white">{tx.quantity}</td>
              <td className="p-3 text-right text-white">₹{tx.price.toLocaleString()}</td>
              <td className="p-3 text-slate-300">{tx.date}</td>
              <td className="p-3 text-slate-400 text-sm">{tx.source}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
