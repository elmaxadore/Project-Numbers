// ============================================================
// Phase 3: Value Calculation and Filtering
// Compares model probability vs bookmaker implied probability
// to identify +EV bets
// ============================================================

import {
  BettingMarket,
  FixtureDataPackage,
  MarketOdds,
  ModelPrediction,
  ValueAnalysis,
} from '../models/types.js';
import { CONFIG } from '../config.js';
import { oddsToImpliedProbability, calculateValue } from '../utils/math.js';
import { logger } from '../utils/logger.js';

/**
 * Find the best odds across all bookmakers for a specific market
 */
export function findBestOdds(
  odds: MarketOdds[],
  market: BettingMarket
): { bestOdds: number; bestBookmaker: string } | null {
  let bestOdds = 0;
  let bestBookmaker = '';

  for (const bookmakerOdds of odds) {
    if (bookmakerOdds.market !== market) continue;

    const candidateOdds = getMarketOdds(bookmakerOdds, market);

    if (candidateOdds !== null && candidateOdds > bestOdds) {
      bestOdds = candidateOdds;
      bestBookmaker = bookmakerOdds.bookmaker;
    }
  }

  if (bestOdds === 0) return null;
  return { bestOdds, bestBookmaker };
}

/**
 * Extract the relevant odds from a MarketOdds entry for a given market
 */
function getMarketOdds(odds: MarketOdds, market: BettingMarket): number | null {
  switch (market) {
    case 'over_2.5_goals':
      return odds.overOdds;
    case 'over_1.5_goals':
      return odds.overOdds; // Same field, differentiated by context
    case 'btts_yes':
      return odds.yesOdds;
    case 'match_result':
      // For match result, we'd need to know which outcome
      return odds.homeOdds; // Simplified
    default:
      return null;
  }
}

/**
 * Perform value analysis for a single fixture and market
 */
export function analyzeValue(
  prediction: ModelPrediction,
  odds: MarketOdds[],
  config = CONFIG
): ValueAnalysis | null {
  const best = findBestOdds(odds, prediction.market);
  if (!best) {
    logger.debug(`No odds found for fixture ${prediction.fixtureId}, market ${prediction.market}`);
    return null;
  }

  const impliedProbability = oddsToImpliedProbability(best.bestOdds);
  const value = calculateValue(prediction.modelProbability, best.bestOdds);

  return {
    fixtureId: prediction.fixtureId,
    market: prediction.market,
    modelProbability: prediction.modelProbability,
    impliedProbability,
    bestOdds: best.bestOdds,
    bestBookmaker: best.bestBookmaker,
    value,
    hasEdge: value > config.valueThreshold,
  };
}

/**
 * Analyze value across all markets for a fixture
 */
export function analyzeAllMarkets(
  predictions: ModelPrediction[],
  odds: MarketOdds[],
  config = CONFIG
): ValueAnalysis[] {
  const results: ValueAnalysis[] = [];

  for (const prediction of predictions) {
    const analysis = analyzeValue(prediction, odds, config);
    if (analysis) {
      results.push(analysis);
    }
  }

  return results;
}

/**
 * Filter fixtures that have passed all checks and have value
 */
export function filterWithValueEdge(
  packages: FixtureDataPackage[],
  predictions: ModelPrediction[],
  config = CONFIG
): Array<{
  pkg: FixtureDataPackage;
  prediction: ModelPrediction;
  value: ValueAnalysis;
}> {
  const results: Array<{
    pkg: FixtureDataPackage;
    prediction: ModelPrediction;
    value: ValueAnalysis;
  }> = [];

  for (const pkg of packages) {
    // Pre-filters
    if (!pkg.leagueFilterPassed) {
      logger.debug(`Fixture ${pkg.fixture.id}: Failed league filter`);
      continue;
    }
    if (!pkg.sampleSizeFilterPassed) {
      logger.debug(`Fixture ${pkg.fixture.id}: Failed sample size filter`);
      continue;
    }

    // Find prediction for this fixture
    const fixturePredictions = predictions.filter(
      p => p.fixtureId === pkg.fixture.id
    );

    for (const prediction of fixturePredictions) {
      // Confidence filter
      if (prediction.modelConfidence < config.minConfidence) {
        continue;
      }

      // Value analysis
      const valueAnalysis = analyzeValue(prediction, pkg.odds, config);
      if (!valueAnalysis || !valueAnalysis.hasEdge) {
        continue;
      }

      results.push({
        pkg,
        prediction,
        value: valueAnalysis,
      });
    }
  }

  // Sort by value (highest edge first)
  results.sort((a, b) => b.value.value - a.value.value);

  logger.info(`Found ${results.length} fixtures with positive value edge`);
  return results;
}
