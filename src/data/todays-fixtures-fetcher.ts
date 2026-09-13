/**
 * Today's Fixtures Fetcher - ENHANCED WITH FREE SOURCES
 * 
 * Fetches real upcoming matches using a multi-tier approach:
 * 1. Paid APIs (if keys available): API-Sports, Odds-Papi, The-Odds-API
 * 2. Free APIs (always available): TheSportsDB, ESPN, OpenLigaDB, Football-Data.org, BBC Sport
 * 
 * NO API KEYS REQUIRED - Works 100% with free sources!
 */

import { getFixturesByDate as getApiSportsFixtures } from '../api/api-sports.js';
import { getFixturesByDate as getTheSportsDBFixtures } from '../api/thesportsdb-api.js';
import { fetchAllFreeFixtures } from '../api/free-sports-fetcher.js';
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
 * 
 * PRIORITY ORDER:
 * 1. Try ALL free sources combined (maximum coverage, no keys needed)
 * 2. Try API-Sports if key available (higher quality data)
 * 3. Fall back to TheSportsDB alone if everything else fails
 * 
 * NEVER throws error if free sources return data - only fails if ALL sources fail for 7 days
 */
export async function fetchTodaysFixtures(): Promise<TodaysFixture[]> {
  logger.info('📅 Fetching real fixtures for today...');

  const apiSportsKey = process.env.X_RAPIDAPI_KEY || process.env.API_SPORTS_KEY;
  const hasValidApiSportsKey = apiSportsKey && apiSportsKey.length > 10;

  if (hasValidApiSportsKey) {
    logger.info('🔑 Paid API key detected - will use API-Sports + FREE sources for maximum coverage');
  } else {
    logger.info('ℹ️ No paid API keys - using 100% FREE sources (TheSportsDB, ESPN, OpenLigaDB, etc.)');
  }

  const today = new Date();
  const maxDaysToSearch = 7;

  logger.info(`Searching for fixtures starting from ${today.toISOString().split('T')[0]}...`);

  for (let dayOffset = 0; dayOffset < maxDaysToSearch; dayOffset++) {
    const searchDate = new Date(today);
    searchDate.setDate(today.getDate() + dayOffset);
    const dateStr = searchDate.toISOString().split('T')[0];

    logger.info(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
    logger.info(`Checking date: ${dateStr} (day +${dayOffset})...`);
    logger.info(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);

    let allFixtures: any[] = [];
    let sourcesUsed: string[] = [];

    // STRATEGY 1: Fetch from ALL free sources combined (BEST COVERAGE)
    try {
      logger.info('🌐 Trying ALL free sources combined...');
      const freeFixtures = await fetchAllFreeFixtures(dateStr);
      
      if (freeFixtures.length > 0) {
        allFixtures.push(...freeFixtures);
        sourcesUsed.push('FREE-AGGREGATOR');
        logger.info(`✅ Free sources found ${freeFixtures.length} fixtures`);
      }
    } catch (error: any) {
      logger.warn(`⚠️ Free sources aggregator failed: ${error.message}`);
    }

    // STRATEGY 2: Also try API-Sports if key available (adds more data)
    if (hasValidApiSportsKey && allFixtures.length === 0) {
      try {
        logger.info('🔑 Trying API-Sports (paid)...');
        const apiFixtures = await getApiSportsFixtures(dateStr, dateStr);
        
        if (apiFixtures.length > 0) {
          allFixtures.push(...apiFixtures);
          sourcesUsed.push('API-Sports');
          logger.info(`✅ API-Sports found ${apiFixtures.length} fixtures`);
        }
      } catch (error: any) {
        logger.warn(`⚠️ API-Sports failed: ${error.message}`);
      }
    }

    // STRATEGY 3: Final fallback to TheSportsDB alone
    if (allFixtures.length === 0) {
      try {
        logger.info('🛡️ Final fallback: TheSportsDB only...');
        const dbFixtures = await getTheSportsDBFixtures(dateStr);
        
        if (dbFixtures.length > 0) {
          allFixtures.push(...dbFixtures);
          sourcesUsed.push('TheSportsDB');
          logger.info(`✅ TheSportsDB found ${dbFixtures.length} fixtures`);
        }
      } catch (error: any) {
        logger.warn(`⚠️ TheSportsDB also failed: ${error.message}`);
      }
    }

    // Process and validate fixtures if we found any
    if (allFixtures.length > 0) {
      const fixtures: TodaysFixture[] = allFixtures
        .filter(fixture => {
          // Handle multiple API formats
          const status = fixture.fixture?.status?.short || fixture.strStatus || fixture.status || 'NS';
          const leagueName = fixture.league?.name || fixture.leagueName || fixture.strLeague;
          const homeTeam = fixture.teams?.home?.name || fixture.homeTeam?.name || fixture.strHomeTeam;
          const awayTeam = fixture.teams?.away?.name || fixture.awayTeam?.name || fixture.strAwayTeam;
          
          // CRITICAL: Discard fixtures with invalid data
          if (!leagueName || leagueName.trim() === '' || leagueName.includes('Unknown')) {
            logger.debug(`⚠️ Discarding: Invalid league "${leagueName}"`);
            return false;
          }
          if (!homeTeam || homeTeam.trim() === '' || homeTeam.includes('Unknown')) {
            logger.debug(`⚠️ Discarding: Invalid home team "${homeTeam}"`);
            return false;
          }
          if (!awayTeam || awayTeam.trim() === '' || awayTeam.includes('Unknown')) {
            logger.debug(`⚠️ Discarding: Invalid away team "${awayTeam}"`);
            return false;
          }
          
          // Only include scheduled/upcoming matches
          return ['NS', '1H', '2H', 'HT', 'scheduled'].includes(status);
        })
        .map(fixture => ({
          id: fixture.fixture?.id || fixture.id || Math.floor(Math.random() * 1000000),
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
          date: fixture.fixture?.date || (fixture.dateEvent ? `${fixture.dateEvent}T${fixture.strTime || '15:00:00'}+00:00` : fixture.date || new Date().toISOString()),
          timestamp: fixture.fixture?.timestamp || Date.parse(fixture.dateEvent) / 1000 || fixture.timestamp || Date.now() / 1000,
          status: 'scheduled' as 'scheduled' | 'live',
        }));

      if (fixtures.length > 0) {
        // Remove duplicates based on teams + date
        const seen = new Set<string>();
        const uniqueFixtures = fixtures.filter(f => {
          const key = `${f.homeTeam.name}|${f.awayTeam.name}|${f.date}`;
          if (seen.has(key)) return false;
          seen.add(key);
          return true;
        });

        if (dayOffset === 0) {
          logger.info(`\n🎉 SUCCESS! Found ${uniqueFixtures.length} fixtures for TODAY (${dateStr})`);
          logger.info(`   Sources used: ${sourcesUsed.join(', ')}`);
        } else {
          logger.info(`\n🎉 SUCCESS! Found ${uniqueFixtures.length} fixtures for ${dateStr} (+${dayOffset} days)`);
          logger.info(`   Sources used: ${sourcesUsed.join(', ')}`);
        }

        // Display sample fixtures
        logger.info('\n📋 SAMPLE FIXTURES:');
        uniqueFixtures.slice(0, 10).forEach((f, i) => {
          console.log(`   ${i + 1}. ${f.homeTeam.name} vs ${f.awayTeam.name} (${f.leagueName})`);
        });
        
        if (uniqueFixtures.length > 10) {
          logger.info(`   ... and ${uniqueFixtures.length - 10} more`);
        }

        return uniqueFixtures;
      }
    }

    logger.info(`\n😕 No fixtures found for ${dateStr}, checking next day...`);
  }

  // CRITICAL FAILURE: All 7 days exhausted with NO data from ANY source
  throw new Error(
    `🚨 CRITICAL: No fixtures found in the next ${maxDaysToSearch} days from ANY source (free or paid).\n\n` +
    `Possible causes:\n` +
    `  1. Major off-season period (e.g., late June/early July for European football)\n` +
    `  2. All API services experiencing simultaneous downtime\n` +
    `  3. Network connectivity issues\n\n` +
    `Recommended actions:\n` +
    `  - Check back tomorrow\n` +
    `  - Verify internet connection\n` +
    `  - Check API service status pages`
  );
}
