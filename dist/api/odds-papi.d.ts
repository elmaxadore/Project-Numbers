import { MarketOdds, BettingMarket } from '../models/types.js';
export interface OddsPapiMatch {
    id: string;
    league: string;
    homeTeam: string;
    awayTeam: string;
    start: string;
    odds: {
        [bookmaker: string]: {
            [market: string]: {
                outcomes: Array<{
                    name: string;
                    price: number;
                }>;
            };
        };
    };
}
/**
 * Get historical odds for a specific match
 */
export declare function getHistoricalOdds(fixtureId: string): Promise<OddsPapiMatch | null>;
/**
 * Parse OddsPapi odds into our MarketOdds format
 */
export declare function parseOddsPapi(match: OddsPapiMatch, fixtureId: number, market: BettingMarket): MarketOdds[];
/**
 * Get the number of API requests used this month
 */
export declare function getMonthlyRequestCount(): number;
//# sourceMappingURL=odds-papi.d.ts.map