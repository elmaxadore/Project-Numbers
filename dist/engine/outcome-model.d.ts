import { MatchData } from '../data/outcome-data-collector.js';
export interface ModelPrediction {
    homeProb: number;
    drawProb: number;
    awayProb: number;
    confidence: number;
    predictedOutcome: 'H' | 'D' | 'A';
}
export declare class MultinomialLogisticRegression {
    private weights;
    private biases;
    private featureMeans;
    private featureStds;
    private isTrained;
    private readonly learningRate;
    private readonly epochs;
    private readonly lambda;
    train(features: number[][], labels: number[]): void;
    predict(features: number[]): [number, number, number];
    getWeights(): {
        weights: number[][];
        biases: number[];
        means: number[];
        stds: number[];
    };
    setWeights(weights: number[][], biases: number[], means: number[], stds: number[]): void;
}
export declare class OutcomeModel {
    private model;
    private featureExtractor;
    private calibrationSlopes;
    private calibrationIntercepts;
    train(matches: MatchData[]): {
        accuracy: number;
        confusionMatrix: number[][];
    };
    private calibrate;
    private evaluate;
    predictMatch(match: MatchData, historicalData: MatchData[]): ModelPrediction | null;
    private applyCalibration;
    private featuresToArray;
}
//# sourceMappingURL=outcome-model.d.ts.map