// ============================================================
// Phase 4: Action Trigger and Output Generation
// Generates structured betting tickets for qualifying bets
// ============================================================

import * as fs from 'fs';
import {
  BettingTicket,
  BettingMarket,
  ValueAnalysis,
  FixtureDataPackage,
  ModelPrediction,
  SystemConfig,
} from '../models/types.js';
import { CONFIG } from '../config.js';
import { calculateStake } from '../utils/math.js';
import { logger } from '../utils/logger.js';

/**
 * Determine confidence level based on value and model probability
 */
function getConfidenceLevel(
  value: number,
  modelProbability: number
): 'low' | 'medium' | 'high' {
  if (value > 0.08 && modelProbability > 0.65) return 'high';
  if (value > 0.04 && modelProbability > 0.55) return 'medium';
  return 'low';
}

/**
 * Format market name for display
 */
function formatMarket(market: BettingMarket): string {
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
export function generateBettingTicket(
  pkg: FixtureDataPackage,
  prediction: ModelPrediction,
  valueAnalysis: ValueAnalysis,
  config: SystemConfig = CONFIG
): BettingTicket {
  const stakeInfo = calculateStake(
    valueAnalysis.modelProbability,
    valueAnalysis.bestOdds,
    config.bankroll,
    config.kellyFractionCap,
    config.fixedStakePercentage
  );

  const confidence = getConfidenceLevel(
    valueAnalysis.value,
    valueAnalysis.modelProbability
  );

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
export function formatTicket(ticket: BettingTicket): string {
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
export function generateAllTickets(
  qualifiedBets: Array<{
    pkg: FixtureDataPackage;
    prediction: ModelPrediction;
    value: ValueAnalysis;
  }>,
  config: SystemConfig = CONFIG
): BettingTicket[] {
  const tickets: BettingTicket[] = [];

  for (const bet of qualifiedBets) {
    const ticket = generateBettingTicket(bet.pkg, bet.prediction, bet.value, config);
    tickets.push(ticket);
  }

  return tickets;
}

/**
 * Output all tickets as structured JSON and formatted text
 */
export function outputTickets(tickets: BettingTicket[]): void {
  if (tickets.length === 0) {
    logger.info('No qualifying bets found for this run.');
    return;
  }

  logger.success(`Generated ${tickets.length} betting ticket(s)\n`);

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
export function exportTicketsJSON(tickets: BettingTicket[], filePath: string): void {
  const output = {
    generatedAt: new Date().toISOString(),
    totalBets: tickets.length,
    tickets,
  };
  fs.writeFileSync(filePath, JSON.stringify(output, null, 2));
  logger.success(`Tickets exported to ${filePath}`);
}
