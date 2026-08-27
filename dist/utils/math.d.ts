/**
 * Convert decimal odds to implied probability
 */
export declare function oddsToImpliedProbability(odds: number): number;
/**
 * Calculate the value (edge) of a bet
 * Value = model_probability - implied_probability
 */
export declare function calculateValue(modelProb: number, decimalOdds: number): number;
/**
 * Calculate Kelly Criterion stake fraction
 * f* = (bp - q) / b
 * where b = odds - 1, p = model probability, q = 1 - p
 */
export declare function kellyCriterion(modelProb: number, decimalOdds: number): number;
/**
 * Apply fractional Kelly (more conservative)
 */
export declare function fractionalKelly(modelProb: number, decimalOdds: number, fraction?: number): number;
/**
 * Calculate recommended stake based on Kelly and bankroll
 */
export declare function calculateStake(modelProb: number, decimalOdds: number, bankroll: number, kellyCap?: number, fixedPct?: number): {
    stake: number;
    kellyFraction: number;
};
/**
 * Calculate ROI from a series of bets
 */
export declare function calculateROI(totalProfit: number, totalStake: number): number;
/**
 * Calculate max drawdown from a profit series
 */
export declare function maxDrawdown(profits: number[]): number;
/**
 * Sigmoid function for logistic regression
 */
export declare function sigmoid(z: number): number;
/**
 * Standardize a value using z-score normalization
 */
export declare function zScore(value: number, mean: number, stdDev: number): number;
/**
 * Min-max normalize a value to [0, 1]
 */
export declare function minMaxNormalize(value: number, min: number, max: number): number;
/**
 * Clamp a number between min and max
 */
export declare function clamp(value: number, min: number, max: number): number;
//# sourceMappingURL=math.d.ts.map