export interface PricePoint {
  date: string;
  close: number;
}

export interface ChartDataPoint {
  date: string;
  price: number;
  dma50?: number;
  dma200?: number;
  rsi?: number;
  bollingerUpper?: number;
  bollingerLower?: number;
  bollingerMiddle?: number;
}

/**
 * Calculate Simple Moving Average (SMA) for a given period
 * @param data Array of price points
 * @param period Number of periods for SMA calculation
 * @returns Array with SMA values (null for initial periods)
 */
export function calculateSMA(data: PricePoint[], period: number): (number | null)[] {
  const result: (number | null)[] = [];

  for (let i = 0; i < data.length; i++) {
    if (i < period - 1) {
      result.push(null);
      continue;
    }

    let sum = 0;
    for (let j = 0; j < period; j++) {
      sum += data[i - j].close;
    }

    result.push(sum / period);
  }

  return result;
}

/**
 * Calculate Exponential Moving Average (EMA) for a given period
 * @param data Array of price points
 * @param period Number of periods for EMA calculation
 * @returns Array with EMA values
 */
export function calculateEMA(data: PricePoint[], period: number): (number | null)[] {
  const result: (number | null)[] = [];
  const multiplier = 2 / (period + 1);

  // Start with SMA for the first value
  let sum = 0;
  for (let i = 0; i < Math.min(period, data.length); i++) {
    sum += data[i].close;
    if (i < period - 1) {
      result.push(null);
    }
  }

  if (data.length < period) {
    return result;
  }

  let ema = sum / period;
  result.push(ema);

  // Calculate EMA for remaining values
  for (let i = period; i < data.length; i++) {
    ema = (data[i].close - ema) * multiplier + ema;
    result.push(ema);
  }

  return result;
}

/**
 * Detect golden cross (50 DMA crosses above 200 DMA)
 * @param dma50 Array of 50-day moving averages
 * @param dma200 Array of 200-day moving averages
 * @returns Array of indices where golden cross occurred
 */
export function detectGoldenCross(
  dma50: (number | null)[],
  dma200: (number | null)[]
): number[] {
  const crosses: number[] = [];

  for (let i = 1; i < dma50.length; i++) {
    const prev50 = dma50[i - 1];
    const curr50 = dma50[i];
    const prev200 = dma200[i - 1];
    const curr200 = dma200[i];

    if (
      prev50 !== null &&
      curr50 !== null &&
      prev200 !== null &&
      curr200 !== null &&
      prev50 < prev200 &&
      curr50 > curr200
    ) {
      crosses.push(i);
    }
  }

  return crosses;
}

/**
 * Detect death cross (50 DMA crosses below 200 DMA)
 * @param dma50 Array of 50-day moving averages
 * @param dma200 Array of 200-day moving averages
 * @returns Array of indices where death cross occurred
 */
export function detectDeathCross(
  dma50: (number | null)[],
  dma200: (number | null)[]
): number[] {
  const crosses: number[] = [];

  for (let i = 1; i < dma50.length; i++) {
    const prev50 = dma50[i - 1];
    const curr50 = dma50[i];
    const prev200 = dma200[i - 1];
    const curr200 = dma200[i];

    if (
      prev50 !== null &&
      curr50 !== null &&
      prev200 !== null &&
      curr200 !== null &&
      prev50 > prev200 &&
      curr50 < curr200
    ) {
      crosses.push(i);
    }
  }

  return crosses;
}

/**
 * Calculate RSI (Relative Strength Index)
 * @param data Array of price points
 * @param period Number of periods for RSI calculation (typically 14)
 * @returns Array with RSI values (0-100)
 */
export function calculateRSI(data: PricePoint[], period: number = 14): (number | null)[] {
  const result: (number | null)[] = [];

  if (data.length < period + 1) {
    return data.map(() => null);
  }

  const changes: number[] = [];
  for (let i = 1; i < data.length; i++) {
    changes.push(data[i].close - data[i - 1].close);
  }

  let avgGain = 0;
  let avgLoss = 0;

  // Initial average
  for (let i = 0; i < period; i++) {
    if (changes[i] > 0) {
      avgGain += changes[i];
    } else {
      avgLoss += Math.abs(changes[i]);
    }
  }
  avgGain /= period;
  avgLoss /= period;

  // First RSI value
  result.push(null); // No RSI for first data point
  for (let i = 0; i < period; i++) {
    result.push(null);
  }

  const rs = avgGain / (avgLoss || 1);
  const rsi = 100 - (100 / (1 + rs));
  result.push(rsi);

  // Calculate subsequent RSI values
  for (let i = period; i < changes.length; i++) {
    const change = changes[i];
    const gain = change > 0 ? change : 0;
    const loss = change < 0 ? Math.abs(change) : 0;

    avgGain = (avgGain * (period - 1) + gain) / period;
    avgLoss = (avgLoss * (period - 1) + loss) / period;

    const rs = avgGain / (avgLoss || 1);
    const rsi = 100 - (100 / (1 + rs));
    result.push(rsi);
  }

  return result;
}

/**
 * Calculate Bollinger Bands
 * @param data Array of price points
 * @param period Number of periods for calculation (typically 20)
 * @param stdDev Number of standard deviations (typically 2)
 * @returns Object with upper, middle, and lower bands
 */
