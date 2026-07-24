import React, { useMemo } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ReferenceDot,
  Brush,
  Area,
  ComposedChart,
} from 'recharts';
import { formatCurrency } from '../../utils/format';
import type { ChartDataPoint } from '../../utils/technicalAnalysis';

interface StockPriceChartProps {
  data: ChartDataPoint[];
  currency: 'INR' | 'USD';
  selectedPeriod: string;
  onPeriodChange: (period: string) => void;
  goldenCrosses?: number[];
  deathCrosses?: number[];
  isTransitioning?: boolean;
}

const PERIODS = [
  { value: '1d', label: '1D' },
  { value: '5d', label: '5D' },
  { value: '1mo', label: '1M' },
  { value: '3mo', label: '3M' },
  { value: '6mo', label: '6M' },
  { value: '1y', label: '1Y' },
  { value: '2y', label: '2Y' },
];

const CustomTooltip = ({ active, payload, currency }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-slate-800 border border-slate-600 rounded-lg p-3 shadow-lg">
        <p className="text-slate-300 text-sm mb-2">{payload[0].payload.date}</p>
        {payload.map((entry: any, index: number) => (
          <div key={index} className="flex items-center gap-2">
            <div
              className="w-3 h-3 rounded-full"
              style={{ backgroundColor: entry.color }}
            />
            <span className="text-xs text-slate-400">{entry.name}:</span>
            <span className="text-sm text-white font-medium">
              {formatCurrency(entry.value, currency)}
            </span>
          </div>
        ))}
      </div>
    );
  }
  return null;
};

