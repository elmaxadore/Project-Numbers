import { LogisticRegression } from './logistic-regression.js';
interface Metrics {
    accuracy: number;
    precision: number;
    recall: number;
    f1: number;
    auc: number;
    brierScore: number;
    logLoss: number;
    calibrationError: number;
}
export declare function stratifiedKFold(X: number[][], y: number[], k?: number): number[][];
export declare function crossValidate(X: number[][], y: number[], k?: number, learningRate?: number, epochs?: number, lambda?: number): {
    accuracies: number[];
    models: LogisticRegression[];
};
export declare function calculateMetrics(yTrue: number[], yPred: number[], yProb: number[]): Metrics;
export declare function createEnsemble(models: LogisticRegression[]): LogisticRegression;
export declare class IsotonicRegression {
    private thresholds;
    private calibrated;
    fit(yTrue: number[], yProb: number[]): void;
    predict(probs: number[]): number[];
}
export {};
//# sourceMappingURL=advanced-validation.d.ts.map