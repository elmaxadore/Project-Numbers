import { MarketOdds } from '../models/types.js';
/**
 * Fetch 1xbet odds from The Odds API
 * 1xbet is listed as a bookmaker in their aggregation
 */
export declare function fetch1xbetFromOddsApi(sport?: string, region?: string, markets?: string): Promise<MarketOdds[]>;
export interface OddsApiEvent {
    id: string;
    sport_key: string;
    sport_title: string;
    commence_time: string;
    home_team: string;
    away_team: string;
    bookmakers: Array<{
        key: string;
        title: string;
        markets: Array<{
            key: string;
            outcomes: Array<{
                name: string;
                price: number;
                point?: number;
            }>;
        }>;
    }>;
}
/**
 * Fetch 1xbet odds for multiple sports/leagues
 */
export declare function fetch1xbetAllLeagues(): Promise<MarketOdds[]>;
/**
 * Scrape odds directly from 1xbet public website
 * This uses the public-facing odds pages
 */
export declare function fetch1xbetDirect(leagueId?: number): Promise<MarketOdds[]>;
/**
 * Main entry: try The Odds API first, fall back to direct scraping
 */
export declare function collect1xbetOdds(leagueId?: number): Promise<MarketOdds[]>;
/**
 * Get the number of API requests used today
 */
export declare function getOddsApiRequestCount(): number;
//# sourceMappingURL=one-xbet.d.ts.map