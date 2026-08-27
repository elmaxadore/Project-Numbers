"use strict";
// ============================================================
// Phase 1: Data Ingestion Pipeline
// Gathers fixtures, team stats (xG/xGA), and odds from multiple APIs
// ============================================================
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.passesLeagueFilter = passesLeagueFilter;
exports.fetchUpcomingFixtures = fetchUpcomingFixtures;
exports.fetchHistoricalFixtures = fetchHistoricalFixtures;
exports.collectTeamStats = collectTeamStats;
exports.buildFixtureExpectedStats = buildFixtureExpectedStats;
exports.collectOdds = collectOdds;
exports.detectOutliers = detectOutliers;
exports.buildFixtureDataPackage = buildFixtureDataPackage;
const config_js_1 = require("../config.js");
const logger_js_1 = require("../utils/logger.js");
const apiSports = __importStar(require("../api/api-sports.js"));
const ballers = __importStar(require("../api/ballers.js"));
const one_xbet_js_1 = require("../api/one-xbet.js");
// ---- League Filter ----
/**
 * Check if a league passes the macro-level scoring filter
 * From the paper: min 2.80 avg goals/match for general, 53% BTTS for BTTS market
 */
function passesLeagueFilter(leagueAvgGoals, leagueBttsRate, config = config_js_1.CONFIG) {
    if (leagueAvgGoals < config.minAvgGoals) {
        return {
            passes: false,
            reason: `League avg goals ${leagueAvgGoals.toFixed(2)} < minimum ${config.minAvgGoals}`,
        };
    }
    if (leagueBttsRate < config.minBttsRate) {
        return {
            passes: false,
            reason: `League BTTS rate ${(leagueBttsRate * 100).toFixed(1)}% < minimum ${(config.minBttsRate * 100).toFixed(1)}%`,
        };
    }
    return { passes: true, reason: 'OK' };
}
// ---- Fixture Fetching ----
/**
 * Fetch upcoming fixtures for a set of leagues
 */
async function fetchUpcomingFixtures(leagueIds, season) {
    const fixtures = [];
    for (const leagueId of leagueIds) {
        const apiFixtures = await apiSports.getFixtures(leagueId, season);
        for (const f of apiFixtures) {
            const status = mapFixtureStatus(f.fixture.status.short);
            if (status === 'finished')
                continue; // Skip completed matches
            fixtures.push({
                id: f.fixture.id,
                leagueId: f.league.id,
                leagueName: f.league.name,
                homeTeam: { id: f.teams.home.id, name: f.teams.home.name },
                awayTeam: { id: f.teams.away.id, name: f.teams.away.name },
                date: f.fixture.date,
                status,
            });
        }
        logger_js_1.logger.debug(`Fetched ${apiFixtures.length} fixtures for league ${leagueId}`);
    }
    logger_js_1.logger.info(`Total upcoming fixtures: ${fixtures.length}`);
    return fixtures;
}
/**
 * Fetch historical fixtures for backtesting
 */
async function fetchHistoricalFixtures(leagueId, season) {
    const apiFixtures = await apiSports.getFixtures(leagueId, season);
    const fixtures = apiFixtures
        .filter(f => f.fixture.status.short === 'FT')
        .map(f => ({
        id: f.fixture.id,
        leagueId: f.league.id,
        leagueName: f.league.name,
        homeTeam: { id: f.teams.home.id, name: f.teams.home.name },
        awayTeam: { id: f.teams.away.id, name: f.teams.away.name },
        date: f.fixture.date,
        status: 'finished',
        goals: {
            home: f.goals.home ?? 0,
            away: f.goals.away ?? 0,
        },
    }));
    logger_js_1.logger.info(`Fetched ${fixtures.length} historical fixtures for league ${leagueId}, season ${season}`);
    return fixtures;
}
// ---- Team Stats Collection ----
/**
 * Collect venue-specific team stats from ballers API (preferred) or API-Sports (fallback)
 */
