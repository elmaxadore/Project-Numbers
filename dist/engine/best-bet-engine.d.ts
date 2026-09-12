/**
 * Best Bet Engine
 * Finds the highest EV bet from today's fixtures using real-time data
 */
import { TodaysFixture } from '../data/todays-fixtures-fetcher.js';
import { ModelWeights } from '../engine/logistic-regression.js';
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
export interface QualifiedBet {
    fixture: TodaysFixture;
    market: 'over_2.5_goals' | 'btts_yes';
    modelProbability: number;
    odds: number;
    impliedProbability: number;
    expectedValue: number;
    confidence: number;
}
/**
 * Find qualified bets from today's fixtures
 */
export declare function findQualifiedBets(fixtures: TodaysFixture[], o25Model?: ModelWeights, bttsModel?: ModelWeights): Promise<QualifiedBet[]>;
/**
 * Find the single best bet (highest EV) from today's fixtures
 */
export declare function findBestBet(fixtures: TodaysFixture[], o25Model?: ModelWeights, bttsModel?: ModelWeights): Promise<PredictionResult>;
//# sourceMappingURL=best-bet-engine.d.ts.map