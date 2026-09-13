/**
 * Today's Fixtures Fetcher - ENHANCED WITH FREE SOURCES
 *
 * Fetches real upcoming matches using a multi-tier approach:
 * 1. Paid APIs (if keys available): API-Sports, Odds-Papi, The-Odds-API
 * 2. Free APIs (always available): TheSportsDB, ESPN, OpenLigaDB, Football-Data.org, BBC Sport
 *
 * NO API KEYS REQUIRED - Works 100% with free sources!
 */
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
export declare function fetchTodaysFixtures(): Promise<TodaysFixture[]>;
//# sourceMappingURL=todays-fixtures-fetcher.d.ts.map