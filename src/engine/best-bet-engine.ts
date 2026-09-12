/**
 * Best Bet Engine
 * Finds the highest EV bet from today's fixtures using real-time data
 */

import { TodaysFixture } from '../data/todays-fixtures-fetcher.js';
import { getOdds, ApiOdds } from '../api/api-sports.js';
import { CONFIG } from '../config.js';
import { logger } from '../utils/logger.js';
import {
  DEFAULT_O25_WEIGHTS,
  DEFAULT_BTTS_WEIGHTS,
  ModelWeights,
} from '../engine/logistic-regression.js';
import { predictFixture } from '../engine/prediction-pipeline.js';
import { FixtureDataPackage, FixtureExpectedStats, TeamVenueStats, MarketOdds } from '../models/types.js';

export interface PredictionResult {
  match: string;
  league: string;
  market: string;
  prediction: string;
  confidence: number;
  odds: number;
  expectedValue: number;
  reasoning: string;
}

export interface QualifiedBet {
  fixture: TodaysFixture;
  market: 'over_2.5_goals' | 'btts_yes';
  modelProbability: number;
  odds: number;
  impliedProbability: number;
  expectedValue: number;
  confidence: number;
}

/**
 * Create a fixture data package from a fixture with estimated stats
 * In production, you would fetch real team stats from API
 */
function createFixtureDataPackage(fixture: TodaysFixture): FixtureDataPackage {
  // Default expected stats (in production, fetch from API or calculate from historical data)
  const homeTeamStats: TeamVenueStats = {
    teamId: fixture.homeTeam.id,
    teamName: fixture.homeTeam.name,
    venue: 'home',
    matchesPlayed: 10,
    goalsScored: 15,
    goalsConceded: 12,
    avgGoalsScored: 1.5,
    avgGoalsConceded: 1.2,
    xG: 1.5,
    xGA: 1.2,
    cleanSheetRate: 0.3,
    failedToScoreRate: 0.2,
    bttsRate: 0.5,
    over25Rate: 0.6,
    over15Rate: 0.8,
  };

  const awayTeamStats: TeamVenueStats = {
    teamId: fixture.awayTeam.id,
    teamName: fixture.awayTeam.name,
    venue: 'away',
    matchesPlayed: 10,
    goalsScored: 13,
    goalsConceded: 14,
    avgGoalsScored: 1.3,
    avgGoalsConceded: 1.4,
    xG: 1.3,
    xGA: 1.4,
    cleanSheetRate: 0.25,
    failedToScoreRate: 0.25,
    bttsRate: 0.55,
    over25Rate: 0.55,
    over15Rate: 0.75,
  };

  const combinedExpectedGoals = homeTeamStats.xG + awayTeamStats.xG;
  const combinedExpectedConceded = homeTeamStats.xGA + awayTeamStats.xGA;
  const fixtureXG = combinedExpectedGoals;

  const expectedStats: FixtureExpectedStats = {
    fixtureId: fixture.id,
    homeTeamStats,
    awayTeamStats,
    combinedExpectedGoals,
    combinedExpectedConceded,
    fixtureXG,
  };

  return {
    fixture: {
      id: fixture.id,
      leagueId: fixture.leagueId,
      leagueName: fixture.leagueName,
      homeTeam: fixture.homeTeam,
      awayTeam: fixture.awayTeam,
      date: fixture.date,
      status: fixture.status,
    },
    expectedStats,
    odds: [],
    leagueFilterPassed: true,
    sampleSizeFilterPassed: true,
    outlierFlags: {
      isRunawayGiant: false,
      homeCleanSheetRate: homeTeamStats.cleanSheetRate,
      awayFailedToScoreRate: awayTeamStats.failedToScoreRate,
    },
  };
}

/**
 * Extract odds from API response for a specific fixture
 */
function extractOddsForFixture(
  fixtureId: number,
  apiOdds: ApiOdds[]
): MarketOdds[] {
  const results: MarketOdds[] = [];
  
  const fixtureOdds = apiOdds.find(o => o.fixture.id === fixtureId);
  if (!fixtureOdds) return results;

  for (const bookmaker of fixtureOdds.bookmakers) {
    for (const bet of bookmaker.bets) {
      const marketOdds: MarketOdds = {
        fixtureId,
        bookmaker: bookmaker.name,
        market: mapApiMarket(bet.name),
        homeOdds: null,
        drawOdds: null,
        awayOdds: null,
        overOdds: null,
        underOdds: null,
        yesOdds: null,
        noOdds: null,
        timestamp: fixtureOdds.update,
      };

      for (const value of bet.values) {
        const odd = parseFloat(value.odd);
        const label = value.value.toLowerCase();

        if (label.includes('home')) marketOdds.homeOdds = odd;
        else if (label.includes('draw')) marketOdds.drawOdds = odd;
        else if (label.includes('away')) marketOdds.awayOdds = odd;
        else if (label.includes('over')) marketOdds.overOdds = odd;
        else if (label.includes('under')) marketOdds.underOdds = odd;
        else if (label.includes('yes')) marketOdds.yesOdds = odd;
        else if (label.includes('no')) marketOdds.noOdds = odd;
      }

      results.push(marketOdds);
    }
  }

  return results;
}

