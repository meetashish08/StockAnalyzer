import React, { useState, useEffect } from 'react';

type Module = 'fundamentals' | 'metrics' | 'technical' | 'criteria' | 'portfolio-mgmt' | 'success';

interface CalculatorState {
  pePrice: string;
  peEps: string;
  cagrStart: string;
  cagrEnd: string;
  cagrYears: string;
  divAnnual: string;
  divPrice: string;
}

export default function LearnPage() {
  const [activeModule, setActiveModule] = useState<Module>('fundamentals');
  const [completedModules, setCompletedModules] = useState<Set<Module>>(new Set());
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set());
  const [calculators, setCalculators] = useState<CalculatorState>({
    pePrice: '',
    peEps: '',
    cagrStart: '',
    cagrEnd: '',
    cagrYears: '',
    divAnnual: '',
    divPrice: '',
  });

  useEffect(() => {
    const saved = localStorage.getItem('completedModules');
    if (saved) {
      setCompletedModules(new Set(JSON.parse(saved)));
    }
  }, []);

  const markComplete = (module: Module) => {
    const updated = new Set(completedModules);
    updated.add(module);
    setCompletedModules(updated);
    localStorage.setItem('completedModules', JSON.stringify(Array.from(updated)));
  };

  const toggleSection = (section: string) => {
    const updated = new Set(expandedSections);
    if (updated.has(section)) {
      updated.delete(section);
    } else {
      updated.add(section);
    }
    setExpandedSections(updated);
  };

  const calculatePE = () => {
    const price = parseFloat(calculators.pePrice);
    const eps = parseFloat(calculators.peEps);
    if (price && eps) return (price / eps).toFixed(2);
    return '-';
  };

  const calculateCAGR = () => {
    const start = parseFloat(calculators.cagrStart);
    const end = parseFloat(calculators.cagrEnd);
    const years = parseFloat(calculators.cagrYears);
    if (start && end && years) {
      const cagr = (Math.pow(end / start, 1 / years) - 1) * 100;
      return cagr.toFixed(2);
    }
    return '-';
  };

  const calculateDivYield = () => {
    const annual = parseFloat(calculators.divAnnual);
    const price = parseFloat(calculators.divPrice);
    if (annual && price) return ((annual / price) * 100).toFixed(2);
    return '-';
  };

  const modules = [
    { id: 'fundamentals' as Module, title: 'Stock Market Fundamentals', icon: '📈' },
    { id: 'metrics' as Module, title: 'Financial Metrics & Calculations', icon: '🧮' },
    { id: 'technical' as Module, title: 'Technical Analysis Basics', icon: '📊' },
    { id: 'criteria' as Module, title: 'Criteria for Good Stocks', icon: '✅' },
    { id: 'portfolio-mgmt' as Module, title: 'Portfolio Management', icon: '💼' },
    { id: 'success' as Module, title: 'Success Criteria & Benchmarks', icon: '🎯' },
  ];

  const progressPercent = (completedModules.size / modules.length) * 100;

  return (
    <div className="flex h-screen overflow-hidden animate-fade-in">
      {/* Sidebar */}
      <div className="w-64 bg-slate-800 border-r border-slate-700 overflow-y-auto">
        <div className="p-6">
          <h2 className="text-xl font-bold text-white mb-2 flex items-center gap-2">
            📚 Learn
          </h2>
          <p className="text-sm text-slate-400 mb-4">Master stock market investing</p>

          {/* Progress */}
          <div className="mb-6">
            <div className="flex justify-between text-xs text-slate-400 mb-1">
              <span>Progress</span>
              <span>{completedModules.size}/{modules.length}</span>
            </div>
            <div className="w-full bg-slate-700 rounded-full h-2">
              <div
                className="bg-green-500 h-2 rounded-full transition-all"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>

          {/* Module Navigation */}
          <nav className="space-y-1">
            {modules.map((module) => (
              <button
                key={module.id}
                onClick={() => setActiveModule(module.id)}
                className={`w-full text-left px-3 py-2 rounded-lg transition-colors flex items-center gap-2 ${
                  activeModule === module.id
                    ? 'bg-slate-700 text-white'
                    : 'text-slate-400 hover:bg-slate-700/50 hover:text-white'
                }`}
              >
                <span className="text-lg">{module.icon}</span>
                <span className="text-sm flex-1">{module.title}</span>
                {completedModules.has(module.id) && (
                  <span className="text-green-500">✓</span>
                )}
              </button>
            ))}
          </nav>

          {/* Search */}
          <div className="mt-6">
            <input
              type="text"
              placeholder="Search topics..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full px-3 py-2 bg-slate-700 text-white text-sm rounded-lg border border-slate-600 focus:outline-none focus:border-blue-500"
            />
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-y-auto bg-slate-900">
        <div className="max-w-4xl mx-auto p-8">
          {/* Module 1: Fundamentals */}
          {activeModule === 'fundamentals' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h1 className="text-3xl font-bold text-white flex items-center gap-3">
                  📈 Stock Market Fundamentals
                </h1>
                <button
                  onClick={() => markComplete('fundamentals')}
                  className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm"
                >
                  {completedModules.has('fundamentals') ? '✓ Completed' : 'Mark Complete'}
                </button>
              </div>

              <Section title="What is a Stock/Share?">
                <InfoBox type="info">
                  A <strong>stock</strong> (or share) represents ownership in a company. When you buy a stock, you become a partial owner of that company and are entitled to a portion of its profits and assets.
                </InfoBox>
                <Example title="Real Example">
                  If TCS has 3,650 million shares outstanding and you own 1,000 shares, you own:<br/>
                  <code className="text-blue-400">1,000 / 3,650,000,000 = 0.0000274% of TCS</code>
                </Example>
              </Section>

              <Section title="Stock Exchanges">
                <div className="grid grid-cols-2 gap-4">
                  <Card>
                    <h4 className="font-semibold text-white mb-2">🇮🇳 Indian Exchanges</h4>
                    <ul className="text-sm text-slate-300 space-y-1">
                      <li>• <strong>NSE</strong> (National Stock Exchange)</li>
                      <li>• <strong>BSE</strong> (Bombay Stock Exchange)</li>
                      <li>• Trading Hours: 9:15 AM - 3:30 PM IST</li>
                    </ul>
                  </Card>
                  <Card>
                    <h4 className="font-semibold text-white mb-2">🇺🇸 US Exchanges</h4>
                    <ul className="text-sm text-slate-300 space-y-1">
                      <li>• <strong>NYSE</strong> (New York Stock Exchange)</li>
                      <li>• <strong>NASDAQ</strong> (Tech-heavy exchange)</li>
                      <li>• Trading Hours: 9:30 AM - 4:00 PM ET</li>
                    </ul>
                  </Card>
                </div>
              </Section>

              <Section title="How Stock Prices Are Determined">
                <InfoBox type="info">
                  Stock prices are determined by <strong>supply and demand</strong>:
                  <ul className="mt-2 space-y-1">
                    <li>• More buyers than sellers = Price goes UP ⬆️</li>
                    <li>• More sellers than buyers = Price goes DOWN ⬇️</li>
                  </ul>
                </InfoBox>
                <Example title="Factors Affecting Demand">
                  <strong>Positive Factors (Price ⬆️):</strong>
                  <ul className="text-sm space-y-1 mt-2">
                    <li>✅ Strong earnings report</li>
                    <li>✅ New product launch success</li>
                    <li>✅ Industry tailwinds</li>
                    <li>✅ Positive analyst upgrades</li>
                  </ul>
                  <strong className="block mt-3">Negative Factors (Price ⬇️):</strong>
                  <ul className="text-sm space-y-1 mt-2">
                    <li>❌ Missed earnings expectations</li>
                    <li>❌ Regulatory issues</li>
                    <li>❌ Management scandals</li>
                    <li>❌ Economic recession</li>
                  </ul>
                </Example>
              </Section>

              <Section title="Market Capitalization">
                <InfoBox type="info">
                  <strong>Market Cap</strong> = Stock Price × Total Shares Outstanding<br/>
                  This represents the total value of a company.
                </InfoBox>
                <div className="grid grid-cols-3 gap-4 mt-4">
                  <Card>
                    <h4 className="font-semibold text-green-400 mb-2">Large Cap</h4>
                    <p className="text-sm text-slate-300">&gt; ₹20,000 Cr</p>
                    <p className="text-xs text-slate-400 mt-2">Stable, low risk</p>
                    <p className="text-xs text-slate-500 mt-1">Examples: TCS, Reliance, HDFC Bank</p>
                  </Card>
                  <Card>
                    <h4 className="font-semibold text-yellow-400 mb-2">Mid Cap</h4>
                    <p className="text-sm text-slate-300">₹5,000 - ₹20,000 Cr</p>
                    <p className="text-xs text-slate-400 mt-2">Moderate growth, medium risk</p>
                    <p className="text-xs text-slate-500 mt-1">Examples: Dixon, Polycab</p>
                  </Card>
                  <Card>
                    <h4 className="font-semibold text-orange-400 mb-2">Small Cap</h4>
                    <p className="text-sm text-slate-300">&lt; ₹5,000 Cr</p>
                    <p className="text-xs text-slate-400 mt-2">High growth, high risk</p>
                    <p className="text-xs text-slate-500 mt-1">Examples: Varun Beverages</p>
                  </Card>
                </div>
              </Section>

              <Section title="Bull vs Bear Markets">
                <div className="grid grid-cols-2 gap-4">
                  <Card className="border-l-4 border-green-500">
                    <h4 className="font-semibold text-green-400 mb-2">🐂 Bull Market</h4>
                    <p className="text-sm text-slate-300">Rising prices, optimism, economic growth</p>
                    <ul className="text-xs text-slate-400 mt-2 space-y-1">
                      <li>• Prices up 20%+ from lows</li>
                      <li>• Investor confidence high</li>
                      <li>• Good time to invest</li>
                    </ul>
                  </Card>
                  <Card className="border-l-4 border-red-500">
                    <h4 className="font-semibold text-red-400 mb-2">🐻 Bear Market</h4>
                    <p className="text-sm text-slate-300">Falling prices, pessimism, economic downturn</p>
                    <ul className="text-xs text-slate-400 mt-2 space-y-1">
                      <li>• Prices down 20%+ from highs</li>
                      <li>• Investor fear prevalent</li>
                      <li>• Opportunity for long-term buyers</li>
                    </ul>
                  </Card>
                </div>
              </Section>

              <Section title="Dividends Explained">
                <InfoBox type="success">
                  <strong>Dividend</strong> = A portion of company profits paid to shareholders<br/>
                  Typically paid quarterly (US) or annually (India)
                </InfoBox>
                <Example title="Example: HDFC Bank">
                  Annual Dividend: ₹19 per share<br/>
                  Stock Price: ₹1,650<br/>
                  <code className="text-blue-400">Dividend Yield = (19 / 1,650) × 100 = 1.15%</code><br/>
                  <p className="text-sm text-slate-400 mt-2">If you own 100 shares, you receive ₹1,900/year</p>
                </Example>
              </Section>

              <Section title="Stock Splits">
                <InfoBox type="info">
                  A <strong>stock split</strong> increases the number of shares while reducing the price proportionally. Total value remains the same.
                </InfoBox>
                <Example title="Example: 2-for-1 Split">
                  <strong>Before Split:</strong><br/>
                  • You own: 10 shares @ ₹2,000 each = ₹20,000 total<br/><br/>
                  <strong>After 2:1 Split:</strong><br/>
                  • You own: 20 shares @ ₹1,000 each = ₹20,000 total<br/><br/>
                  <span className="text-green-400">✅ Makes stock more affordable for retail investors</span>
                </Example>
              </Section>
            </div>
          )}

          {/* Module 2: Financial Metrics */}
          {activeModule === 'metrics' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h1 className="text-3xl font-bold text-white flex items-center gap-3">
                  🧮 Financial Metrics & Calculations
                </h1>
                <button
                  onClick={() => markComplete('metrics')}
                  className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm"
                >
                  {completedModules.has('metrics') ? '✓ Completed' : 'Mark Complete'}
                </button>
              </div>

              <Section title="P/E Ratio (Price-to-Earnings)">
                <InfoBox type="info">
                  <strong>Formula:</strong> <code className="text-blue-400">P/E = Stock Price / Earnings Per Share (EPS)</code><br/><br/>
                  Measures how much investors pay for each rupee/dollar of earnings
                </InfoBox>

                {/* P/E Calculator */}
                <Card className="bg-slate-800">
                  <h4 className="font-semibold text-white mb-3">📊 P/E Ratio Calculator</h4>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-sm text-slate-400">Stock Price</label>
                      <input
                        type="number"
                        value={calculators.pePrice}
                        onChange={(e) => setCalculators({...calculators, pePrice: e.target.value})}
                        className="w-full px-3 py-2 bg-slate-700 text-white rounded mt-1"
                        placeholder="e.g., 3500"
                      />
                    </div>
                    <div>
                      <label className="text-sm text-slate-400">EPS (Earnings Per Share)</label>
                      <input
                        type="number"
                        value={calculators.peEps}
                        onChange={(e) => setCalculators({...calculators, peEps: e.target.value})}
                        className="w-full px-3 py-2 bg-slate-700 text-white rounded mt-1"
                        placeholder="e.g., 140"
                      />
                    </div>
                  </div>
                  <div className="mt-4 p-3 bg-slate-900 rounded text-center">
                    <p className="text-sm text-slate-400">P/E Ratio</p>
                    <p className="text-2xl font-bold text-green-400">{calculatePE()}</p>
                  </div>
                </Card>

                <Example title="Interpretation Guide">
                  <ul className="space-y-2">
                    <li><strong className="text-green-400">Low P/E (&lt;15):</strong> Potentially undervalued or slow-growth company</li>
                    <li><strong className="text-yellow-400">Medium P/E (15-25):</strong> Fairly valued, stable growth</li>
                    <li><strong className="text-orange-400">High P/E (&gt;25):</strong> Growth stock or potentially overvalued</li>
                  </ul>
                  <InfoBox type="warning" className="mt-3">
                    ⚠️ Always compare P/E with industry peers! Tech companies typically have higher P/E than banks.
                  </InfoBox>
                </Example>
              </Section>

              <Section title="ROE (Return on Equity)">
                <InfoBox type="info">
                  <strong>Formula:</strong> <code className="text-blue-400">ROE = (Net Income / Shareholders' Equity) × 100</code><br/><br/>
                  Measures how efficiently a company generates profit from equity
                </InfoBox>
                <div className="grid grid-cols-3 gap-3 mt-4">
                  <Card className="border-l-4 border-red-500">
                    <p className="text-sm text-slate-400">Poor</p>
                    <p className="text-xl font-bold text-red-400">&lt; 10%</p>
                  </Card>
                  <Card className="border-l-4 border-yellow-500">
                    <p className="text-sm text-slate-400">Good</p>
                    <p className="text-xl font-bold text-yellow-400">15-20%</p>
                  </Card>
                  <Card className="border-l-4 border-green-500">
                    <p className="text-sm text-slate-400">Excellent</p>
                    <p className="text-xl font-bold text-green-400">&gt; 20%</p>
                  </Card>
                </div>
                <Example title="Real Example: Asian Paints">
                  Net Income: ₹3,000 Cr<br/>
                  Shareholders' Equity: ₹12,000 Cr<br/>
                  <code className="text-blue-400">ROE = (3,000 / 12,000) × 100 = 25%</code><br/>
                  <span className="text-green-400 mt-2 block">✅ Excellent efficiency! Company generates ₹25 for every ₹100 of equity</span>
                </Example>
              </Section>

              <Section title="P/B Ratio (Price-to-Book)">
                <InfoBox type="info">
                  <strong>Formula:</strong> <code className="text-blue-400">P/B = Stock Price / Book Value Per Share</code><br/><br/>
                  Compares market price to accounting book value
                </InfoBox>
                <Example title="Interpretation">
                  <ul className="space-y-2">
                    <li><strong>P/B &lt; 1:</strong> Trading below book value (value stock or distressed)</li>
                    <li><strong>P/B = 1-3:</strong> Fairly valued</li>
                    <li><strong>P/B &gt; 3:</strong> Premium valuation (growth/brand value)</li>
                  </ul>
                </Example>
              </Section>

              <Section title="EPS (Earnings Per Share)">
                <InfoBox type="info">
                  <strong>Formula:</strong> <code className="text-blue-400">EPS = Net Income / Total Shares Outstanding</code><br/><br/>
                  Profit allocated to each share. Higher EPS = more profitable
                </InfoBox>
                <Example title="Growth Analysis">
                  <table className="w-full text-sm mt-3">
                    <thead>
                      <tr className="text-left text-slate-400 border-b border-slate-700">
                        <th className="pb-2">Year</th>
                        <th className="pb-2">EPS</th>
                        <th className="pb-2">Growth</th>
                      </tr>
                    </thead>
                    <tbody className="text-slate-300">
                      <tr><td>2022</td><td>₹100</td><td>-</td></tr>
                      <tr><td>2023</td><td>₹115</td><td className="text-green-400">+15%</td></tr>
                      <tr><td>2024</td><td>₹132</td><td className="text-green-400">+14.8%</td></tr>
                    </tbody>
                  </table>
                  <p className="text-green-400 mt-2">✅ Consistent EPS growth indicates strong business performance</p>
                </Example>
              </Section>

              <Section title="Dividend Yield">
                <InfoBox type="info">
                  <strong>Formula:</strong> <code className="text-blue-400">Dividend Yield = (Annual Dividend / Stock Price) × 100</code><br/><br/>
                  Percentage return from dividends alone
                </InfoBox>

                {/* Dividend Calculator */}
                <Card className="bg-slate-800">
                  <h4 className="font-semibold text-white mb-3">💰 Dividend Yield Calculator</h4>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-sm text-slate-400">Annual Dividend</label>
                      <input
                        type="number"
                        value={calculators.divAnnual}
                        onChange={(e) => setCalculators({...calculators, divAnnual: e.target.value})}
                        className="w-full px-3 py-2 bg-slate-700 text-white rounded mt-1"
                        placeholder="e.g., 25"
                      />
                    </div>
                    <div>
                      <label className="text-sm text-slate-400">Stock Price</label>
                      <input
                        type="number"
                        value={calculators.divPrice}
                        onChange={(e) => setCalculators({...calculators, divPrice: e.target.value})}
                        className="w-full px-3 py-2 bg-slate-700 text-white rounded mt-1"
                        placeholder="e.g., 500"
                      />
                    </div>
                  </div>
                  <div className="mt-4 p-3 bg-slate-900 rounded text-center">
                    <p className="text-sm text-slate-400">Dividend Yield</p>
                    <p className="text-2xl font-bold text-green-400">{calculateDivYield()}%</p>
                  </div>
                </Card>

                <Example title="Typical Ranges">
                  <ul className="space-y-2">
                    <li><strong>&lt; 2%:</strong> Growth companies (reinvest profits)</li>
                    <li><strong>2-4%:</strong> Balanced companies</li>
                    <li><strong>&gt; 4%:</strong> Dividend-focused (utilities, REITs)</li>
                    <li><strong>&gt; 7%:</strong> ⚠️ Too high - may be unsustainable</li>
                  </ul>
                </Example>
              </Section>

              <Section title="Debt-to-Equity Ratio">
                <InfoBox type="info">
                  <strong>Formula:</strong> <code className="text-blue-400">D/E = Total Debt / Shareholders' Equity</code><br/><br/>
                  Measures financial leverage and risk
                </InfoBox>
                <div className="grid grid-cols-3 gap-3 mt-4">
                  <Card className="border-l-4 border-green-500">
                    <p className="text-sm text-slate-400">Low Risk</p>
                    <p className="text-xl font-bold text-green-400">&lt; 0.5</p>
                    <p className="text-xs text-slate-500 mt-1">Conservative</p>
                  </Card>
                  <Card className="border-l-4 border-yellow-500">
                    <p className="text-sm text-slate-400">Moderate</p>
                    <p className="text-xl font-bold text-yellow-400">0.5 - 1.0</p>
                    <p className="text-xs text-slate-500 mt-1">Balanced</p>
                  </Card>
                  <Card className="border-l-4 border-red-500">
                    <p className="text-sm text-slate-400">High Risk</p>
                    <p className="text-xl font-bold text-red-400">&gt; 1.0</p>
                    <p className="text-xs text-slate-500 mt-1">Leveraged</p>
                  </Card>
                </div>
              </Section>

              <Section title="CAGR (Compound Annual Growth Rate)">
                <InfoBox type="info">
                  <strong>Formula:</strong> <code className="text-blue-400">CAGR = [(Ending Value / Beginning Value)^(1/Years)] - 1</code><br/><br/>
                  Smoothed annual growth rate over time
                </InfoBox>

                {/* CAGR Calculator */}
                <Card className="bg-slate-800">
                  <h4 className="font-semibold text-white mb-3">📈 CAGR Calculator</h4>
                  <div className="grid grid-cols-3 gap-3">
                    <div>
                      <label className="text-sm text-slate-400">Starting Value</label>
                      <input
                        type="number"
                        value={calculators.cagrStart}
                        onChange={(e) => setCalculators({...calculators, cagrStart: e.target.value})}
                        className="w-full px-3 py-2 bg-slate-700 text-white rounded mt-1"
                        placeholder="e.g., 100000"
                      />
                    </div>
                    <div>
                      <label className="text-sm text-slate-400">Ending Value</label>
                      <input
                        type="number"
                        value={calculators.cagrEnd}
                        onChange={(e) => setCalculators({...calculators, cagrEnd: e.target.value})}
                        className="w-full px-3 py-2 bg-slate-700 text-white rounded mt-1"
                        placeholder="e.g., 200000"
                      />
                    </div>
                    <div>
                      <label className="text-sm text-slate-400">Years</label>
                      <input
                        type="number"
                        value={calculators.cagrYears}
                        onChange={(e) => setCalculators({...calculators, cagrYears: e.target.value})}
                        className="w-full px-3 py-2 bg-slate-700 text-white rounded mt-1"
                        placeholder="e.g., 5"
                      />
                    </div>
                  </div>
                  <div className="mt-4 p-3 bg-slate-900 rounded text-center">
                    <p className="text-sm text-slate-400">CAGR</p>
                    <p className="text-2xl font-bold text-green-400">{calculateCAGR()}%</p>
                  </div>
                </Card>

                <Example title="Benchmark Returns">
                  <ul className="space-y-1">
                    <li><strong>8-10%:</strong> Conservative/Fixed Income</li>
                    <li><strong>12-15%:</strong> Good equity returns</li>
                    <li><strong>18%+:</strong> Excellent performance</li>
                  </ul>
                </Example>
              </Section>
            </div>
          )}

          {/* Module 3: Technical Analysis - Due to length, showing structure */}
          {activeModule === 'technical' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h1 className="text-3xl font-bold text-white flex items-center gap-3">
                  📊 Technical Analysis Basics
                </h1>
                <button
                  onClick={() => markComplete('technical')}
                  className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm"
                >
                  {completedModules.has('technical') ? '✓ Completed' : 'Mark Complete'}
                </button>
              </div>

              <InfoBox type="info">
                Technical analysis uses historical price and volume data to predict future price movements.
              </InfoBox>

              <Section title="Moving Averages (MA)">
                <InfoBox type="info">
                  A <strong>Moving Average</strong> smooths price data by averaging over a period.<br/><br/>
                  <code className="text-blue-400">SMA = (Sum of closing prices over N days) / N</code>
                </InfoBox>
                <div className="grid grid-cols-2 gap-4 mt-4">
                  <Card>
                    <h4 className="font-semibold text-blue-400 mb-2">50-Day DMA</h4>
                    <p className="text-sm text-slate-300">Short to medium-term trend</p>
                    <ul className="text-xs text-slate-400 mt-2 space-y-1">
                      <li>• Price above 50 DMA = Bullish</li>
                      <li>• Price below 50 DMA = Bearish</li>
                      <li>• Used by active traders</li>
                    </ul>
                  </Card>
                  <Card>
                    <h4 className="font-semibold text-orange-400 mb-2">200-Day DMA</h4>
                    <p className="text-sm text-slate-300">Long-term trend indicator</p>
                    <ul className="text-xs text-slate-400 mt-2 space-y-1">
                      <li>• Price above 200 DMA = Strong uptrend</li>
                      <li>• Price below 200 DMA = Weak/downtrend</li>
                      <li>• Most watched by institutions</li>
                    </ul>
                  </Card>
                </div>
              </Section>

              <Section title="Golden Cross & Death Cross">
                <div className="grid grid-cols-2 gap-4">
                  <Card className="border-l-4 border-green-500">
                    <h4 className="font-semibold text-green-400 mb-2">✨ Golden Cross</h4>
                    <p className="text-sm text-slate-300 mb-2">50 DMA crosses <strong>above</strong> 200 DMA</p>
                    <InfoBox type="success">
                      <strong>Signal:</strong> Strong bullish indicator<br/>
                      <strong>Action:</strong> Consider buying<br/>
                      <strong>Historical accuracy:</strong> 65-70%
                    </InfoBox>
                  </Card>
                  <Card className="border-l-4 border-red-500">
                    <h4 className="font-semibold text-red-400 mb-2">💀 Death Cross</h4>
                    <p className="text-sm text-slate-300 mb-2">50 DMA crosses <strong>below</strong> 200 DMA</p>
                    <InfoBox type="warning">
                      <strong>Signal:</strong> Strong bearish indicator<br/>
                      <strong>Action:</strong> Consider selling/hedging<br/>
                      <strong>Historical accuracy:</strong> 60-65%
                    </InfoBox>
                  </Card>
                </div>
              </Section>

              <Section title="RSI (Relative Strength Index)">
                <InfoBox type="info">
                  <strong>RSI</strong> measures momentum on a 0-100 scale<br/><br/>
                  Formula: <code className="text-blue-400">RSI = 100 - [100 / (1 + RS)]</code><br/>
                  where RS = Average Gain / Average Loss over 14 days
                </InfoBox>
                <div className="bg-slate-800 rounded-lg p-4 mt-4">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm text-slate-400">RSI Scale</span>
                  </div>
                  <div className="relative h-12 bg-gradient-to-r from-red-500 via-yellow-500 to-green-500 rounded">
                    <div className="absolute inset-0 flex justify-between items-center px-2 text-xs font-bold text-white">
                      <span>0</span>
                      <span>30</span>
                      <span>50</span>
                      <span>70</span>
                      <span>100</span>
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-2 mt-3 text-sm">
                    <div className="text-center">
                      <p className="text-red-400 font-semibold">&lt; 30</p>
                      <p className="text-xs text-slate-400">Oversold (Buy signal)</p>
                    </div>
                    <div className="text-center">
                      <p className="text-yellow-400 font-semibold">30-70</p>
                      <p className="text-xs text-slate-400">Neutral (Hold)</p>
                    </div>
                    <div className="text-center">
                      <p className="text-green-400 font-semibold">&gt; 70</p>
                      <p className="text-xs text-slate-400">Overbought (Sell signal)</p>
                    </div>
                  </div>
                </div>
              </Section>

              <Section title="MACD (Moving Average Convergence Divergence)">
                <InfoBox type="info">
                  MACD shows the relationship between two exponential moving averages
                </InfoBox>
                <Example title="How to Read MACD">
                  <ul className="space-y-2">
                    <li><strong className="text-green-400">MACD Line crosses above Signal Line:</strong> Bullish (buy signal)</li>
                    <li><strong className="text-red-400">MACD Line crosses below Signal Line:</strong> Bearish (sell signal)</li>
                    <li><strong>Histogram expanding:</strong> Trend strengthening</li>
                    <li><strong>Histogram shrinking:</strong> Trend weakening</li>
                  </ul>
                </Example>
              </Section>

              <Section title="Support & Resistance">
                <div className="grid grid-cols-2 gap-4">
                  <Card>
                    <h4 className="font-semibold text-green-400 mb-2">🛡️ Support Level</h4>
                    <p className="text-sm text-slate-300">Price level where buying interest prevents further decline</p>
                    <p className="text-xs text-slate-400 mt-2">Think of it as a "floor" where buyers step in</p>
                  </Card>
                  <Card>
                    <h4 className="font-semibold text-red-400 mb-2">🔝 Resistance Level</h4>
                    <p className="text-sm text-slate-300">Price level where selling pressure prevents further rise</p>
                    <p className="text-xs text-slate-400 mt-2">Think of it as a "ceiling" where sellers emerge</p>
                  </Card>
                </div>
                <InfoBox type="warning" className="mt-4">
                  When support breaks, it often becomes new resistance. When resistance breaks, it often becomes new support.
                </InfoBox>
              </Section>

              <Section title="Volume Analysis">
                <InfoBox type="info">
                  <strong>Volume</strong> = Number of shares traded<br/>
                  Confirms price movements and indicates strength of trends
                </InfoBox>
                <Example title="Volume Interpretation">
                  <ul className="space-y-2">
                    <li>✅ <strong>Price ⬆️ + High Volume:</strong> Strong uptrend (confident buyers)</li>
                    <li>⚠️ <strong>Price ⬆️ + Low Volume:</strong> Weak rally (may reverse)</li>
                    <li>✅ <strong>Price ⬇️ + High Volume:</strong> Strong downtrend (panic selling)</li>
                    <li>⚠️ <strong>Price ⬇️ + Low Volume:</strong> Weak decline (may rebound)</li>
                  </ul>
                </Example>
              </Section>
            </div>
          )}

          {/* Module 4: Criteria for Good Stocks */}
          {activeModule === 'criteria' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h1 className="text-3xl font-bold text-white flex items-center gap-3">
                  ✅ Criteria for Good Stocks
                </h1>
                <button
                  onClick={() => markComplete('criteria')}
                  className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm"
                >
                  {completedModules.has('criteria') ? '✓ Completed' : 'Mark Complete'}
                </button>
              </div>

              <Section title="Universal Quality Checklist">
                <Card className="bg-slate-800">
                  <h4 className="font-semibold text-white mb-4">✅ Must-Have Criteria</h4>
                  <div className="space-y-3">
                    {[
                      { text: 'Consistent revenue growth (>10% YoY)', metric: 'Revenue Growth', good: '>10%' },
                      { text: 'Strong profit margins (>15%)', metric: 'Net Margin', good: '>15%' },
                      { text: 'Low debt-to-equity (<0.5 for growth)', metric: 'D/E Ratio', good: '<0.5' },
                      { text: 'Good ROE (>15%)', metric: 'ROE', good: '>15%' },
                      { text: 'Competitive moat (brand/patents/network)', metric: 'Moat', good: 'Yes' },
                      { text: 'Strong management track record', metric: 'Management', good: 'Proven' },
                      { text: 'Growing market opportunity', metric: 'TAM', good: 'Expanding' },
                    ].map((item, idx) => (
                      <div key={idx} className="flex items-start gap-3 p-3 bg-slate-900 rounded">
                        <span className="text-green-500 text-xl">✓</span>
                        <div className="flex-1">
                          <p className="text-white">{item.text}</p>
                          <p className="text-xs text-slate-400 mt-1">
                            <span className="font-semibold">{item.metric}:</span> {item.good}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </Card>
              </Section>

              <Section title="Stock Categories & Criteria">
                <div className="space-y-4">
                  {/* Value Stocks */}
                  <Card className="border-l-4 border-blue-500">
                    <h4 className="font-semibold text-blue-400 mb-3">💎 Value Stocks</h4>
                    <p className="text-sm text-slate-300 mb-3">Undervalued companies with strong fundamentals</p>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-xs text-slate-400 mb-2">Key Criteria:</p>
                        <ul className="text-sm space-y-1">
                          <li>✅ Low P/E (&lt;15)</li>
                          <li>✅ Low P/B (&lt;3)</li>
                          <li>✅ High dividend yield (&gt;3%)</li>
                          <li>✅ Trading below intrinsic value</li>
                        </ul>
                      </div>
                      <div>
                        <p className="text-xs text-slate-400 mb-2">Examples:</p>
                        <ul className="text-sm space-y-1 text-slate-300">
                          <li>• Banks (HDFC, ICICI)</li>
                          <li>• Utilities (NTPC, Power Grid)</li>
                          <li>• Mature industrials</li>
                        </ul>
                      </div>
                    </div>
                    <InfoBox type="success" className="mt-3">
                      <strong>Strategy:</strong> Buy when undervalued, hold for 3-5 years
                    </InfoBox>
                  </Card>

                  {/* Growth Stocks */}
                  <Card className="border-l-4 border-green-500">
                    <h4 className="font-semibold text-green-400 mb-3">🚀 Growth Stocks</h4>
                    <p className="text-sm text-slate-300 mb-3">High-growth companies with expanding revenues</p>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-xs text-slate-400 mb-2">Key Criteria:</p>
                        <ul className="text-sm space-y-1">
                          <li>✅ Revenue growth &gt;20% YoY</li>
                          <li>✅ High ROE (&gt;20%)</li>
                          <li>✅ Expanding profit margins</li>
                          <li>✅ Large addressable market</li>
                        </ul>
                      </div>
                      <div>
                        <p className="text-xs text-slate-400 mb-2">Examples:</p>
                        <ul className="text-sm space-y-1 text-slate-300">
                          <li>• Tech (TCS, Infosys)</li>
                          <li>• New-age (Zomato, Nykaa)</li>
                          <li>• Electric vehicles</li>
                        </ul>
                      </div>
                    </div>
                    <InfoBox type="warning" className="mt-3">
                      <strong>Note:</strong> P/E may be high (25-40) but justified by growth
                    </InfoBox>
                  </Card>

                  {/* Dividend Stocks */}
                  <Card className="border-l-4 border-yellow-500">
                    <h4 className="font-semibold text-yellow-400 mb-3">💰 Dividend Stocks</h4>
                    <p className="text-sm text-slate-300 mb-3">Stable companies paying regular income</p>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-xs text-slate-400 mb-2">Key Criteria:</p>
                        <ul className="text-sm space-y-1">
                          <li>✅ 10+ year dividend history</li>
                          <li>✅ Dividend yield &gt;3%</li>
                          <li>✅ Payout ratio &lt;60%</li>
                          <li>✅ Strong cash flow</li>
                        </ul>
                      </div>
                      <div>
                        <p className="text-xs text-slate-400 mb-2">Examples:</p>
                        <ul className="text-sm space-y-1 text-slate-300">
                          <li>• ITC (dividend aristocrat)</li>
                          <li>• Coal India</li>
                          <li>• ONGC, IOC</li>
                        </ul>
                      </div>
                    </div>
                    <InfoBox type="info" className="mt-3">
                      <strong>Best for:</strong> Retirees and income-focused investors
                    </InfoBox>
                  </Card>
                </div>
              </Section>

              <Section title="Red Flags to Avoid">
                <Card className="bg-red-900/20 border border-red-500/50">
                  <h4 className="font-semibold text-red-400 mb-4">🚩 Warning Signs</h4>
                  <div className="space-y-2">
                    {[
                      'Declining revenue for 2+ consecutive quarters',
                      'Debt-to-equity > 2 (highly leveraged)',
                      'Negative cash flow from operations',
                      'Frequent management changes',
                      'Corporate governance issues',
                      'Pledged promoter shares > 50%',
                      'Consistent delays in financial reporting',
                      'Accounting irregularities or restatements',
                      'Loss of key customers (> 25% revenue)',
                      'Regulatory investigations or penalties',
                    ].map((flag, idx) => (
                      <div key={idx} className="flex items-start gap-2 text-sm text-slate-300">
                        <span className="text-red-500">❌</span>
                        <span>{flag}</span>
                      </div>
                    ))}
                  </div>
                </Card>
              </Section>

              <Section title="Competitive Moat Analysis">
                <InfoBox type="info">
                  A <strong>moat</strong> is a sustainable competitive advantage that protects profits
                </InfoBox>
                <div className="grid grid-cols-2 gap-4 mt-4">
                  {[
                    { title: '🏰 Brand Power', desc: 'Strong brand commands premium pricing', example: 'Asian Paints, Nestle' },
                    { title: '🔒 Patents/IP', desc: 'Intellectual property creates barriers', example: 'Pharma companies, Tech firms' },
                    { title: '🌐 Network Effects', desc: 'Value increases with more users', example: 'PayTM, Zomato, Facebook' },
                    { title: '💰 Cost Leadership', desc: 'Lowest cost producer in industry', example: 'Reliance, Amazon' },
                    { title: '🔄 Switching Costs', desc: 'High cost to change providers', example: 'Enterprise software, Banks' },
                    { title: '📜 Regulatory License', desc: 'Government approval required', example: 'Telecom, Insurance' },
                  ].map((moat, idx) => (
                    <Card key={idx}>
                      <h5 className="font-semibold text-blue-400 mb-1">{moat.title}</h5>
                      <p className="text-xs text-slate-300 mb-2">{moat.desc}</p>
                      <p className="text-xs text-slate-500">Ex: {moat.example}</p>
                    </Card>
                  ))}
                </div>
              </Section>
            </div>
          )}

          {/* Module 5: Portfolio Management */}
          {activeModule === 'portfolio-mgmt' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h1 className="text-3xl font-bold text-white flex items-center gap-3">
                  💼 How Portfolio Managers Decide
                </h1>
                <button
                  onClick={() => markComplete('portfolio-mgmt')}
                  className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm"
                >
                  {completedModules.has('portfolio-mgmt') ? '✓ Completed' : 'Mark Complete'}
                </button>
              </div>

              <Section title="Professional Investment Process">
                <div className="space-y-4">
                  {[
                    {
                      step: '1',
                      title: 'Top-Down Analysis',
                      desc: 'Macro to micro approach',
                      points: [
                        'Analyze macroeconomic trends (GDP, inflation, interest rates)',
                        'Identify growth sectors vs declining sectors',
                        'Sector rotation strategy based on economic cycle',
                        'Currency and commodity price impact',
                      ],
                    },
                    {
                      step: '2',
                      title: 'Stock Screening',
                      desc: 'Filter universe to shortlist',
                      points: [
                        'Apply quantitative filters (P/E, ROE, market cap)',
                        'Liquidity requirements (avg volume > 100K shares/day)',
                        'Create shortlist of 50-100 stocks from 5,000+',
                        'Use screeners and fundamental databases',
                      ],
                    },
                    {
                      step: '3',
                      title: 'Fundamental Analysis',
                      desc: 'Deep dive into companies',
                      points: [
                        'Read annual reports (10-K, 10-Q, AR)',
                        'Management quality assessment',
                        'Competitive position analysis (Porter\'s 5 Forces)',
                        'Financial statement deep dive (3-5 years)',
                        'DCF valuation and price target',
                      ],
                    },
                    {
                      step: '4',
                      title: 'Risk Assessment',
                      desc: 'Evaluate downside scenarios',
                      points: [
                        'Concentration limits (max 5-10% per stock)',
                        'Sector diversification (<25% per sector)',
                        'Beta analysis (volatility vs market)',
                        'Stress testing portfolio',
                      ],
                    },
                    {
                      step: '5',
                      title: 'Position Sizing',
                      desc: 'Allocate capital by conviction',
                      points: [
                        'High conviction: 5-8% allocation',
                        'Medium conviction: 2-4% allocation',
                        'Low conviction: 0.5-1% allocation',
                        'Total: 15-30 stocks optimal',
                      ],
                    },
                    {
                      step: '6',
                      title: 'Exit Strategy',
                      desc: 'Know when to sell',
                      points: [
                        'Stop loss: -15% to -20%',
                        'Target price achievement (sell 50%, hold rest)',
                        'Fundamental deterioration',
                        'Better opportunity elsewhere (opportunity cost)',
                      ],
                    },
                  ].map((process) => (
                    <Card key={process.step} className="border-l-4 border-blue-500">
                      <div className="flex items-start gap-3">
                        <div className="flex-shrink-0 w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center text-white font-bold">
                          {process.step}
                        </div>
                        <div className="flex-1">
                          <h4 className="font-semibold text-white mb-1">{process.title}</h4>
                          <p className="text-sm text-slate-400 mb-3">{process.desc}</p>
                          <ul className="space-y-1">
                            {process.points.map((point, idx) => (
                              <li key={idx} className="text-sm text-slate-300 flex items-start gap-2">
                                <span className="text-blue-400">•</span>
                                <span>{point}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              </Section>

              <Section title="Famous Investment Strategies">
                <div className="grid grid-cols-2 gap-4">
                  {[
                    {
                      name: 'Warren Buffett',
                      title: 'Value Investing',
                      principles: [
                        'Buy wonderful companies at fair prices',
                        'Economic moat is essential',
                        'Hold forever (long-term)',
                        'Circle of competence',
                      ],
                      key: 'Intrinsic value > Market price',
                    },
                    {
                      name: 'Peter Lynch',
                      title: 'Growth at Reasonable Price (GARP)',
                      principles: [
                        'Buy what you know',
                        'Look for 10-baggers',
                        'PEG ratio < 1 (PE/Growth rate)',
                        'Visit stores, use products',
                      ],
                      key: 'P/E should equal growth rate',
                    },
                    {
                      name: 'Benjamin Graham',
                      title: 'Deep Value',
                      principles: [
                        'Margin of safety (buy at 2/3 intrinsic value)',
                        'Focus on balance sheet',
                        'Ignore market emotions',
                        'Diversify (20-30 stocks)',
                      ],
                      key: 'Price < Book Value',
                    },
                    {
                      name: 'Cathie Wood',
                      title: 'Disruptive Innovation',
                      principles: [
                        'Focus on innovation (AI, genomics, blockchain)',
                        'High-growth companies',
                        '5-year investment horizon',
                        'Accept volatility for returns',
                      ],
                      key: 'Revolutionary technology',
                    },
                  ].map((strategy) => (
                    <Card key={strategy.name} className="bg-slate-800">
                      <h4 className="font-semibold text-green-400 mb-1">{strategy.name}</h4>
                      <p className="text-xs text-slate-400 mb-3">{strategy.title}</p>
                      <ul className="text-xs space-y-1 mb-3">
                        {strategy.principles.map((p, idx) => (
                          <li key={idx} className="text-slate-300">• {p}</li>
                        ))}
                      </ul>
                      <div className="pt-3 border-t border-slate-700">
                        <p className="text-xs text-blue-400">
                          <strong>Key:</strong> {strategy.key}
                        </p>
                      </div>
                    </Card>
                  ))}
                </div>
              </Section>

              <Section title="Diversification Guidelines">
                <div className="grid grid-cols-2 gap-4">
                  <Card>
                    <h4 className="font-semibold text-white mb-3">📊 Optimal Portfolio Mix</h4>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-slate-400">Number of stocks:</span>
                        <span className="text-white font-semibold">15-30</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400">Sectors:</span>
                        <span className="text-white font-semibold">5-7 different</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400">Max per stock:</span>
                        <span className="text-white font-semibold">8-10%</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400">Max per sector:</span>
                        <span className="text-white font-semibold">25%</span>
                      </div>
                    </div>
                  </Card>

                  <Card>
                    <h4 className="font-semibold text-white mb-3">🏢 Market Cap Allocation</h4>
                    <div className="space-y-2">
                      <div>
                        <div className="flex justify-between text-sm mb-1">
                          <span className="text-slate-400">Large Cap</span>
                          <span className="text-green-400">60%</span>
                        </div>
                        <div className="w-full bg-slate-700 rounded-full h-2">
                          <div className="bg-green-500 h-2 rounded-full" style={{ width: '60%' }} />
                        </div>
                      </div>
                      <div>
                        <div className="flex justify-between text-sm mb-1">
                          <span className="text-slate-400">Mid Cap</span>
                          <span className="text-yellow-400">25%</span>
                        </div>
                        <div className="w-full bg-slate-700 rounded-full h-2">
                          <div className="bg-yellow-500 h-2 rounded-full" style={{ width: '25%' }} />
                        </div>
                      </div>
                      <div>
                        <div className="flex justify-between text-sm mb-1">
                          <span className="text-slate-400">Small Cap</span>
                          <span className="text-orange-400">15%</span>
                        </div>
                        <div className="w-full bg-slate-700 rounded-full h-2">
                          <div className="bg-orange-500 h-2 rounded-full" style={{ width: '15%' }} />
                        </div>
                      </div>
                    </div>
                  </Card>
                </div>

                <InfoBox type="warning" className="mt-4">
                  <strong>Rule:</strong> Never put more than 10% in a single stock, no matter how confident you are!
                </InfoBox>
              </Section>

              <Section title="Rebalancing Strategy">
                <InfoBox type="info">
                  <strong>Rebalancing</strong> = Adjusting portfolio back to target allocation
                </InfoBox>
                <Example title="When to Rebalance">
                  <ul className="space-y-2">
                    <li>✅ <strong>Quarterly or Semi-annually:</strong> Check if any stock &gt; 12% (trim to 8-10%)</li>
                    <li>✅ <strong>After major market moves:</strong> If sector concentration &gt; 30%</li>
                    <li>✅ <strong>When fundamentals change:</strong> Deteriorating business quality</li>
                    <li>✅ <strong>Tax-loss harvesting:</strong> Sell losers in March for tax benefit</li>
                  </ul>
                </Example>
              </Section>
            </div>
          )}

          {/* Module 6: Success Criteria */}
          {activeModule === 'success' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h1 className="text-3xl font-bold text-white flex items-center gap-3">
                  🎯 Success Criteria & Benchmarks
                </h1>
                <button
                  onClick={() => markComplete('success')}
                  className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm"
                >
                  {completedModules.has('success') ? '✓ Completed' : 'Mark Complete'}
                </button>
              </div>

              <Section title="Portfolio Performance Metrics">
                <div className="space-y-4">
                  {[
                    {
                      name: 'Absolute Returns',
                      formula: '[(Ending Value - Beginning Value) / Beginning Value] × 100',
                      interpretation: 'Total gain/loss percentage over period',
                      good: '>12% annually',
                    },
                    {
                      name: 'CAGR',
                      formula: '[(Ending Value / Beginning Value)^(1/years)] - 1',
                      interpretation: 'Smoothed annual growth rate',
                      good: '12-15% long-term',
                    },
                    {
                      name: 'Alpha',
                      formula: 'Portfolio Return - Benchmark Return',
                      interpretation: 'Excess return vs market',
                      good: '+2% to +5%',
                    },
                    {
                      name: 'Beta',
                      formula: 'Covariance(Portfolio, Market) / Variance(Market)',
                      interpretation: 'Volatility vs market (1.0 = market risk)',
                      good: '0.8-1.2 (similar to market)',
                    },
                    {
                      name: 'Sharpe Ratio',
                      formula: '(Portfolio Return - Risk-free Rate) / Std Deviation',
                      interpretation: 'Risk-adjusted returns',
                      good: '>1 is good, >2 is excellent',
                    },
                    {
                      name: 'Max Drawdown',
                      formula: '(Trough Value - Peak Value) / Peak Value',
                      interpretation: 'Largest peak-to-trough decline',
                      good: '<25% (low risk)',
                    },
                  ].map((metric) => (
                    <Card key={metric.name} className="bg-slate-800">
                      <div className="flex justify-between items-start mb-2">
                        <h4 className="font-semibold text-blue-400">{metric.name}</h4>
                        <span className="text-xs bg-green-900/30 text-green-400 px-2 py-1 rounded">
                          {metric.good}
                        </span>
                      </div>
                      <code className="text-xs text-slate-400 block mb-2">{metric.formula}</code>
                      <p className="text-sm text-slate-300">{metric.interpretation}</p>
                    </Card>
                  ))}
                </div>
              </Section>

              <Section title="Benchmark Comparisons">
                <div className="grid grid-cols-2 gap-4">
                  <Card className="border-l-4 border-blue-500">
                    <h4 className="font-semibold text-white mb-3">🇮🇳 Indian Benchmarks</h4>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-slate-400">Nifty 50:</span>
                        <span className="text-white">~12% CAGR</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400">Sensex:</span>
                        <span className="text-white">~11% CAGR</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400">Nifty Midcap 100:</span>
                        <span className="text-white">~15% CAGR</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400">Nifty Smallcap 100:</span>
                        <span className="text-white">~17% CAGR</span>
                      </div>
                    </div>
                    <p className="text-xs text-slate-500 mt-3">Historical 10-year averages</p>
                  </Card>

                  <Card className="border-l-4 border-orange-500">
                    <h4 className="font-semibold text-white mb-3">🇺🇸 US Benchmarks</h4>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-slate-400">S&P 500:</span>
                        <span className="text-white">~10% CAGR</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400">NASDAQ:</span>
                        <span className="text-white">~12% CAGR</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400">Dow Jones:</span>
                        <span className="text-white">~8% CAGR</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400">Russell 2000:</span>
                        <span className="text-white">~9% CAGR</span>
                      </div>
                    </div>
                    <p className="text-xs text-slate-500 mt-3">Historical 10-year averages</p>
                  </Card>
                </div>
                <InfoBox type="success" className="mt-4">
                  <strong>Goal:</strong> Beat benchmark by 2-5% annually (after fees)
                </InfoBox>
              </Section>

              <Section title="Success by Investor Type">
                <div className="space-y-3">
                  {[
                    {
                      type: 'Conservative',
                      color: 'blue',
                      cagr: '8-10%',
                      drawdown: '<15%',
                      allocation: '60% Large Cap, 30% Debt, 10% Mid/Small',
                      horizon: '3-5 years',
                    },
                    {
                      type: 'Moderate',
                      color: 'yellow',
                      cagr: '12-15%',
                      drawdown: '15-25%',
                      allocation: '60% Large, 25% Mid, 15% Small',
                      horizon: '5-7 years',
                    },
                    {
                      type: 'Aggressive',
                      color: 'orange',
                      cagr: '18%+',
                      drawdown: '30%+ OK',
                      allocation: '40% Large, 35% Mid, 25% Small',
                      horizon: '7-10+ years',
                    },
                  ].map((profile) => (
                    <Card key={profile.type} className={`border-l-4 border-${profile.color}-500`}>
                      <h4 className={`font-semibold text-${profile.color}-400 mb-3`}>
                        {profile.type} Investor
                      </h4>
                      <div className="grid grid-cols-2 gap-3 text-sm">
                        <div>
                          <p className="text-slate-400 text-xs">Target CAGR</p>
                          <p className="text-white font-semibold">{profile.cagr}</p>
                        </div>
                        <div>
                          <p className="text-slate-400 text-xs">Max Drawdown</p>
                          <p className="text-white font-semibold">{profile.drawdown}</p>
                        </div>
                        <div>
                          <p className="text-slate-400 text-xs">Allocation</p>
                          <p className="text-white text-xs">{profile.allocation}</p>
                        </div>
                        <div>
                          <p className="text-slate-400 text-xs">Time Horizon</p>
                          <p className="text-white font-semibold">{profile.horizon}</p>
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              </Section>

              <Section title="Time Horizon Success Criteria">
                <Card className="bg-slate-800">
                  <table className="w-full">
                    <thead>
                      <tr className="text-left text-slate-400 border-b border-slate-700">
                        <th className="pb-2">Period</th>
                        <th className="pb-2">Goal</th>
                        <th className="pb-2">Multiplier</th>
                        <th className="pb-2">Beat</th>
                      </tr>
                    </thead>
                    <tbody className="text-white">
                      <tr className="border-b border-slate-700">
                        <td className="py-3">1 year</td>
                        <td>&gt; 7%</td>
                        <td>1.07x</td>
                        <td className="text-slate-400">Inflation</td>
                      </tr>
                      <tr className="border-b border-slate-700">
                        <td className="py-3">3 years</td>
                        <td>&gt; 9%</td>
                        <td>1.30x</td>
                        <td className="text-slate-400">FD returns</td>
                      </tr>
                      <tr className="border-b border-slate-700">
                        <td className="py-3">5 years</td>
                        <td>&gt; 14.4%</td>
                        <td className="text-green-400">2.0x</td>
                        <td className="text-slate-400">Double money</td>
                      </tr>
                      <tr className="border-b border-slate-700">
                        <td className="py-3">7 years</td>
                        <td>&gt; 15%</td>
                        <td className="text-green-400">2.66x</td>
                        <td className="text-slate-400">Market avg</td>
                      </tr>
                      <tr>
                        <td className="py-3">10 years</td>
                        <td>&gt; 12-15%</td>
                        <td className="text-green-400">3.0-4.0x</td>
                        <td className="text-slate-400">Wealth creation</td>
                      </tr>
                    </tbody>
                  </table>
                </Card>
                <InfoBox type="success" className="mt-4">
                  <strong>Rule of 72:</strong> Years to double = 72 / Annual Return %<br/>
                  Example: At 12% CAGR, money doubles in 72/12 = 6 years
                </InfoBox>
              </Section>

              <Section title="Checklist: Are You Succeeding?">
                <Card className="bg-slate-800">
                  <h4 className="font-semibold text-white mb-4">✅ Success Indicators</h4>
                  <div className="space-y-3">
                    {[
                      'Beating benchmark by 2-5% annually',
                      'CAGR > 12% over 5+ years',
                      'Maximum drawdown < 30% (acceptable for equity)',
                      'Win rate > 60% (60% stocks profitable)',
                      'Average gain > Average loss (2:1 ratio ideal)',
                      'Portfolio growing faster than inflation',
                      'Diversified (15-30 stocks, 5+ sectors)',
                      'Regular rebalancing (every 6-12 months)',
                      'Sticking to investment plan (not panic selling)',
                      'Learning from mistakes (maintaining journal)',
                    ].map((item, idx) => (
                      <div key={idx} className="flex items-start gap-3 p-2">
                        <input
                          type="checkbox"
                          className="mt-1 w-4 h-4 rounded border-slate-600 text-green-500 focus:ring-green-500"
                        />
                        <span className="text-sm text-slate-300">{item}</span>
                      </div>
                    ))}
                  </div>
                </Card>
              </Section>
            </div>
          )}

          {/* Completion Badge */}
          {progressPercent === 100 && (
            <Card className="bg-gradient-to-r from-green-900/50 to-blue-900/50 border border-green-500/50 text-center">
              <div className="text-6xl mb-3">🎓</div>
              <h3 className="text-2xl font-bold text-white mb-2">Congratulations!</h3>
              <p className="text-slate-300">
                You've completed all 6 modules. You're now equipped with the knowledge to become a successful investor!
              </p>
              <button className="mt-4 px-6 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-semibold">
                Download Certificate
              </button>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}

// Helper Components
function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="space-y-3">
      <h3 className="text-lg font-semibold text-white border-b border-slate-700 pb-2">{title}</h3>
      <div>{children}</div>
    </div>
  );
}

function Card({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`bg-slate-800/50 rounded-lg p-4 ${className}`}>
      {children}
    </div>
  );
}

function InfoBox({ type = 'info', children, className = '' }: { type?: 'info' | 'success' | 'warning'; children: React.ReactNode; className?: string }) {
  const colors = {
    info: 'bg-blue-900/20 border-blue-500/50 text-blue-100',
    success: 'bg-green-900/20 border-green-500/50 text-green-100',
    warning: 'bg-yellow-900/20 border-yellow-500/50 text-yellow-100',
  };

  return (
    <div className={`border-l-4 p-3 rounded ${colors[type]} ${className}`}>
      <div className="text-sm">{children}</div>
    </div>
  );
}

function Example({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <Card className="bg-slate-900 border border-slate-700">
      <h5 className="text-sm font-semibold text-slate-400 mb-2">📊 {title}</h5>
      <div className="text-sm text-slate-300">{children}</div>
    </Card>
  );
}
