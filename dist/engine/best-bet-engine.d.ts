/**
 * Best Bet Engine
 * Finds the highest EV bet from today's fixtures using real-time data
 */
import { Fixture } from '../types/fixtures.js';
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
 * Returns the single highest EV bet that meets confidence thresholds
 */
export declare function findBestBet(fixtures: Fixture[]): Promise<PredictionResult>;
//# sourceMappingURL=best-bet-engine.d.ts.map