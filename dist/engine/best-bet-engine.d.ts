/**
 * Best Bet Engine
 * Finds the highest EV bet from today's fixtures using real-time data
 */
import { TodaysFixture } from '../data/todays-fixtures-fetcher.js';
export interface PredictionResult {
    match: string;
    league: string;
    market: string;
    prediction: string;
    confidence: number;
    odds: number;
    expectedValue: number;
    reasoning: string;
}
/**
 * Find the best bet from today's fixtures
 * Returns comprehensive analysis of ALL matches ranked by probability
 */
export declare function findBestBet(fixtures: TodaysFixture[]): Promise<PredictionResult | null>;
//# sourceMappingURL=best-bet-engine.d.ts.map