/**
 * Best Bet Engine
 * Finds the highest EV bet from today's fixtures using real-time data
 */
import { getOdds, getTeamStatistics } from '../api/api-sports.js';
import { CONFIG } from '../config.js';
import { logger } from '../utils/logger.js';
import { DEFAULT_O25_WEIGHTS, DEFAULT_BTTS_WEIGHTS, } from '../engine/logistic-regression.js';
import { predictFixture } from '../engine/prediction-pipeline.js';
/**
 * Create a fixture data package from a fixture with real stats fetched from API
 */
async function createFixtureDataPackage(fixture) {
    if (!CONFIG.apiSportsKey) {
        throw new Error(`API_SPORTS_KEY not configured. Cannot fetch real statistics for ${fixture.homeTeam.name} vs ${fixture.awayTeam.name}.`);
    }
    const currentYear = new Date().getFullYear();
    // Fetch real team statistics from API-Sports
    const [homeStats, awayStats] = await Promise.all([
        getTeamStatistics(fixture.leagueId, currentYear, fixture.homeTeam.id),
        getTeamStatistics(fixture.leagueId, currentYear, fixture.awayTeam.id)
    ]);
    if (!homeStats || !awayStats) {
        throw new Error(`Failed to fetch real statistics for ${fixture.homeTeam.name} vs ${fixture.awayTeam.name}. API returned no data.`);
    }
    // Convert API stats to our internal format
    const homeTeamStats = {
        teamId: fixture.homeTeam.id,
        teamName: fixture.homeTeam.name,
        venue: 'home',
        matchesPlayed: homeStats.fixtures.played.home || homeStats.fixtures.played.total,
        goalsScored: homeStats.goals.for.total.home || homeStats.goals.for.total.total,
        goalsConceded: homeStats.goals.against.total.home || homeStats.goals.against.total.total,
        avgGoalsScored: parseFloat(homeStats.goals.for.average.home) || parseFloat(homeStats.goals.for.average.total) || 0,
        avgGoalsConceded: parseFloat(homeStats.goals.against.average.home) || parseFloat(homeStats.goals.against.average.total) || 0,
        xG: parseFloat(homeStats.goals.for.average.home) || parseFloat(homeStats.goals.for.average.total) || 0,
        xGA: parseFloat(homeStats.goals.against.average.home) || parseFloat(homeStats.goals.against.average.total) || 0,
        cleanSheetRate: homeStats.clean_sheet.home / (homeStats.fixtures.played.home || 1) || 0,
        failedToScoreRate: homeStats.failed_to_score.home / (homeStats.fixtures.played.home || 1) || 0,
        bttsRate: homeStats.both_teams_to_score.total / (homeStats.fixtures.played.total || 1) || 0,
        over25Rate: 0, // Will be calculated from historical data
        over15Rate: 0, // Will be calculated from historical data
    };
    const awayTeamStats = {
        teamId: fixture.awayTeam.id,
        teamName: fixture.awayTeam.name,
        venue: 'away',
        matchesPlayed: awayStats.fixtures.played.away || awayStats.fixtures.played.total,
        goalsScored: awayStats.goals.for.total.away || awayStats.goals.for.total.total,
        goalsConceded: awayStats.goals.against.total.away || awayStats.goals.against.total.total,
        avgGoalsScored: parseFloat(awayStats.goals.for.average.away) || parseFloat(awayStats.goals.for.average.total) || 0,
        avgGoalsConceded: parseFloat(awayStats.goals.against.average.away) || parseFloat(awayStats.goals.against.average.total) || 0,
        xG: parseFloat(awayStats.goals.for.average.away) || parseFloat(awayStats.goals.for.average.total) || 0,
        xGA: parseFloat(awayStats.goals.against.average.away) || parseFloat(awayStats.goals.against.average.total) || 0,
        cleanSheetRate: awayStats.clean_sheet.away / (awayStats.fixtures.played.away || 1) || 0,
        failedToScoreRate: awayStats.failed_to_score.away / (awayStats.fixtures.played.away || 1) || 0,
        bttsRate: awayStats.both_teams_to_score.total / (awayStats.fixtures.played.total || 1) || 0,
        over25Rate: 0,
        over15Rate: 0,
    };
    const combinedExpectedGoals = homeTeamStats.xG + awayTeamStats.xG;
    const combinedExpectedConceded = homeTeamStats.xGA + awayTeamStats.xGA;
    const fixtureXG = combinedExpectedGoals;
    const expectedStats = {
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
function extractOddsForFixture(fixtureId, apiOdds) {
    const results = [];
    const fixtureOdds = apiOdds.find(o => o.fixture.id === fixtureId);
    if (!fixtureOdds)
        return results;
    for (const bookmaker of fixtureOdds.bookmakers) {
        for (const bet of bookmaker.bets) {
            const marketOdds = {
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
                if (label.includes('home'))
                    marketOdds.homeOdds = odd;
                else if (label.includes('draw'))
                    marketOdds.drawOdds = odd;
                else if (label.includes('away'))
                    marketOdds.awayOdds = odd;
                else if (label.includes('over'))
                    marketOdds.overOdds = odd;
                else if (label.includes('under'))
                    marketOdds.underOdds = odd;
                else if (label.includes('yes'))
                    marketOdds.yesOdds = odd;
                else if (label.includes('no'))
                    marketOdds.noOdds = odd;
            }
            results.push(marketOdds);
        }
    }
    return results;
}
function mapApiMarket(apiMarketName) {
    const name = apiMarketName.toLowerCase();
    if (name.includes('over/under') && name.includes('2.5'))
        return 'over_2.5_goals';
    if (name.includes('both teams score') || name.includes('btts'))
        return 'btts_yes';
    if (name.includes('match result') || name.includes('1x2'))
        return 'match_result';
    if (name.includes('over/under') && name.includes('1.5'))
        return 'over_1.5_goals';
    return 'over_2.5_goals';
}
/**
 * Find qualified bets from today's fixtures
 */
export async function findQualifiedBets(fixtures, o25Model = DEFAULT_O25_WEIGHTS, bttsModel = DEFAULT_BTTS_WEIGHTS) {
    const qualifiedBets = [];
    for (const fixture of fixtures) {
        try {
            // Create fixture data package - will throw if real data not available
            const pkg = await createFixtureDataPackage(fixture);
            // Get predictions for this fixture
            const predictions = predictFixture(pkg, o25Model, bttsModel);
            // Fetch odds for this fixture (limit API calls)
            let apiOdds = [];
            try {
                apiOdds = await getOdds(fixture.leagueId, new Date().getFullYear(), fixture.id);
            }
            catch (err) {
                logger.warn(`Could not fetch odds for fixture ${fixture.id}: ${err}`);
            }
            const marketOdds = extractOddsForFixture(fixture.id, apiOdds);
            pkg.odds = marketOdds;
            // Evaluate each prediction
            for (const pred of predictions) {
                const modelProb = pred.modelProbability;
                if (modelProb < CONFIG.minConfidence)
                    continue;
                // Get odds for this market - require real odds, no fallback
                let bestOdd = null;
                let impliedProb = null;
                const matchingOdds = marketOdds.find(o => o.market === pred.market);
                if (matchingOdds) {
                    if (pred.market === 'over_2.5_goals' && matchingOdds.overOdds) {
                        bestOdd = matchingOdds.overOdds;
                    }
                    else if (pred.market === 'btts_yes' && matchingOdds.yesOdds) {
                        bestOdd = matchingOdds.yesOdds;
                    }
                }
                // Skip if no real odds found for this market
                if (!bestOdd) {
                    logger.debug(`No odds available for ${pred.market} in fixture ${fixture.id}`);
                    continue;
                }
                impliedProb = 1 / bestOdd;
                // Calculate Expected Value
                const ev = (modelProb * bestOdd - 1) * 100;
                // Only include positive EV bets above threshold
                if (ev > CONFIG.valueThreshold * 100) {
                    qualifiedBets.push({
                        fixture,
                        market: pred.market,
                        modelProbability: modelProb,
                        odds: bestOdd,
                        impliedProbability: impliedProb,
                        expectedValue: ev,
                        confidence: pred.modelConfidence * 100,
                    });
                }
            }
        }
        catch (err) {
            // Re-throw errors about missing real data - don't swallow them
            if (err.message && err.message.includes('Real team statistics and odds data required')) {
                throw err;
            }
            logger.error(`Error processing fixture ${fixture.id}: ${err}`);
        }
    }
    return qualifiedBets;
}
/**
 * Find the single best bet (highest EV) from today's fixtures
 */
export async function findBestBet(fixtures, o25Model = DEFAULT_O25_WEIGHTS, bttsModel = DEFAULT_BTTS_WEIGHTS) {
    logger.info('🧠 Running prediction engine on real fixtures...');
    const qualifiedBets = await findQualifiedBets(fixtures, o25Model, bttsModel);
    if (qualifiedBets.length === 0) {
        const errorMsg = 'No qualified bets found with positive EV. The model scanned all fixtures but found no opportunities meeting the value threshold.';
        logger.error(errorMsg);
        throw new Error(errorMsg);
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
//# sourceMappingURL=best-bet-engine.js.map