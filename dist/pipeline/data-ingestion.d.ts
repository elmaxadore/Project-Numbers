import { Fixture, FixtureExpectedStats, FixtureDataPackage } from '../models/types.js';
/**
 * Check if a league passes the filter criteria
 */
export declare function passesLeagueFilter(avgGoals: number, bttsRate: number): {
    passes: boolean;
    reason?: string;
};
/**
 * Fetch upcoming fixtures for given leagues
 * PRODUCTION READY: Uses real API calls via todays-fixtures-fetcher
 * This legacy function is kept for backward compatibility but should not be used in production
 */
export declare function fetchUpcomingFixtures(leagueIds: number[], season: number): Promise<Fixture[]>;
/**
 * Build expected stats for a fixture
 */
export declare function buildFixtureExpectedStats(fixture: Fixture, homeIsRunaway?: boolean, awayIsRunaway?: boolean): FixtureExpectedStats;
/**
 * Build complete data package for a fixture
 */
export declare function buildFixtureDataPackage(fixture: Fixture, season: number, topRankedTeamIds: Set<number>): Promise<FixtureDataPackage | null>;
//# sourceMappingURL=data-ingestion.d.ts.map