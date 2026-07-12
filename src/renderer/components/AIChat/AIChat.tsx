import React, { useState, useRef, useEffect } from 'react';
import { useStore } from '../../store/useStore';
import { formatCurrency, formatPercent, formatDateTime } from '../../utils/format';

interface Message {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
  model?: string;
  bookmarked?: boolean;
}

interface Bookmark {
  id: number;
  question: string;
  answer: string;
  model: string;
  createdAt: string;
}

interface AIModel {
  id: string;
  name: string;
  description: string;
}

interface SuggestedPrompt {
  icon: string;
  text: string;
  prompt: string;
}

const SUGGESTED_PROMPTS: SuggestedPrompt[] = [
  // Portfolio Analysis
  {
    icon: '📊',
    text: 'Analyze my portfolio',
    prompt: 'Analyze my current portfolio and give me a summary of my investments, including total value, P&L, and diversification.',
  },
  {
    icon: '🏆',
    text: 'Top performers',
    prompt: 'What are my top 5 best performing stocks by percentage gain?',
  },
  {
    icon: '⚠️',
    text: 'Risk assessment',
    prompt: 'Assess the risk in my portfolio. Are there any stocks I should be concerned about?',
  },
  // Real-Time Market Data (NEW - Yahoo Finance)
  {
    icon: '🔬',
    text: 'Research stock',
    prompt: 'Research RELIANCE for me - company info, financials, technicals, and investment view.',
  },
  {
    icon: '🔍',
    text: 'Compare stocks',
    prompt: 'Compare TCS vs Infosys with real-time data. Show P/E, ROE, dividend yield, and recommend which is better.',
  },
  {
    icon: '📈',
    text: 'Technical analysis',
    prompt: 'Check RSI, moving averages, and momentum for AAPL. Is it overbought or good entry point?',
  },
  {
    icon: '💰',
    text: 'Find dividend stocks',
    prompt: 'Screen NSE for high dividend stocks with yield above 4% and P/E below 15.',
  },
  {
    icon: '🎯',
    text: 'Stock screening',
    prompt: 'Find undervalued large-cap stocks in NSE with good fundamentals.',
  },
  {
    icon: '📊',
    text: 'Price history',
    prompt: 'Show me TCS price trend for last 6 months and identify support/resistance levels.',
  },
  {
    icon: '🏢',
    text: 'Company analysis',
    prompt: 'What does Microsoft do? Show me their business model, revenue, and competitive position.',
  },
  {
    icon: '🌍',
    text: 'Market overview',
    prompt: 'What\'s happening in the market today? Show me the major indices and top movers.',
  },
  {
    icon: '⚡',
    text: 'Investment decision',
    prompt: 'Should I buy Apple at current price? Analyze fundamentals, technicals, and give entry/exit points.',
  },
];

