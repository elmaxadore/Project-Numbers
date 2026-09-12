interface BacktestResults {
    totalBets: number;
    wins: number;
    losses: number;
    pushes: number;
    winRate: number;
    totalStake: number;
    totalProfit: number;
    roi: number;
    byMarket: Record<string, {
        bets: number;
        wins: number;
        roi: number;
    }>;
    byLeague: Record<string, {
        bets: number;
        wins: number;
        roi: number;
    }>;
    bySeason: Record<string, {
        bets: number;
        wins: number;
        roi: number;
    }>;
}
/**
 * Run backtest with temporal validation
 * Train on past seasons, test on future seasons
 */
export declare function runRealBacktest(): BacktestResults;
/**
 * Print backtest results
 */
export declare function printRealBacktestResults(results: BacktestResults): void;
declare function main(): Promise<void>;
export { main };
//# sourceMappingURL=real-backtest.d.ts.map