"use strict";
// ============================================================
// 1xbet Odds Collector
// Fetches odds from 1xbet via The Odds API (aggregates 1xbet)
// and direct scraping of 1xbet public website
// ============================================================
Object.defineProperty(exports, "__esModule", { value: true });
exports.fetch1xbetFromOddsApi = fetch1xbetFromOddsApi;
exports.fetch1xbetAllLeagues = fetch1xbetAllLeagues;
exports.fetch1xbetDirect = fetch1xbetDirect;
exports.collect1xbetOdds = collect1xbetOdds;
exports.getOddsApiRequestCount = getOddsApiRequestCount;
const config_js_1 = require("../config.js");
const logger_js_1 = require("../utils/logger.js");
// ---- The Odds API (includes 1xbet odds) ----
const ODDS_API_BASE = 'https://api.the-odds-api.com/v4';
let oddsApiRequestCount = 0;
const ODDS_API_DAILY_LIMIT = 500;
/**
 * Fetch 1xbet odds from The Odds API
 * 1xbet is listed as a bookmaker in their aggregation
 */
async function fetch1xbetFromOddsApi(sport = 'soccer_epl', region = 'eu', markets = 'h2h,totals,btts') {
    if (!config_js_1.CONFIG.oddsApiKey) {
        logger_js_1.logger.warn('ODDS_API_KEY not configured. Skipping The Odds API.');
        return [];
    }
    if (oddsApiRequestCount >= ODDS_API_DAILY_LIMIT) {
        logger_js_1.logger.warn('The Odds API daily limit reached.');
        return [];
    }
    const url = `${ODDS_API_BASE}/sports/${sport}/odds/?apiKey=${config_js_1.CONFIG.oddsApiKey}&regions=${region}&markets=${markets}&bookmakers=1xbet&oddsFormat=decimal`;
    try {
        const response = await fetch(url);
        oddsApiRequestCount++;
        if (!response.ok) {
            logger_js_1.logger.error(`The Odds API error: ${response.status}`);
            return [];
        }
        const data = await response.json();
        return parseOddsApiEvents(data);
    }
    catch (err) {
        logger_js_1.logger.error(`The Odds API request failed: ${err}`);
        return [];
    }
}
function parseOddsApiEvents(events) {
    const results = [];
    for (const event of events) {
        const fixtureId = parseInt(event.id.replace(/\D/g, '').slice(0, 8), 10) || 0;
        for (const bookmaker of event.bookmakers) {
            // Only collect 1xbet odds
            if (bookmaker.key.toLowerCase() !== '1xbet')
                continue;
            const odds = {
                fixtureId,
                bookmaker: '1xbet',
                market: 'over_2.5_goals',
                homeOdds: null,
                drawOdds: null,
                awayOdds: null,
                overOdds: null,
                underOdds: null,
                yesOdds: null,
                noOdds: null,
                timestamp: event.commence_time,
            };
            for (const market of bookmaker.markets) {
                if (market.key === 'h2h') {
                    for (const outcome of market.outcomes) {
                        const name = outcome.name.toLowerCase();
                        if (name === event.home_team.toLowerCase())
                            odds.homeOdds = outcome.price;
                        else if (name === event.away_team.toLowerCase())
                            odds.awayOdds = outcome.price;
                        else if (name === 'draw')
                            odds.drawOdds = outcome.price;
                    }
                }
                if (market.key === 'totals') {
                    for (const outcome of market.outcomes) {
                        if (outcome.name.toLowerCase() === 'over' && outcome.point === 2.5) {
                            odds.overOdds = outcome.price;
                            odds.market = 'over_2.5_goals';
                        }
                    }
                }
                if (market.key === 'btts') {
                    for (const outcome of market.outcomes) {
                        if (outcome.name.toLowerCase() === 'yes') {
                            odds.yesOdds = outcome.price;
                        }
                    }
                }
            }
            results.push(odds);
        }
    }
    logger_js_1.logger.info(`Fetched 1xbet odds for ${events.length} events from The Odds API`);
    return results;
}
/**
 * Fetch 1xbet odds for multiple sports/leagues
 */
async function fetch1xbetAllLeagues() {
    const leagues = [
        'soccer_epl', // Premier League
        'soccer_germany_bundesliga',
        'soccer_netherlands_eredivisie',
        'soccer_usa_mls',
        'soccer_italy_serie_a',
        'soccer_spain_la_liga',
        'soccer_france_ligue_one',
        'soccer_portugal_primeira_liga',
    ];
    const allOdds = [];
    for (const league of leagues) {
        const odds = await fetch1xbetFromOddsApi(league);
        allOdds.push(...odds);
    }
    logger_js_1.logger.info(`Total 1xbet odds collected: ${allOdds.length} entries`);
    return allOdds;
}
// ---- Direct 1xbet Scraping (fallback) ----
const XBET_BASE = 'https://1xbet.com';
/**
 * Scrape odds directly from 1xbet public website
 * This uses the public-facing odds pages
 */
async function fetch1xbetDirect(leagueId) {
    const results = [];
    try {
        // 1xbet's public API endpoint for live/pre-match odds
        const url = `${XBET_BASE}/LineFeed/Get1xZone_VZip,sports/1赛事_${leagueId ? `? leagueId=${leagueId}` : ''}`;
        const response = await fetch(url, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                'Accept': 'application/json',
                'Referer': 'https://1xbet.com/',
            },
        });
        if (!response.ok) {
            logger_js_1.logger.warn(`1xbet direct scrape failed: ${response.status}`);
            return results;
        }
        const text = await response.text();
        // Parse the JSONP response
        const jsonStr = text.replace(/^[^(]*\(/, '').replace(/\);?\s*$/, '');
        const data = JSON.parse(jsonStr);
        if (data?.Success && data?.Value?.Ls) {
            for (const event of data.Value.Ls) {
                const odds = parseXBetEvent(event);
                if (odds)
                    results.push(odds);
            }
        }
        logger_js_1.logger.info(`Scraped ${results.length} odds from1xbet directly`);
    }
    catch (err) {
        logger_js_1.logger.warn(`1xbet direct scraping not available: ${err}`);
    }
    return results;
}
function parseXBetEvent(event) {
    if (!event.E1 || !event.E2)
        return null;
    return {
        fixtureId: event.I,
        bookmaker: '1xbet',
        market: 'over_2.5_goals',
        homeOdds: event.E1 || null,
        drawOdds: event.X || null,
        awayOdds: event.E2 || null,
        overOdds: event.S5 ? event.S5 / 100 : null,
        underOdds: event.S6 ? event.S6 / 100 : null,
        yesOdds: event.W1 ? event.W1 / 100 : null,
        noOdds: event.W2 ? event.W2 / 100 : null,
        timestamp: new Date().toISOString(),
    };
}
/**
 * Main entry: try The Odds API first, fall back to direct scraping
 */
async function collect1xbetOdds(leagueId) {
    logger_js_1.logger.info('Collecting 1xbet odds...');
    // Try The Odds API first (more reliable)
    const apiOdds = await fetch1xbetFromOddsApi();
    if (apiOdds.length > 0) {
        return apiOdds;
    }
    // Fall back to direct scraping
    const scrapedOdds = await fetch1xbetDirect(leagueId);
    return scrapedOdds;
}
/**
 * Get the number of API requests used today
 */
function getOddsApiRequestCount() {
    return oddsApiRequestCount;
}
//# sourceMappingURL=one-xbet.js.map