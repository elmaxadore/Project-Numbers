"use strict";
// ============================================================
// OddsPapi Client
// Free tier: 250 requests/month
// Use for: Historical odds data and Closing Line Value analysis
// ============================================================
Object.defineProperty(exports, "__esModule", { value: true });
exports.getHistoricalOdds = getHistoricalOdds;
exports.parseOddsPapi = parseOddsPapi;
exports.getMonthlyRequestCount = getMonthlyRequestCount;
const config_js_1 = require("../config.js");
const logger_js_1 = require("../utils/logger.js");
const BASE_URL = 'https://api.odds.papi.io/v1';
let requestCount = 0;
const MONTHLY_LIMIT = 250;
async function apiRequest(endpoint, params = {}) {
    if (requestCount >= MONTHLY_LIMIT) {
        logger_js_1.logger.warn(`OddsPapi monthly limit reached (${MONTHLY_LIMIT} requests). Skipping.`);
        return null;
    }
    if (!config_js_1.CONFIG.oddsPapiKey) {
        logger_js_1.logger.warn('ODDS_PAPI_KEY not configured. Skipping OddsPapi request.');
        return null;
    }
    const queryString = new URLSearchParams(params).toString();
    const url = `${BASE_URL}${endpoint}?apikey=${config_js_1.CONFIG.oddsPapiKey}${queryString ? '&' + queryString : ''}`;
    try {
        const response = await fetch(url);
        requestCount++;
        if (!response.ok) {
            logger_js_1.logger.error(`OddsPapi error: ${response.status} ${response.statusText}`);
            return null;
        }
        return await response.json();
    }
    catch (err) {
        logger_js_1.logger.error(`OddsPapi request failed: ${err}`);
        return null;
    }
}
/**
 * Get historical odds for a specific match
 */
async function getHistoricalOdds(fixtureId) {
    return apiRequest(`/matches/${fixtureId}/odds`);
}
/**
 * Parse OddsPapi odds into our MarketOdds format
 */
function parseOddsPapi(match, fixtureId, market) {
    const results = [];
    for (const [bookmaker, markets] of Object.entries(match.odds)) {
        const marketKey = mapMarketName(market);
        const marketData = markets[marketKey];
        if (!marketData)
            continue;
        const odds = {
            fixtureId,
            bookmaker,
            market,
            homeOdds: null,
            drawOdds: null,
            awayOdds: null,
            overOdds: null,
            underOdds: null,
            yesOdds: null,
            noOdds: null,
            timestamp: match.start,
        };
        for (const outcome of marketData.outcomes) {
            const name = outcome.name.toLowerCase();
            if (name === 'home')
                odds.homeOdds = outcome.price;
            else if (name === 'draw')
                odds.drawOdds = outcome.price;
            else if (name === 'away')
                odds.awayOdds = outcome.price;
            else if (name === 'over')
                odds.overOdds = outcome.price;
            else if (name === 'under')
                odds.underOdds = outcome.price;
            else if (name === 'yes')
                odds.yesOdds = outcome.price;
            else if (name === 'no')
                odds.noOdds = outcome.price;
        }
        results.push(odds);
    }
    return results;
}
function mapMarketName(market) {
    switch (market) {
        case 'over_1.5_goals': return 'over_under_1_5';
        case 'over_2.5_goals': return 'over_under_2_5';
        case 'btts_yes': return 'btts';
        case 'match_result': return 'match_result';
        default: return market;
    }
}
/**
 * Get the number of API requests used this month
 */
function getMonthlyRequestCount() {
    return requestCount;
}
//# sourceMappingURL=odds-papi.js.map