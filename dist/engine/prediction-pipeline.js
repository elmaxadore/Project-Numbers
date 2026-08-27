"use strict";
// ============================================================
// Complete Prediction Pipeline
// Orchestrates Phases 1-4 into a single run
// ============================================================
Object.defineProperty(exports, "__esModule", { value: true });
exports.predictFixture = predictFixture;
exports.runPipeline = runPipeline;
const config_js_1 = require("../config.js");
const logistic_regression_js_1 = require("./logistic-regression.js");
const value_calculator_js_1 = require("./value-calculator.js");
const action_trigger_js_1 = require("./action-trigger.js");
const logger_js_1 = require("../utils/logger.js");
/**
 * Generate predictions for a fixture using the trained models
 */
function predictFixture(fixtureData, o25Model = logistic_regression_js_1.DEFAULT_O25_WEIGHTS, bttsModel = logistic_regression_js_1.DEFAULT_BTTS_WEIGHTS) {
    const stats = fixtureData.expectedStats;
    const predictions = [];
    // Extract feature vector
    const features = (0, logistic_regression_js_1.extractFeatures)(stats.homeTeamStats.xG, stats.homeTeamStats.xGA, stats.awayTeamStats.xG, stats.awayTeamStats.xGA, stats.homeTeamStats.cleanSheetRate, stats.awayTeamStats.failedToScoreRate, stats.fixtureId % 100, stats.homeTeamStats.avgGoalsScored, stats.homeTeamStats.avgGoalsConceded, stats.awayTeamStats.avgGoalsScored, stats.awayTeamStats.avgGoalsConceded);
    // Predict Over 2.5 Goals
    const o25Prob = (0, logistic_regression_js_1.predict)(features, o25Model);
    predictions.push({
        fixtureId: fixtureData.fixture.id,
        market: 'over_2.5_goals',
        modelProbability: o25Prob,
        modelConfidence: Math.abs(o25Prob - 0.5) * 2, // distance from 50%
        features: {
            homeXG: features[0],
            homeXGA: features[1],
            awayXG: features[2],
            awayXGA: features[3],
            combinedXG: features[6],
        },
    });
    // Predict BTTS
    const bttsProb = (0, logistic_regression_js_1.predict)(features, bttsModel);
    predictions.push({
        fixtureId: fixtureData.fixture.id,
        market: 'btts_yes',
        modelProbability: bttsProb,
        modelConfidence: Math.abs(bttsProb - 0.5) * 2,
        features: {
            homeXG: features[0],
            homeXGA: features[1],
            awayXG: features[2],
            awayXGA: features[3],
            combinedXG: features[6],
        },
    });
    return predictions;
}
/**
 * Run the complete pipeline for a set of fixture data packages
 */
async function runPipeline(fixturePackages, o25Model = logistic_regression_js_1.DEFAULT_O25_WEIGHTS, bttsModel = logistic_regression_js_1.DEFAULT_BTTS_WEIGHTS, config = config_js_1.CONFIG) {
    logger_js_1.logger.info(`\n🚀 Starting prediction pipeline for ${fixturePackages.length} fixtures...\n`);
    // Step 1: Generate predictions for all fixtures
    const allPredictions = [];
    for (const pkg of fixturePackages) {
        const predictions = predictFixture(pkg, o25Model, bttsModel);
        allPredictions.push(...predictions);
    }
    logger_js_1.logger.info(`Generated ${allPredictions.length} predictions across ${fixturePackages.length} fixtures`);
    // Step 2: Find value edges
    const qualifiedBets = (0, value_calculator_js_1.filterWithValueEdge)(fixturePackages, allPredictions, config);
    // Step 3: Generate and output betting tickets
    const tickets = (0, action_trigger_js_1.generateAllTickets)(qualifiedBets, config);
    (0, action_trigger_js_1.outputTickets)(tickets);
}
//# sourceMappingURL=prediction-pipeline.js.map