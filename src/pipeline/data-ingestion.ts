// ============================================================
// Data Ingestion Pipeline
// Fetches fixtures and builds data packages for prediction
// ============================================================

import { Fixture, League, TeamVenueStats, FixtureExpectedStats, FixtureDataPackage } from '../models/types.js';
import { logger } from '../utils/logger.js';
import { KNOWN_LEAGUES } from '../models/leagues.js';
import { CONFIG } from '../config.js';

/**
 * Check if a league passes the filter criteria
 */
export function passesLeagueFilter(
  avgGoals: number,
  bttsRate: number
): { passes: boolean; reason?: string } {
  if (avgGoals < CONFIG.minAvgGoals) {
    return { passes: false, reason: `avgGoals ${avgGoals.toFixed(2)} < ${CONFIG.minAvgGoals}` };
  }
  if (bttsRate < CONFIG.minBttsRate) {
    return { passes: false, reason: `bttsRate ${bttsRate.toFixed(2)} < ${CONFIG.minBttsRate}` };
  }
  return { passes: true };
}

/**
 * Fetch upcoming fixtures for given leagues
 * In production, this would call API-Sports or similar
 */
export async function fetchUpcomingFixtures(
  leagueIds: number[],
  season: number
): Promise<Fixture[]> {
  logger.info(`Fetching upcoming fixtures for ${leagueIds.length} leagues...`);
  
  // Demo mode: generate mock fixtures
  const mockFixtures: Fixture[] = [];
  
  for (const leagueId of leagueIds.slice(0, 3)) {
    const league = KNOWN_LEAGUES.find(l => l.id === leagueId);
    if (!league) continue;
    
    // Generate 5 mock fixtures per league
    for (let i = 0; i < 5; i++) {
      mockFixtures.push({
        id: leagueId * 1000 + i,
        leagueId: league.id,
        leagueName: league.name,
        homeTeam: { id: i * 2, name: `${league.name} Home ${i}` },
        awayTeam: { id: i * 2 + 1, name: `${league.name} Away ${i}` },
        date: new Date(Date.now() + (i + 1) * 86400000).toISOString(),
        status: 'scheduled',
      });
    }
  }
  
  logger.info(`Found ${mockFixtures.length} upcoming fixtures`);
  return mockFixtures;
}

/**
 * Build team venue stats (in production, fetch from historical data)
 */
function buildTeamVenueStats(
  teamId: number,
  teamName: string,
  venue: 'home' | 'away',
  isRunawayGiant: boolean = false
): TeamVenueStats {
  // Mock data with realistic variance
  const baseXG = venue === 'home' ? 1.5 : 1.2;
  const baseXGA = venue === 'home' ? 1.1 : 1.3;
  
  // Runaway giants have extreme stats
  const xGMultiplier = isRunawayGiant ? (venue === 'home' ? 1.5 : 1.2) : 1.0;
  const xGAMultiplier = isRunawayGiant ? (venue === 'home' ? 0.6 : 0.8) : 1.0;
  
  return {
    teamId,
    teamName,
    venue,
    matchesPlayed: 15,
    goalsScored: Math.round(baseXG * xGMultiplier * 15),
    goalsConceded: Math.round(baseXGA * xGAMultiplier * 15),
    avgGoalsScored: baseXG * xGMultiplier,
    avgGoalsConceded: baseXGA * xGAMultiplier,
    xG: baseXG * xGMultiplier * 15,
    xGA: baseXGA * xGAMultiplier * 15,
    cleanSheetRate: isRunawayGiant && venue === 'home' ? 0.55 : 0.35,
    failedToScoreRate: isRunawayGiant ? 0.05 : 0.20,
    bttsRate: isRunawayGiant ? 0.40 : 0.55,
    over25Rate: isRunawayGiant ? 0.75 : 0.55,
    over15Rate: isRunawayGiant ? 0.90 : 0.75,
  };
}

/**
 * Build expected stats for a fixture
 */
export function buildFixtureExpectedStats(
  fixture: Fixture,
  homeIsRunaway: boolean = false,
  awayIsRunaway: boolean = false
): FixtureExpectedStats {
  const homeStats = buildTeamVenueStats(
    fixture.homeTeam.id,
    fixture.homeTeam.name,
    'home',
    homeIsRunaway
  );
  
  const awayStats = buildTeamVenueStats(
    fixture.awayTeam.id,
    fixture.awayTeam.name,
    'away',
    awayIsRunaway
  );
  
  const combinedExpectedGoals = homeStats.xG / homeStats.matchesPlayed + awayStats.xG / awayStats.matchesPlayed;
  const combinedExpectedConceded = homeStats.xGA / homeStats.matchesPlayed + awayStats.xGA / awayStats.matchesPlayed;
  
  // Fixture Expected Goals baseline
  const fixtureXG = (combinedExpectedGoals + combinedExpectedConceded) / 2;
  
  return {
    fixtureId: fixture.id,
    homeTeamStats: homeStats,
    awayTeamStats: awayStats,
    combinedExpectedGoals,
    combinedExpectedConceded,
    fixtureXG,
  };
}

/**
 * Build complete data package for a fixture
 */
export async function buildFixtureDataPackage(
  fixture: Fixture,
  season: number,
  topRankedTeamIds: Set<number>
): Promise<FixtureDataPackage | null> {
  try {
    // Check for outlier teams
    const homeIsRunaway = topRankedTeamIds.has(fixture.homeTeam.id);
    const awayIsRunaway = topRankedTeamIds.has(fixture.awayTeam.id);
    
    // Build expected stats
    const expectedStats = buildFixtureExpectedStats(fixture, homeIsRunaway, awayIsRunaway);
    
    // Mock odds data
    const odds = [{
      fixtureId: fixture.id,
      bookmaker: 'DemoBookie',
      market: 'over_2.5_goals' as const,
      homeOdds: null,
      drawOdds: null,
      awayOdds: null,
      overOdds: 1.85,
      underOdds: 1.95,
      yesOdds: null,
      noOdds: null,
      timestamp: new Date().toISOString(),
    }, {
      fixtureId: fixture.id,
      bookmaker: 'DemoBookie',
      market: 'btts_yes' as const,
      homeOdds: null,
      drawOdds: null,
      awayOdds: null,
      overOdds: null,
      underOdds: null,
      yesOdds: 1.90,
      noOdds: 1.90,
      timestamp: new Date().toISOString(),
    }];
    
    // Check league filter
    const league = KNOWN_LEAGUES.find(l => l.id === fixture.leagueId);
    const leagueFilterPassed = league ? 
      passesLeagueFilter(league.avgGoalsPerMatch, league.bttsRate).passes : false;
    
    // Sample size check (always passes in demo)
    const sampleSizeFilterPassed = true;
    
    return {
      fixture,
      expectedStats,
      odds,
      leagueFilterPassed,
      sampleSizeFilterPassed,
      outlierFlags: {
        isRunawayGiant: homeIsRunaway || awayIsRunaway,
        homeCleanSheetRate: expectedStats.homeTeamStats.cleanSheetRate,
        awayFailedToScoreRate: expectedStats.awayTeamStats.failedToScoreRate,
      },
    };
  } catch (error) {
    logger.error(`Failed to build data package for fixture ${fixture.id}: ${error}`);
    return null;
  }
}
