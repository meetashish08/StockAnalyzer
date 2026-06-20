import React from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts';
import type { HoldingWithPrice } from '../../../shared/types';

interface Props {
  holdings: HoldingWithPrice[];
}

const COLORS = [
  '#22c55e', // green
  '#3b82f6', // blue
  '#f59e0b', // amber
  '#ef4444', // red
  '#8b5cf6', // purple
  '#06b6d4', // cyan
  '#ec4899', // pink
  '#f97316', // orange
];

export default function AllocationChart({ holdings }: Props) {
  if (holdings.length === 0) {
    return (
      <div className="h-64 flex items-center justify-center text-slate-400">
        No holdings to display
      </div>
    );
  }

  const data = holdings
    .map((h) => ({
      name: h.symbol,
      value: h.currentValue,
      percent: h.allocation,
    }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 8);

  // Group remaining as "Others" if more than 8 holdings
  if (holdings.length > 8) {
    const othersValue = holdings
      .slice(8)
      .reduce((sum, h) => sum + h.currentValue, 0);
    const totalValue = holdings.reduce((sum, h) => sum + h.currentValue, 0);
    data.push({
      name: 'Others',
      value: othersValue,
      percent: (othersValue / totalValue) * 100,
    });
  }

  return (
    <div className="h-64">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            innerRadius={60}
            outerRadius={80}
            paddingAngle={2}
            dataKey="value"
          >
            {data.map((_, index) => (
              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
            ))}
          </Pie>
          <Tooltip
            contentStyle={{
              backgroundColor: '#1e293b',
              border: '1px solid #475569',
              borderRadius: '8px',
              color: '#f1f5f9',
            }}
            formatter={(value: number, name: string) => [
              `₹${value.toLocaleString('en-IN')} (${data.find(d => d.name === name)?.percent.toFixed(1)}%)`,
              name
            ]}
          />
          <Legend
            layout="vertical"
            align="right"
            verticalAlign="middle"
            formatter={(value: string) => (
              <span className="text-sm text-slate-300">{value}</span>
            )}
          />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}
