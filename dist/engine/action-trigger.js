"use strict";
// ============================================================
// Phase 4: Action Trigger and Output Generation
// Generates structured betting tickets for qualifying bets
// ============================================================
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateBettingTicket = generateBettingTicket;
exports.formatTicket = formatTicket;
exports.generateAllTickets = generateAllTickets;
exports.outputTickets = outputTickets;
exports.exportTicketsJSON = exportTicketsJSON;
const fs = __importStar(require("fs"));
const config_js_1 = require("../config.js");
const math_js_1 = require("../utils/math.js");
const logger_js_1 = require("../utils/logger.js");
/**
 * Determine confidence level based on value and model probability
 */
function getConfidenceLevel(value, modelProbability) {
    if (value > 0.08 && modelProbability > 0.65)
        return 'high';
    if (value > 0.04 && modelProbability > 0.55)
        return 'medium';
    return 'low';
}
/**
 * Format market name for display
 */
function formatMarket(market) {
    switch (market) {
        case 'over_1.5_goals': return 'Over 1.5 Goals';
        case 'over_2.5_goals': return 'Over 2.5 Goals';
        case 'btts_yes': return 'Both Teams to Score (Yes)';
        case 'match_result': return 'Match Result';
        default: return market;
    }
}
/**
 * Generate a betting ticket from qualified value analysis
 */
function generateBettingTicket(pkg, prediction, valueAnalysis, config = config_js_1.CONFIG) {
    const stakeInfo = (0, math_js_1.calculateStake)(valueAnalysis.modelProbability, valueAnalysis.bestOdds, config.bankroll, config.kellyFractionCap, config.fixedStakePercentage);
    const confidence = getConfidenceLevel(valueAnalysis.value, valueAnalysis.modelProbability);
    return {
        fixtureId: pkg.fixture.id,
        league: pkg.fixture.leagueName,
        homeTeam: pkg.fixture.homeTeam.name,
        awayTeam: pkg.fixture.awayTeam.name,
        fixtureDate: pkg.fixture.date,
        market: prediction.market,
        modelPrediction: Math.round(valueAnalysis.modelProbability * 1000) / 10,
        bookmakerOdds: valueAnalysis.bestOdds,
        bookmakerName: valueAnalysis.bestBookmaker,
        impliedProbability: Math.round(valueAnalysis.impliedProbability * 1000) / 10,
        calculatedValue: Math.round(valueAnalysis.value * 1000) / 10,
        recommendedStake: stakeInfo.stake,
        kellyFraction: stakeInfo.kellyFraction,
        confidence,
    };
}
/**
 * Format a betting ticket as a readable string
 */
function formatTicket(ticket) {
    const lines = [
        '╔══════════════════════════════════════════════╗',
        '║         🎯 BETTING TICKET                   ║',
        '╚══════════════════════════════════════════════╝',
        '',
        `🏟️  ${ticket.homeTeam} vs ${ticket.awayTeam}`,
        `📅  ${ticket.fixtureDate}`,
        `🏆  ${ticket.league}`,
        '',
        `📊  Market: ${formatMarket(ticket.market)}`,
        `📈  Model Prediction: ${ticket.modelPrediction}%`,
        `🎰  Best Odds: ${ticket.bookmakerOdds} (${ticket.bookmakerName})`,
        `📉  Implied Probability: ${ticket.impliedProbability}%`,
        '',
        `💎  Value Edge: +${ticket.calculatedValue}%`,
        `🎯  Confidence: ${ticket.confidence.toUpperCase()}`,
        '',
        `💰  Recommended Stake: $${ticket.recommendedStake.toFixed(2)}`,
        `   (Kelly Fraction: ${(ticket.kellyFraction * 100).toFixed(2)}%)`,
        '',
        '═══════════════════════════════════════════════',
    ];
    return lines.join('\n');
}
/**
 * Generate betting tickets for all qualifying bets
 */
function generateAllTickets(qualifiedBets, config = config_js_1.CONFIG) {
    const tickets = [];
    for (const bet of qualifiedBets) {
        const ticket = generateBettingTicket(bet.pkg, bet.prediction, bet.value, config);
        tickets.push(ticket);
    }
    return tickets;
}
/**
 * Output all tickets as structured JSON and formatted text
 */
function outputTickets(tickets) {
    if (tickets.length === 0) {
        logger_js_1.logger.info('No qualifying bets found for this run.');
        return;
    }
    logger_js_1.logger.success(`Generated ${tickets.length} betting ticket(s)\n`);
    // Print formatted tickets
    for (const ticket of tickets) {
        console.log(formatTicket(ticket));
        console.log();
    }
    // Print summary
    const totalStake = tickets.reduce((sum, t) => sum + t.recommendedStake, 0);
    const avgValue = tickets.reduce((sum, t) => sum + t.calculatedValue, 0) / tickets.length;
    const avgOdds = tickets.reduce((sum, t) => sum + t.bookmakerOdds, 0) / tickets.length;
    console.log('╔══════════════════════════════════════════════╗');
    console.log('║         📊 SUMMARY                         ║');
    console.log('╚══════════════════════════════════════════════╝');
    console.log(`  Total Bets:       ${tickets.length}`);
    console.log(`  Total Stake:      $${totalStake.toFixed(2)}`);
    console.log(`  Avg Value:        +${avgValue.toFixed(1)}%`);
    console.log(`  Avg Odds:         ${avgOdds.toFixed(2)}`);
    console.log(`  Confidence:       H:${tickets.filter(t => t.confidence === 'high').length} M:${tickets.filter(t => t.confidence === 'medium').length} L:${tickets.filter(t => t.confidence === 'low').length}`);
    console.log();
}
/**
 * Export tickets to JSON file
 */
function exportTicketsJSON(tickets, filePath) {
    const output = {
        generatedAt: new Date().toISOString(),
        totalBets: tickets.length,
        tickets,
    };
    fs.writeFileSync(filePath, JSON.stringify(output, null, 2));
    logger_js_1.logger.success(`Tickets exported to ${filePath}`);
}
//# sourceMappingURL=action-trigger.js.map