// ============================================================
// Freebuff Football Betting System
// Main Entry Point
// ============================================================

import { CONFIG, validateConfig } from './config.js';
import { KNOWN_LEAGUES } from './models/leagues.js';
import { logger } from './utils/logger.js';
import {
  fetchUpcomingFixtures,
  buildFixtureDataPackage,
  passesLeagueFilter,
} from './pipeline/data-ingestion.js';
import { runPipeline } from './engine/prediction-pipeline.js';

/**
 * Main execution function
 * Runs the complete betting analysis pipeline
 */
async function main(): Promise<void> {
  console.log(`
╔══════════════════════════════════════════════════════╗
║     🏟️  Freebuff Football Betting System            ║
║     From Rules to Models: Probabilistic Engine       ║
╚══════════════════════════════════════════════════════╝
  `);

  // Validate configuration
  const configCheck = validateConfig();
  if (!configCheck.valid) {
    logger.warn(`Missing API keys: ${configCheck.missing.join(', ')}`);
    logger.warn('Running in demo mode with default models. Some features will be limited.\n');
  }

  // Log configuration
  logger.info('Configuration:');
  logger.info(`  Bankroll:           $${CONFIG.bankroll}`);
  logger.info(`  Min Avg Goals:      ${CONFIG.minAvgGoals}`);
  logger.info(`  Min BTTS Rate:      ${(CONFIG.minBttsRate * 100).toFixed(1)}%`);
  logger.info(`  Value Threshold:    ${(CONFIG.valueThreshold * 100).toFixed(1)}%`);
  logger.info(`  Kelly Fraction Cap: ${(CONFIG.kellyFractionCap * 100).toFixed(0)}%`);
  logger.info(`  Matches Window:     ${CONFIG.recentMatchesWindow}`);
  logger.info('');

  // Step 1: Filter leagues
  const season = new Date().getFullYear();
  const activeLeagues = KNOWN_LEAGUES.filter(league => {
    const result = passesLeagueFilter(league.avgGoalsPerMatch, league.bttsRate);
    if (!result.passes) {
      logger.debug(`Skipping ${league.name}: ${result.reason}`);
      return false;
    }
    return true;
  });

  logger.info(`Active leagues after filter: ${activeLeagues.length}`);
  const leagueIds = [...new Set(activeLeagues.map(l => l.id))];
  logger.info(`League IDs: ${leagueIds.join(', ')}\n`);

  // Step 2: Fetch upcoming fixtures
  const fixtures = await fetchUpcomingFixtures(leagueIds, season);

  if (fixtures.length === 0) {
    logger.info('No upcoming fixtures found. Try running during match season.');
    logger.info('You can also run the backtesting harness for historical analysis.');
    return;
  }

  // Step 3: Build data packages for each fixture
  logger.info('\nBuilding data packages for each fixture...\n');
  const packages = [];

  // Get top-ranked team IDs for outlier detection
  const topRankedTeamIds = new Set<number>(); // Will be populated from standings

  for (const fixture of fixtures.slice(0, 50)) { // Limit to 50 fixtures
    const pkg = await buildFixtureDataPackage(fixture, season, topRankedTeamIds);
    if (pkg) packages.push(pkg);
  }

  logger.info(`Built ${packages.length} data packages\n`);

  // Step 4-5: Run prediction pipeline (Phases 2-4)
  await runPipeline(packages);

  // Summary
  console.log('\n✅ Analysis complete!');
  console.log('For historical validation, run the backtesting harness.');
  console.log('Set API keys in environment variables for full functionality.\n');
}

// Run if executed directly
main().catch(err => {
  logger.error(`Fatal error: ${err}`);
  process.exit(1);
});

export { main };
