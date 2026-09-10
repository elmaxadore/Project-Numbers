import { multiSportGenerator } from '../data/multi-sport-generator';
import { featureExtractor, labelGenerator, PredictionTargets } from './multi-sport-model';
import { LogisticRegression } from './logistic-regression';

/**
 * Multi-Sport Training and Evaluation Script
 * Trains separate models for each sport and market combination
 */

interface ModelResults {
  sport: string;
  market: string;
  accuracy: number;
  precision: number;
  recall: number;
  f1Score: number;
  auc: number;
  sampleSize: number;
}

async function trainMultiSportModels() {
  console.log('=== Multi-Sport ML Training Pipeline ===\n');
  
  // Generate comprehensive dataset
  console.log('Generating multi-sport historical data...');
  const matches = await multiSportGenerator.generateHistoricalData(3, 600);
  console.log(`Generated ${matches.length} matches\n`);
  
  // Prepare training data by sport and market
  const trainingData: Map<string, { features: number[][], labels: number[] }> = new Map();
  
  for (const match of matches) {
    const features = featureExtractor.extractFeatures(match);
    const featureArray = featureExtractor.featuresToArray(features, match.sport);
    const targets = labelGenerator.generateLabels(match);
    
    for (const target of targets) {
      const key = `${target.sport}_${target.market}`;
      
      if (!trainingData.has(key)) {
        trainingData.set(key, { features: [], labels: [] });
      }
      
      const data = trainingData.get(key)!;
      data.features.push(featureArray);
      data.labels.push(target.label);
    }
  }
  
  console.log(`Prepared ${trainingData.size} sport-market combinations for training\n`);
  
  // Train models for each sport-market combination
  const results: ModelResults[] = [];
  
  for (const [key, data] of trainingData.entries()) {
    if (data.labels.length < 100) {
      console.log(`Skipping ${key}: insufficient data (${data.labels.length} samples)`);
      continue;
    }
    
    console.log(`Training model for ${key}...`);
    
    // Split data (80/20)
    const splitIdx = Math.floor(data.features.length * 0.8);
    const trainFeatures = data.features.slice(0, splitIdx);
    const trainLabels = data.labels.slice(0, splitIdx);
    const testFeatures = data.features.slice(splitIdx);
    const testLabels = data.labels.slice(splitIdx);
    
    // Train logistic regression model
    const model = new LogisticRegression({
      learningRate: 0.1,
      epochs: 500,
      lambda: 0.01
    });
    
    model.train(trainFeatures, trainLabels);
    
    // Evaluate on test set
    const predictions = model.predict(testFeatures);
    const probabilities = model.predictProbabilities(testFeatures);
    
    // Calculate metrics
    const metrics = calculateMetrics(testLabels, predictions, probabilities);
    
    const [sport, market] = key.split('_');
    results.push({
      sport: sport || 'unknown',
      market: market || 'unknown',
      ...metrics,
      sampleSize: testLabels.length
    });
    
    console.log(`  Accuracy: ${(metrics.accuracy * 100).toFixed(1)}%, F1: ${(metrics.f1Score * 100).toFixed(1)}%, AUC: ${metrics.auc.toFixed(3)}\n`);
  }
  
  // Summary
  console.log('\n=== Multi-Sport Model Performance Summary ===');
  console.table(results.map(r => ({
    Sport: r.sport,
    Market: r.market,
    Accuracy: `${(r.accuracy * 100).toFixed(1)}%`,
    Precision: `${(r.precision * 100).toFixed(1)}%`,
    Recall: `${(r.recall * 100).toFixed(1)}%`,
    F1: `${(r.f1Score * 100).toFixed(1)}%`,
    AUC: r.auc.toFixed(3),
    Samples: r.sampleSize
  })));
  
  // Overall statistics
  const avgAccuracy = results.reduce((sum, r) => sum + r.accuracy, 0) / results.length;
  const avgF1 = results.reduce((sum, r) => sum + r.f1Score, 0) / results.length;
  const avgAUC = results.reduce((sum, r) => sum + r.auc, 0) / results.length;
  
  console.log('\nOverall Performance:');
  console.log(`  Average Accuracy: ${(avgAccuracy * 100).toFixed(1)}%`);
  console.log(`  Average F1 Score: ${(avgF1 * 100).toFixed(1)}%`);
  console.log(`  Average AUC: ${avgAUC.toFixed(3)}`);
  
  return results;
}

function calculateMetrics(
  actual: number[],
  predicted: number[],
  probabilities: number[]
): { accuracy: number; precision: number; recall: number; f1Score: number; auc: number } {
  let tp = 0, fp = 0, tn = 0, fn = 0;
  
  for (let i = 0; i < actual.length; i++) {
    if (actual[i] === 1 && predicted[i] === 1) tp++;
    else if (actual[i] === 0 && predicted[i] === 1) fp++;
    else if (actual[i] === 0 && predicted[i] === 0) tn++;
    else if (actual[i] === 1 && predicted[i] === 0) fn++;
  }
  
  const accuracy = (tp + tn) / actual.length;
  const precision = tp / (tp + fp || 1);
  const recall = tp / (tp + fn || 1);
  const f1Score = 2 * (precision * recall) / (precision + recall || 1);
  
  // Calculate AUC (simplified)
  const auc = calculateAUC(actual, probabilities);
  
  return { accuracy, precision, recall, f1Score, auc };
}

function calculateAUC(actual: number[], probabilities: number[]): number {
  // Create pairs of (probability, actual)
  const pairs = actual.map((label, i) => ({ prob: probabilities[i], label }));
  
  // Sort by probability descending
  pairs.sort((a, b) => b.prob - a.prob);
  
  // Count positives and negatives
  const totalPositives = actual.filter(l => l === 1).length;
  const totalNegatives = actual.length - totalPositives;
  
  if (totalPositives === 0 || totalNegatives === 0) {
    return 0.5;
  }
  
  // Calculate AUC using trapezoidal rule
  let auc = 0;
  let tp = 0;
  let fp = 0;
  let prevTpr = 0;
  let prevFpr = 0;
  
  for (let i = 0; i < pairs.length; i++) {
    if (pairs[i].label === 1) {
      tp++;
    } else {
      fp++;
    }
    
    const tpr = tp / totalPositives;
    const fpr = fp / totalNegatives;
    
    // Trapezoidal area
    auc += (fpr - prevFpr) * (tpr + prevTpr) / 2;
    
    prevTpr = tpr;
    prevFpr = fpr;
  }
  
  return auc;
}

// Run training
trainMultiSportModels().catch(console.error);
