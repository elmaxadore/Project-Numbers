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

async function apiRequest<T>(endpoint: string, params: Record<string, string> = {}): Promise<T | null> {
  if (requestCount >= DAILY_LIMIT) {
    logger.warn(`API-Sports daily limit reached (${DAILY_LIMIT} requests). Skipping.`);
    return null;
  }

  if (!CONFIG.apiSportsKey) {
    logger.warn('API_SPORTS_KEY not configured. Skipping API-Sports request.');
    return null;
  }

  const queryString = new URLSearchParams(params).toString();
  const url = `${BASE_URL}${endpoint}${queryString ? '?' + queryString : ''}`;

  try {
    const response = await fetch(url, {
      headers: {
        'x-rapidapi-key': CONFIG.apiSportsKey,
        'x-rapidapi-host': 'v3.football.api-sports.io',
      },
    });

    requestCount++;

    if (!response.ok) {
      logger.error(`API-Sports error: ${response.status} ${response.statusText}`);
      return null;
    }

    const data = await response.json() as ApiSportsResponse<T>;
    return data.response;
  } catch (err) {
    logger.error(`API-Sports request failed: ${err}`);
    return null;
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
  const result = await apiRequest<ApiFixture[]>('/fixtures', {
    league: String(leagueId),
    season: String(season),
  });
  return result || [];
}

/**
 * Get fixtures for a specific date range
 */
export async function getFixturesByDate(
  from: string,
  to: string,
  leagueId?: number
): Promise<ApiFixture[]> {
  const params: Record<string, string> = { from, to };
  if (leagueId) params.league = String(leagueId);

  const result = await apiRequest<ApiFixture[]>('/fixtures', params);
  return result || [];
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
  const result = await apiRequest<ApiTeamStatistic[]>('/teams/statistics', {
    league: String(leagueId),
    season: String(season),
    team: String(teamId),
  });
  return result && result.length > 0 ? result[0] : null;
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
  const result = await apiRequest<ApiStanding[]>('/standings', {
    league: String(leagueId),
    season: String(season),
  });
  return result && result.length > 0 ? result[0] : null;
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
  const params: Record<string, string> = {
    league: String(leagueId),
    season: String(season),
  };
  if (fixtureId) params.fixture = String(fixtureId);

  const result = await apiRequest<ApiOdds[]>('/odds', params);
  return result || [];
}

// ---- Head-to-Head ----

/**
 * Get head-to-head results between two teams
 */
export async function getHeadToHead(
  homeTeamId: number,
  awayTeamId: number
): Promise<ApiFixture[]> {
  const h2h = `${homeTeamId}-${awayTeamId}`;
  const result = await apiRequest<ApiFixture[]>('/fixtures/headtohead', {
    h2h,
  });
  return result || [];
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
