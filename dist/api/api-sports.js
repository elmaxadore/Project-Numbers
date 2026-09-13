// ============================================================
// API-Sports Client (api-football.com via RapidAPI)
// Free tier: 100 requests/day
// Use for: Historical fixtures, stats, and backtesting data
// ============================================================
import { CONFIG } from '../config.js';
import { logger } from '../utils/logger.js';
const BASE_URL = 'https://v3.football.api-sports.io';
// Rate limiter: max 100 requests/day
let requestCount = 0;
const DAILY_LIMIT = 100;
async function apiRequest(endpoint, params = {}) {
    if (requestCount >= DAILY_LIMIT) {
        throw new Error(`API-Sports daily limit reached (${DAILY_LIMIT} requests). Try again tomorrow.`);
    }
    if (!CONFIG.apiSportsKey) {
        throw new Error('API_SPORTS_KEY or X_RAPIDAPI_KEY not configured. Set it in GitHub Secrets.');
    }
    const queryString = new URLSearchParams(params).toString();
    const url = `${BASE_URL}${endpoint}${queryString ? '?' + queryString : ''}`;
    try {
        logger.debug(`🌐 API Request: ${url}`);
        const response = await fetch(url, {
            headers: {
                'x-rapidapi-key': CONFIG.apiSportsKey,
                'x-rapidapi-host': 'v3.football.api-sports.io',
            },
        });
        requestCount++;
        // Handle HTTP errors with detailed messages
        if (!response.ok) {
            const errorText = await response.text().catch(() => 'Unknown error');
            let errorMessage = `API-Sports HTTP ${response.status}: ${response.statusText}`;
            if (response.status === 401 || response.status === 403) {
                errorMessage = `API-Sports Authentication Failed (${response.status}): Invalid or expired API key. Check your X_RAPIDAPI_KEY secret.`;
            }
            else if (response.status === 429) {
                errorMessage = `API-Sports Rate Limited (${response.status}): Too many requests. Wait and retry.`;
            }
            else if (response.status === 404) {
                errorMessage = `API-Sports Not Found (${response.status}): Invalid endpoint or no data available.`;
            }
            else if (response.status >= 500) {
                errorMessage = `API-Sports Server Error (${response.status}): ${errorText || 'Server temporarily unavailable'}`;
            }
            logger.error(`❌ ${errorMessage}`);
            throw new Error(errorMessage);
        }
        const data = await response.json();
        // Check for API-level errors in response body
        if (data.errors && data.errors.length > 0) {
            const errorMsg = `API-Sports returned errors: ${data.errors.join(', ')}`;
            logger.error(`❌ ${errorMsg}`);
            throw new Error(errorMsg);
        }
        return data.response;
    }
    catch (err) {
        // Re-throw if already an Error we created
        if (err instanceof Error && !err.message.includes('fetch')) {
            throw err;
        }
        // Wrap network errors
        const errorMsg = `API-Sports network error: ${err.message || err}. Check your internet connection and API key.`;
        logger.error(`❌ ${errorMsg}`);
        throw new Error(errorMsg);
    }
}
/**
 * Get fixtures for a league in a specific season
 */
export async function getFixtures(leagueId, season) {
    try {
        const result = await apiRequest('/fixtures', {
            league: String(leagueId),
            season: String(season),
        });
        return result || [];
    }
    catch (error) {
        logger.error(`Failed to get fixtures for league ${leagueId}, season ${season}: ${error.message}`);
        throw error; // Re-throw to let caller handle
    }
}
/**
 * Get fixtures for a specific date range
 */
export async function getFixturesByDate(from, to, leagueId) {
    try {
        const params = { from, to };
        if (leagueId)
            params.league = String(leagueId);
        const result = await apiRequest('/fixtures', params);
        return result || [];
    }
    catch (error) {
        logger.error(`Failed to get fixtures for date range ${from} to ${to}: ${error.message}`);
        throw error; // Re-throw to let caller handle
    }
}
/**
 * Get team statistics for a league/season
 */
export async function getTeamStatistics(leagueId, season, teamId) {
    try {
        const result = await apiRequest('/teams/statistics', {
            league: String(leagueId),
            season: String(season),
            team: String(teamId),
        });
        return result && result.length > 0 ? result[0] : null;
    }
    catch (error) {
        logger.error(`Failed to get statistics for team ${teamId}, league ${leagueId}, season ${season}: ${error.message}`);
        throw error; // Re-throw to let caller handle
    }
}
/**
 * Get league standings
 */
export async function getStandings(leagueId, season) {
    try {
        const result = await apiRequest('/standings', {
            league: String(leagueId),
            season: String(season),
        });
        return result && result.length > 0 ? result[0] : null;
    }
    catch (error) {
        logger.error(`Failed to get standings for league ${leagueId}, season ${season}: ${error.message}`);
        throw error; // Re-throw to let caller handle
    }
}
/**
 * Get pre-match odds for upcoming fixtures
 */
export async function getOdds(leagueId, season, fixtureId) {
    try {
        const params = {
            league: String(leagueId),
            season: String(season),
        };
        if (fixtureId)
            params.fixture = String(fixtureId);
        const result = await apiRequest('/odds', params);
        return result || [];
    }
    catch (error) {
        logger.error(`Failed to get odds for league ${leagueId}, season ${season}: ${error.message}`);
        throw error; // Re-throw to let caller handle
    }
}
// ---- Head-to-Head ----
/**
 * Get head-to-head results between two teams
 */
export async function getHeadToHead(homeTeamId, awayTeamId) {
    try {
        const h2h = `${homeTeamId}-${awayTeamId}`;
        const result = await apiRequest('/fixtures/headtohead', {
            h2h,
        });
        return result || [];
    }
    catch (error) {
        logger.error(`Failed to get head-to-head for teams ${homeTeamId} vs ${awayTeamId}: ${error.message}`);
        throw error; // Re-throw to let caller handle
    }
}
/**
 * Get the number of API requests used today
 */
export function getRequestCount() {
    return requestCount;
}
/**
 * Reset the daily request counter
 */
export function resetRequestCount() {
    requestCount = 0;
}
//# sourceMappingURL=api-sports.js.map