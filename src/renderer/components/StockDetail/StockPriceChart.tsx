import React from 'react';
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
}

const PERIODS = [
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
}: StockPriceChartProps) {
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
      {/* Period Selector */}
      <div className="flex items-center gap-1 md:gap-2 flex-wrap">
        <span className="text-slate-400 text-xs md:text-sm mr-1">Period:</span>
        {PERIODS.map((period) => (
          <button
            key={period.value}
            onClick={() => onPeriodChange(period.value)}
            className={`px-2 md:px-3 py-1 rounded-lg text-xs md:text-sm font-medium transition-colors ${
              selectedPeriod === period.value
                ? 'bg-blue-600 text-white'
                : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
            }`}
          >
            {period.label}
          </button>
        ))}
      </div>

      {/* Chart */}
      <ResponsiveContainer width="100%" height={280}>
        <LineChart
          data={data}
          margin={{ top: 10, right: 30, left: 10, bottom: 10 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
          <XAxis
            dataKey="date"
            tickFormatter={formatXAxis}
            stroke="#94a3b8"
            style={{ fontSize: '12px' }}
            interval="preserveStartEnd"
            minTickGap={50}
          />
          <YAxis
            tickFormatter={formatYAxis}
            stroke="#94a3b8"
            style={{ fontSize: '12px' }}
            width={80}
          />
          <Tooltip content={<CustomTooltip currency={currency} />} />
          <Legend
            wrapperStyle={{
              paddingTop: '20px',
              fontSize: '14px',
            }}
            iconType="line"
          />

          {/* Price Line */}
          <Line
            type="monotone"
            dataKey="price"
            stroke="#10b981"
            strokeWidth={2}
            dot={false}
            name="Price"
            isAnimationActive={false}
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

          {/* 200 DMA Line */}
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

          {/* Golden Cross Markers */}
          {goldenCrosses.map((index) => (
            <ReferenceDot
              key={`golden-${index}`}
              x={data[index]?.date}
              y={data[index]?.price}
              r={6}
              fill="#10b981"
              stroke="#fff"
              strokeWidth={2}
            />
          ))}

          {/* Death Cross Markers */}
          {deathCrosses.map((index) => (
            <ReferenceDot
              key={`death-${index}`}
              x={data[index]?.date}
              y={data[index]?.price}
              r={6}
              fill="#ef4444"
              stroke="#fff"
              strokeWidth={2}
            />
          ))}
        </LineChart>
      </ResponsiveContainer>

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
