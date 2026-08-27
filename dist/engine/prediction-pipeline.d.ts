import { FixtureDataPackage, ModelPrediction } from '../models/types.js';
import { SystemConfig } from '../models/types.js';
import { ModelWeights } from './logistic-regression.js';
/**
 * Generate predictions for a fixture using the trained models
 */
export declare function predictFixture(fixtureData: FixtureDataPackage, o25Model?: ModelWeights, bttsModel?: ModelWeights): ModelPrediction[];
/**
 * Run the complete pipeline for a set of fixture data packages
 */
export declare function runPipeline(fixturePackages: FixtureDataPackage[], o25Model?: ModelWeights, bttsModel?: ModelWeights, config?: SystemConfig): Promise<void>;
//# sourceMappingURL=prediction-pipeline.d.ts.map