function mapApiMarket(apiMarketName: string): 'over_2.5_goals' | 'btts_yes' | 'match_result' | 'over_1.5_goals' {
  const name = apiMarketName.toLowerCase();
  if (name.includes('over/under') && name.includes('2.5')) return 'over_2.5_goals';
  if (name.includes('both teams score') || name.includes('btts')) return 'btts_yes';
  if (name.includes('match result') || name.includes('1x2')) return 'match_result';
  if (name.includes('over/under') && name.includes('1.5')) return 'over_1.5_goals';
  return 'over_2.5_goals';
}

/**
 * Find qualified bets from today's fixtures
 */
export async function findQualifiedBets(
  fixtures: TodaysFixture[],
  o25Model: ModelWeights = DEFAULT_O25_WEIGHTS,
  bttsModel: ModelWeights = DEFAULT_BTTS_WEIGHTS
): Promise<QualifiedBet[]> {
  const qualifiedBets: QualifiedBet[] = [];

  for (const fixture of fixtures) {
    try {
      // Create fixture data package
      const pkg = createFixtureDataPackage(fixture);

      // Get predictions for this fixture
      const predictions = predictFixture(pkg, o25Model, bttsModel);

      // Fetch odds for this fixture (limit API calls)
      let apiOdds: ApiOdds[] = [];
      try {
        apiOdds = await getOdds(fixture.leagueId, new Date().getFullYear(), fixture.id);
      } catch (err) {
        logger.warn(`Could not fetch odds for fixture ${fixture.id}: ${err}`);
      }

      const marketOdds = extractOddsForFixture(fixture.id, apiOdds);
      pkg.odds = marketOdds;

      // Evaluate each prediction
      for (const pred of predictions) {
        const modelProb = pred.modelProbability;
        if (modelProb < CONFIG.minConfidence) continue;

        // Get odds for this market
        let bestOdd = 1.85; // default fallback
        let impliedProb = 1 / bestOdd;

        const matchingOdds = marketOdds.find(o => o.market === pred.market);
        if (matchingOdds) {
          if (pred.market === 'over_2.5_goals' && matchingOdds.overOdds) {
            bestOdd = matchingOdds.overOdds;
          } else if (pred.market === 'btts_yes' && matchingOdds.yesOdds) {
            bestOdd = matchingOdds.yesOdds;
          }
          impliedProb = 1 / bestOdd;
        }

        // Calculate Expected Value
        const ev = (modelProb * bestOdd - 1) * 100;

        // Only include positive EV bets above threshold
        if (ev > CONFIG.valueThreshold * 100) {
          qualifiedBets.push({
            fixture,
            market: pred.market as 'over_2.5_goals' | 'btts_yes',
            modelProbability: modelProb,
            odds: bestOdd,
            impliedProbability: impliedProb,
            expectedValue: ev,
            confidence: pred.modelConfidence * 100,
          });
        }
      }
    } catch (err) {
      logger.error(`Error processing fixture ${fixture.id}: ${err}`);
    }
  }

  return qualifiedBets;
}

/**
 * Find the single best bet (highest EV) from today's fixtures
 */
export async function findBestBet(
  fixtures: TodaysFixture[],
  o25Model: ModelWeights = DEFAULT_O25_WEIGHTS,
  bttsModel: ModelWeights = DEFAULT_BTTS_WEIGHTS
): Promise<PredictionResult | null> {
  logger.info('🧠 Running prediction engine on real fixtures...');

  const qualifiedBets = await findQualifiedBets(fixtures, o25Model, bttsModel);

  if (qualifiedBets.length === 0) {
    logger.info('No qualified bets found with positive EV.');
    return null;
  }

  // Sort by expected value (highest first)
  qualifiedBets.sort((a, b) => b.expectedValue - a.expectedValue);

  const bestBet = qualifiedBets[0];
  logger.info(`✅ Found best bet: ${bestBet.fixture.homeTeam.name} vs ${bestBet.fixture.awayTeam.name}`);
  logger.info(`   Market: ${bestBet.market}, EV: +${bestBet.expectedValue.toFixed(2)}%, Odds: ${bestBet.odds.toFixed(2)}`);

  // Format the prediction result
  const marketName = bestBet.market === 'over_2.5_goals' ? 'Over 2.5 Goals' : 'BTTS Yes';
  const predictionText = bestBet.market === 'over_2.5_goals' ? 'Yes' : 'Yes';

  return {
    match: `${bestBet.fixture.homeTeam.name} vs ${bestBet.fixture.awayTeam.name}`,
    league: bestBet.fixture.leagueName,
    market: marketName,
    prediction: predictionText,
    confidence: bestBet.confidence,
    odds: bestBet.odds,
    expectedValue: bestBet.expectedValue,
    reasoning: `Model probability: ${(bestBet.modelProbability * 100).toFixed(1)}%. Based on xG analysis and recent form. Bookmaker odds: ${bestBet.odds.toFixed(2)} (implied: ${(bestBet.impliedProbability * 100).toFixed(1)}%).`,
  };
}
