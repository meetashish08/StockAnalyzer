export function formatCurrency(value: number, currency: 'INR' | 'USD' = 'INR'): string {
  if (currency === 'INR') {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(value);
  }

  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 2,
  }).format(value);
}

export function formatNumber(value: number, decimals: number = 2): string {
  return new Intl.NumberFormat('en-IN', {
    maximumFractionDigits: decimals,
    minimumFractionDigits: decimals,
  }).format(value);
}

export function formatPercent(value: number): string {
  const sign = value >= 0 ? '+' : '';
  return `${sign}${value.toFixed(2)}%`;
}

export function formatCompactNumber(value: number): string {
  if (value >= 10000000) {
    return `${(value / 10000000).toFixed(2)} Cr`;
  }
  if (value >= 100000) {
    return `${(value / 100000).toFixed(2)} L`;
  }
  if (value >= 1000) {
    return `${(value / 1000).toFixed(2)} K`;
  }
  return value.toFixed(2);
}

export function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

export function formatDateTime(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function getSignalColor(signal: string): string {
  switch (signal) {
    case 'STRONG_BUY':
      return 'text-green-400';
    case 'BUY':
      return 'text-green-500';
    case 'HOLD':
      return 'text-yellow-400';
    case 'SELL':
      return 'text-orange-500';
    case 'STRONG_SELL':
      return 'text-red-500';
    default:
      return 'text-slate-400';
  }
}

export function getSignalBadgeClass(signal: string): string {
  switch (signal) {
    case 'STRONG_BUY':
    case 'BUY':
      return 'badge-green';
    case 'HOLD':
      return 'badge-yellow';
    case 'SELL':
    case 'STRONG_SELL':
      return 'badge-red';
    default:
      return 'badge-blue';
  }
}
