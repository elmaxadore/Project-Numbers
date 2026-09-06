// ============================================================
// Math Utilities for the Betting System
// ============================================================

/**
 * Sigmoid function for logistic regression
 */
export function sigmoid(x: number): number {
  return 1 / (1 + Math.exp(-x));
}

/**
 * Z-score normalization
 */
export function zScore(value: number, mean: number, std: number): number {
  if (std === 0) return 0;
  return (value - mean) / std;
}

/**
 * Convert decimal odds to implied probability
 */
export function oddsToImpliedProbability(decimalOdds: number): number {
  if (decimalOdds <= 1) return 1;
  return 1 / decimalOdds;
}

/**
 * Calculate value edge: modelProb - impliedProb
 */
export function calculateValue(modelProb: number, decimalOdds: number): number {
  const impliedProb = oddsToImpliedProbability(decimalOdds);
  return modelProb - impliedProb;
}

/**
 * Calculate Kelly Criterion stake
 * f* = (bp - q) / b
 * where:
 *   b = decimal_odds - 1
 *   p = model probability
 *   q = 1 - p
 */
export function calculateKelly(
  modelProb: number,
  decimalOdds: number,
  maxFraction: number = 0.25
): number {
  const b = decimalOdds - 1;
  const p = modelProb;
  const q = 1 - p;
  
  const kelly = (b * p - q) / b;
  
  // Apply fractional Kelly and clamp to [0, 1]
  const fractionalKelly = kelly * maxFraction;
  return Math.max(0, Math.min(1, fractionalKelly));
}

/**
 * Calculate ROI from a series of bets
 */
export function calculateROI(totalStake: number, totalProfit: number): number {
  if (totalStake === 0) return 0;
  return (totalProfit / totalStake) * 100;
}

/**
 * Calculate maximum drawdown from a series of cumulative profits
 */
export function maxDrawdown(cumulativeProfits: number[]): number {
  let peak = cumulativeProfits[0] || 0;
  let maxDD = 0;
  
  for (const profit of cumulativeProfits) {
    if (profit > peak) {
      peak = profit;
    }
    const drawdown = (peak - profit) / peak;
    if (drawdown > maxDD) {
      maxDD = drawdown;
    }
  }
  
  return maxDD;
}

/**
 * Kelly Criterion calculation (alias for calculateKelly)
 */
export function kellyCriterion(
  modelProb: number,
  decimalOdds: number,
  maxFraction: number = 0.25
): number {
  return calculateKelly(modelProb, decimalOdds, maxFraction);
}

/**
 * Calculate recommended stake as amount (not percentage)
 * Returns object with stake amount and kelly fraction used
 */
export function calculateStake(
  modelProb: number,
  decimalOdds: number,
  bankroll: number,
  kellyCap: number = 0.25,
  fixedStakePct: number = 0.02
): { stake: number; kellyFraction: number } {
  const kellyFraction = calculateKelly(modelProb, decimalOdds, kellyCap);
  
  // If Kelly is zero or negative, fall back to fixed stake
  if (kellyFraction <= 0) {
    return { 
      stake: bankroll * fixedStakePct, 
      kellyFraction: 0 
    };
  }
  
  return { 
    stake: bankroll * kellyFraction, 
    kellyFraction 
  };
}
