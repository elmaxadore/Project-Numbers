// ============================================================
// Backtesting Harness
// Validates model performance against historical data
// Simulates the system's decisions over past seasons
// ============================================================

import {
  BacktestBet,
  BacktestResult,
  BettingMarket,
  Fixture,
  FixtureDataPackage,
  ModelPrediction,
  SystemConfig,
} from '../../models/types.js';
import { CONFIG } from '../../config.js';
import {
  calculateROI,
  maxDrawdown,
  kellyCriterion,
} from '../../utils/math.js';
import { predictFixture } from '../prediction-pipeline.js';
import { findBestOdds, analyzeValue } from '../value-calculator.js';
import { logger } from '../../utils/logger.js';
import {
  ModelWeights,
  DEFAULT_O25_WEIGHTS,
  DEFAULT_BTTS_WEIGHTS,
} from '../logistic-regression.js';

/** Stats tracked per market */
interface MarketStats {
  count: number;
  wins: number;
  roi: number;
}

/** Stats tracked per league */
interface LeagueStats {
  count: number;
  wins: number;
  roi: number;
}

/**
 * Simulate a single match outcome based on actual goals
 */
function simulateOutcome(
  homeGoals: number,
  awayGoals: number,
  market: BettingMarket
): boolean {
  const totalGoals = homeGoals + awayGoals;

  switch (market) {
    case 'over_1.5_goals':
      return totalGoals > 1.5;
    case 'over_2.5_goals':
      return totalGoals > 2.5;
    case 'btts_yes':
      return homeGoals >= 1 && awayGoals >= 1;
    default:
      return false;
  }
}

/**
 * Backtest the system against historical fixtures
 */
export async function runBacktest(
  historicalFixtures: Array<{
    fixture: FixtureDataPackage;
    homeGoals: number;
    awayGoals: number;
  }>,
  o25Model: ModelWeights = DEFAULT_O25_WEIGHTS,
  bttsModel: ModelWeights = DEFAULT_BTTS_WEIGHTS,
  config: SystemConfig = CONFIG
): Promise<BacktestResult> {
  logger.info(`\n📊 Starting backtest with ${historicalFixtures.length} historical fixtures...\n`);

  const bets: BacktestBet[] = [];

  for (const { fixture, homeGoals, awayGoals } of historicalFixtures) {
    // Generate predictions
    const predictions = predictFixture(fixture, o25Model, bttsModel);

    // Check value for each market
    for (const prediction of predictions) {
      const valueAnalysis = analyzeValue(prediction, fixture.odds, config);
      if (!valueAnalysis || !valueAnalysis.hasEdge) continue;

      // Check if bet would have won
      const won = simulateOutcome(homeGoals, awayGoals, prediction.market);

      // Calculate profit/loss
      const stake = config.bankroll * config.fixedStakePercentage;
      const profit = won ? stake * (valueAnalysis.bestOdds - 1) : -stake;

      bets.push({
        fixtureId: fixture.fixture.id,
        date: fixture.fixture.date,
        league: fixture.fixture.leagueName,
        market: prediction.market,
        modelProbability: prediction.modelProbability,
        odds: valueAnalysis.bestOdds,
        value: valueAnalysis.value,
        stake,
        won,
        profit,
      });
    }
  }

  return compileResults(bets, historicalFixtures);
}

/**
 * Compile backtest results into summary statistics
 */
