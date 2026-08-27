import { BacktestResult, FixtureDataPackage, SystemConfig } from '../../models/types.js';
import { ModelWeights } from '../logistic-regression.js';
/**
 * Backtest the system against historical fixtures
 */
export declare function runBacktest(historicalFixtures: Array<{
    fixture: FixtureDataPackage;
    homeGoals: number;
    awayGoals: number;
}>, o25Model?: ModelWeights, bttsModel?: ModelWeights, config?: SystemConfig): Promise<BacktestResult>;
/**
 * Print backtest results in a readable format
 */
export declare function printBacktestResults(result: BacktestResult): void;
//# sourceMappingURL=index.d.ts.map