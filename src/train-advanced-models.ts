import * as fs from 'fs';
import * as path from 'path';
import { realDataCollector } from './data/real-data-collector.js';
import { LogisticRegression } from './engine/logistic-regression.js';
import { RandomForestClassifier, GradientBoostingClassifier } from './engine/ensemble-models.js';
import { crossValidate, calculateMetrics, createEnsemble, IsotonicRegression } from './engine/advanced-validation.js';

interface MatchFeatures {
  features: number[];
  label: number;
  market: string;
  sport: string;
}

function extractFeatures(matches: any[]): MatchFeatures[] {
  const dataset: MatchFeatures[] = [];
  
  // Group by league and season for form calculation
  const grouped: any = {};
  for (const match of matches) {
    if (match.sport !== 'football') continue; // Only process football for now
    const key = `${match.league}_${match.season}`;
    if (!grouped[key]) grouped[key] = [];
    grouped[key].push(match);
  }
  
  for (const [key, leagueMatches] of Object.entries(grouped)) {
    // Sort by index (assume data is in chronological order)
    const sortedMatches = leagueMatches as any[];
    
    // Calculate rolling stats for each team
    const teamStats: any = {};
    
    for (const match of sortedMatches) {
      const homeTeam = match.homeTeam;
      const awayTeam = match.awayTeam;
      
      // Initialize team stats if needed
      if (!teamStats[homeTeam]) {
        teamStats[homeTeam] = { goalsFor: [], goalsAgainst: [], shots: [], results: [] };
      }
      if (!teamStats[awayTeam]) {
        teamStats[awayTeam] = { goalsFor: [], goalsAgainst: [], shots: [], results: [] };
      }
      
      // Get last 5 games form (excluding current match)
      const homeForm = teamStats[homeTeam].results.slice(-5);
      const awayForm = teamStats[awayTeam].results.slice(-5);
      
      // Calculate feature values
      const homeGoalsAvg = teamStats[homeTeam].goalsFor.length > 0 
        ? teamStats[homeTeam].goalsFor.reduce((a: number, b: number) => a + b, 0) / teamStats[homeTeam].goalsFor.length 
        : 1.5;
      const awayGoalsAvg = teamStats[awayTeam].goalsFor.length > 0 
        ? teamStats[awayTeam].goalsFor.reduce((a: number, b: number) => a + b, 0) / teamStats[awayTeam].goalsFor.length 
        : 1.5;
      const homeConcededAvg = teamStats[homeTeam].goalsAgainst.length > 0 
        ? teamStats[homeTeam].goalsAgainst.reduce((a: number, b: number) => a + b, 0) / teamStats[homeTeam].goalsAgainst.length 
        : 1.5;
      const awayConcededAvg = teamStats[awayTeam].goalsAgainst.length > 0 
        ? teamStats[awayTeam].goalsAgainst.reduce((a: number, b: number) => a + b, 0) / teamStats[awayTeam].goalsAgainst.length 
        : 1.5;
      
      const homeFormPoints = homeForm.filter((r: string) => r === 'W').length * 3 + homeForm.filter((r: string) => r === 'D').length;
      const awayFormPoints = awayForm.filter((r: string) => r === 'W').length * 3 + awayForm.filter((r: string) => r === 'D').length;
      
      const homeShotsAvg = teamStats[homeTeam].shots.length > 0 
        ? teamStats[homeTeam].shots.reduce((a: number, b: number) => a + b, 0) / teamStats[homeTeam].shots.length 
        : 12;
      const awayShotsAvg = teamStats[awayTeam].shots.length > 0 
        ? teamStats[awayTeam].shots.reduce((a: number, b: number) => a + b, 0) / teamStats[awayTeam].shots.length 
        : 12;
      
      const features = [
        homeGoalsAvg,
        awayGoalsAvg,
        homeConcededAvg,
        awayConcededAvg,
        homeFormPoints / 15, // Normalize to 0-1
        awayFormPoints / 15,
        homeShotsAvg / 20,
        awayShotsAvg / 20
      ];
      
      // Over 2.5 Goals market - use homeScore and awayScore from actual data
      if (match.homeScore !== undefined && match.awayScore !== undefined) {
        const totalGoals = match.homeScore + match.awayScore;
        dataset.push({
          features: [...features],
          label: totalGoals > 2.5 ? 1 : 0,
          market: 'O2.5',
          sport: 'football'
        });
      }
      
      // Update team stats after using them (to avoid data leakage)
      if (match.homeScore !== undefined && match.awayScore !== undefined) {
        teamStats[homeTeam].goalsFor.push(match.homeScore);
        teamStats[homeTeam].goalsAgainst.push(match.awayScore);
        teamStats[awayTeam].goalsFor.push(match.awayScore);
        teamStats[awayTeam].goalsAgainst.push(match.homeScore);
        
        if (match.homeShots) teamStats[homeTeam].shots.push(match.homeShots);
        if (match.awayShots) teamStats[awayTeam].shots.push(match.awayShots);
        
        // Result for form
        if (match.homeScore > match.awayScore) {
          teamStats[homeTeam].results.push('W');
          teamStats[awayTeam].results.push('L');
        } else if (match.homeScore < match.awayScore) {
          teamStats[homeTeam].results.push('L');
          teamStats[awayTeam].results.push('W');
        } else {
          teamStats[homeTeam].results.push('D');
          teamStats[awayTeam].results.push('D');
        }
      }
    }
  }
  
  return dataset;
}

