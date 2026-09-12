/**
 * Today's Fixtures Fetcher
 * Fetches real upcoming matches for today using API-Sports (RapidAPI)
 */

import { getFixturesByDate, ApiFixture } from '../api/api-sports.js';
import { CONFIG } from '../config.js';
import { logger } from '../utils/logger.js';

export interface TodaysFixture {
  id: number;
  leagueId: number;
  leagueName: string;
  homeTeam: {
    id: number;
    name: string;
  };
  awayTeam: {
    id: number;
    name: string;
  };
  date: string;
  timestamp: number;
  status: 'scheduled' | 'live' | 'finished';
}

/**
 * Fetch all fixtures scheduled for today
 * Returns empty array if API fails or no fixtures found
 */
export async function fetchTodaysFixtures(): Promise<TodaysFixture[]> {
  logger.info('📅 Fetching real fixtures for today...');

  // Check if API key is configured
  if (!CONFIG.apiSportsKey) {
    logger.warn('⚠️ API_SPORTS_KEY or X_RAPIDAPI_KEY not configured. Cannot fetch fixtures.');
    return [];
  }

  try {
    const today = new Date().toISOString().split('T')[0];
    
    logger.info(`Fetching fixtures for date: ${today}`);
    
    // Fetch fixtures for today across all leagues
    const apiFixtures = await getFixturesByDate(today, today);
    
    if (!apiFixtures || apiFixtures.length === 0) {
      logger.info('No fixtures found for today.');
      return [];
    }

    // Filter only scheduled/upcoming fixtures
    const todaysFixtures: TodaysFixture[] = apiFixtures
      .filter(fixture => {
        const status = fixture.fixture.status.short;
        // NS = Not Started, 1H = First Half, 2H = Second Half (include live too)
        return ['NS', '1H', '2H', 'HT'].includes(status);
      })
      .map(fixture => ({
        id: fixture.fixture.id,
        leagueId: fixture.league.id,
        leagueName: fixture.league.name,
        homeTeam: {
          id: fixture.teams.home.id,
          name: fixture.teams.home.name,
        },
        awayTeam: {
          id: fixture.teams.away.id,
          name: fixture.teams.away.name,
        },
        date: fixture.fixture.date,
        timestamp: fixture.fixture.timestamp,
        status: fixture.fixture.status.short === 'NS' ? 'scheduled' : 'live' as 'scheduled' | 'live',
      }));

    logger.info(`✅ Found ${todaysFixtures.length} real matches for today`);
    
    // Log first few fixtures for debugging
    todaysFixtures.slice(0, 3).forEach(f => {
      logger.debug(`  - ${f.homeTeam.name} vs ${f.awayTeam.name} (${f.leagueName})`);
    });

    return todaysFixtures;
  } catch (error: any) {
    logger.error(`Failed to fetch fixtures: ${error.message}`);
    return [];
  }
}

/**
 * Fetch fixtures for a specific league
 */
export async function fetchFixturesForLeague(
  leagueId: number,
  date?: string
): Promise<TodaysFixture[]> {
  logger.info(`📅 Fetching fixtures for league ${leagueId}...`);

  if (!CONFIG.apiSportsKey) {
    logger.warn('⚠️ API_SPORTS_KEY not configured.');
    return [];
  }

  try {
    const today = date || new Date().toISOString().split('T')[0];
    const apiFixtures = await getFixturesByDate(today, today, leagueId);

    if (!apiFixtures || apiFixtures.length === 0) {
      logger.info(`No fixtures found for league ${leagueId} on ${today}`);
      return [];
    }

    return apiFixtures
      .filter(fixture => ['NS', '1H', '2H', 'HT'].includes(fixture.fixture.status.short))
      .map(fixture => ({
        id: fixture.fixture.id,
        leagueId: fixture.league.id,
        leagueName: fixture.league.name,
        homeTeam: {
          id: fixture.teams.home.id,
          name: fixture.teams.home.name,
        },
        awayTeam: {
          id: fixture.teams.away.id,
          name: fixture.teams.away.name,
        },
        date: fixture.fixture.date,
        timestamp: fixture.fixture.timestamp,
        status: fixture.fixture.status.short === 'NS' ? 'scheduled' : 'live' as 'scheduled' | 'live',
      }));
  } catch (error: any) {
    logger.error(`Failed to fetch fixtures for league ${leagueId}: ${error.message}`);
    return [];
  }
}