export function calculateBollingerBands(
  data: PricePoint[],
  period: number = 20,
  stdDev: number = 2
): {
  upper: (number | null)[];
  middle: (number | null)[];
  lower: (number | null)[];
} {
  const middle = calculateSMA(data, period);
  const upper: (number | null)[] = [];
  const lower: (number | null)[] = [];

  for (let i = 0; i < data.length; i++) {
    if (i < period - 1 || middle[i] === null) {
      upper.push(null);
      lower.push(null);
      continue;
    }

    // Calculate standard deviation
    let sumSquares = 0;
    for (let j = 0; j < period; j++) {
      const diff = data[i - j].close - middle[i]!;
      sumSquares += diff * diff;
    }
    const sd = Math.sqrt(sumSquares / period);

    upper.push(middle[i]! + (stdDev * sd));
    lower.push(middle[i]! - (stdDev * sd));
  }

  return { upper, middle, lower };
}

/**
 * Calculate MACD (Moving Average Convergence Divergence)
 * @param data Array of price points
 * @returns Object with MACD line, signal line, and histogram
 */
export function calculateMACD(data: PricePoint[]): {
  macd: (number | null)[];
  signal: (number | null)[];
  histogram: (number | null)[];
} {
  const ema12 = calculateEMA(data, 12);
  const ema26 = calculateEMA(data, 26);

  const macd: (number | null)[] = [];

  for (let i = 0; i < data.length; i++) {
    if (ema12[i] !== null && ema26[i] !== null) {
      macd.push(ema12[i]! - ema26[i]!);
    } else {
      macd.push(null);
    }
  }

  // Calculate signal line (9-day EMA of MACD)
  const macdData: PricePoint[] = macd.map((value, index) => ({
    date: data[index].date,
    close: value || 0,
  }));

  const signal = calculateEMA(macdData, 9);

  // Calculate histogram
  const histogram: (number | null)[] = [];
  for (let i = 0; i < macd.length; i++) {
    if (macd[i] !== null && signal[i] !== null) {
      histogram.push(macd[i]! - signal[i]!);
    } else {
      histogram.push(null);
    }
  }

  return { macd, signal, histogram };
}

/**
 * Calculate Average True Range (ATR) - Volatility indicator
 * @param data Array of price points with high, low, close
 * @param period Number of periods (typically 14)
 * @returns Array with ATR values
 */
export function calculateATR(
  data: Array<{ date: string; high: number; low: number; close: number }>,
  period: number = 14
): (number | null)[] {
  const result: (number | null)[] = [];

  if (data.length < period) {
    return data.map(() => null);
  }

  const trueRanges: number[] = [];

  for (let i = 1; i < data.length; i++) {
    const highLow = data[i].high - data[i].low;
    const highClose = Math.abs(data[i].high - data[i - 1].close);
    const lowClose = Math.abs(data[i].low - data[i - 1].close);
    const tr = Math.max(highLow, highClose, lowClose);
    trueRanges.push(tr);
  }

  result.push(null); // First data point has no TR

  // Calculate initial ATR
  let atr = 0;
  for (let i = 0; i < period - 1; i++) {
    result.push(null);
    atr += trueRanges[i];
  }
  atr = atr / (period - 1);
  result.push(atr);

  // Calculate subsequent ATR values (smoothed)
  for (let i = period - 1; i < trueRanges.length; i++) {
    atr = ((atr * (period - 1)) + trueRanges[i]) / period;
    result.push(atr);
  }

  return result;
}

/**
 * Determine overall trend signal based on multiple indicators
 * @param price Current price
 * @param dma50 50-day moving average
 * @param dma200 200-day moving average
 * @param rsi RSI value
 * @returns Signal: 'BUY', 'SELL', or 'HOLD'
 */
export function getOverallSignal(
  price: number,
  dma50: number | null | undefined,
  dma200: number | null | undefined,
  rsi: number | null | undefined
): 'BUY' | 'SELL' | 'HOLD' {
  let bullishSignals = 0;
  let bearishSignals = 0;

  // Price vs MAs
  if (dma50 !== null && dma50 !== undefined && price > dma50) bullishSignals++;
  if (dma50 !== null && dma50 !== undefined && price < dma50) bearishSignals++;

  if (dma200 !== null && dma200 !== undefined && price > dma200) bullishSignals++;
  if (dma200 !== null && dma200 !== undefined && price < dma200) bearishSignals++;

  // Golden/Death Cross
  if (dma50 !== null && dma50 !== undefined && dma200 !== null && dma200 !== undefined) {
    if (dma50 > dma200) bullishSignals++;
    if (dma50 < dma200) bearishSignals++;
  }

  // RSI
  if (rsi !== null && rsi !== undefined) {
    if (rsi < 30) bullishSignals += 2; // Oversold - strong buy signal
    if (rsi > 70) bearishSignals += 2; // Overbought - strong sell signal
    if (rsi >= 30 && rsi <= 45) bullishSignals++;
    if (rsi >= 55 && rsi <= 70) bearishSignals++;
  }

  if (bullishSignals > bearishSignals + 1) return 'BUY';
  if (bearishSignals > bullishSignals + 1) return 'SELL';
  return 'HOLD';
}
