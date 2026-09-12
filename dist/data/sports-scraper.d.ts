/**
 * Sports Data Scraper and Aggregator
 *
 * WARNING: Web scraping may violate terms of service of target websites.
 * For production use, always prefer official APIs (API-Football, TheRundown, etc.)
 * This module is for educational purposes and demonstrates the architecture.
 */
export interface MatchData {
    sport: string;
    league: string;
    homeTeam: string;
    awayTeam: string;
    date: Date;
    homeScore?: number;
    awayScore?: number;
    status: 'scheduled' | 'live' | 'finished';
    odds?: {
        homeWin?: number;
        draw?: number;
        awayWin?: number;
        over25?: number;
        under25?: number;
        bttsYes?: number;
        bttsNo?: number;
        moneylineHome?: number;
        moneylineAway?: number;
        spread?: number;
        totalPoints?: number;
    };
    stats?: {
        homeXG?: number;
        awayXG?: number;
        homeShots?: number;
        awayShots?: number;
        homePossession?: number;
        awayPossession?: number;
        homeRebounds?: number;
        awayRebounds?: number;
        homeAssists?: number;
        awayAssists?: number;
        [key: string]: number | undefined;
    };
}
export interface TeamStats {
    sport: string;
    league: string;
    team: string;
    matchesPlayed: number;
    wins: number;
    draws: number;
    losses: number;
    goalsFor: number;
    goalsAgainst: number;
    form: ('W' | 'D' | 'L')[];
    xGFor?: number;
    xGAgainst?: number;
}
export declare class SportsScraper {
    private baseUrl;
    private delayMs;
    constructor(delayMs?: number);
    /**
     * Delay to avoid rate limiting
     */
    private sleep;
    /**
     * Scrape football data from public sources
     * Note: This is a template - actual implementation requires specific URL targets
     */
    scrapeFootballData(): Promise<MatchData[]>;
    /**
     * Scrape basketball data (NBA, EuroLeague, etc.)
     */
    scrapeBasketballData(): Promise<MatchData[]>;
    /**
     * Scrape tennis data (ATP, WTA)
     */
    scrapeTennisData(): Promise<MatchData[]>;
    /**
     * Scrape American Football (NFL)
     */
    scrapeNFLData(): Promise<MatchData[]>;
    /**
     * Scrape Baseball (MLB)
     */
    scrapeMLBData(): Promise<MatchData[]>;
    /**
     * Scrape Ice Hockey (NHL)
     */
    scrapeNHLData(): Promise<MatchData[]>;
    /**
     * Aggregate all sports data
     */
    scrapeAllSports(): Promise<MatchData[]>;
}
/**
 * Alternative: Use free/public APIs where available
 * This is the recommended approach for production
 */
export declare class SportsAPIFetcher {
    private apiKeys;
    constructor(apiKeys?: Map<string, string>);
    /**
     * Fetch football data from API-Football (requires subscription)
     */
    fetchFootballFromAPI(): Promise<MatchData[]>;
    /**
     * Fetch basketball data from TheRundown API (free tier available)
     */
    fetchBasketballFromAPI(): Promise<MatchData[]>;
    /**
     * Generate mock data for testing when APIs are unavailable
     */
    private generateMockFootballData;
    private generateMockBasketballData;
    /**
     * Get all available data (API + fallback to mock)
     */
    getAllData(): Promise<MatchData[]>;
}
export declare const scraper: SportsScraper;
export declare const apiFetcher: SportsAPIFetcher;
//# sourceMappingURL=sports-scraper.d.ts.map