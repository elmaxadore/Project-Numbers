"use strict";
// ============================================================
// Freebuff Football Betting System
// Main Entry Point
// ============================================================
Object.defineProperty(exports, "__esModule", { value: true });
exports.main = main;
const config_js_1 = require("./config.js");
const leagues_js_1 = require("./models/leagues.js");
const logger_js_1 = require("./utils/logger.js");
const data_ingestion_js_1 = require("./pipeline/data-ingestion.js");
const prediction_pipeline_js_1 = require("./engine/prediction-pipeline.js");
/**
 * Main execution function
 * Runs the complete betting analysis pipeline
 */
async function main() {
    console.log(`
╔══════════════════════════════════════════════════════╗
║     🏟️  Freebuff Football Betting System            ║
║     From Rules to Models: Probabilistic Engine       ║
╚══════════════════════════════════════════════════════╝
  `);
    // Validate configuration
    const configCheck = (0, config_js_1.validateConfig)();
    if (!configCheck.valid) {
        logger_js_1.logger.warn(`Missing API keys: ${configCheck.missing.join(', ')}`);
        logger_js_1.logger.warn('Running in demo mode with default models. Some features will be limited.\n');
    }
    // Log configuration
    logger_js_1.logger.info('Configuration:');
    logger_js_1.logger.info(`  Bankroll:           $${config_js_1.CONFIG.bankroll}`);
    logger_js_1.logger.info(`  Min Avg Goals:      ${config_js_1.CONFIG.minAvgGoals}`);
    logger_js_1.logger.info(`  Min BTTS Rate:      ${(config_js_1.CONFIG.minBttsRate * 100).toFixed(1)}%`);
    logger_js_1.logger.info(`  Value Threshold:    ${(config_js_1.CONFIG.valueThreshold * 100).toFixed(1)}%`);
    logger_js_1.logger.info(`  Kelly Fraction Cap: ${(config_js_1.CONFIG.kellyFractionCap * 100).toFixed(0)}%`);
    logger_js_1.logger.info(`  Matches Window:     ${config_js_1.CONFIG.recentMatchesWindow}`);
    logger_js_1.logger.info('');
    // Step 1: Filter leagues
    const season = new Date().getFullYear();
    const activeLeagues = leagues_js_1.KNOWN_LEAGUES.filter(league => {
        const result = (0, data_ingestion_js_1.passesLeagueFilter)(league.avgGoalsPerMatch, league.bttsRate);
        if (!result.passes) {
            logger_js_1.logger.debug(`Skipping ${league.name}: ${result.reason}`);
            return false;
        }
        return true;
    });
    logger_js_1.logger.info(`Active leagues after filter: ${activeLeagues.length}`);
    const leagueIds = [...new Set(activeLeagues.map(l => l.id))];
    logger_js_1.logger.info(`League IDs: ${leagueIds.join(', ')}\n`);
    // Step 2: Fetch upcoming fixtures
    const fixtures = await (0, data_ingestion_js_1.fetchUpcomingFixtures)(leagueIds, season);
    if (fixtures.length === 0) {
        logger_js_1.logger.info('No upcoming fixtures found. Try running during match season.');
        logger_js_1.logger.info('You can also run the backtesting harness for historical analysis.');
        return;
    }
    // Step 3: Build data packages for each fixture
    logger_js_1.logger.info('\nBuilding data packages for each fixture...\n');
    const packages = [];
    // Get top-ranked team IDs for outlier detection
    const topRankedTeamIds = new Set(); // Will be populated from standings
    for (const fixture of fixtures.slice(0, 50)) { // Limit to 50 fixtures
        const pkg = await (0, data_ingestion_js_1.buildFixtureDataPackage)(fixture, season, topRankedTeamIds);
        if (pkg)
            packages.push(pkg);
    }
    logger_js_1.logger.info(`Built ${packages.length} data packages\n`);
    // Step 4-5: Run prediction pipeline (Phases 2-4)
    await (0, prediction_pipeline_js_1.runPipeline)(packages);
    // Summary
    console.log('\n✅ Analysis complete!');
    console.log('For historical validation, run the backtesting harness.');
    console.log('Set API keys in environment variables for full functionality.\n');
}
// Run if executed directly
main().catch(err => {
    logger_js_1.logger.error(`Fatal error: ${err}`);
    process.exit(1);
});
//# sourceMappingURL=index.js.map