function compileResults(
  bets: BacktestBet[],
  fixtures: Array<{ fixture: FixtureDataPackage }>
): BacktestResult {
  const wins = bets.filter(b => b.won).length;
  const losses = bets.filter(b => !b.won).length;
  const totalStake = bets.reduce((sum, b) => sum + b.stake, 0);
  const totalProfit = bets.reduce((sum, b) => sum + b.profit, 0);

  // By market breakdown
  const marketKeys: BettingMarket[] = [
    'over_1.5_goals',
    'over_2.5_goals',
    'btts_yes',
    'match_result',
  ];
  const betsByMarket: Record<string, MarketStats> = {};
  for (const key of marketKeys) {
    betsByMarket[key] = { count: 0, wins: 0, roi: 0 };
  }

  for (const bet of bets) {
    const market = betsByMarket[bet.market];
    if (market) {
      market.count++;
      if (bet.won) market.wins++;
    }
  }

  for (const key of marketKeys) {
    const m = betsByMarket[key];
    const marketBets = bets.filter(b => b.market === key);
    const marketStake = marketBets.reduce((sum, b) => sum + b.stake, 0);
    const marketProfit = marketBets.reduce((sum, b) => sum + b.profit, 0);
    m.roi = calculateROI(marketProfit, marketStake);
  }

  // By league breakdown
  const betsByLeague: Record<string, LeagueStats> = {};
  for (const bet of bets) {
    if (!betsByLeague[bet.league]) {
      betsByLeague[bet.league] = { count: 0, wins: 0, roi: 0 };
    }
    const l = betsByLeague[bet.league];
    l.count++;
    if (bet.won) l.wins++;
  }

  for (const league of Object.keys(betsByLeague)) {
    const l = betsByLeague[league];
    const leagueBets = bets.filter(b => b.league === league);
    const leagueStake = leagueBets.reduce((sum, b) => sum + b.stake, 0);
    const leagueProfit = leagueBets.reduce((sum, b) => sum + b.profit, 0);
    l.roi = calculateROI(leagueProfit, leagueStake);
  }

  // Period
  const dates = bets.map(b => b.date).sort();

  return {
    totalBets: bets.length,
    wins,
    losses,
    winRate: bets.length > 0 ? (wins / bets.length) * 100 : 0,
    totalStake,
    totalProfit,
    roi: calculateROI(totalProfit, totalStake),
    maxDrawdown: maxDrawdown(bets.map(b => b.profit)),
    averageOdds: bets.length > 0 ? bets.reduce((sum, b) => sum + b.odds, 0) / bets.length : 0,
    averageValue: bets.length > 0 ? bets.reduce((sum, b) => sum + b.value, 0) / bets.length : 0,
    betsByMarket: betsByMarket as BacktestResult['betsByMarket'],
    betsByLeague,
    period: {
      from: dates[0] || 'N/A',
      to: dates[dates.length - 1] || 'N/A',
    },
  };
}

/**
 * Print backtest results in a readable format
 */
export function printBacktestResults(result: BacktestResult): void {
  console.log('\n╔══════════════════════════════════════════════╗');
  console.log('║         📊 BACKTEST RESULTS                 ║');
  console.log('╚══════════════════════════════════════════════╝\n');

  console.log(`  Period:            ${result.period.from} → ${result.period.to}`);
  console.log(`  Total Bets:        ${result.totalBets}`);
  console.log(`  Wins:              ${result.wins} (${result.winRate.toFixed(1)}%)`);
  console.log(`  Losses:            ${result.losses}`);
  console.log(`  Total Stake:       $${result.totalStake.toFixed(2)}`);
  console.log(`  Total Profit:      $${result.totalProfit.toFixed(2)}`);
  console.log(`  ROI:               ${result.roi >= 0 ? '+' : ''}${result.roi.toFixed(2)}%`);
  console.log(`  Max Drawdown:      $${result.maxDrawdown.toFixed(2)}`);
  console.log(`  Avg Odds:          ${result.averageOdds.toFixed(2)}`);
  console.log(`  Avg Value:         ${result.averageValue.toFixed(4)}`);

  console.log('\n  By Market:');
  for (const [market, stats] of Object.entries(result.betsByMarket)) {
    if (stats.count > 0) {
      console.log(`    ${market}: ${stats.count} bets, ${stats.wins} wins, ROI ${stats.roi >= 0 ? '+' : ''}${stats.roi.toFixed(2)}%`);
    }
  }

  console.log('\n  By League:');
  const sortedLeagues = Object.entries(result.betsByLeague)
    .sort((a, b) => b[1].roi - a[1].roi);

  for (const [league, stats] of sortedLeagues) {
    console.log(`    ${league}: ${stats.count} bets, ${stats.wins} wins, ROI ${stats.roi >= 0 ? '+' : ''}${stats.roi.toFixed(2)}%`);
  }

  console.log();
}

/**
 * Generate mock historical fixtures for demo backtesting
 */