export default function AIChat() {
  const { holdingsWithPrices, fetchHoldings } = useStore();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [selectedModel, setSelectedModel] = useState('claude-sonnet');
  const [availableModels, setAvailableModels] = useState<AIModel[]>([]);
  const [bookmarks, setBookmarks] = useState<Bookmark[]>([]);
  const [showBookmarks, setShowBookmarks] = useState(false);
  const [bookmarkingId, setBookmarkingId] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    fetchHoldings();
    loadModels();
    loadBookmarks();
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const loadModels = async () => {
    try {
      const res = await fetch('/api/ai/models');
      const data = await res.json();
      setAvailableModels(data.models);
      setSelectedModel(data.default);
    } catch (err) {
      console.error('Failed to load models:', err);
    }
  };

  const loadBookmarks = async () => {
    try {
      const res = await fetch('/api/ai/bookmarks');
      const data = await res.json();
      setBookmarks(data);
    } catch (err) {
      console.error('Failed to load bookmarks:', err);
    }
  };

  const getPortfolioContext = () => {
    if (holdingsWithPrices.length === 0) {
      return 'The user has no holdings in their portfolio yet.';
    }

    const totalValue = holdingsWithPrices.reduce((sum, h) => sum + h.currentValue, 0);
    const totalPnL = holdingsWithPrices.reduce((sum, h) => sum + h.pnl, 0);
    const totalInvested = holdingsWithPrices.reduce((sum, h) => sum + (h.avgPrice * h.quantity), 0);
    const winners = holdingsWithPrices.filter(h => h.pnl > 0);
    const losers = holdingsWithPrices.filter(h => h.pnl < 0);

    const holdingsList = holdingsWithPrices
      .sort((a, b) => b.currentValue - a.currentValue)
      .map(h => ({
        symbol: h.symbol,
        name: h.name,
        market: h.market,
        type: h.type,
        quantity: h.quantity,
        avgPrice: h.avgPrice,
        currentPrice: h.currentPrice,
        currentValue: h.currentValue,
        pnl: h.pnl,
        pnlPercent: h.pnlPercent,
        weight: ((h.currentValue / totalValue) * 100).toFixed(2) + '%',
      }));

    return `
USER'S PORTFOLIO DATA:
- Total Holdings: ${holdingsWithPrices.length}
- Total Invested: ${formatCurrency(totalInvested)}
- Current Value: ${formatCurrency(totalValue)}
- Total P&L: ${formatCurrency(totalPnL)} (${formatPercent((totalPnL / totalInvested) * 100)})
- Profitable Holdings: ${winners.length}
- Loss-making Holdings: ${losers.length}

DETAILED HOLDINGS:
${JSON.stringify(holdingsList, null, 2)}

Note: All Indian stocks (NSE/BSE) values are in INR. US stocks (NYSE/NASDAQ) values are in USD.
`;
  };

  const sendMessage = async (messageText?: string) => {
    const text = messageText || input.trim();
    if (!text || isLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: text,
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      const response = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: text,
          portfolioContext: getPortfolioContext(),
          history: messages.slice(-10).map(m => ({ role: m.role, content: m.content })),
          model: selectedModel,
        }),
      });

      const data = await response.json();

      if (data.error) {
        throw new Error(data.error);
      }

      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: data.response,
        timestamp: new Date(),
        model: data.model || selectedModel,
        bookmarked: false,
      };

      setMessages(prev => [...prev, assistantMessage]);
    } catch (error: any) {
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: `Sorry, I encountered an error: ${error.message}. Please try again.`,
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleBookmark = async (message: Message) => {
    // Find the preceding user message (question)
    const messageIndex = messages.findIndex(m => m.id === message.id);
    const questionMessage = messages.slice(0, messageIndex).reverse().find(m => m.role === 'user');

    if (!questionMessage) return;

    setBookmarkingId(message.id);

    try {
      const res = await fetch('/api/ai/bookmarks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          question: questionMessage.content,
          answer: message.content,
          model: message.model || selectedModel,
        }),
      });

      const bookmark = await res.json();
      setBookmarks(prev => [bookmark, ...prev]);

      // Mark message as bookmarked
      setMessages(prev => prev.map(m =>
        m.id === message.id ? { ...m, bookmarked: true } : m
      ));
    } catch (err) {
      console.error('Failed to bookmark:', err);
    } finally {
      setBookmarkingId(null);
    }
  };

  const handleDeleteBookmark = async (id: number) => {
    if (!confirm('Delete this bookmark?')) return;

    try {
      await fetch(`/api/ai/bookmarks/${id}`, { method: 'DELETE' });
      setBookmarks(prev => prev.filter(b => b.id !== id));
    } catch (err) {
      console.error('Failed to delete bookmark:', err);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const clearChat = () => {
    setMessages([]);
  };

  const getModelName = (modelId: string) => {
    const model = availableModels.find(m => m.id === modelId);
    return model?.name || modelId;
  };

  return (
    <div className="h-[calc(100vh-120px)] flex flex-col animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <span>🤖</span> AI Stock Market Assistant
          </h1>
          <p className="text-slate-400">Powered by Claude AI - Analyze your portfolio, research any stock, discover market opportunities</p>
        </div>
        <div className="flex items-center gap-3">
          {/* Model Selector */}
          <div className="flex items-center gap-2">
            <label className="text-sm text-slate-400">Model:</label>
            <select
              value={selectedModel}
              onChange={(e) => setSelectedModel(e.target.value)}
              className="select text-sm py-1"
              disabled={isLoading}
            >
              {availableModels.map(model => (
                <option key={model.id} value={model.id}>
                  {model.name}
                </option>
              ))}
            </select>
          </div>

          {/* Bookmarks Button */}
          <button
            onClick={() => setShowBookmarks(!showBookmarks)}
            className={`btn-secondary text-sm flex items-center gap-1 ${showBookmarks ? 'bg-slate-600' : ''}`}
          >
            <span>🔖</span>
            <span>Bookmarks</span>
            {bookmarks.length > 0 && (
              <span className="bg-blue-600 text-white text-xs px-1.5 rounded-full">
                {bookmarks.length}
              </span>
            )}
          </button>

          {messages.length > 0 && (
            <button onClick={clearChat} className="btn-secondary text-sm">
              Clear Chat
            </button>
          )}
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 overflow-hidden flex gap-4">
        {/* Chat Area */}
        <div className={`flex-1 flex flex-col bg-slate-800/50 rounded-xl overflow-hidden ${showBookmarks ? 'w-2/3' : 'w-full'}`}>
          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {messages.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center">
                <div className="text-6xl mb-4">🌟</div>
                <h3 className="text-xl font-semibold text-white mb-2">
                  Your AI-Powered Stock Market Expert
                </h3>
                <p className="text-slate-400 mb-6 max-w-2xl">
                  I can analyze your portfolio, research any stock in NSE or NYSE, compare investments,
                  find opportunities, track market trends, and provide personalized recommendations.
                </p>

                {/* Quick Action Buttons */}
                <div className="flex flex-wrap gap-2 mb-6 justify-center">
                  <button
                    onClick={() => sendMessage('What\'s happening in the market today?')}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded-lg transition-colors"
                  >
                    📈 Market Overview
                  </button>
                  <button
                    onClick={() => sendMessage('Analyze my portfolio performance and suggest improvements')}
                    className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white text-sm rounded-lg transition-colors"
                  >
                    📊 Portfolio Analysis
                  </button>
                  <button
                    onClick={() => sendMessage('Find me 5 undervalued stocks with good fundamentals')}
                    className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white text-sm rounded-lg transition-colors"
                  >
                    💎 Find Opportunities
                  </button>
                  <button
                    onClick={() => sendMessage('How is the IT sector performing compared to Banking?')}
                    className="px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white text-sm rounded-lg transition-colors"
                  >
                    🎯 Sector Comparison
                  </button>
                </div>

                {/* Suggested Prompts */}
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3 max-w-3xl">
                  {SUGGESTED_PROMPTS.map((prompt, idx) => (
                    <button
                      key={idx}
                      onClick={() => sendMessage(prompt.prompt)}
                      disabled={isLoading}
                      className="p-3 bg-slate-700/50 hover:bg-slate-700 rounded-lg text-left transition-colors group"
                    >
                      <span className="text-xl">{prompt.icon}</span>
                      <p className="text-sm text-slate-300 mt-1 group-hover:text-white">
                        {prompt.text}
                      </p>
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <>
                {messages.map((message) => (
                  <div
                    key={message.id}
                    className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                  >
                    <div
                      className={`max-w-[80%] rounded-xl p-4 ${
                        message.role === 'user'
                          ? 'bg-blue-600 text-white'
                          : 'bg-slate-700 text-slate-100'
                      }`}
                    >
                      {message.role === 'assistant' && (
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2 text-xs text-slate-400">
                            <span>🤖</span>
                            <span>{getModelName(message.model || selectedModel)}</span>
                          </div>
                          {/* Bookmark Button */}
                          <button
                            onClick={() => handleBookmark(message)}
                            disabled={bookmarkingId === message.id || message.bookmarked}
                            className={`text-sm p-1 rounded hover:bg-slate-600 transition-colors ${
                              message.bookmarked ? 'text-yellow-400' : 'text-slate-400 hover:text-yellow-400'
                            }`}
                            title={message.bookmarked ? 'Bookmarked' : 'Bookmark this answer'}
                          >
                            {bookmarkingId === message.id ? '...' : message.bookmarked ? '🔖' : '☆'}
                          </button>
                        </div>
                      )}
                      <div className="whitespace-pre-wrap text-sm leading-relaxed">
                        {message.content}
                      </div>
                      <div className={`text-xs mt-2 ${
                        message.role === 'user' ? 'text-blue-200' : 'text-slate-400'
                      }`}>
                        {message.timestamp.toLocaleTimeString()}
                      </div>
                    </div>
                  </div>
                ))}
                {isLoading && (
                  <div className="flex justify-start">
                    <div className="bg-slate-700 rounded-xl p-4">
                      <div className="flex items-center gap-2 text-slate-300">
                        <div className="flex gap-1">
                          <span className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></span>
                          <span className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></span>
                          <span className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></span>
                        </div>
                        <span>{getModelName(selectedModel)} is thinking...</span>
                      </div>
                    </div>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </>
            )}
          </div>

          {/* Input Area */}
          <div className="p-4 border-t border-slate-700">
            <div className="flex gap-2">
              <textarea
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Ask about your portfolio, any stock, market trends, or investment opportunities..."
                disabled={isLoading}
                rows={1}
                className="input flex-1 resize-none"
                style={{ minHeight: '44px', maxHeight: '120px' }}
              />
              <button
                onClick={() => sendMessage()}
                disabled={isLoading || !input.trim()}
                className="btn-primary px-6"
              >
                {isLoading ? '...' : 'Send'}
              </button>
            </div>
            <div className="mt-2 flex items-center justify-between">
              <p className="text-xs text-slate-500">
                Press Enter to send, Shift+Enter for new line
              </p>
              <div className="flex gap-2 text-xs text-slate-500">
                <span className="hidden md:inline">Try:</span>
                <button
                  onClick={() => setInput('Compare HDFC Bank vs ICICI Bank')}
                  className="text-blue-400 hover:text-blue-300"
                >
                  "Compare stocks"
                </button>
                <span className="hidden md:inline">|</span>
                <button
                  onClick={() => setInput('Should I buy Apple stock?')}
                  className="text-blue-400 hover:text-blue-300"
                >
                  "Analyze AAPL"
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Bookmarks Panel */}
        {showBookmarks && (
          <div className="w-1/3 bg-slate-800/50 rounded-xl overflow-hidden flex flex-col">
            <div className="p-4 border-b border-slate-700">
              <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                <span>🔖</span> Saved Answers
              </h3>
              <p className="text-sm text-slate-400">{bookmarks.length} bookmarks</p>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {bookmarks.length === 0 ? (
                <div className="text-center text-slate-400 py-8">
                  <div className="text-4xl mb-2">📑</div>
                  <p>No bookmarks yet</p>
                  <p className="text-sm mt-1">Click the star on any AI answer to save it</p>
                </div>
              ) : (
                bookmarks.map((bookmark) => (
                  <div key={bookmark.id} className="bg-slate-700/50 rounded-lg p-3">
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <p className="text-sm text-blue-400 font-medium line-clamp-2">
                        {bookmark.question}
                      </p>
                      <button
                        onClick={() => handleDeleteBookmark(bookmark.id)}
                        className="text-slate-400 hover:text-red-400 text-sm flex-shrink-0"
                        title="Delete bookmark"
                      >
                        🗑
                      </button>
                    </div>
                    <p className="text-sm text-slate-300 line-clamp-4 mb-2">
                      {bookmark.answer}
                    </p>
                    <div className="flex items-center justify-between text-xs text-slate-500">
                      <span>{getModelName(bookmark.model)}</span>
                      <span>{new Date(bookmark.createdAt).toLocaleDateString()}</span>
                    </div>
                    <button
                      onClick={() => {
                        // Expand bookmark in chat
                        const userMsg: Message = {
                          id: Date.now().toString(),
                          role: 'user',
                          content: bookmark.question,
                          timestamp: new Date(bookmark.createdAt),
                        };
                        const assistantMsg: Message = {
                          id: (Date.now() + 1).toString(),
                          role: 'assistant',
                          content: bookmark.answer,
                          timestamp: new Date(bookmark.createdAt),
                          model: bookmark.model,
                          bookmarked: true,
                        };
                        setMessages([userMsg, assistantMsg]);
                        setShowBookmarks(false);
                      }}
                      className="text-xs text-blue-400 hover:text-blue-300 mt-2"
                    >
                      View full answer →
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
