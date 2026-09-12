/**
 * Real-World Sports Data Collector
 *
 * This module collects REAL historical sports data from free public sources
 * without requiring API keys. It scrapes publicly available statistics websites.
 *
 * IMPORTANT: Always respect robots.txt and terms of service. Add delays to avoid overloading servers.
 */
export interface HistoricalMatch {
    sport: string;
    league: string;
    season: string;
    date: Date;
    homeTeam: string;
    awayTeam: string;
    homeScore: number;
    awayScore: number;
    homeShots?: number;
    awayShots?: number;
    homeXG?: number;
    awayXG?: number;
    homePossession?: number;
    awayPossession?: number;
    oddsHome?: number;
    oddsDraw?: number;
    oddsAway?: number;
    status: 'finished';
}
export interface TeamForm {
    team: string;
    league: string;
    sport: string;
    matchesPlayed: number;
    wins: number;
    draws: number;
    losses: number;
    goalsFor: number;
    goalsAgainst: number;
    form: ('W' | 'D' | 'L')[];
    avgGoalsFor: number;
    avgGoalsAgainst: number;
    cleanSheets: number;
    failedToScore: number;
}
export declare class RealDataCollector {
    private cacheDir;
    private useCache;
    constructor(cacheDir?: string, useCache?: boolean);
    /**
     * Sleep utility to avoid rate limiting
     */
    private sleep;
    /**
     * Cache management
     */
    private getCachePath;
    private getCached;
    private setCache;
    /**
     * Scrape Football-Data.co.uk - FREE historical football data
     * This site provides CSV downloads of historical match data
     */
    scrapeFootballDataUK(): Promise<HistoricalMatch[]>;
    /**
     * Scrape Basketball Reference for NBA data
     */
    scrapeBasketballData(): Promise<HistoricalMatch[]>;
    /**
     * Scrape Baseball Reference for MLB data
     */
    scrapeBaseballData(): Promise<HistoricalMatch[]>;
    /**
     * Scrape Hockey Reference for NHL data
     */
    scrapeHockeyData(): Promise<HistoricalMatch[]>;
    /**
     * Helper to parse various date formats
     */
    private parseDate;
    /**
     * Calculate team form from historical matches
     */
    calculateTeamForm(matches: HistoricalMatch[], team: string): TeamForm;
    /**
     * Collect all sports data
     */
    collectAllSports(): Promise<HistoricalMatch[]>;
}
export declare const realDataCollector: RealDataCollector;
//# sourceMappingURL=real-data-collector.d.ts.map