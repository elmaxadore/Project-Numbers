import { BettingMarket, FixtureDataPackage, MarketOdds, ModelPrediction, ValueAnalysis } from '../models/types.js';
/**
 * Find the best odds across all bookmakers for a specific market
 */
export declare function findBestOdds(odds: MarketOdds[], market: BettingMarket): {
    bestOdds: number;
    bestBookmaker: string;
} | null;
/**
 * Perform value analysis for a single fixture and market
 */
export declare function analyzeValue(prediction: ModelPrediction, odds: MarketOdds[], config?: import("../models/types.js").SystemConfig): ValueAnalysis | null;
/**
 * Analyze value across all markets for a fixture
 */
export declare function analyzeAllMarkets(predictions: ModelPrediction[], odds: MarketOdds[], config?: import("../models/types.js").SystemConfig): ValueAnalysis[];
/**
 * Filter fixtures that have passed all checks and have value
 */
export declare function filterWithValueEdge(packages: FixtureDataPackage[], predictions: ModelPrediction[], config?: import("../models/types.js").SystemConfig): Array<{
    pkg: FixtureDataPackage;
    prediction: ModelPrediction;
    value: ValueAnalysis;
}>;
//# sourceMappingURL=value-calculator.d.ts.map