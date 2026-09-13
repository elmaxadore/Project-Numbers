// ============================================================
// API-Sports Client (api-football.com via RapidAPI)
// Free tier: 100 requests/day
// Use for: Historical fixtures, stats, and backtesting data
// ============================================================

import { CONFIG } from '../config.js';
import { logger } from '../utils/logger.js';

const BASE_URL = 'https://v3.football.api-sports.io';

interface ApiSportsResponse<T> {
  get: string;
  parameters: Record<string, unknown>;
  errors: string[];
  results: number;
  paging: { current: number; total: number };
  response: T;
}

// Rate limiter: max 100 requests/day
let requestCount = 0;
const DAILY_LIMIT = 100;

async function apiRequest<T>(endpoint: string, params: Record<string, string> = {}): Promise<T> {
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
      } else if (response.status === 429) {
        errorMessage = `API-Sports Rate Limited (${response.status}): Too many requests. Wait and retry.`;
      } else if (response.status === 404) {
        errorMessage = `API-Sports Not Found (${response.status}): Invalid endpoint or no data available.`;
      } else if (response.status >= 500) {
        errorMessage = `API-Sports Server Error (${response.status}): ${errorText || 'Server temporarily unavailable'}`;
      }
      
      logger.error(`❌ ${errorMessage}`);
      throw new Error(errorMessage);
    }

    const data = await response.json() as ApiSportsResponse<T>;
    
    // Check for API-level errors in response body
    if (data.errors && data.errors.length > 0) {
      const errorMsg = `API-Sports returned errors: ${data.errors.join(', ')}`;
      logger.error(`❌ ${errorMsg}`);
      throw new Error(errorMsg);
    }
    
    return data.response;
  } catch (err: any) {
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

// ---- Fixtures ----

export interface ApiFixture {
  fixture: {
    id: number;
    date: string;
    timestamp: number;
    status: { short: string; long: string };
  };
  league: {
    id: number;
    name: string;
    country: string;
  };
  teams: {
    home: { id: number; name: string; winner: boolean };
    away: { id: number; name: string; winner: boolean };
  };
  goals: { home: number | null; away: number | null };
  score: {
    halftime: { home: number | null; away: number | null };
    fulltime: { home: number | null; away: number | null };
  };
}

/**
 * Get fixtures for a league in a specific season
 */
export async function getFixtures(
  leagueId: number,
  season: number
): Promise<ApiFixture[]> {
  try {
    const result = await apiRequest<ApiFixture[]>('/fixtures', {
      league: String(leagueId),
      season: String(season),
    });
    return result || [];
  } catch (error: any) {
    logger.error(`Failed to get fixtures for league ${leagueId}, season ${season}: ${error.message}`);
    throw error; // Re-throw to let caller handle
  }
}

/**
 * Get fixtures for a specific date range
 */
export async function getFixturesByDate(
  from: string,
  to: string,
  leagueId?: number
): Promise<ApiFixture[]> {
  try {
    const params: Record<string, string> = { from, to };
    if (leagueId) params.league = String(leagueId);

    const result = await apiRequest<ApiFixture[]>('/fixtures', params);
    return result || [];
  } catch (error: any) {
    logger.error(`Failed to get fixtures for date range ${from} to ${to}: ${error.message}`);
    throw error; // Re-throw to let caller handle
  }
}

// ---- Statistics ----

export interface ApiTeamStatistic {
  team: { id: number; name: string };
  fixtures: {
    played: { home: number; away: number; total: number };
    wins: { home: number; away: number; total: number };
    draws: { home: number; away: number; total: number };
    loses: { home: number; away: number; total: number };
  };
  goals: {
    for: {
      total: { home: number; away: number; total: number };
      average: { home: string; away: string; total: string };
    };
    against: {
      total: { home: number; away: number; total: number };
      average: { home: string; away: string; total: string };
    };
  };
  clean_sheet: { home: number; away: number; total: number };
  failed_to_score: { home: number; away: number; total: number };
  both_teams_to_score: { total: number };
}

/**
 * Get team statistics for a league/season
 */
export async function getTeamStatistics(
  leagueId: number,
  season: number,
  teamId: number
): Promise<ApiTeamStatistic | null> {
  try {
    const result = await apiRequest<ApiTeamStatistic[]>('/teams/statistics', {
      league: String(leagueId),
      season: String(season),
      team: String(teamId),
    });
    return result && result.length > 0 ? result[0] : null;
  } catch (error: any) {
    logger.error(`Failed to get statistics for team ${teamId}, league ${leagueId}, season ${season}: ${error.message}`);
    throw error; // Re-throw to let caller handle
  }
}

// ---- Standings ----

export interface ApiStanding {
  league: {
    id: number;
    name: string;
    standings: Array<Array<{
      rank: number;
      team: { id: number; name: string };
      points: number;
      goalsDiff: number;
      all: {
        played: number;
        win: number;
        draw: number;
        lose: number;
        goals: { for: number; against: number };
      };
    }>>;
  };
}

/**
 * Get league standings
 */
export async function getStandings(
  leagueId: number,
  season: number
): Promise<ApiStanding | null> {
  try {
    const result = await apiRequest<ApiStanding[]>('/standings', {
      league: String(leagueId),
      season: String(season),
    });
    return result && result.length > 0 ? result[0] : null;
  } catch (error: any) {
    logger.error(`Failed to get standings for league ${leagueId}, season ${season}: ${error.message}`);
    throw error; // Re-throw to let caller handle
  }
}

// ---- Odds ----

export interface ApiOdds {
  league: { id: number; name: string };
  fixture: { id: number; date: string };
  update: string;
  bookmakers: Array<{
    id: number;
    name: string;
    bets: Array<{
      id: number;
      name: string;
      values: Array<{ value: string; odd: string }>;
    }>;
  }>;
}

/**
 * Get pre-match odds for upcoming fixtures
 */
export async function getOdds(
  leagueId: number,
  season: number,
  fixtureId?: number
): Promise<ApiOdds[]> {
  try {
    const params: Record<string, string> = {
      league: String(leagueId),
      season: String(season),
    };
    if (fixtureId) params.fixture = String(fixtureId);

    const result = await apiRequest<ApiOdds[]>('/odds', params);
    return result || [];
  } catch (error: any) {
    logger.error(`Failed to get odds for league ${leagueId}, season ${season}: ${error.message}`);
    throw error; // Re-throw to let caller handle
  }
}

// ---- Head-to-Head ----

/**
 * Get head-to-head results between two teams
 */
export async function getHeadToHead(
  homeTeamId: number,
  awayTeamId: number
): Promise<ApiFixture[]> {
  try {
    const h2h = `${homeTeamId}-${awayTeamId}`;
    const result = await apiRequest<ApiFixture[]>('/fixtures/headtohead', {
      h2h,
    });
    return result || [];
  } catch (error: any) {
    logger.error(`Failed to get head-to-head for teams ${homeTeamId} vs ${awayTeamId}: ${error.message}`);
    throw error; // Re-throw to let caller handle
  }
}

/**
 * Get the number of API requests used today
 */
export function getRequestCount(): number {
  return requestCount;
}

/**
 * Reset the daily request counter
 */
export function resetRequestCount(): void {
  requestCount = 0;
}
