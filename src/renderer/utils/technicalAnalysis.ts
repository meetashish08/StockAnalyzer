export interface PricePoint {
  date: string;
  close: number;
}

export interface ChartDataPoint {
  date: string;
  price: number;
  dma50?: number;
  dma200?: number;
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
