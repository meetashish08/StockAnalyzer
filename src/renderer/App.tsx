import React, { useMemo } from 'react';
import { Routes, Route, NavLink } from 'react-router-dom';
import Dashboard from './components/Dashboard/Dashboard';
import Portfolio from './components/Portfolio/Portfolio';
import Recommendations from './components/Recommendations/Recommendations';
import StockPickerPage from './components/StockPicker/StockPickerPage';
import Analytics from './components/Analytics/Analytics';
import ImportData from './components/Import/ImportData';
import AIChat from './components/AIChat/AIChat';
import TaxAnalysis from './components/TaxAnalysis/TaxAnalysis';
import LearnPage from './components/Learn/LearnPage';
import StockDetailModal from './components/StockDetail/StockDetailModal';
import { useStore } from './store/useStore';
import type { Holding } from '../shared/types';

const navItems = [
  { path: '/', label: 'Dashboard', icon: '📊' },
  { path: '/portfolio', label: 'Portfolio', icon: '💼' },
  { path: '/stock-picker', label: 'Stock Picker', icon: '🎯' },
  { path: '/learn', label: 'Learn', icon: '📚' },
  { path: '/recommendations', label: 'Recommendations', icon: '💡' },
  { path: '/analytics', label: 'Analytics', icon: '📈' },
  { path: '/tax-analysis', label: 'Tax Analysis', icon: '🧾' },
  { path: '/import', label: 'Import', icon: '📥' },
  { path: '/ai-chat', label: 'AI Assistant', icon: '🤖' },
];

function App() {
  const { selectedStockForDetail, setSelectedStockForDetail, holdings } = useStore();

  // Convert selectedStockForDetail to Holding format for StockDetailModal
  const selectedHoldingForModal = useMemo((): Holding | null => {
    if (!selectedStockForDetail) return null;

    // Try to find existing holding
    const existingHolding = holdings.find(
      h => h.symbol === selectedStockForDetail.symbol && h.market === selectedStockForDetail.market
    );

    if (existingHolding) {
      return existingHolding;
    }

    // Create a minimal holding for stocks not in portfolio
    return {
      id: -1, // Temporary ID for non-portfolio stocks
      symbol: selectedStockForDetail.symbol,
      market: selectedStockForDetail.market as any,
      name: selectedStockForDetail.name || selectedStockForDetail.symbol,
      quantity: 0,
      avgPrice: 0,
      purchaseDate: new Date().toISOString(),
      type: 'STOCK',
      createdAt: new Date().toISOString(),
    };
  }, [selectedStockForDetail, holdings]);

  return (
    <div className="flex min-h-screen bg-slate-900">
      {/* Sidebar */}
      <aside className="w-64 bg-slate-800 border-r border-slate-700 flex flex-col">
        {/* Logo */}
        <div className="p-6 border-b border-slate-700">
          <h1 className="text-xl font-bold text-white flex items-center gap-2">
            <span className="text-2xl">📈</span>
            Stock Analyzer
          </h1>
          <p className="text-xs text-slate-400 mt-1">India & US Markets</p>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-4">
          <ul className="space-y-2">
            {navItems.map((item) => (
              <li key={item.path}>
                <NavLink
                  to={item.path}
                  className={({ isActive }) =>
                    `flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200 ${
                      isActive
                        ? 'bg-green-600 text-white'
                        : 'text-slate-300 hover:bg-slate-700 hover:text-white'
                    }`
                  }
                >
                  <span className="text-lg">{item.icon}</span>
                  <span className="font-medium">{item.label}</span>
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>

        {/* Footer */}
        <div className="p-4 border-t border-slate-700">
          <div className="text-xs text-slate-400 text-center">
            <p>Market data from Yahoo Finance</p>
            <p className="mt-1">v1.0.0</p>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-auto">
        <div className="p-6">
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/portfolio" element={<Portfolio />} />
            <Route path="/stock-picker" element={<StockPickerPage />} />
            <Route path="/learn" element={<LearnPage />} />
            <Route path="/recommendations" element={<Recommendations />} />
            <Route path="/analytics" element={<Analytics />} />
            <Route path="/tax-analysis" element={<TaxAnalysis />} />
            <Route path="/import" element={<ImportData />} />
            <Route path="/ai-chat" element={<AIChat />} />
          </Routes>
        </div>
      </main>

      {/* Global Stock Detail Modal */}
      {selectedHoldingForModal && (
        <StockDetailModal
          holding={selectedHoldingForModal}
          onClose={() => setSelectedStockForDetail(null)}
        />
      )}
    </div>
  );
}

export default App;