async function collectTeamStats(teamId, leagueId, season, venue) {
    // Primary: ballers API (has xG data)
    const ballersStats = await ballers.getTeamSeasonStats(teamId, leagueId, season);
    if (ballersStats) {
        return ballers.toTeamVenueStats(ballersStats, venue);
    }
    // Fallback: API-Sports (no xG, but has basic stats)
    const apiStats = await apiSports.getTeamStatistics(leagueId, season, teamId);
    if (apiStats) {
        return convertApiSportsStats(apiStats, teamId, venue);
    }
    logger_js_1.logger.warn(`No stats found for team ${teamId} in league ${leagueId}`);
    return null;
}
function convertApiSportsStats(stats, teamId, venue) {
    const isHome = venue === 'home';
    const played = isHome
        ? stats.fixtures.played.home
        : stats.fixtures.played.away;
    const goalsFor = isHome
        ? stats.goals.for.total.home
        : stats.goals.for.total.away;
    const goalsAgainst = isHome
        ? stats.goals.against.total.home
        : stats.goals.against.total.away;
    const cleanSheets = isHome ? stats.clean_sheet.home : stats.clean_sheet.away;
    const failedToScore = isHome ? stats.failed_to_score.home : stats.failed_to_score.away;
    const btts = stats.both_teams_to_score.total;
    const divisor = played || 1;
    return {
        teamId,
        teamName: stats.team.name,
        venue,
        matchesPlayed: played,
        goalsScored: goalsFor,
        goalsConceded: goalsAgainst,
        avgGoalsScored: goalsFor / divisor,
        avgGoalsConceded: goalsAgainst / divisor,
        xG: 0, // Not available from this API
        xGA: 0,
        cleanSheetRate: played > 0 ? cleanSheets / played : 0,
        failedToScoreRate: played > 0 ? failedToScore / played : 0,
        bttsRate: played > 0 ? btts / played : 0,
        over25Rate: 0, // Will be calculated from match-level data
        over15Rate: 0,
    };
}
// ---- Fixture Expected Stats ----
/**
 * Build the fixture-level expected stats by combining home + away splits
 */
async function buildFixtureExpectedStats(fixture, season) {
    const homeStats = await collectTeamStats(fixture.homeTeam.id, fixture.leagueId, season, 'home');
    const awayStats = await collectTeamStats(fixture.awayTeam.id, fixture.leagueId, season, 'away');
    if (!homeStats || !awayStats) {
        logger_js_1.logger.warn(`Insufficient stats for fixture ${fixture.id}`);
        return null;
    }
    return {
        fixtureId: fixture.id,
        homeTeamStats: homeStats,
        awayTeamStats: awayStats,
        combinedExpectedGoals: homeStats.xG + awayStats.xG,
        combinedExpectedConceded: homeStats.xGA + awayStats.xGA,
        fixtureXG: homeStats.xG + awayStats.xG,
    };
}
// ---- Odds Collection ----
/**
 * Collect odds from all sources including 1xbet
 * Priority: 1xbet (primary) > API-Sports (fallback)
 */
