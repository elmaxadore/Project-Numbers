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
 * In production, this would call API-Sports or similar
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