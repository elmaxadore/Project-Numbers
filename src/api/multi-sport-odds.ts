/**
 * Multi-Sport Odds Aggregator
 * 
 * Integrates with:
 * - Odds-Papi (250 requests/month free tier)
 * - The Odds API (covers 1xbet and 50+ bookmakers)
 * - API-Sports via RapidAPI (100 requests/day free tier)
 * 
 * Supports: Football, Basketball, Tennis, Baseball, Ice Hockey, American Football
 */

import { CONFIG } from '../config.js';
import { logger } from '../utils/logger.js';
import { MarketOdds, BettingMarket } from '../models/types.js';

// ============================================================================
// Type Definitions
// ============================================================================

export interface MultiSportFixture {
  id: string;
  sport: SportType;
  league: string;
  homeTeam: string;
  awayTeam: string;
  startTime: string;
  status: 'scheduled' | 'live' | 'finished';
}

export type SportType = 
  | 'soccer'
  | 'basketball'
  | 'tennis'
  | 'baseball'
  | 'ice_hockey'
  | 'american_football';

export interface OddsPapiResponse {
  data: Array<{
    id: string;
    sport: string;
    league: string;
    home_team: string;
    away_team: string;
    commence_time: string;
    bookmakers: Array<{
      key: string;
      title: string;
      markets: Array<{
        key: string;
        outcomes: Array<{
          name: string;
          price: number;
        }>;
      }>;
    }>;
  }>;
}

export interface TheOddsApiResponse {
  id: string;
  sport_key: string;
  sport_title: string;
  commencing_timestamp: number;
  home_team: string;
  away_team: string;
  bookmakers: Array<{
    key: string;
    title: string;
    markets: Array<{
      key: string;
      outcomes: Array<{
        name: string;
        price: number;
      }>;
    }>;
  }>;
}

// ============================================================================
// Constants
// ============================================================================

const SPORTS_MAP: Record<string, string> = {
  'soccer': 'soccer',
  'basketball': 'basketball',
  'tennis': 'tennis',
  'baseball': 'baseball',
  'ice_hockey': 'ice_hockey',
  'american_football': 'americanfootball',
};

const LEAGUE_MAP: Record<SportType, string[]> = {
  'soccer': [
    'epl',           // English Premier League
    'spain_la_liga', // La Liga
    'germany_bundesliga',
    'italy_serie_a',
    'france_ligue_1',
    'uefa_champions_league',
    'mls',           // Major League Soccer
    'brazil_campeonato',
  ],
  'basketball': [
    'basketball_nba',
    'basketball_euroleague',
    'basketball_ncaab',
  ],
  'tennis': [
    'tennis_atp_french_open',
    'tennis_wta_french_open',
    'tennis_atp_wimbledon',
    'tennis_atp_us_open',
  ],
  'baseball': [
    'baseball_mlb',
  ],
  'ice_hockey': [
    'icehockey_nhl',
  ],
  'american_football': [
    'americanfootball_nfl',
    'americanfootball_ncaaf',
  ],
};

// ============================================================================
// Odds-Papi Client
// ============================================================================

let oddsPapiRequestCount = 0;
const ODDS_PAPI_MONTHLY_LIMIT = 250;

async function oddsPapiRequest<T>(endpoint: string, params: Record<string, string> = {}): Promise<T | null> {
  if (oddsPapiRequestCount >= ODDS_PAPI_MONTHLY_LIMIT) {
    logger.warn(`⚠️ Odds-Papi monthly limit reached (${ODDS_PAPI_MONTHLY_LIMIT}). Skipping.`);
    return null;
  }

  if (!CONFIG.oddsPapiKey) {
    logger.warn('⚠️ ODDS_PAPI_KEY not configured. Skipping Odds-Papi request.');
    return null;
  }

  const queryString = new URLSearchParams(params).toString();
  const url = `https://api.odds.papi.io/v1${endpoint}?apikey=${CONFIG.oddsPapiKey}${queryString ? '&' + queryString : ''}`;

  try {
    const response = await fetch(url);
    oddsPapiRequestCount++;

    if (!response.ok) {
      logger.error(`❌ Odds-Papi error: ${response.status} ${response.statusText}`);
      return null;
    }

    return await response.json() as T;
  } catch (err) {
    logger.error(`❌ Odds-Papi request failed: ${err}`);
    return null;
  }
}

