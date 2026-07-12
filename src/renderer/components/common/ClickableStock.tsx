import React from 'react';
import { useStore } from '../../store/useStore';
import type { Market } from '../../../shared/types';

interface ClickableStockProps {
  symbol: string;
  market: Market | string;
  name?: string;
  className?: string;
  showIcon?: boolean;
}

export default function ClickableStock({
  symbol,
  market,
  name,
  className = '',
  showIcon = false,
}: ClickableStockProps) {
  const { setSelectedStockForDetail } = useStore();

  // Normalize market to valid Market type
  const normalizeMarket = (mkt: string): Market => {
    const upper = mkt.toUpperCase();
    if (upper === 'NSE' || upper === 'BSE' || upper === 'NYSE' || upper === 'NASDAQ') {
      return upper as Market;
    }
    // Default to NSE for Indian stocks, NYSE for US
    return 'NSE';
  };

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent row click if inside a table
    setSelectedStockForDetail({
      symbol,
      market: normalizeMarket(market as string),
      name,
    });
  };

  return (
    <button
      onClick={handleClick}
      className={`text-blue-400 hover:text-blue-300 hover:underline cursor-pointer transition-colors text-left inline-flex items-center gap-1 ${className}`}
      title={`View details for ${symbol}${name ? ` (${name})` : ''}`}
    >
      {showIcon && <span className="text-xs">📈</span>}
      <span>{symbol}</span>
    </button>
  );
}