function generateMockHistoricalFixtures(count: number = 50) {
  const fixtures: Array<{
    fixture: FixtureDataPackage;
    homeGoals: number;
    awayGoals: number;
  }> = [];

  const leagues = [
    { id: 88, name: 'Eredivisie' },
    { id: 78, name: 'Bundesliga' },
    { id: 39, name: 'Premier League' },
  ];

  for (let i = 0; i < count; i++) {
    const league = leagues[i % leagues.length];
    const fixture: FixtureDataPackage = {
      fixture: {
        id: i,
        leagueId: league.id,
        leagueName: league.name,
        homeTeam: { id: i * 2, name: `${league.name} Home ${i}` },
        awayTeam: { id: i * 2 + 1, name: `${league.name} Away ${i}` },
        date: new Date(Date.now() - (count - i) * 86400000).toISOString(),
        status: 'finished' as const,
      },
      expectedStats: {
        fixtureId: i,
        homeTeamStats: {
          teamId: i * 2,
          teamName: `${league.name} Home ${i}`,
          venue: 'home' as const,
          matchesPlayed: 15,
          goalsScored: 22,
          goalsConceded: 16,
          avgGoalsScored: 1.5,
          avgGoalsConceded: 1.1,
          xG: 22.5,
          xGA: 16.5,
          cleanSheetRate: 0.35,
          failedToScoreRate: 0.20,
          bttsRate: 0.55,
          over25Rate: 0.60,
          over15Rate: 0.80,
        },
        awayTeamStats: {
          teamId: i * 2 + 1,
          teamName: `${league.name} Away ${i}`,
          venue: 'away' as const,
          matchesPlayed: 15,
          goalsScored: 18,
          goalsConceded: 19,
          avgGoalsScored: 1.2,
          avgGoalsConceded: 1.3,
          xG: 18.0,
          xGA: 19.5,
          cleanSheetRate: 0.25,
          failedToScoreRate: 0.25,
          bttsRate: 0.55,
          over25Rate: 0.55,
          over15Rate: 0.75,
        },
        combinedExpectedGoals: 2.7,
        combinedExpectedConceded: 2.4,
        fixtureXG: 2.55,
      },
      odds: [
        {
          fixtureId: i,
          bookmaker: 'DemoBookie',
          market: 'over_2.5_goals' as const,
          homeOdds: null,
          drawOdds: null,
          awayOdds: null,
          overOdds: 1.85,
          underOdds: 1.95,
          yesOdds: null,
          noOdds: null,
          timestamp: new Date().toISOString(),
        },
        {
          fixtureId: i,
          bookmaker: 'DemoBookie',
          market: 'btts_yes' as const,
          homeOdds: null,
          drawOdds: null,
          awayOdds: null,
          overOdds: null,
          underOdds: null,
          yesOdds: 1.90,
          noOdds: 1.90,
          timestamp: new Date().toISOString(),
        },
      ],
      leagueFilterPassed: true,
      sampleSizeFilterPassed: true,
      outlierFlags: {
        isRunawayGiant: false,
        homeCleanSheetRate: 0.35,
        awayFailedToScoreRate: 0.25,
      },
    };

    // Simulate realistic goal outcomes
    const homeGoals = Math.floor(Math.random() * 4);
    const awayGoals = Math.floor(Math.random() * 3);

    fixtures.push({ fixture, homeGoals, awayGoals });
  }

  return fixtures;
}

/**
 * Main entry point for backtesting CLI
 */
async function main(): Promise<void> {
  console.log(`
╔══════════════════════════════════════════════════════╗
║     📊 Freebuff Backtesting Harness (DEMO MODE)     ║
║     WARNING: Uses mock data for demonstration       ║
║     NOT FOR PRODUCTION USE                          ║
╚══════════════════════════════════════════════════════╝
  `);

  logger.warn('⚠️  WARNING: This backtest uses MOCK DATA for demonstration only.');
  logger.warn('⚠️  DO NOT use these results for real betting decisions.');
  logger.warn('⚠️  For production backtesting, connect to real historical APIs.');
  logger.warn('');
  
  logger.info('Generating mock historical fixtures for demonstration...');
  const mockFixtures = generateMockHistoricalFixtures(50);

  logger.info(`Running backtest on ${mockFixtures.length} historical fixtures...\n`);

  const result = await runBacktest(mockFixtures);
  printBacktestResults(result);

  console.log('✅ Demo backtest complete!');
  console.log('⚠️  NOTE: Results are based on MOCK DATA and should not be used for real betting.');
  console.log('💡  Connect to real historical APIs (API-Sports, Football-Data.org) for production backtesting.\n');
}

// Run if executed directly
main().catch(err => {
  logger.error(`Fatal error: ${err}`);
  process.exit(1);
});

export { main };
