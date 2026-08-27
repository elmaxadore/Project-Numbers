"use strict";
// ============================================================
// API-Sports Client (api-football.com via RapidAPI)
// Free tier: 100 requests/day
// Use for: Historical fixtures, stats, and backtesting data
// ============================================================
Object.defineProperty(exports, "__esModule", { value: true });
exports.getFixtures = getFixtures;
exports.getFixturesByDate = getFixturesByDate;
exports.getTeamStatistics = getTeamStatistics;
exports.getStandings = getStandings;
exports.getOdds = getOdds;
exports.getHeadToHead = getHeadToHead;
exports.getRequestCount = getRequestCount;
exports.resetRequestCount = resetRequestCount;
const config_js_1 = require("../config.js");
const logger_js_1 = require("../utils/logger.js");
const BASE_URL = 'https://v3.football.api-sports.io';
// Rate limiter: max 100 requests/day
let requestCount = 0;
const DAILY_LIMIT = 100;
async function apiRequest(endpoint, params = {}) {
    if (requestCount >= DAILY_LIMIT) {
        logger_js_1.logger.warn(`API-Sports daily limit reached (${DAILY_LIMIT} requests). Skipping.`);
        return null;
    }
    if (!config_js_1.CONFIG.apiSportsKey) {
        logger_js_1.logger.warn('API_SPORTS_KEY not configured. Skipping API-Sports request.');
        return null;
    }
    const queryString = new URLSearchParams(params).toString();
    const url = `${BASE_URL}${endpoint}${queryString ? '?' + queryString : ''}`;
    try {
        const response = await fetch(url, {
            headers: {
                'x-rapidapi-key': config_js_1.CONFIG.apiSportsKey,
                'x-rapidapi-host': 'v3.football.api-sports.io',
            },
        });
        requestCount++;
        if (!response.ok) {
            logger_js_1.logger.error(`API-Sports error: ${response.status} ${response.statusText}`);
            return null;
        }
        const data = await response.json();
        return data.response;
    }
    catch (err) {
        logger_js_1.logger.error(`API-Sports request failed: ${err}`);
        return null;
    }
}
/**
 * Get fixtures for a league in a specific season
 */
async function getFixtures(leagueId, season) {
    const result = await apiRequest('/fixtures', {
        league: String(leagueId),
        season: String(season),
    });
    return result || [];
}
/**
 * Get fixtures for a specific date range
 */
async function getFixturesByDate(from, to, leagueId) {
    const params = { from, to };
    if (leagueId)
        params.league = String(leagueId);
    const result = await apiRequest('/fixtures', params);
    return result || [];
}
/**
 * Get team statistics for a league/season
 */
async function getTeamStatistics(leagueId, season, teamId) {
    const result = await apiRequest('/teams/statistics', {
        league: String(leagueId),
        season: String(season),
        team: String(teamId),
    });
    return result && result.length > 0 ? result[0] : null;
}
/**
 * Get league standings
 */
async function getStandings(leagueId, season) {
    const result = await apiRequest('/standings', {
        league: String(leagueId),
        season: String(season),
    });
    return result && result.length > 0 ? result[0] : null;
}
/**
 * Get pre-match odds for upcoming fixtures
 */
async function getOdds(leagueId, season, fixtureId) {
    const params = {
        league: String(leagueId),
        season: String(season),
    };
    if (fixtureId)
        params.fixture = String(fixtureId);
    const result = await apiRequest('/odds', params);
    return result || [];
}
// ---- Head-to-Head ----
/**
 * Get head-to-head results between two teams
 */
async function getHeadToHead(homeTeamId, awayTeamId) {
    const h2h = `${homeTeamId}-${awayTeamId}`;
    const result = await apiRequest('/fixtures/headtohead', {
        h2h,
    });
    return result || [];
}
/**
 * Get the number of API requests used today
 */
function getRequestCount() {
    return requestCount;
}
/**
 * Reset the daily request counter
 */
function resetRequestCount() {
    requestCount = 0;
}
//# sourceMappingURL=api-sports.js.map