/**
 * Fetch upcoming fixtures with odds from Odds-Papi
 */
export async function fetchOddsPapiFixtures(
  sport: SportType = 'soccer',
  daysAhead: number = 7
): Promise<MultiSportFixture[]> {
  logger.info(`📡 Fetching ${sport} fixtures from Odds-Papi...`);

  const leagues = LEAGUE_MAP[sport] || [];
  const allFixtures: MultiSportFixture[] = [];

  for (const league of leagues) {
    const result = await oddsPapiRequest<OddsPapiResponse>('/events', {
      sport: sport,
      league: league,
      days: String(daysAhead),
    });

    if (result?.data) {
      for (const event of result.data) {
        const fixture: MultiSportFixture = {
          id: event.id,
          sport: sport as SportType,
          league: event.league,
          homeTeam: event.home_team,
          awayTeam: event.away_team,
          startTime: event.commence_time,
          status: 'scheduled',
        };
        allFixtures.push(fixture);
      }
    }
  }

  logger.info(`✅ Found ${allFixtures.length} ${sport} fixtures from Odds-Papi`);
  return allFixtures;
}

// ============================================================================
// The Odds API Client
// ============================================================================

let theOddsApiRequestCount = 0;
const THE_ODDS_API_DAILY_LIMIT = 500;

async function theOddsApiRequest<T>(endpoint: string, params: Record<string, string> = {}): Promise<T | null> {
  if (theOddsApiRequestCount >= THE_ODDS_API_DAILY_LIMIT) {
    logger.warn(`⚠️ The Odds API daily limit reached (${THE_ODDS_API_DAILY_LIMIT}). Skipping.`);
    return null;
  }

  if (!CONFIG.oddsApiKey && !process.env.THE_ODDS_API) {
    logger.warn('⚠️ THE_ODDS_API key not configured. Skipping The Odds API request.');
    return null;
  }

  const apiKey = CONFIG.oddsApiKey || process.env.THE_ODDS_API!;
  const queryString = new URLSearchParams(params).toString();
  const url = `https://api.the-odds-api.com/v4${endpoint}?apiKey=${apiKey}${queryString ? '&' + queryString : ''}`;

  try {
    const response = await fetch(url);
    theOddsApiRequestCount++;

    if (!response.ok) {
      logger.error(`❌ The Odds API error: ${response.status} ${response.statusText}`);
      return null;
    }

    return await response.json() as T;
  } catch (err) {
    logger.error(`❌ The Odds API request failed: ${err}`);
    return null;
  }
}

/**
 * Fetch upcoming fixtures with odds from The Odds API
 */
export async function fetchTheOddsApiFixtures(
  sport: SportType = 'soccer',
  daysAhead: number = 7
): Promise<MultiSportFixture[]> {
  logger.info(`📡 Fetching ${sport} fixtures from The Odds API...`);

  const sportKey = SPORTS_MAP[sport];
  if (!sportKey) {
    logger.warn(`⚠️ Unknown sport: ${sport}`);
    return [];
  }

  const result = await theOddsApiRequest<TheOddsApiResponse[]>('/sports', {
    sport: sportKey,
    regions: 'us,uk,eu',
    markets: 'h2h,totals,spreads',
    dateFormat: 'iso',
  });

  if (!result) {
    return [];
  }

  const fixtures: MultiSportFixture[] = [];
  for (const event of result) {
    // Filter by days ahead
    const eventDate = new Date(event.commencing_timestamp);
    const maxDate = new Date();
    maxDate.setDate(maxDate.getDate() + daysAhead);

    if (eventDate <= maxDate) {
      fixtures.push({
        id: event.id,
        sport: sport as SportType,
        league: event.sport_title,
        homeTeam: event.home_team,
        awayTeam: event.away_team,
        startTime: new Date(event.commencing_timestamp).toISOString(),
        status: 'scheduled',
      });
    }
  }

  logger.info(`✅ Found ${fixtures.length} ${sport} fixtures from The Odds API`);
  return fixtures;
}

