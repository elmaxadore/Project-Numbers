// ============================================================
// Model Training and Evaluation System
// Trains logistic regression models on historical data
// Implements cross-validation, hyperparameter tuning, and evaluation
// ============================================================

import {
  MatchFeatures,
  ModelWeights,
  trainModel,
  predict,
  serializeModel,
  deserializeModel,
} from './logistic-regression.js';
import { logger } from '../utils/logger.js';

/**
 * Training sample with features and binary label
 */
export interface TrainingSample {
  features: number[];
  label: number; // 0 or 1
}

/**
 * Evaluation metrics for model performance
 */
export interface ModelMetrics {
  accuracy: number;
  precision: number;
  recall: number;
  f1Score: number;
  auc: number;
  calibrationError: number;
  confusionMatrix: {
    truePositive: number;
    trueNegative: number;
    falsePositive: number;
    falseNegative: number;
  };
}

/**
 * Training result with optimized model and metrics
 */
export interface TrainingResult {
  model: ModelWeights;
  trainMetrics: ModelMetrics;
  valMetrics: ModelMetrics;
  bestHyperparams: {
    learningRate: number;
    epochs: number;
    regularization?: number;
  };
}

/**
 * Generate synthetic training data that mimics real football statistics
 * Uses realistic distributions based on actual football analytics research
 */
export function generateSyntheticTrainingData(
  numSamples: number = 2000,
  seed?: number
): Array<{ features: number[]; o25Label: number; bttsLabel: number }> {
  const data: Array<{ features: number[]; o25Label: number; bttsLabel: number }> = [];
  
  // Use seed for reproducibility if provided
  let random = Math.random;
  if (seed !== undefined) {
    let s = seed;
    random = () => {
      s = (s * 9301 + 49297) % 233280;
      return s / 233280;
    };
  }

  for (let i = 0; i < numSamples; i++) {
    // Generate realistic team stats
    // Home team xG at home: typically 1.0-2.5, avg ~1.5
    const homeXGHome = 0.8 + random() * 2.2;
    // Home team xGA at home: typically 0.7-2.0, avg ~1.2
    const homeXGAHome = 0.6 + random() * 1.8;
    // Away team xG away: typically 0.7-2.0, avg ~1.1
    const awayXGAway = 0.6 + random() * 1.8;
    // Away team xGA away: typically 0.8-2.5, avg ~1.4
    const awayXGAAway = 0.7 + random() * 2.3;
    
    // Clean sheet rate: 0.2-0.5
    const homeCSRate = 0.2 + random() * 0.35;
    // Failed to score rate: 0.1-0.35
    const awayFTSRate = 0.1 + random() * 0.3;
    
    // League encoding (1-50 for top European leagues)
    const leagueId = Math.floor(random() * 50);
    
    // Average goals scored/conceded
    const homeAvgGoals = 0.9 + random() * 2.0;
    const homeAvgConceded = 0.7 + random() * 1.8;
    const awayAvgGoals = 0.8 + random() * 1.7;
    const awayAvgConceded = 0.8 + random() * 2.0;
    
    // Derived features
    const combinedXG = homeXGHome + awayXGAway;
    const xGDifference = homeXGHome - awayXGAway;
    
    const features = [
      homeXGHome,
      homeXGAHome,
      awayXGAway,
      awayXGAAway,
      homeCSRate,
      awayFTSRate,
      combinedXG,
      xGDifference,
      leagueId,
      homeAvgGoals,
      awayAvgGoals,
      homeAvgConceded,
      awayAvgConceded,
    ];
    
    // Generate outcomes based on realistic probabilities
    // Over 2.5 probability increases with combined xG
    const baseO25Prob = 0.3 + (combinedXG - 2.0) * 0.15;
    const o25Prob = Math.max(0.1, Math.min(0.9, baseO25Prob));
    const o25Label = random() < o25Prob ? 1 : 0;
    
    // BTTS probability increases with both teams' attacking strength
    const bttsBaseProb = 0.35 + (homeXGHome * 0.1) + (awayXGAway * 0.08) - (homeCSRate * 0.3) - (awayFTSRate * 0.35);
    const bttsProb = Math.max(0.15, Math.min(0.85, bttsBaseProb));
    const bttsLabel = random() < bttsProb ? 1 : 0;
    
    data.push({ features, o25Label, bttsLabel });
  }
  
  return data;
}

/**
 * Split data into training and validation sets
 */
export function splitData(
  data: Array<{ features: number[]; o25Label: number; bttsLabel: number }>,
  trainRatio: number = 0.8,
  seed?: number
): {
  train: typeof data;
  val: typeof data;
} {
  let random = Math.random;
  if (seed !== undefined) {
    let s = seed;
    random = () => {
      s = (s * 9301 + 49297) % 233280;
      return s / 233280;
    };
  }
  
  // Shuffle data
  const shuffled = [...data].sort(() => random() - 0.5);
  const splitIndex = Math.floor(shuffled.length * trainRatio);
  
  return {
    train: shuffled.slice(0, splitIndex),
    val: shuffled.slice(splitIndex),
  };
}

