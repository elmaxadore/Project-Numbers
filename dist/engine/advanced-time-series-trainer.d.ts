/**
 * Advanced Time-Series Aware Model Training
 *
 * This module implements proper temporal splitting to prevent look-ahead bias,
 * advanced regularization techniques, and ensemble methods for robust predictions.
 *
 * Key Features:
 * - Purged time-series cross-validation (no data leakage)
 * - Early stopping to prevent overfitting
 * - Feature importance analysis
 * - Probability calibration with isotonic regression
 * - Ensemble of Logistic Regression, Random Forest, and Gradient Boosting
 */
interface CrossValidationResult {
    fold: number;
    trainSize: number;
    testSize: number;
    accuracy: number;
    precision: number;
    recall: number;
    f1Score: number;
    auc: number;
    brierScore: number;
    calibrationError: number;
}
interface ModelEvaluation {
    modelName: string;
    sport: string;
    market: string;
    cvResults: CrossValidationResult[];
    meanAccuracy: number;
    stdAccuracy: number;
    meanAUC: number;
    meanF1: number;
    meanCalibrationError: number;
    featureImportance?: number[];
}
export declare class AdvancedTimeSeriesTrainer {
    private collector;
    private featureExtractor;
    constructor(cacheDir?: string);
    /**
     * Sort matches chronologically and split by time to prevent look-ahead bias
     */
    private temporalSplit;
    /**
     * Purged time-series cross-validation
     * Ensures no temporal overlap between train and test sets
     */
    private timeSeriesCV;
    /**
     * Extract features ensuring no future information leaks in
     */
    private extractFeaturesWithTemporalAwareness;
    private updateTeamStats;
    /**
     * Calculate evaluation metrics
     */
    private calculateMetrics;
    /**
     * Train and evaluate a single model with proper temporal validation
     */
    private trainAndEvaluateModel;
    /**
     * Main training pipeline with time-series cross-validation
     */
    trainAllSports(): Promise<ModelEvaluation[]>;
}
export {};
//# sourceMappingURL=advanced-time-series-trainer.d.ts.map