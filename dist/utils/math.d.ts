/**
 * Sigmoid function for logistic regression
 */
export declare function sigmoid(x: number): number;
/**
 * Z-score normalization
 */
export declare function zScore(value: number, mean: number, std: number): number;
/**
 * Convert decimal odds to implied probability
 */
export declare function oddsToImpliedProbability(decimalOdds: number): number;
/**
 * Calculate value edge: modelProb - impliedProb
 */
export declare function calculateValue(modelProb: number, decimalOdds: number): number;
/**
 * Calculate Kelly Criterion stake
 * f* = (bp - q) / b
 * where:
 *   b = decimal_odds - 1
 *   p = model probability
 *   q = 1 - p
 */
export declare function calculateKelly(modelProb: number, decimalOdds: number, maxFraction?: number): number;
/**
 * Calculate ROI from a series of bets
 */
export declare function calculateROI(totalStake: number, totalProfit: number): number;
/**
 * Calculate maximum drawdown from a series of cumulative profits
 */
export declare function maxDrawdown(cumulativeProfits: number[]): number;
/**
 * Kelly Criterion calculation (alias for calculateKelly)
 */
export declare function kellyCriterion(modelProb: number, decimalOdds: number, maxFraction?: number): number;
/**
 * Calculate recommended stake as amount (not percentage)
 * Returns object with stake amount and kelly fraction used
 */
export declare function calculateStake(modelProb: number, decimalOdds: number, bankroll: number, kellyCap?: number, fixedStakePct?: number): {
    stake: number;
    kellyFraction: number;
};
//# sourceMappingURL=math.d.ts.map