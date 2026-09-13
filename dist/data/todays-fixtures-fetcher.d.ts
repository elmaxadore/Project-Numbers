/**
 * Today's Fixtures Fetcher
 * Fetches real upcoming matches for today using API-Sports (RapidAPI)
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
 * Fetch all fixtures scheduled for today
 * Throws error if API key is missing or API call fails
 * Returns empty array only if API succeeds but no fixtures exist for today
 */
export declare function fetchTodaysFixtures(): Promise<TodaysFixture[]>;
/**
 * Fetch fixtures for a specific league
 */
export declare function fetchFixturesForLeague(leagueId: number, date?: string): Promise<TodaysFixture[]>;
//# sourceMappingURL=todays-fixtures-fetcher.d.ts.map