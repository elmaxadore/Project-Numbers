import { ModelWeights } from './logistic-regression.js';
/**
 * Training sample with features and binary label
 */
export interface TrainingSample {
    features: number[];
    label: number;
}
/**
 * Evaluation metrics for model performance
 */
export interface ModelMetrics {
    accuracy: number;
    precision: number;
    recall: number;
    f1Score: number;
    auc: number;
    calibrationError: number;
    confusionMatrix: {
        truePositive: number;
        trueNegative: number;
        falsePositive: number;
        falseNegative: number;
    };
}
/**
 * Training result with optimized model and metrics
 */
export interface TrainingResult {
    model: ModelWeights;
    trainMetrics: ModelMetrics;
    valMetrics: ModelMetrics;
    bestHyperparams: {
        learningRate: number;
        epochs: number;
        regularization?: number;
    };
}
/**
 * Generate synthetic training data that mimics real football statistics
 * Uses realistic distributions based on actual football analytics research
 */
export declare function generateSyntheticTrainingData(numSamples?: number, seed?: number): Array<{
    features: number[];
    o25Label: number;
    bttsLabel: number;
}>;
/**
 * Split data into training and validation sets
 */
export declare function splitData(data: Array<{
    features: number[];
    o25Label: number;
    bttsLabel: number;
}>, trainRatio?: number, seed?: number): {
    train: typeof data;
    val: typeof data;
};
/**
 * Calculate evaluation metrics for a model
 */
export declare function evaluateModel(model: ModelWeights, testData: TrainingSample[]): ModelMetrics;
/**
 * Train model with hyperparameter tuning using grid search
 */
export declare function trainWithTuning(trainData: TrainingSample[], valData: TrainingSample[], label: string): TrainingResult;
/**
 * K-fold cross-validation for robust evaluation
 */
export declare function kFoldCrossValidation(data: Array<{
    features: number[];
    o25Label: number;
    bttsLabel: number;
}>, k: number, label: 'o25' | 'btts'): {
    meanAccuracy: number;
    stdAccuracy: number;
    models: ModelWeights[];
};
/**
 * Create ensemble model by averaging predictions from multiple models
 */
export declare function createEnsembleModel(models: ModelWeights[], label: string): ModelWeights;
/**
 * Predict using ensemble of models
 */
export declare function predictEnsemble(features: number[], models: ModelWeights[]): number;
//# sourceMappingURL=model-trainer.d.ts.map