// ============================================================================
// API-Sports (RapidAPI) Client for Multi-Sport
// ============================================================================

let apiSportsRequestCount = 0;
const API_SPORTS_DAILY_LIMIT = 100;

async function apiSportsRequest<T>(endpoint: string, params: Record<string, string> = {}): Promise<T | null> {
  if (apiSportsRequestCount >= API_SPORTS_DAILY_LIMIT) {
    logger.warn(`⚠️ API-Sports daily limit reached (${API_SPORTS_DAILY_LIMIT}). Skipping.`);
    return null;
  }

  if (!CONFIG.apiSportsKey) {
    logger.warn('⚠️ X_RAPIDAPI_KEY/API_SPORTS_KEY not configured. Skipping API-Sports request.');
    return null;
  }

  const queryString = new URLSearchParams(params).toString();
  const url = `https://v3.football.api-sports.io${endpoint}${queryString ? '?' + queryString : ''}`;

  try {
    const response = await fetch(url, {
      headers: {
        'x-rapidapi-key': CONFIG.apiSportsKey,
        'x-rapidapi-host': 'v3.football.api-sports.io',
      },
    });
    apiSportsRequestCount++;

    if (!response.ok) {
      logger.error(`❌ API-Sports error: ${response.status} ${response.statusText}`);
      return null;
    }

    const data: any = await response.json();
    if (data.errors && Array.isArray(data.errors) && data.errors.length > 0) {
      logger.error(`❌ API-Sports returned errors: ${data.errors.join(', ')}`);
      return null;
    }

    return data.response as T;
  } catch (err) {
    logger.error(`❌ API-Sports request failed: ${err}`);
    return null;
  }
}

/**
 * Fetch fixtures from API-Sports (primarily for soccer/football)
 */
export async function fetchApiSportsFixtures(
  dateFrom: string,
  dateTo: string,
  leagueId?: number
): Promise<MultiSportFixture[]> {
  logger.info(`📡 Fetching fixtures from API-Sports (${dateFrom} to ${dateTo})...`);

  const params: Record<string, string> = { from: dateFrom, to: dateTo };
  if (leagueId) {
    params.league = String(leagueId);
  }

  const result = await apiSportsRequest<any[]>('/fixtures', params);

  if (!result) {
    return [];
  }

  const fixtures: MultiSportFixture[] = [];
  for (const fixture of result) {
    fixtures.push({
      id: String(fixture.fixture.id),
      sport: 'soccer',
      league: fixture.league.name,
      homeTeam: fixture.teams.home.name,
      awayTeam: fixture.teams.away.name,
      startTime: fixture.fixture.date,
      status: fixture.fixture.status.short === 'NS' ? 'scheduled' : 
              fixture.fixture.status.short === '1H' || fixture.fixture.status.short === '2H' ? 'live' : 'finished',
    });
  }

  logger.info(`✅ Found ${fixtures.length} fixtures from API-Sports`);
  return fixtures;
}

// ============================================================================
// Unified Multi-Sport Fixture Fetcher
// ============================================================================

/**
 * Fetch fixtures from ALL available sources for ALL supported sports
 * Prioritizes paid APIs when keys are available, falls back to free sources
 */