/**
 * Calculate evaluation metrics for a model
 */
export function evaluateModel(
  model: ModelWeights,
  testData: TrainingSample[]
): ModelMetrics {
  if (testData.length === 0) {
    return {
      accuracy: 0,
      precision: 0,
      recall: 0,
      f1Score: 0,
      auc: 0.5,
      calibrationError: 1,
      confusionMatrix: {
        truePositive: 0,
        trueNegative: 0,
        falsePositive: 0,
        falseNegative: 0,
      },
    };
  }
  
  let tp = 0, tn = 0, fp = 0, fn = 0;
  let correct = 0;
  const predictions: Array<{ prob: number; label: number }> = [];
  
  for (const sample of testData) {
    const prob = predict(sample.features, model);
    const pred = prob >= 0.5 ? 1 : 0;
    
    predictions.push({ prob, label: sample.label });
    
    if (pred === sample.label) correct++;
    
    if (pred === 1 && sample.label === 1) tp++;
    else if (pred === 0 && sample.label === 0) tn++;
    else if (pred === 1 && sample.label === 0) fp++;
    else if (pred === 0 && sample.label === 1) fn++;
  }
  
  const accuracy = correct / testData.length;
  const precision = tp + fp > 0 ? tp / (tp + fp) : 0;
  const recall = tp + fn > 0 ? tp / (tp + fn) : 0;
  const f1Score = precision + recall > 0 
    ? 2 * (precision * recall) / (precision + recall) 
    : 0;
  
  // Calculate AUC (simplified trapezoidal approximation)
  const sorted = predictions.sort((a, b) => b.prob - a.prob);
  let auc = 0;
  let tpr = 0, fpr = 0;
  let prevTpr = 0, prevFpr = 0;
  const totalPos = tp + fn;
  const totalNeg = tn + fp;
  
  for (const pred of sorted) {
    if (pred.label === 1) tpr++;
    else fpr++;
    
    const currTpr = tpr / totalPos;
    const currFpr = fpr / totalNeg;
    
    auc += (currFpr - prevFpr) * (currTpr + prevTpr) / 2;
    prevTpr = currTpr;
    prevFpr = currFpr;
  }
  
  // Calibration error (mean absolute difference between predicted and actual probabilities)
  const calibrationBuckets = 10;
  const buckets: Array<{ sumProb: number; sumActual: number; count: number }> = 
    new Array(calibrationBuckets).fill(null).map(() => ({ sumProb: 0, sumActual: 0, count: 0 }));
  
  for (const pred of predictions) {
    const bucketIdx = Math.min(Math.floor(pred.prob * calibrationBuckets), calibrationBuckets - 1);
    buckets[bucketIdx].sumProb += pred.prob;
    buckets[bucketIdx].sumActual += pred.label;
    buckets[bucketIdx].count++;
  }
  
  let calibrationError = 0;
  let calibrationCount = 0;
  for (const bucket of buckets) {
    if (bucket.count > 0) {
      const avgProb = bucket.sumProb / bucket.count;
      const avgActual = bucket.sumActual / bucket.count;
      calibrationError += Math.abs(avgProb - avgActual) * bucket.count;
      calibrationCount += bucket.count;
    }
  }
  calibrationError = calibrationCount > 0 ? calibrationError / calibrationCount : 1;
  
  return {
    accuracy,
    precision,
    recall,
    f1Score,
    auc,
    calibrationError,
    confusionMatrix: {
      truePositive: tp,
      trueNegative: tn,
      falsePositive: fp,
      falseNegative: fn,
    },
  };
}

/**
 * Train model with hyperparameter tuning using grid search
 */
export function trainWithTuning(
  trainData: TrainingSample[],
  valData: TrainingSample[],
  label: string
): TrainingResult {
  const learningRates = [0.001, 0.01, 0.05, 0.1];
  const epochsList = [500, 1000, 2000, 3000];
  
  let bestValAccuracy = 0;
  let bestModel: ModelWeights | null = null;
  let bestParams = { learningRate: 0.01, epochs: 1000 };
  
  logger.info(`Training ${label} model with hyperparameter tuning...`);
  
  for (const lr of learningRates) {
    for (const epochs of epochsList) {
      const model = trainModel(trainData, lr, epochs, `${label}_lr${lr}_ep${epochs}`);
      const metrics = evaluateModel(model, valData);
      
      logger.debug(`  LR=${lr}, Epochs=${epochs}: val_accuracy=${(metrics.accuracy * 100).toFixed(1)}%, F1=${metrics.f1Score.toFixed(3)}`);
      
      if (metrics.accuracy > bestValAccuracy) {
        bestValAccuracy = metrics.accuracy;
        bestModel = model;
        bestParams = { learningRate: lr, epochs };
      }
    }
  }
  
  if (!bestModel) {
    throw new Error('Failed to train model');
  }
  
  const trainMetrics = evaluateModel(bestModel, trainData);
  const finalValMetrics = evaluateModel(bestModel, valData);
  
  logger.success(`Best ${label} model: LR=${bestParams.learningRate}, Epochs=${bestParams.epochs}`);
  logger.success(`  Train Accuracy: ${(trainMetrics.accuracy * 100).toFixed(1)}%, F1=${trainMetrics.f1Score.toFixed(3)}`);
  logger.success(`  Val Accuracy: ${(finalValMetrics.accuracy * 100).toFixed(1)}%, F1=${finalValMetrics.f1Score.toFixed(3)}`);
  
  return {
    model: bestModel,
    trainMetrics,
    valMetrics: finalValMetrics,
    bestHyperparams: bestParams,
  };
}

