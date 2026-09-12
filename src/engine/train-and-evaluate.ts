#!/usr/bin/env node
// ============================================================
// Model Training and Evaluation Script
// Trains improved models using synthetic data and cross-validation
// Then tests them with backtesting
// ============================================================

import {
  generateSyntheticTrainingData,
  splitData,
  kFoldCrossValidation,
  createEnsembleModel,
  evaluateModel,
  TrainingSample,
} from './model-trainer.js';
import {
  DEFAULT_O25_WEIGHTS,
  DEFAULT_BTTS_WEIGHTS,
  ModelWeights,
  saveModelToFile,
} from './logistic-regression.js';
import { runBacktest, printBacktestResults } from './backtesting/index.js';
import { logger } from '../utils/logger.js';

/**
 * Generate mock historical fixtures for testing
 */
function generateMockHistoricalFixtures(count: number = 100) {
  const fixtures: Array<{
    fixture: any;
    homeGoals: number;
    awayGoals: number;
  }> = [];

  const leagues = [
    { id: 88, name: 'Eredivisie' },
    { id: 78, name: 'Bundesliga' },
    { id: 39, name: 'Premier League' },
  ];

  for (let i = 0; i < count; i++) {
    const league = leagues[i % leagues.length];
    const fixture = {
      fixture: {
        id: i,
        leagueId: league.id,
        leagueName: league.name,
        homeTeam: { id: i * 2, name: `${league.name} Home ${i}` },
        awayTeam: { id: i * 2 + 1, name: `${league.name} Away ${i}` },
        date: new Date(Date.now() - (count - i) * 86400000).toISOString(),
        status: 'finished' as const,
      },
      expectedStats: {
        fixtureId: i,
        homeTeamStats: {
          teamId: i * 2,
          teamName: `${league.name} Home ${i}`,
          venue: 'home' as const,
          matchesPlayed: 15,
          goalsScored: 22,
          goalsConceded: 16,
          avgGoalsScored: 1.5,
          avgGoalsConceded: 1.1,
          xG: 1.0 + Math.random() * 2.0,
          xGA: 0.8 + Math.random() * 1.5,
          cleanSheetRate: 0.25 + Math.random() * 0.3,
          failedToScoreRate: 0.15 + Math.random() * 0.25,
          bttsRate: 0.45 + Math.random() * 0.2,
          over25Rate: 0.50 + Math.random() * 0.2,
          over15Rate: 0.70 + Math.random() * 0.15,
        },
        awayTeamStats: {
          teamId: i * 2 + 1,
          teamName: `${league.name} Away ${i}`,
          venue: 'away' as const,
          matchesPlayed: 15,
          goalsScored: 18,
          goalsConceded: 19,
          avgGoalsScored: 1.2,
          avgGoalsConceded: 1.3,
          xG: 0.9 + Math.random() * 1.7,
          xGA: 1.0 + Math.random() * 1.8,
          cleanSheetRate: 0.20 + Math.random() * 0.25,
          failedToScoreRate: 0.20 + Math.random() * 0.25,
          bttsRate: 0.45 + Math.random() * 0.2,
          over25Rate: 0.45 + Math.random() * 0.2,
          over15Rate: 0.65 + Math.random() * 0.15,
        },
        combinedExpectedGoals: 2.5,
        combinedExpectedConceded: 2.3,
        fixtureXG: 2.4,
      },
      odds: [
        {
          fixtureId: i,
          bookmaker: 'DemoBookie',
          market: 'over_2.5_goals' as const,
          homeOdds: null,
          drawOdds: null,
          awayOdds: null,
          overOdds: 1.75 + Math.random() * 0.4,
          underOdds: 1.85 + Math.random() * 0.3,
          yesOdds: null,
          noOdds: null,
          timestamp: new Date().toISOString(),
        },
        {
          fixtureId: i,
          bookmaker: 'DemoBookie',
          market: 'btts_yes' as const,
          homeOdds: null,
          drawOdds: null,
          awayOdds: null,
          overOdds: null,
          underOdds: null,
          yesOdds: 1.70 + Math.random() * 0.5,
          noOdds: 1.80 + Math.random() * 0.4,
          timestamp: new Date().toISOString(),
        },
      ],
      leagueFilterPassed: true,
      sampleSizeFilterPassed: true,
      outlierFlags: {
        isRunawayGiant: false,
        homeCleanSheetRate: 0.3,
        awayFailedToScoreRate: 0.25,
      },
    };

    // Generate realistic goal outcomes based on xG
    const homeXG = fixture.expectedStats.homeTeamStats.xG;
    const awayXG = fixture.expectedStats.awayTeamStats.xG;
    
    // Use Poisson-like distribution for goals
    const homeGoals = Math.floor(-Math.log(1 - Math.random()) * homeXG);
    const awayGoals = Math.floor(-Math.log(1 - Math.random()) * awayXG);

    fixtures.push({ fixture, homeGoals: Math.min(homeGoals, 5), awayGoals: Math.min(awayGoals, 5) });
  }

  return fixtures;
}

