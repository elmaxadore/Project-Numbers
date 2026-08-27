// ============================================================
// Complete Prediction Pipeline
// Orchestrates Phases 1-4 into a single run
// ============================================================

import {
  Fixture,
  FixtureDataPackage,
  FixtureExpectedStats,
  MarketOdds,
  ModelPrediction,
  BettingMarket,
  TeamVenueStats,
} from '../models/types.js';
import { CONFIG } from '../config.js';
import { SystemConfig } from '../models/types.js';
import {
  extractFeatures,
  predict,
  ModelWeights,
  DEFAULT_O25_WEIGHTS,
  DEFAULT_BTTS_WEIGHTS,
} from './logistic-regression.js';
import {
  filterWithValueEdge,
} from './value-calculator.js';
import {
  generateAllTickets,
  outputTickets,
} from './action-trigger.js';
import { logger } from '../utils/logger.js';

/**
 * Generate predictions for a fixture using the trained models
 */
export function predictFixture(
  fixtureData: FixtureDataPackage,
  o25Model: ModelWeights = DEFAULT_O25_WEIGHTS,
  bttsModel: ModelWeights = DEFAULT_BTTS_WEIGHTS
): ModelPrediction[] {
  const stats = fixtureData.expectedStats;
  const predictions: ModelPrediction[] = [];

  // Extract feature vector
  const features = extractFeatures(
    stats.homeTeamStats.xG,
    stats.homeTeamStats.xGA,
    stats.awayTeamStats.xG,
    stats.awayTeamStats.xGA,
    stats.homeTeamStats.cleanSheetRate,
    stats.awayTeamStats.failedToScoreRate,
    stats.fixtureId % 100,
    stats.homeTeamStats.avgGoalsScored,
    stats.homeTeamStats.avgGoalsConceded,
    stats.awayTeamStats.avgGoalsScored,
    stats.awayTeamStats.avgGoalsConceded
  );

  // Predict Over 2.5 Goals
  const o25Prob = predict(features, o25Model);
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
  const bttsProb = predict(features, bttsModel);
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
export async function runPipeline(
  fixturePackages: FixtureDataPackage[],
  o25Model: ModelWeights = DEFAULT_O25_WEIGHTS,
  bttsModel: ModelWeights = DEFAULT_BTTS_WEIGHTS,
  config: SystemConfig = CONFIG
): Promise<void> {
  logger.info(`\n🚀 Starting prediction pipeline for ${fixturePackages.length} fixtures...\n`);

  // Step 1: Generate predictions for all fixtures
  const allPredictions: ModelPrediction[] = [];
  for (const pkg of fixturePackages) {
    const predictions = predictFixture(pkg, o25Model, bttsModel);
    allPredictions.push(...predictions);
  }
  logger.info(`Generated ${allPredictions.length} predictions across ${fixturePackages.length} fixtures`);

  // Step 2: Find value edges
  const qualifiedBets = filterWithValueEdge(fixturePackages, allPredictions, config);

  // Step 3: Generate and output betting tickets
  const tickets = generateAllTickets(qualifiedBets, config);
  outputTickets(tickets);
}
