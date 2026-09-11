// ============================================================
// Math Utilities for the Betting System
// ============================================================
/**
 * Sigmoid function for logistic regression
 */
export function sigmoid(x) {
    return 1 / (1 + Math.exp(-x));
}
/**
 * Z-score normalization
 */
export function zScore(value, mean, std) {
    if (std === 0)
        return 0;
    return (value - mean) / std;
}
/**
 * Convert decimal odds to implied probability
 */
export function oddsToImpliedProbability(decimalOdds) {
    if (decimalOdds <= 1)
        return 1;
    return 1 / decimalOdds;
}
/**
 * Calculate value edge: modelProb - impliedProb
 */
export function calculateValue(modelProb, decimalOdds) {
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
export function calculateKelly(modelProb, decimalOdds, maxFraction = 0.25) {
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
export function calculateROI(totalStake, totalProfit) {
    if (totalStake === 0)
        return 0;
    return (totalProfit / totalStake) * 100;
}
/**
 * Calculate maximum drawdown from a series of cumulative profits
 */
export function maxDrawdown(cumulativeProfits) {
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
export function kellyCriterion(modelProb, decimalOdds, maxFraction = 0.25) {
    return calculateKelly(modelProb, decimalOdds, maxFraction);
}
/**
 * Calculate recommended stake as amount (not percentage)
 * Returns object with stake amount and kelly fraction used
 */
export function calculateStake(modelProb, decimalOdds, bankroll, kellyCap = 0.25, fixedStakePct = 0.02) {
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
//# sourceMappingURL=math.js.map