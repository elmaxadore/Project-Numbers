/**
 * Advanced Model Training Script
 *
 * Trains prediction models with:
 * - Time-series cross-validation (no look-ahead bias)
 * - Multiple ensemble methods (LR, RF, GBM)
 * - Probability calibration
 * - Comprehensive evaluation metrics
 */
import { AdvancedTimeSeriesTrainer } from './engine/advanced-time-series-trainer.js';
async function main() {
    console.log('\n' + '='.repeat(70));
    console.log('ADVANCED SPORTS PREDICTION MODEL TRAINING');
    console.log('Features:');
    console.log('  ✓ Time-series aware validation (no look-ahead bias)');
    console.log('  ✓ Purged cross-validation with gap periods');
    console.log('  ✓ Rolling features using only historical data');
    console.log('  ✓ Ensemble methods: LR, Random Forest, Gradient Boosting');
    console.log('  ✓ Probability calibration (Isotonic Regression)');
    console.log('  ✓ L2 Regularization to prevent overfitting');
    console.log('  ✓ Comprehensive metrics: Accuracy, AUC, F1, Brier, Calibration');
    console.log('='.repeat(70) + '\n');
    const trainer = new AdvancedTimeSeriesTrainer('./data-cache');
    try {
        const results = await trainer.trainAllSports();
        if (results.length === 0) {
            console.log('\n⚠️  No models trained. Check data collection.');
            return;
        }
        // Save best models
        console.log('\n' + '='.repeat(70));
        console.log('MODEL SELECTION RECOMMENDATIONS');
        console.log('='.repeat(70));
        const bestBySportMarket = results.reduce((acc, evaluation) => {
            const key = `${evaluation.sport}-${evaluation.market}`;
            if (!acc[key] || evaluation.meanAccuracy > acc[key].meanAccuracy) {
                acc[key] = evaluation;
            }
            return acc;
        }, {});
        console.log('\nFor production deployment, use these models:');
        for (const [key, evaluation] of Object.entries(bestBySportMarket)) {
            const [sport, market] = key.split('-');
            console.log(`\n${sport.toUpperCase()} - ${market === 'overUnder' ? 'Over/Under' : 'Moneyline'}:`);
            console.log(`  Best Model: ${evaluation.modelName}`);
            console.log(`  Expected Accuracy: ${(evaluation.meanAccuracy * 100).toFixed(1)}% ± ${(evaluation.stdAccuracy * 100).toFixed(1)}%`);
            console.log(`  AUC: ${(evaluation.meanAUC * 100).toFixed(1)}%`);
            console.log(`  F1 Score: ${(evaluation.meanF1 * 100).toFixed(1)}%`);
            console.log(`  Calibration Error: ${(evaluation.meanCalibrationError * 100).toFixed(2)}%`);
            if (evaluation.stdAccuracy < 0.02) {
                console.log(`  ✅ Low variance - model is stable`);
            }
            else {
                console.log(`  ⚠️  Higher variance - consider collecting more data`);
            }
        }
        console.log('\n' + '='.repeat(70));
        console.log('IMPORTANT NOTES');
        console.log('='.repeat(70));
        console.log(`
1. TEMPORAL VALIDATION: All models were trained using purged time-series
   cross-validation to prevent look-ahead bias. Test sets are always
   chronologically after training sets with a 30-day gap.

2. OVERFITTING PREVENTION:
   - L2 regularization applied to logistic regression
   - Tree depth limits on ensemble methods
   - Minimum samples per leaf constraints
   
3. CALIBRATION: Probabilities have been calibrated using isotonic regression
   to ensure predicted probabilities match actual frequencies.

4. REAL DATA: Models trained on real scraped data from:
   - Football: Premier League, Bundesliga, Serie A, La Liga, Ligue 1, Eredivisie
   - Basketball: NBA
   - Baseball: MLB  
   - Hockey: NHL

5. NEXT STEPS FOR PRODUCTION:
   - Collect more seasons of historical data
   - Add injury reports and team news features
   - Include weather data for outdoor sports
   - Implement live odds comparison for value betting
   - Set up automated retraining pipeline

⚠️  DISCLAIMER: Sports betting involves risk. These models are for educational
   purposes. Past performance does not guarantee future results. Never bet
   more than you can afford to lose.
`);
    }
    catch (error) {
        console.error('❌ Training failed:', error.message);
        console.error(error);
    }
}
// Run if executed directly
if (require.main === module) {
    main().catch(console.error);
}
export { main };
//# sourceMappingURL=train-advanced-time-series.js.map