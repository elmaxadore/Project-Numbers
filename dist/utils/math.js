"use strict";
// ============================================================
// Math Utilities for the Betting System
// ============================================================
Object.defineProperty(exports, "__esModule", { value: true });
exports.oddsToImpliedProbability = oddsToImpliedProbability;
exports.calculateValue = calculateValue;
exports.kellyCriterion = kellyCriterion;
exports.fractionalKelly = fractionalKelly;
exports.calculateStake = calculateStake;
exports.calculateROI = calculateROI;
exports.maxDrawdown = maxDrawdown;
exports.sigmoid = sigmoid;
exports.zScore = zScore;
exports.minMaxNormalize = minMaxNormalize;
exports.clamp = clamp;
/**
 * Convert decimal odds to implied probability
 */
function oddsToImpliedProbability(odds) {
    return 1 / odds;
}
/**
 * Calculate the value (edge) of a bet
 * Value = model_probability - implied_probability
 */
function calculateValue(modelProb, decimalOdds) {
    const implied = oddsToImpliedProbability(decimalOdds);
    return modelProb - implied;
}
/**
 * Calculate Kelly Criterion stake fraction
 * f* = (bp - q) / b
 * where b = odds - 1, p = model probability, q = 1 - p
 */
function kellyCriterion(modelProb, decimalOdds) {
    const b = decimalOdds - 1;
    const p = modelProb;
    const q = 1 - p;
    if (b <= 0 || p <= 0)
        return 0;
    const kelly = (b * p - q) / b;
    return Math.max(0, kelly);
}
/**
 * Apply fractional Kelly (more conservative)
 */
function fractionalKelly(modelProb, decimalOdds, fraction = 0.25) {
    return kellyCriterion(modelProb, decimalOdds) * fraction;
}
/**
 * Calculate recommended stake based on Kelly and bankroll
 */
function calculateStake(modelProb, decimalOdds, bankroll, kellyCap = 0.25, fixedPct = 0.02) {
    const fullKelly = kellyCriterion(modelProb, decimalOdds);
    const cappedKelly = Math.min(fullKelly * kellyCap, kellyCap);
    const kellyFraction = cappedKelly;
    let stake;
    if (fullKelly > 0 && cappedKelly > 0) {
        stake = bankroll * cappedKelly;
    }
    else {
        // Fallback to fixed stake
        stake = bankroll * fixedPct;
    }
    return {
        stake: Math.round(stake * 100) / 100,
        kellyFraction: Math.round(kellyFraction * 10000) / 10000,
    };
}
/**
 * Calculate ROI from a series of bets
 */
function calculateROI(totalProfit, totalStake) {
    if (totalStake === 0)
        return 0;
    return (totalProfit / totalStake) * 100;
}
/**
 * Calculate max drawdown from a profit series
 */
function maxDrawdown(profits) {
    let peak = 0;
    let maxDD = 0;
    let cumulative = 0;
    for (const profit of profits) {
        cumulative += profit;
        if (cumulative > peak) {
            peak = cumulative;
        }
        const dd = peak - cumulative;
        if (dd > maxDD) {
            maxDD = dd;
        }
    }
    return maxDD;
}
/**
 * Sigmoid function for logistic regression
 */
function sigmoid(z) {
    // Clamp to prevent overflow
    const clamped = Math.max(-500, Math.min(500, z));
    return 1 / (1 + Math.exp(-clamped));
}
/**
 * Standardize a value using z-score normalization
 */
function zScore(value, mean, stdDev) {
    if (stdDev === 0)
        return 0;
    return (value - mean) / stdDev;
}
/**
 * Min-max normalize a value to [0, 1]
 */
function minMaxNormalize(value, min, max) {
    if (max === min)
        return 0.5;
    return (value - min) / (max - min);
}
/**
 * Clamp a number between min and max
 */
function clamp(value, min, max) {
    return Math.min(Math.max(value, min), max);
}
//# sourceMappingURL=math.js.map