async function main(): Promise<void> {
  console.log(`
╔══════════════════════════════════════════════════════╗
║     🧠 Freebuff Model Training & Evaluation         ║
║     Advanced Machine Learning Pipeline              ║
╚══════════════════════════════════════════════════════╝
  `);

  // Step 1: Generate synthetic training data
  logger.info('Generating synthetic training data...');
  const syntheticData = generateSyntheticTrainingData(3000, 42);
  logger.success(`Generated ${syntheticData.length} synthetic samples`);

  // Step 2: Split into train/validation sets
  const { train, val } = splitData(syntheticData, 0.8, 42);
  logger.info(`Train set: ${train.length} samples, Validation set: ${val.length} samples`);

  // Step 3: Run k-fold cross-validation for O2.5 model
  console.log('\n─── Over 2.5 Goals Model ───');
  const o25CV = kFoldCrossValidation(syntheticData, 5, 'o25');
  const o25Ensemble = createEnsembleModel(o25CV.models, 'Over 2.5 Goals (Ensemble)');

  // Step 4: Run k-fold cross-validation for BTTS model
  console.log('\n─── BTTS Model ───');
  const bttsCV = kFoldCrossValidation(syntheticData, 5, 'btts');
  const bttsEnsemble = createEnsembleModel(bttsCV.models, 'BTTS Yes (Ensemble)');

  // Step 5: Evaluate ensemble models on validation set
  console.log('\n─── Ensemble Model Evaluation ───');
  
  const o25ValData: TrainingSample[] = val.map(d => ({
    features: d.features,
    label: d.o25Label,
  }));
  
  const bttsValData: TrainingSample[] = val.map(d => ({
    features: d.features,
    label: d.bttsLabel,
  }));

  const o25Metrics = evaluateModel(o25Ensemble, o25ValData);
  const bttsMetrics = evaluateModel(bttsEnsemble, bttsValData);

  logger.success('O2.5 Ensemble Metrics:');
  logger.success(`  Accuracy: ${(o25Metrics.accuracy * 100).toFixed(1)}%`);
  logger.success(`  Precision: ${o25Metrics.precision.toFixed(3)}`);
  logger.success(`  Recall: ${o25Metrics.recall.toFixed(3)}`);
  logger.success(`  F1 Score: ${o25Metrics.f1Score.toFixed(3)}`);
  logger.success(`  AUC: ${o25Metrics.auc.toFixed(3)}`);
  logger.success(`  Calibration Error: ${o25Metrics.calibrationError.toFixed(3)}`);
  logger.success(`  Confusion Matrix: TP=${o25Metrics.confusionMatrix.truePositive}, TN=${o25Metrics.confusionMatrix.trueNegative}, FP=${o25Metrics.confusionMatrix.falsePositive}, FN=${o25Metrics.confusionMatrix.falseNegative}`);

  logger.success('BTTS Ensemble Metrics:');
  logger.success(`  Accuracy: ${(bttsMetrics.accuracy * 100).toFixed(1)}%`);
  logger.success(`  Precision: ${bttsMetrics.precision.toFixed(3)}`);
  logger.success(`  Recall: ${bttsMetrics.recall.toFixed(3)}`);
  logger.success(`  F1 Score: ${bttsMetrics.f1Score.toFixed(3)}`);
  logger.success(`  AUC: ${bttsMetrics.auc.toFixed(3)}`);
  logger.success(`  Calibration Error: ${bttsMetrics.calibrationError.toFixed(3)}`);
  logger.success(`  Confusion Matrix: TP=${bttsMetrics.confusionMatrix.truePositive}, TN=${bttsMetrics.confusionMatrix.trueNegative}, FP=${bttsMetrics.confusionMatrix.falsePositive}, FN=${bttsMetrics.confusionMatrix.falseNegative}`);

  // Step 6: Compare with default models
  console.log('\n─── Comparison with Default Models ───');
  const o25DefaultMetrics = evaluateModel(DEFAULT_O25_WEIGHTS, o25ValData);
  const bttsDefaultMetrics = evaluateModel(DEFAULT_BTTS_WEIGHTS, bttsValData);

  logger.info(`Over 2.5 Goals - Default Model Accuracy: ${(o25DefaultMetrics.accuracy * 100).toFixed(1)}%`);
  logger.info(`Over 2.5 Goals - Ensemble Model Accuracy: ${(o25Metrics.accuracy * 100).toFixed(1)}%`);
  logger.info(`Improvement: ${((o25Metrics.accuracy - o25DefaultMetrics.accuracy) * 100).toFixed(1)} percentage points`);

  logger.info(`BTTS - Default Model Accuracy: ${(bttsDefaultMetrics.accuracy * 100).toFixed(1)}%`);
  logger.info(`BTTS - Ensemble Model Accuracy: ${(bttsMetrics.accuracy * 100).toFixed(1)}%`);
  logger.info(`Improvement: ${((bttsMetrics.accuracy - bttsDefaultMetrics.accuracy) * 100).toFixed(1)} percentage points`);

  // Step 7: Backtest with trained ensemble models
  console.log('\n\n═══════════════════════════════════════════════════════');
  logger.info('Running backtest with ENSEMBLE models...\n');
  
  const testFixtures = generateMockHistoricalFixtures(200);
  const ensembleResult = await runBacktest(testFixtures, o25Ensemble, bttsEnsemble);
  
  console.log('\n╔══════════════════════════════════════════════╗');
  console.log('║    📊 BACKTEST RESULTS (ENSEMBLE MODELS)   ║');
  console.log('╚══════════════════════════════════════════════╝\n');
  printBacktestResults(ensembleResult);

  // Step 8: Backtest with default models for comparison
  logger.info('\nRunning backtest with DEFAULT models for comparison...\n');
  const defaultResult = await runBacktest(testFixtures, DEFAULT_O25_WEIGHTS, DEFAULT_BTTS_WEIGHTS);
  
  console.log('\n╔══════════════════════════════════════════════╗');
  console.log('║    📊 BACKTEST RESULTS (DEFAULT MODELS)    ║');
  console.log('╚══════════════════════════════════════════════╝\n');
  printBacktestResults(defaultResult);

  // Step 9: Summary comparison
  console.log('\n═══════════════════════════════════════════════════════');
  console.log('📈 MODEL COMPARISON SUMMARY');
  console.log('═══════════════════════════════════════════════════════');
  console.log(`Ensemble ROI: ${(ensembleResult.roi >= 0 ? '+' : '')}${ensembleResult.roi.toFixed(2)}%`);
  console.log(`Default ROI:  ${(defaultResult.roi >= 0 ? '+' : '')}${defaultResult.roi.toFixed(2)}%`);
  console.log(`Improvement:  ${((ensembleResult.roi - defaultResult.roi)).toFixed(2)} percentage points`);
  console.log(`\nEnsemble Win Rate: ${ensembleResult.winRate.toFixed(1)}%`);
  console.log(`Default Win Rate:  ${defaultResult.winRate.toFixed(1)}%`);
  console.log('═══════════════════════════════════════════════════════\n');

  if (ensembleResult.roi > defaultResult.roi) {
    logger.success('✅ Ensemble models outperformed default models!');
  } else {
    logger.warn('⚠️  Default models performed better in this run.');
    logger.warn('Note: Results may vary due to randomness in mock data.');
  }

  // Step 10: Save trained models to files for deployment
  console.log('\n─── Saving Models for Deployment ───');
  try {
    await saveModelToFile(o25Ensemble, './dist/engine/o25-ensemble.bin');
    await saveModelToFile(bttsEnsemble, './dist/engine/btts-ensemble.bin');
    logger.success('✅ Models saved successfully!');
    logger.info('   - ./dist/engine/o25-ensemble.bin');
    logger.info('   - ./dist/engine/btts-ensemble.bin');
  } catch (err) {
    logger.error(`Failed to save models: ${err}`);
  }

  console.log('\n✅ Training and evaluation complete!\n');
}

main().catch(err => {
  logger.error(`Fatal error: ${err}`);
  process.exit(1);
});
