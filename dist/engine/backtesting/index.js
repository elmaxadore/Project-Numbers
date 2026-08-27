"use strict";
// ============================================================
// Backtesting Harness
// Validates model performance against historical data
// Simulates the system's decisions over past seasons
// ============================================================
Object.defineProperty(exports, "__esModule", { value: true });
exports.runBacktest = runBacktest;
exports.printBacktestResults = printBacktestResults;
const config_js_1 = require("../../config.js");
const math_js_1 = require("../../utils/math.js");
const prediction_pipeline_js_1 = require("../prediction-pipeline.js");
const value_calculator_js_1 = require("../value-calculator.js");
const logger_js_1 = require("../../utils/logger.js");
const logistic_regression_js_1 = require("../logistic-regression.js");
/**
 * Simulate a single match outcome based on actual goals
 */
function simulateOutcome(homeGoals, awayGoals, market) {
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
async function runBacktest(historicalFixtures, o25Model = logistic_regression_js_1.DEFAULT_O25_WEIGHTS, bttsModel = logistic_regression_js_1.DEFAULT_BTTS_WEIGHTS, config = config_js_1.CONFIG) {
    logger_js_1.logger.info(`\n📊 Starting backtest with ${historicalFixtures.length} historical fixtures...\n`);
    const bets = [];
    for (const { fixture, homeGoals, awayGoals } of historicalFixtures) {
        // Generate predictions
        const predictions = (0, prediction_pipeline_js_1.predictFixture)(fixture, o25Model, bttsModel);
        // Check value for each market
        for (const prediction of predictions) {
            const valueAnalysis = (0, value_calculator_js_1.analyzeValue)(prediction, fixture.odds, config);
            if (!valueAnalysis || !valueAnalysis.hasEdge)
                continue;
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
function compileResults(bets, fixtures) {
    const wins = bets.filter(b => b.won).length;
    const losses = bets.filter(b => !b.won).length;
    const totalStake = bets.reduce((sum, b) => sum + b.stake, 0);
    const totalProfit = bets.reduce((sum, b) => sum + b.profit, 0);
    // By market breakdown
    const marketKeys = [
        'over_1.5_goals',
        'over_2.5_goals',
        'btts_yes',
        'match_result',
    ];
    const betsByMarket = {};
    for (const key of marketKeys) {
        betsByMarket[key] = { count: 0, wins: 0, roi: 0 };
    }
    for (const bet of bets) {
        const market = betsByMarket[bet.market];
        if (market) {
            market.count++;
            if (bet.won)
                market.wins++;
        }
    }
    for (const key of marketKeys) {
        const m = betsByMarket[key];
        const marketBets = bets.filter(b => b.market === key);
        const marketStake = marketBets.reduce((sum, b) => sum + b.stake, 0);
        const marketProfit = marketBets.reduce((sum, b) => sum + b.profit, 0);
        m.roi = (0, math_js_1.calculateROI)(marketProfit, marketStake);
    }
    // By league breakdown
    const betsByLeague = {};
    for (const bet of bets) {
        if (!betsByLeague[bet.league]) {
            betsByLeague[bet.league] = { count: 0, wins: 0, roi: 0 };
        }
        const l = betsByLeague[bet.league];
        l.count++;
        if (bet.won)
            l.wins++;
    }
    for (const league of Object.keys(betsByLeague)) {
        const l = betsByLeague[league];
        const leagueBets = bets.filter(b => b.league === league);
        const leagueStake = leagueBets.reduce((sum, b) => sum + b.stake, 0);
        const leagueProfit = leagueBets.reduce((sum, b) => sum + b.profit, 0);
        l.roi = (0, math_js_1.calculateROI)(leagueProfit, leagueStake);
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
        roi: (0, math_js_1.calculateROI)(totalProfit, totalStake),
        maxDrawdown: (0, math_js_1.maxDrawdown)(bets.map(b => b.profit)),
        averageOdds: bets.length > 0 ? bets.reduce((sum, b) => sum + b.odds, 0) / bets.length : 0,
        averageValue: bets.length > 0 ? bets.reduce((sum, b) => sum + b.value, 0) / bets.length : 0,
        betsByMarket: betsByMarket,
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
function printBacktestResults(result) {
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
//# sourceMappingURL=index.js.map