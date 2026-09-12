interface RandomForestConfig {
    nTrees: number;
    maxDepth: number;
    minSamplesSplit: number;
    minSamplesLeaf: number;
    maxFeatures: number;
    seed?: number;
}
export declare class RandomForestClassifier {
    private trees;
    private config;
    private nFeatures;
    constructor(config?: Partial<RandomForestConfig>);
    fit(X: number[][], y: number[]): void;
    private bootstrapSample;
    private buildTree;
    private calculateGain;
    private entropy;
    predict(X: number[][]): number[];
    predictProb(X: number[][]): number[];
    private predictTree;
}
interface GradientBoostingConfig {
    nTrees: number;
    learningRate: number;
    maxDepth: number;
    minSamplesSplit: number;
}
export declare class GradientBoostingClassifier {
    private trees;
    private initialPrediction;
    private config;
    constructor(config?: Partial<GradientBoostingConfig>);
    fit(X: number[][], y: number[]): void;
    private fitRegressionTree;
    private mse;
    private predictTreeValue;
    predict(X: number[][]): number[];
    predictProb(X: number[][]): number[];
}
export {};
//# sourceMappingURL=ensemble-models.d.ts.map