"use strict";
// ============================================================
// ballers (Big Balls) API Client
// Free tier: 1,000 requests/day
// Use for: Live data with Expected Goals (xG) metrics
// ============================================================
Object.defineProperty(exports, "__esModule", { value: true });
exports.getTeamSeasonStats = getTeamSeasonStats;
exports.getUpcomingFixtures = getUpcomingFixtures;
exports.getMatchDetails = getMatchDetails;
exports.toTeamVenueStats = toTeamVenueStats;
exports.getRequestCount = getRequestCount;
const config_js_1 = require("../config.js");
const logger_js_1 = require("../utils/logger.js");
const BASE_URL = 'https://api.bfrds.com/v2';
let requestCount = 0;
const DAILY_LIMIT = 1000;
async function apiRequest(endpoint, params = {}) {
    if (requestCount >= DAILY_LIMIT) {
        logger_js_1.logger.warn(`ballers daily limit reached (${DAILY_LIMIT} requests). Skipping.`);
        return null;
    }
    if (!config_js_1.CONFIG.ballersKey) {
        logger_js_1.logger.warn('BALLERS_KEY not configured. Skipping ballers request.');
        return null;
    }
    const queryString = new URLSearchParams(params).toString();
    const url = `${BASE_URL}${endpoint}?api_token=${config_js_1.CONFIG.ballersKey}${queryString ? '&' + queryString : ''}`;
    try {
        const response = await fetch(url);
        requestCount++;
        if (!response.ok) {
            logger_js_1.logger.error(`ballers error: ${response.status} ${response.statusText}`);
            return null;
        }
        return await response.json();
    }
    catch (err) {
        logger_js_1.logger.error(`ballers request failed: ${err}`);
        return null;
    }
}
/**
 * Get team season statistics with xG data
 */
async function getTeamSeasonStats(teamId, leagueId, season) {
    return apiRequest(`/teams/${teamId}/season/${season}`, { league: String(leagueId) });
}
/**
 * Get upcoming fixtures with xG predictions
 */
async function getUpcomingFixtures(leagueId, page = 1) {
    const result = await apiRequest(`/fixtures/league/${leagueId}`, { page: String(page), sort: 'start' });
    return result?.data || [];
}
/**
 * Get match details with full xG breakdown
 */
async function getMatchDetails(matchId) {
    return apiRequest(`/fixtures/${matchId}`);
}
/**
 * Convert ballers stats to our TeamVenueStats format
 */
function toTeamVenueStats(stats, venue) {
    const venueStats = venue === 'home' ? stats.home : stats.away;
    const totalStats = stats.statistics;
    const venueData = venueStats || totalStats;
    const matchesPlayed = venueData.matches_played;
    const divisor = matchesPlayed || 1;
    return {
        teamId: stats.team.id,
        teamName: stats.team.name,
        venue,
        matchesPlayed,
        goalsScored: venueData.goals_scored,
        goalsConceded: venueData.goals_conceded,
        avgGoalsScored: venueData.goals_scored / divisor,
        avgGoalsConceded: venueData.goals_conceded / divisor,
        xG: venueData.expected_goals / divisor,
        xGA: venueData.expected_goals_against / divisor,
        cleanSheetRate: matchesPlayed > 0 ? venueData.clean_sheets / matchesPlayed : 0,
        failedToScoreRate: matchesPlayed > 0 ? venueData.failed_to_score / matchesPlayed : 0,
        bttsRate: matchesPlayed > 0 ? venueData.both_teams_to_score / matchesPlayed : 0,
        over25Rate: 0, // Will be calculated from match data
        over15Rate: 0, // Will be calculated from match data
    };
}
/**
 * Get the number of API requests used today
 */
function getRequestCount() {
    return requestCount;
}
//# sourceMappingURL=ballers.js.map