async function main() {
  console.log('🚀 Starting Advanced Multi-Sport Model Training with Real Data\n');
  console.log('=' .repeat(60));
  
  // Collect real data (10 seasons)
  const matches = await realDataCollector.collectAllSports();
  console.log(`\n📊 Collected ${matches.length} real matches`);
  
  if (matches.length === 0) {
    console.log('⚠️ No data collected. Using synthetic data for demonstration...');
    // Fallback to synthetic if scraping fails
    const { generateMultiSportData } = require('./data/multi-sport-generator');
    const syntheticMatches = generateMultiSportData(5000);
    matches.push(...syntheticMatches);
  }
  
  // Extract features
  const dataset = extractFeatures(matches);
  console.log(`📈 Extracted ${dataset.length} training samples`);
  
  // Filter for football O2.5 market for this demo
  const footballO25 = dataset.filter(d => d.sport === 'football' && d.market === 'O2.5');
  console.log(`⚽ Football O2.5 samples: ${footballO25.length}`);
  
  if (footballO25.length < 100) {
    console.log('⚠️ Insufficient data for training');
    return;
  }
  
  // Prepare X and y
  const X = footballO25.map(d => d.features);
  const y = footballO25.map(d => d.label);
  
  // Split into train/test (80/20)
  const splitIdx = Math.floor(X.length * 0.8);
  const X_train = X.slice(0, splitIdx);
  const y_train = y.slice(0, splitIdx);
  const X_test = X.slice(splitIdx);
  const y_test = y.slice(splitIdx);
  
  console.log(`\n📉 Train set: ${X_train.length}, Test set: ${X_test.length}`);
  
  // ========== MODEL 1: Logistic Regression with Cross-Validation ==========
  console.log('\n' + '='.repeat(60));
  console.log('📊 Model 1: Logistic Regression with 5-Fold CV');
  console.log('='.repeat(60));
  
  const cvResults = crossValidate(X_train, y_train, 5, 0.1, 1000, 0.01);
  const lrEnsemble = createEnsemble(cvResults.models);
  
  const lrTestProbs = lrEnsemble.predictProb(X_test);
  const lrTestPreds = lrTestProbs.map((p: number) => p >= 0.5 ? 1 : 0);
  const lrMetrics = calculateMetrics(y_test, lrTestPreds, lrTestProbs);
  
  console.log(`\n✅ Test Accuracy: ${(lrMetrics.accuracy * 100).toFixed(2)}%`);
  console.log(`   Precision: ${(lrMetrics.precision * 100).toFixed(2)}%`);
  console.log(`   Recall: ${(lrMetrics.recall * 100).toFixed(2)}%`);
  console.log(`   F1 Score: ${(lrMetrics.f1 * 100).toFixed(2)}%`);
  console.log(`   AUC: ${(lrMetrics.auc * 100).toFixed(2)}%`);
  console.log(`   Brier Score: ${lrMetrics.brierScore.toFixed(4)}`);
  console.log(`   Calibration Error: ${(lrMetrics.calibrationError * 100).toFixed(2)}%`);
  
  // ========== MODEL 2: Random Forest ==========
  console.log('\n' + '='.repeat(60));
  console.log('🌲 Model 2: Random Forest (100 trees)');
  console.log('='.repeat(60));
  
  const rfModel = new RandomForestClassifier({
    nTrees: 100,
    maxDepth: 8,
    minSamplesSplit: 5,
    minSamplesLeaf: 2,
    maxFeatures: Math.floor(Math.sqrt(X_train[0].length))
  });
  
  rfModel.fit(X_train, y_train);
  
  const rfTestProbs = rfModel.predictProb(X_test);
  const rfTestPreds = rfTestProbs.map(p => p >= 0.5 ? 1 : 0);
  const rfMetrics = calculateMetrics(y_test, rfTestPreds, rfTestProbs);
  
  console.log(`\n✅ Test Accuracy: ${(rfMetrics.accuracy * 100).toFixed(2)}%`);
  console.log(`   Precision: ${(rfMetrics.precision * 100).toFixed(2)}%`);
  console.log(`   Recall: ${(rfMetrics.recall * 100).toFixed(2)}%`);
  console.log(`   F1 Score: ${(rfMetrics.f1 * 100).toFixed(2)}%`);
  console.log(`   AUC: ${(rfMetrics.auc * 100).toFixed(2)}%`);
  console.log(`   Brier Score: ${rfMetrics.brierScore.toFixed(4)}`);
  console.log(`   Calibration Error: ${(rfMetrics.calibrationError * 100).toFixed(2)}%`);
  
  // ========== MODEL 3: Gradient Boosting ==========
  console.log('\n' + '='.repeat(60));
  console.log('🚀 Model 3: Gradient Boosting (50 trees)');
  console.log('='.repeat(60));
  
  const gbModel = new GradientBoostingClassifier({
    nTrees: 50,
    learningRate: 0.1,
    maxDepth: 3,
    minSamplesSplit: 5
  });
  
  gbModel.fit(X_train, y_train);
  
  const gbTestProbs = gbModel.predictProb(X_test);
  const gbTestPreds = gbTestProbs.map(p => p >= 0.5 ? 1 : 0);
  const gbMetrics = calculateMetrics(y_test, gbTestPreds, gbTestProbs);
  
  console.log(`\n✅ Test Accuracy: ${(gbMetrics.accuracy * 100).toFixed(2)}%`);
  console.log(`   Precision: ${(gbMetrics.precision * 100).toFixed(2)}%`);
  console.log(`   Recall: ${(gbMetrics.recall * 100).toFixed(2)}%`);
  console.log(`   F1 Score: ${(gbMetrics.f1 * 100).toFixed(2)}%`);
  console.log(`   AUC: ${(gbMetrics.auc * 100).toFixed(2)}%`);
  console.log(`   Brier Score: ${gbMetrics.brierScore.toFixed(4)}`);
  console.log(`   Calibration Error: ${(gbMetrics.calibrationError * 100).toFixed(2)}%`);
  
  // ========== PROBABILITY CALIBRATION ==========
  console.log('\n' + '='.repeat(60));
  console.log('🎯 Probability Calibration (Isotonic Regression)');
  console.log('='.repeat(60));
  
  // Use best model (highest AUC)
  const models = [
    { name: 'Logistic Regression', probs: lrTestProbs, metrics: lrMetrics },
    { name: 'Random Forest', probs: rfTestProbs, metrics: rfMetrics },
    { name: 'Gradient Boosting', probs: gbTestProbs, metrics: gbMetrics }
  ];
  
  const bestModel = models.reduce((best, curr) => 
    curr.metrics.auc > best.metrics.auc ? curr : best
  );
  
  console.log(`\n🏆 Best model: ${bestModel.name} (AUC: ${(bestModel.metrics.auc * 100).toFixed(2)}%)`);
  
  // Calibrate probabilities
  const isotonic = new IsotonicRegression();
  isotonic.fit(y_train, bestModel.probs.slice(0, Math.min(y_train.length, bestModel.probs.length)));
  
  // Note: In production, use separate calibration set
  const calibratedProbs = isotonic.predict(bestModel.probs);
  const calibratedMetrics = calculateMetrics(y_test, gbTestPreds, calibratedProbs);
  
  console.log(`\n📊 After Calibration:`);
  console.log(`   Brier Score: ${calibratedMetrics.brierScore.toFixed(4)} (was ${bestModel.metrics.brierScore.toFixed(4)})`);
  console.log(`   Calibration Error: ${(calibratedMetrics.calibrationError * 100).toFixed(2)}% (was ${(bestModel.metrics.calibrationError * 100).toFixed(2)}%)`);
  
  // ========== SUMMARY ==========
  console.log('\n' + '='.repeat(60));
  console.log('📋 FINAL SUMMARY');
  console.log('='.repeat(60));
  
  console.log('\nModel Comparison (Test Set):');
  console.log('-'.repeat(60));
  console.log('Model                    Accuracy   AUC        Brier');
  console.log('-'.repeat(60));
  console.log('Logistic Regression      ' + (lrMetrics.accuracy * 100).toFixed(2) + '%     ' + (lrMetrics.auc * 100).toFixed(2) + '%     ' + lrMetrics.brierScore.toFixed(4));
  console.log('Random Forest            ' + (rfMetrics.accuracy * 100).toFixed(2) + '%     ' + (rfMetrics.auc * 100).toFixed(2) + '%     ' + rfMetrics.brierScore.toFixed(4));
  console.log('Gradient Boosting        ' + (gbMetrics.accuracy * 100).toFixed(2) + '%     ' + (gbMetrics.auc * 100).toFixed(2) + '%     ' + gbMetrics.brierScore.toFixed(4));
  console.log('-'.repeat(60));
  
  console.log('\n✅ Training complete! Models are ready for prediction.');
  console.log('\n⚠️ DISCLAIMER: Sports betting involves risk. These models are for');
  console.log('   educational purposes only. Never bet more than you can afford to lose.');
}

main().catch(console.error);
