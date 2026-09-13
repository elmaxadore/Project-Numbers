/**
 * Today's Fixtures Fetcher
 * Fetches real upcoming matches using API-Sports (RapidAPI) or TheSportsDB (free fallback)
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
 * Tries API-Sports first (if key available), then falls back to TheSportsDB (free)
 * Throws error only if both sources fail
 */
export declare function fetchTodaysFixtures(): Promise<TodaysFixture[]>;
//# sourceMappingURL=todays-fixtures-fetcher.d.ts.map