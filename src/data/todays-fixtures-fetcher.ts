/**
 * Today's Fixtures Fetcher
 * Fetches real upcoming matches using API-Sports (RapidAPI) or TheSportsDB (free fallback)
 */

import { getFixturesByDate as getApiSportsFixtures } from '../api/api-sports.js';
import { getFixturesByDate as getTheSportsDBFixtures } from '../api/thesportsdb-api.js';
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
 * Fetch all fixtures scheduled for today. If none found, searches next 7 days.
 * Tries API-Sports first (if key available), then falls back to TheSportsDB (free)
 * Throws error only if both sources fail
 */
export async function fetchTodaysFixtures(): Promise<TodaysFixture[]> {
  logger.info('📅 Fetching real fixtures for today...');

  const apiSportsKey = process.env.X_RAPIDAPI_KEY || process.env.API_SPORTS_KEY;
  let hasValidApiSportsKey = apiSportsKey && apiSportsKey.length > 10;

  if (hasValidApiSportsKey) {
    logger.info('🔑 Using API-Sports (RapidAPI)...');
  } else {
    logger.info('ℹ️ No valid API-Sports key found. Using TheSportsDB (free)...');
  }

  const today = new Date();
  const maxDaysToSearch = 7;

  logger.info(`Searching for fixtures starting from ${today.toISOString().split('T')[0]}...`);

  for (let dayOffset = 0; dayOffset < maxDaysToSearch; dayOffset++) {
    const searchDate = new Date(today);
    searchDate.setDate(today.getDate() + dayOffset);
    const dateStr = searchDate.toISOString().split('T')[0];

    logger.info(`Checking date: ${dateStr} (day +${dayOffset})...`);

    let apiFixtures: any[] = [];
    let source = '';

    // Try API-Sports first if key is available
    if (hasValidApiSportsKey) {
      try {
        apiFixtures = await getApiSportsFixtures(dateStr, dateStr);
        source = 'API-Sports';
      } catch (error: any) {
        logger.warn(`⚠️ API-Sports failed: ${error.message}. Trying TheSportsDB...`);
        hasValidApiSportsKey = false; // Don't retry API-Sports
      }
    }

    // Fallback to TheSportsDB if API-Sports failed or no key
    if (!hasValidApiSportsKey || (source === 'API-Sports' && apiFixtures.length === 0)) {
      try {
        apiFixtures = await getTheSportsDBFixtures(dateStr);
        source = 'TheSportsDB';
      } catch (error: any) {
        logger.warn(`⚠️ TheSportsDB also failed: ${error.message}`);
        apiFixtures = [];
      }
    }

    if (apiFixtures && apiFixtures.length > 0) {
      // Filter only scheduled/upcoming fixtures AND validate all required fields
      const fixtures: TodaysFixture[] = apiFixtures
        .filter(fixture => {
          // TheSportsDB uses strStatus, API-Sports uses fixture.status.short
          const status = fixture.fixture?.status?.short || fixture.strStatus || 'NS';
          // Handle both API formats: API-Sports uses nested objects, TheSportsDB uses flat properties
          const leagueName = fixture.league?.name || fixture.leagueName || fixture.strLeague;
          const homeTeam = fixture.teams?.home?.name || fixture.homeTeam?.name || fixture.strHomeTeam;
          const awayTeam = fixture.teams?.away?.name || fixture.awayTeam?.name || fixture.strAwayTeam;
          
          // CRITICAL: Discard fixtures with unknown/null league or team names
          if (!leagueName || leagueName.trim() === '' || leagueName === 'Unknown League') {
            logger.warn(`⚠️ Discarding fixture: Invalid league name "${leagueName}"`);
            return false;
          }
          if (!homeTeam || homeTeam.trim() === '' || homeTeam === 'Unknown Home') {
            logger.warn(`⚠️ Discarding fixture: Invalid home team "${homeTeam}"`);
            return false;
          }
          if (!awayTeam || awayTeam.trim() === '' || awayTeam === 'Unknown Away') {
            logger.warn(`⚠️ Discarding fixture: Invalid away team "${awayTeam}"`);
            return false;
          }
          
          return ['NS', '1H', '2H', 'HT'].includes(status);
        })
        .map(fixture => ({
          id: fixture.fixture?.id || fixture.id || 0,
          leagueId: fixture.league?.id || fixture.idLeague || fixture.leagueId || 0,
          leagueName: (fixture.league?.name || fixture.leagueName || fixture.strLeague)!,
          homeTeam: {
            id: fixture.teams?.home?.id || fixture.homeTeam?.id || fixture.idHomeTeam || 0,
            name: (fixture.teams?.home?.name || fixture.homeTeam?.name || fixture.strHomeTeam)!,
          },
          awayTeam: {
            id: fixture.teams?.away?.id || fixture.awayTeam?.id || fixture.idAwayTeam || 0,
            name: (fixture.teams?.away?.name || fixture.awayTeam?.name || fixture.strAwayTeam)!,
          },
          date: fixture.fixture?.date || (fixture.dateEvent ? `${fixture.dateEvent}T${fixture.strTime || '15:00:00'}+00:00` : fixture.date || ''),
          timestamp: fixture.fixture?.timestamp || Date.parse(fixture.dateEvent) / 1000 || fixture.timestamp || 0,
          status: 'scheduled' as 'scheduled' | 'live',
        }));

      if (fixtures.length > 0) {
        if (dayOffset === 0) {
          logger.info(`✅ Found ${fixtures.length} fixtures for today (${dateStr}) via ${source}`);
        } else {
          logger.info(`✅ Found ${fixtures.length} fixtures for ${dateStr} (${dayOffset} day${dayOffset > 1 ? 's' : ''} ahead) via ${source}`);
        }

        // Log first few fixtures for debugging (use console.log since logger.debug might be filtered)
        fixtures.slice(0, 5).forEach(f => {
          console.log(`  🔍 Fixture: ${f.homeTeam.name} vs ${f.awayTeam.name} (${f.leagueName})`);
        });

        return fixtures;
      }
    }

    logger.info(`No fixtures found for ${dateStr}, checking next day...`);
  }

  // Only reach here if ALL 7 days had no fixtures from both sources
  throw new Error(
    `No fixtures found in the next ${maxDaysToSearch} days from any source. ` +
    `This likely means: 1) It's a major off-season period (e.g., July for European football), ` +
    `2) Both API services are experiencing downtime, or 3) Network issues. ` +
    `Check back tomorrow or verify your internet connection.`
  );
}