async function collectOdds(fixture, market, season) {
    const odds = [];
    // Primary: 1xbet odds via The Odds API
    const xbetOdds = await (0, one_xbet_js_1.collect1xbetOdds)(fixture.leagueId);
    const xbetForFixture = xbetOdds.filter(o => o.fixtureId === fixture.id);
    odds.push(...xbetForFixture);
    // Fallback: API-Sports odds
    if (odds.length === 0) {
        const apiOdds = await apiSports.getOdds(fixture.leagueId, season, fixture.id);
        for (const bookmakerOdds of apiOdds) {
            for (const bookmaker of bookmakerOdds.bookmakers) {
                const marketOdds = {
                    fixtureId: fixture.id,
                    bookmaker: bookmaker.name,
                    market,
                    homeOdds: null,
                    drawOdds: null,
                    awayOdds: null,
                    overOdds: null,
                    underOdds: null,
                    yesOdds: null,
                    noOdds: null,
                    timestamp: bookmakerOdds.update,
                };
                for (const bet of bookmaker.bets) {
                    const marketName = bet.name.toLowerCase();
                    // Over/Under 2.5
                    if (marketName.includes('over/under') && marketName.includes('2.5')) {
                        for (const v of bet.values) {
                            if (v.value.toLowerCase().includes('over')) {
                                marketOdds.overOdds = parseFloat(v.odd);
                            }
                            else if (v.value.toLowerCase().includes('under')) {
                                marketOdds.underOdds = parseFloat(v.odd);
                            }
                        }
                    }
                    // Over/Under 1.5
                    if (marketName.includes('over/under') && marketName.includes('1.5')) {
                        for (const v of bet.values) {
                            if (v.value.toLowerCase().includes('over')) {
                                marketOdds.overOdds = marketOdds.overOdds || parseFloat(v.odd);
                            }
                        }
                    }
                    // BTTS
                    if (marketName.includes('both teams to score') || marketName.includes('btts')) {
                        for (const v of bet.values) {
                            if (v.value.toLowerCase() === 'yes') {
                                marketOdds.yesOdds = parseFloat(v.odd);
                            }
                            else if (v.value.toLowerCase() === 'no') {
                                marketOdds.noOdds = parseFloat(v.odd);
                            }
                        }
                    }
                    // Match Result
                    if (marketName === 'match winner' || marketName === '1x2') {
                        for (const v of bet.values) {
                            const val = v.value.toLowerCase();
                            if (val === 'home')
                                marketOdds.homeOdds = parseFloat(v.odd);
                            else if (val === 'draw')
                                marketOdds.drawOdds = parseFloat(v.odd);
                            else if (val === 'away')
                                marketOdds.awayOdds = parseFloat(v.odd);
                        }
                    }
                }
                odds.push(marketOdds);
            }
        }
    }
    return odds;
}
// ---- Outlier Detection ----
/**
 * Check for "Runaway Giant" outlier — dominant team that may suppress BTTS
 */
function detectOutliers(homeStats, awayStats, topRankedTeamIds, config = config_js_1.CONFIG) {
    const homeIsTopRanked = topRankedTeamIds.has(homeStats.teamId);
    const awayIsTopRanked = topRankedTeamIds.has(awayStats.teamId);
    return {
        isRunawayGiant: (homeIsTopRanked && homeStats.cleanSheetRate > config.runawayGiantCleanSheetThreshold) ||
            (awayIsTopRanked && awayStats.cleanSheetRate > config.runawayGiantCleanSheetThreshold),
        homeCleanSheetRate: homeStats.cleanSheetRate,
        awayFailedToScoreRate: awayStats.failedToScoreRate,
    };
}
// ---- Full Pipeline ----
/**
 * Build a complete data package for a fixture
 */
async function buildFixtureDataPackage(fixture, season, topRankedTeamIds, config = config_js_1.CONFIG) {
    // Build expected stats
    const expectedStats = await buildFixtureExpectedStats(fixture, season);
    if (!expectedStats)
        return null;
    // Collect odds for both markets
    const oddsO25 = await collectOdds(fixture, 'over_2.5_goals', season);
    const oddsBTTS = await collectOdds(fixture, 'btts_yes', season);
    const allOdds = [...oddsO25, ...oddsBTTS];
    // Detect outliers
    const outlierFlags = detectOutliers(expectedStats.homeTeamStats, expectedStats.awayTeamStats, topRankedTeamIds, config);
    // Sample size filter
    const homeMatches = expectedStats.homeTeamStats.matchesPlayed;
    const awayMatches = expectedStats.awayTeamStats.matchesPlayed;
    const sampleSizeFilterPassed = homeMatches >= config.minMatchesForStats &&
        awayMatches >= config.minMatchesForStats;
    return {
        fixture,
        expectedStats,
        odds: allOdds,
        leagueFilterPassed: true, // Already filtered before calling this
        sampleSizeFilterPassed,
        outlierFlags,
    };
}
// ---- Helpers ----
function mapFixtureStatus(apiStatus) {
    switch (apiStatus) {
        case 'FT':
        case 'AET':
        case 'PEN':
            return 'finished';
        case '1H':
        case '2H':
        case 'HT':
        case 'ET':
        case 'P':
        case 'BT':
        case 'SUSP':
            return 'live';
        default:
            return 'scheduled';
    }
}
//# sourceMappingURL=data-ingestion.js.map