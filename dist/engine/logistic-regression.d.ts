/**
 * Feature vector for a single match
 */
export interface MatchFeatures {
    homeTeamXGHome: number;
    homeTeamXGAHome: number;
    awayTeamXGAway: number;
    awayTeamXGAAway: number;
    homeCleanSheetRate: number;
    awayFailedToScoreRate: number;
    combinedXG: number;
    xGDifference: number;
    leagueEncoded: number;
    homeAvgGoalsScored: number;
    awayAvgGoalsScored: number;
    homeAvgGoalsConceded: number;
    awayAvgGoalsConceded: number;
}
/**
 * Trained model weights and normalization parameters
 */
export interface ModelWeights {
    /** Weight for each feature */
    weights: number[];
    /** Bias term */
    bias: number;
    /** Feature normalization parameters: [mean, stddev] for each feature */
    featureNorms: Array<{
        mean: number;
        std: number;
    }>;
    /** Label: what this model predicts */
    label: string;
    /** Training metadata */
    metadata: {
        trainedOn: number;
        accuracy: number;
        calibrationError: number;
        trainedAt: string;
    };
}
/**
 * Default model weights based on research findings
 * These are informed by the literature on xG-based football prediction
 */
export declare const DEFAULT_O25_WEIGHTS: ModelWeights;
export declare const DEFAULT_BTTS_WEIGHTS: ModelWeights;
/**
 * Normalize features using z-score normalization
 */
export declare function normalizeFeatures(features: number[], norms: Array<{
    mean: number;
    std: number;
}>): number[];
/**
 * Extract a feature vector from match data
 */
export declare function extractFeatures(homeXG: number, homeXGA: number, awayXG: number, awayXGA: number, homeCSRate: number, awayFTSRate: number, leagueId: number, homeAvgGoals: number, homeAvgConceded: number, awayAvgGoals: number, awayAvgConceded: number): number[];
/**
 * Predict probability using a logistic regression model
 */
export declare function predict(features: number[], model: ModelWeights): number;
/**
 * Train a logistic regression model using gradient descent
 * This implements the actual learning process from data
 */
export declare function trainModel(trainingData: Array<{
    features: number[];
    label: number;
}>, learningRate?: number, epochs?: number, label?: string): ModelWeights;
/**
 * Serialize model weights to JSON for persistence
 */
export declare function serializeModel(model: ModelWeights): string;
/**
 * Deserialize model weights from JSON
 */
export declare function deserializeModel(json: string): ModelWeights;
//# sourceMappingURL=logistic-regression.d.ts.map