export async function fetchAllMultiSportFixtures(
  daysAhead: number = 7
): Promise<MultiSportFixture[]> {
  logger.info('🌍 Fetching multi-sport fixtures from all available sources...');
  
  const allFixtures: MultiSportFixture[] = [];
  const sports: SportType[] = ['soccer', 'basketball', 'tennis', 'baseball', 'ice_hockey', 'american_football'];

  for (const sport of sports) {
    logger.info(`\n🏆 Processing ${sport.toUpperCase()}...`);
    
    let sportFixtures: MultiSportFixture[] = [];

    // Try The Odds API first (best coverage)
    if (CONFIG.oddsApiKey || process.env.THE_ODDS_API) {
      const theOddsFixtures = await fetchTheOddsApiFixtures(sport, daysAhead);
      sportFixtures.push(...theOddsFixtures);
    }

    // Try Odds-Papi for additional coverage
    if (CONFIG.oddsPapiKey) {
      const oddsPapiFixtures = await fetchOddsPapiFixtures(sport, daysAhead);
      // Avoid duplicates
      const existingIds = new Set(sportFixtures.map(f => f.id));
      for (const fixture of oddsPapiFixtures) {
        if (!existingIds.has(fixture.id)) {
          sportFixtures.push(fixture);
        }
      }
    }

    // For soccer, also try API-Sports
    if (sport === 'soccer' && CONFIG.apiSportsKey) {
      const today = new Date().toISOString().split('T')[0];
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + daysAhead);
      const futureStr = futureDate.toISOString().split('T')[0];

      const apiSportsFixtures = await fetchApiSportsFixtures(today, futureStr);
      const existingIds = new Set(sportFixtures.map(f => f.id));
      for (const fixture of apiSportsFixtures) {
        if (!existingIds.has(fixture.id)) {
          sportFixtures.push(fixture);
        }
      }
    }

    logger.info(`✅ ${sport.toUpperCase()}: ${sportFixtures.length} total fixtures`);
    allFixtures.push(...sportFixtures);
  }

  logger.info(`\n🎯 TOTAL: ${allFixtures.length} multi-sport fixtures found`);
  return allFixtures;
}

// ============================================================================
// Odds Parsing Utilities
// ============================================================================

/**
 * Parse odds from The Odds API format into our MarketOdds format
 */
export function parseTheOddsApiOdds(
  eventData: TheOddsApiResponse,
  fixtureId: string
): MarketOdds[] {
  const results: MarketOdds[] = [];

  for (const bookmaker of eventData.bookmakers) {
    for (const market of bookmaker.markets) {
      const odds: MarketOdds = {
        fixtureId: parseInt(fixtureId),
        bookmaker: bookmaker.title,
        market: mapMarketKey(market.key),
        homeOdds: null,
        drawOdds: null,
        awayOdds: null,
        overOdds: null,
        underOdds: null,
        yesOdds: null,
        noOdds: null,
        timestamp: new Date(eventData.commencing_timestamp).toISOString(),
      };

      for (const outcome of market.outcomes) {
        const name = outcome.name.toLowerCase();
        if (name === 'home' || name === eventData.home_team.toLowerCase()) {
          odds.homeOdds = outcome.price;
        } else if (name === 'away' || name === eventData.away_team.toLowerCase()) {
          odds.awayOdds = outcome.price;
        } else if (name === 'draw') {
          odds.drawOdds = outcome.price;
        } else if (name === 'over') {
          odds.overOdds = outcome.price;
        } else if (name === 'under') {
          odds.underOdds = outcome.price;
        } else if (name === 'yes') {
          odds.yesOdds = outcome.price;
        } else if (name === 'no') {
          odds.noOdds = outcome.price;
        }
      }

      results.push(odds);
    }
  }

  return results;
}

function mapMarketKey(marketKey: string): BettingMarket {
  switch (marketKey) {
    case 'totals':
    case 'over_under':
      return 'over_2.5_goals';
    case 'h2h':
      return 'match_result';
    case 'btts':
    case 'both_teams_to_score':
      return 'btts_yes';
    default:
      return 'over_2.5_goals';
  }
}

// ============================================================================
// Request Count Tracking
// ============================================================================

export function getRequestCounts(): {
  oddsPapi: number;
  theOddsApi: number;
  apiSports: number;
} {
  return {
    oddsPapi: oddsPapiRequestCount,
    theOddsApi: theOddsApiRequestCount,
    apiSports: apiSportsRequestCount,
  };
}

export function resetRequestCounts(): void {
  oddsPapiRequestCount = 0;
  theOddsApiRequestCount = 0;
  apiSportsRequestCount = 0;
}