/**
 * K-fold cross-validation for robust evaluation
 */
export function kFoldCrossValidation(
  data: Array<{ features: number[]; o25Label: number; bttsLabel: number }>,
  k: number = 5,
  label: 'o25' | 'btts'
): { meanAccuracy: number; stdAccuracy: number; models: ModelWeights[] } {
  const foldSize = Math.floor(data.length / k);
  const accuracies: number[] = [];
  const models: ModelWeights[] = [];
  
  logger.info(`Running ${k}-fold cross-validation for ${label.toUpperCase()} model...`);
  
  for (let fold = 0; fold < k; fold++) {
    const valStart = fold * foldSize;
    const valEnd = fold === k - 1 ? data.length : (fold + 1) * foldSize;
    
    const valData = data.slice(valStart, valEnd);
    const trainData = [...data.slice(0, valStart), ...data.slice(valEnd)];
    
    const trainSamples: TrainingSample[] = trainData.map(d => ({
      features: d.features,
      label: label === 'o25' ? d.o25Label : d.bttsLabel,
    }));
    
    const valSamples: TrainingSample[] = valData.map(d => ({
      features: d.features,
      label: label === 'o25' ? d.o25Label : d.bttsLabel,
    }));
    
    const result = trainWithTuning(trainSamples, valSamples, `${label}_fold${fold}`);
    accuracies.push(result.valMetrics.accuracy);
    models.push(result.model);
    
    logger.debug(`  Fold ${fold + 1}/${k}: accuracy=${(result.valMetrics.accuracy * 100).toFixed(1)}%`);
  }
  
  const meanAccuracy = accuracies.reduce((a, b) => a + b, 0) / k;
  const variance = accuracies.reduce((sum, acc) => sum + (acc - meanAccuracy) ** 2, 0) / k;
  const stdAccuracy = Math.sqrt(variance);
  
  logger.success(`${label.toUpperCase()} Cross-Validation: ${(meanAccuracy * 100).toFixed(1)}% ± ${(stdAccuracy * 100).toFixed(1)}%`);
  
  return { meanAccuracy, stdAccuracy, models };
}

/**
 * Create ensemble model by averaging predictions from multiple models
 */
export function createEnsembleModel(models: ModelWeights[], label: string): ModelWeights {
  if (models.length === 0) {
    throw new Error('Cannot create ensemble from empty model list');
  }
  
  const numFeatures = models[0].weights.length;
  const avgWeights = new Array(numFeatures).fill(0);
  let avgBias = 0;
  
  // Average weights and bias
  for (const model of models) {
    for (let i = 0; i < numFeatures; i++) {
      avgWeights[i] += model.weights[i];
    }
    avgBias += model.bias;
  }
  
  for (let i = 0; i < numFeatures; i++) {
    avgWeights[i] /= models.length;
  }
  avgBias /= models.length;
  
  // Use average normalization parameters
  const avgNorms = new Array(numFeatures).fill(null).map((_, i) => {
    const norms = models.map(m => m.featureNorms[i]);
    return {
      mean: norms.reduce((a, b) => a + b.mean, 0) / norms.length,
      std: norms.reduce((a, b) => a + b.std, 0) / norms.length,
    };
  });
  
  return {
    weights: avgWeights,
    bias: avgBias,
    featureNorms: avgNorms,
    label,
    metadata: {
      trainedOn: models.reduce((sum, m) => sum + m.metadata.trainedOn, 0),
      accuracy: models.reduce((sum, m) => sum + m.metadata.accuracy, 0) / models.length,
      calibrationError: models.reduce((sum, m) => sum + m.metadata.calibrationError, 0) / models.length,
      trainedAt: new Date().toISOString(),
    },
  };
}

/**
 * Predict using ensemble of models
 */
export function predictEnsemble(features: number[], models: ModelWeights[]): number {
  const probs = models.map(m => predict(features, m));
  return probs.reduce((a, b) => a + b, 0) / probs.length;
}
