import { ModelWeights } from './logistic-regression.js';
/**
 * Training sample with features and binary label
 */
export interface TrainingSample {
    features: number[];
    label: number;
}
/**
 * Generate enhanced synthetic data with more realistic correlations
 */
export declare function generateEnhancedTrainingData(numSamples?: number, seed?: number): Array<{
    features: number[];
    o25Label: number;
    bttsLabel: number;
}>;
/**
 * Add polynomial and interaction features
 */
export declare function addPolynomialFeatures(features: number[]): number[];
/**
 * Train model with L2 regularization
 */
export declare function trainWithRegularization(trainingData: TrainingSample[], learningRate?: number, epochs?: number, lambda?: number, // L2 regularization strength
label?: string): ModelWeights;
/**
 * Platt scaling for probability calibration
 */
export declare function calibrateProbabilities(model: ModelWeights, calibrationData: TrainingSample[]): {
    a: number;
    b: number;
};
/**
 * Apply calibration to model predictions
 */
export declare function applyCalibration(prob: number, a: number, b: number): number;
/**
 * Create calibrated model wrapper
 */
export interface CalibratedModel extends ModelWeights {
    calibration: {
        a: number;
        b: number;
    };
}
/**
 * Train and calibrate model
 */
export declare function trainAndCalibrate(trainData: TrainingSample[], valData: TrainingSample[], label: string, usePolyFeatures?: boolean): {
    model: CalibratedModel;
    accuracy: number;
};
//# sourceMappingURL=advanced-trainer.d.ts.map