export default function StockPriceChart({
  data,
  currency,
  selectedPeriod,
  onPeriodChange,
  goldenCrosses = [],
  deathCrosses = [],
  isTransitioning = false,
}: StockPriceChartProps) {
  // Calculate period change percentage
  const periodChange = useMemo(() => {
    if (!data || data.length === 0) {
      console.log('[PeriodChange] No data available');
      return null;
    }

    const startPrice = data[0]?.price;
    const endPrice = data[data.length - 1]?.price;

    console.log('[PeriodChange] Debug:', {
      dataLength: data.length,
      startPrice,
      endPrice,
      firstItem: data[0],
      lastItem: data[data.length - 1]
    });

    if (!startPrice || !endPrice || startPrice === 0) {
      console.log('[PeriodChange] Invalid prices - startPrice:', startPrice, 'endPrice:', endPrice);
      return null;
    }

    const change = endPrice - startPrice;
    const changePercent = (change / startPrice) * 100;

    console.log('[PeriodChange] Calculated:', { change, changePercent });

    return {
      change,
      changePercent,
      isPositive: change >= 0
    };
  }, [data]);

  // Show 200 DMA for all periods
  const show200DMA = true;

  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center h-96 text-slate-400">
        No historical data available
      </div>
    );
  }

  const formatYAxis = (value: number) => {
    return formatCurrency(value, currency);
  };

  const formatXAxis = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  return (
    <div className="space-y-4">
      {/* Period Selector and Change Display */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        <div className="flex items-center gap-1 flex-wrap">
          <span className="text-slate-400 text-[10px] md:text-xs mr-0.5">Period:</span>
          {PERIODS.map((period) => (
            <button
              key={period.value}
              onClick={() => onPeriodChange(period.value)}
              className={`px-1.5 md:px-2 py-0.5 md:py-1 rounded text-[10px] md:text-xs font-medium transition-all duration-200 ${
                selectedPeriod === period.value
                  ? 'bg-blue-600 text-white shadow-md scale-105'
                  : 'bg-slate-700 text-slate-300 hover:bg-slate-600 hover:scale-102'
              }`}
            >
              {period.label}
            </button>
          ))}
        </div>

        {/* Period Change Display */}
        {periodChange && (
          <div
            key={`period-change-${selectedPeriod}-${data.length}`}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg transition-all duration-300 ${
              periodChange.isPositive ? 'bg-green-500/10' : 'bg-red-500/10'
            }`}
          >
            <span className="text-slate-400 text-xs">Period Change:</span>
            <span className={`text-sm font-bold ${
              periodChange.isPositive ? 'text-green-400' : 'text-red-400'
            }`}>
              {periodChange.isPositive ? '↑' : '↓'} {Math.abs(periodChange.changePercent).toFixed(2)}%
            </span>
            <span className={`text-xs ${
              periodChange.isPositive ? 'text-green-300/70' : 'text-red-300/70'
            }`}>
              ({periodChange.isPositive ? '+' : ''}{formatCurrency(periodChange.change, currency)})
            </span>
          </div>
        )}
      </div>

      {/* Chart */}
      <div className="relative">
        {isTransitioning && (
          <div className="absolute inset-0 bg-slate-800/50 backdrop-blur-sm z-10 flex items-center justify-center rounded-lg">
            <div className="flex items-center gap-2 bg-slate-700 px-4 py-2 rounded-lg shadow-lg">
              <div className="animate-spin h-5 w-5 border-2 border-blue-500 border-t-transparent rounded-full"></div>
              <span className="text-slate-300 text-sm">Loading...</span>
            </div>
          </div>
        )}
        <ResponsiveContainer width="100%" height={400}>
          <ComposedChart
            data={data}
            margin={{ top: 10, right: 30, left: 10, bottom: 50 }}
          >
          <defs>
            <linearGradient id="priceGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
              <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
            </linearGradient>
          </defs>

          <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.5} />
          <XAxis
            dataKey="date"
            tickFormatter={formatXAxis}
            stroke="#94a3b8"
            style={{ fontSize: '11px' }}
            interval="preserveStartEnd"
            minTickGap={50}
            tick={{ fill: '#94a3b8' }}
          />
          <YAxis
            tickFormatter={formatYAxis}
            stroke="#94a3b8"
            style={{ fontSize: '11px' }}
            width={85}
            tick={{ fill: '#94a3b8' }}
            domain={['auto', 'auto']}
          />
          <Tooltip content={<CustomTooltip currency={currency} />} />
          <Legend
            wrapperStyle={{
              paddingTop: '10px',
              fontSize: '13px',
            }}
            iconType="line"
          />

          {/* Price Area with gradient */}
          <Area
            type="monotone"
            dataKey="price"
            fill="url(#priceGradient)"
            stroke="none"
            isAnimationActive={false}
          />

          {/* Price Line */}
          <Line
            type="monotone"
            dataKey="price"
            stroke="#10b981"
            strokeWidth={2.5}
            dot={false}
            name="Price"
            isAnimationActive={false}
            activeDot={{ r: 6, strokeWidth: 2, stroke: '#fff' }}
          />

          {/* 50 DMA Line */}
          <Line
            type="monotone"
            dataKey="dma50"
            stroke="#3b82f6"
            strokeWidth={2}
            strokeDasharray="5 5"
            dot={false}
            name="50 DMA"
            isAnimationActive={false}
            connectNulls
          />

          {/* 200 DMA Line - conditionally rendered */}
          {show200DMA && (
            <Line
              type="monotone"
              dataKey="dma200"
              stroke="#f97316"
              strokeWidth={2}
              strokeDasharray="5 5"
              dot={false}
              name="200 DMA"
              isAnimationActive={false}
              connectNulls
            />
          )}

          {/* Golden Cross Markers */}
          {goldenCrosses.map((index) => (
            <ReferenceDot
              key={`golden-${index}`}
              x={data[index]?.date}
              y={data[index]?.price}
              r={7}
              fill="#10b981"
              stroke="#fff"
              strokeWidth={2.5}
            />
          ))}

          {/* Death Cross Markers */}
          {deathCrosses.map((index) => (
            <ReferenceDot
              key={`death-${index}`}
              x={data[index]?.date}
              y={data[index]?.price}
              r={7}
              fill="#ef4444"
              stroke="#fff"
              strokeWidth={2.5}
            />
          ))}

          {/* Brush for zooming */}
          <Brush
            dataKey="date"
            height={30}
            stroke="#3b82f6"
            fill="#1e293b"
            tickFormatter={formatXAxis}
            travellerWidth={10}
          />
        </ComposedChart>
      </ResponsiveContainer>
      </div>

      {/* Legend for crosses */}
      {(goldenCrosses.length > 0 || deathCrosses.length > 0) && (
        <div className="flex items-center gap-4 text-sm">
          {goldenCrosses.length > 0 && (
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-green-500 border-2 border-white" />
              <span className="text-slate-300">Golden Cross ({goldenCrosses.length})</span>
            </div>
          )}
          {deathCrosses.length > 0 && (
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-red-500 border-2 border-white" />
              <span className="text-slate-300">Death Cross ({deathCrosses.length})</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
