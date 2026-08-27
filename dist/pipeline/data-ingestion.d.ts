import { Fixture, FixtureExpectedStats, MarketOdds, TeamVenueStats, OutlierFlags, FixtureDataPackage, BettingMarket, SystemConfig } from '../models/types.js';
/**
 * Check if a league passes the macro-level scoring filter
 * From the paper: min 2.80 avg goals/match for general, 53% BTTS for BTTS market
 */
export declare function passesLeagueFilter(leagueAvgGoals: number, leagueBttsRate: number, config?: SystemConfig): {
    passes: boolean;
    reason: string;
};
/**
 * Fetch upcoming fixtures for a set of leagues
 */
export declare function fetchUpcomingFixtures(leagueIds: number[], season: number): Promise<Fixture[]>;
/**
 * Fetch historical fixtures for backtesting
 */
export declare function fetchHistoricalFixtures(leagueId: number, season: number): Promise<Fixture[]>;
/**
 * Collect venue-specific team stats from ballers API (preferred) or API-Sports (fallback)
 */
export declare function collectTeamStats(teamId: number, leagueId: number, season: number, venue: 'home' | 'away'): Promise<TeamVenueStats | null>;
/**
 * Build the fixture-level expected stats by combining home + away splits
 */
export declare function buildFixtureExpectedStats(fixture: Fixture, season: number): Promise<FixtureExpectedStats | null>;
/**
 * Collect odds from all sources including 1xbet
 * Priority: 1xbet (primary) > API-Sports (fallback)
 */
export declare function collectOdds(fixture: Fixture, market: BettingMarket, season: number): Promise<MarketOdds[]>;
/**
 * Check for "Runaway Giant" outlier — dominant team that may suppress BTTS
 */
export declare function detectOutliers(homeStats: TeamVenueStats, awayStats: TeamVenueStats, topRankedTeamIds: Set<number>, config?: SystemConfig): OutlierFlags;
/**
 * Build a complete data package for a fixture
 */
export declare function buildFixtureDataPackage(fixture: Fixture, season: number, topRankedTeamIds: Set<number>, config?: SystemConfig): Promise<FixtureDataPackage | null>;
//# sourceMappingURL=data-ingestion.d.ts.map