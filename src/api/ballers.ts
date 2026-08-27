// ============================================================
// ballers (Big Balls) API Client
// Free tier: 1,000 requests/day
// Use for: Live data with Expected Goals (xG) metrics
// ============================================================

import { CONFIG } from '../config.js';
import { logger } from '../utils/logger.js';
import { TeamVenueStats } from '../models/types.js';

const BASE_URL = 'https://api.bfrds.com/v2';

let requestCount = 0;
const DAILY_LIMIT = 1000;

async function apiRequest<T>(endpoint: string, params: Record<string, string> = {}): Promise<T | null> {
  if (requestCount >= DAILY_LIMIT) {
    logger.warn(`ballers daily limit reached (${DAILY_LIMIT} requests). Skipping.`);
    return null;
  }

  if (!CONFIG.ballersKey) {
    logger.warn('BALLERS_KEY not configured. Skipping ballers request.');
    return null;
  }

  const queryString = new URLSearchParams(params).toString();
  const url = `${BASE_URL}${endpoint}?api_token=${CONFIG.ballersKey}${queryString ? '&' + queryString : ''}`;

  try {
    const response = await fetch(url);
    requestCount++;

    if (!response.ok) {
      logger.error(`ballers error: ${response.status} ${response.statusText}`);
      return null;
    }

    return await response.json() as T;
  } catch (err) {
    logger.error(`ballers request failed: ${err}`);
    return null;
  }
}

// ---- xG Data ----

export interface BallersTeamSeasonStats {
  team: {
    id: number;
    name: string;
  };
  league: {
    id: number;
    name: string;
  };
  season: number;
  statistics: {
    matches_played: number;
    goals_scored: number;
    goals_conceded: number;
    expected_goals: number;        // xG
    expected_goals_against: number; // xGA
    clean_sheets: number;
    failed_to_score: number;
    both_teams_to_score: number;
    shots_per_game: number;
    shots_on_target_per_game: number;
  };
  home?: {
    matches_played: number;
    goals_scored: number;
    goals_conceded: number;
    expected_goals: number;
    expected_goals_against: number;
    clean_sheets: number;
    failed_to_score: number;
    both_teams_to_score: number;
  };
  away?: {
    matches_played: number;
    goals_scored: number;
    goals_conceded: number;
    expected_goals: number;
    expected_goals_against: number;
    clean_sheets: number;
    failed_to_score: number;
    both_teams_to_score: number;
  };
}

export interface BallersMatch {
  id: number;
  league: { id: number; name: string };
  home_team: { id: number; name: string };
  away_team: { id: number; name: string };
  start: string;
  stats: {
    home: {
      expected_goals: number;
      expected_goals_against: number;
      goals: number;
      shots: number;
      shots_on_target: number;
    };
    away: {
      expected_goals: number;
      expected_goals_against: number;
      goals: number;
      shots: number;
      shots_on_target: number;
    };
  };
  odds?: {
    home: number;
    draw: number;
    away: number;
  };
}

/**
 * Get team season statistics with xG data
 */
export async function getTeamSeasonStats(
  teamId: number,
  leagueId: number,
  season: number
): Promise<BallersTeamSeasonStats | null> {
  return apiRequest<BallersTeamSeasonStats>(
    `/teams/${teamId}/season/${season}`,
    { league: String(leagueId) }
  );
}

/**
 * Get upcoming fixtures with xG predictions
 */
export async function getUpcomingFixtures(
  leagueId: number,
  page: number = 1
): Promise<BallersMatch[]> {
  const result = await apiRequest<{ data: BallersMatch[] }>(
    `/fixtures/league/${leagueId}`,
    { page: String(page), sort: 'start' }
  );
  return result?.data || [];
}

/**
 * Get match details with full xG breakdown
 */
export async function getMatchDetails(
  matchId: number
): Promise<BallersMatch | null> {
  return apiRequest<BallersMatch>(`/fixtures/${matchId}`);
}

/**
 * Convert ballers stats to our TeamVenueStats format
 */
export function toTeamVenueStats(
  stats: BallersTeamSeasonStats,
  venue: 'home' | 'away'
): TeamVenueStats {
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
export function getRequestCount(): number {
  return requestCount;
}
