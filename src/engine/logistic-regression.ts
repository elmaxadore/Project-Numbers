// ============================================================
// Phase 2: Logistic Regression Prediction Engine
// Predicts P(Over 2.5 Goals) and P(BTTS) using xG features
// ============================================================

import { sigmoid, zScore } from '../utils/math.js';
import { logger } from '../utils/logger.js';

/**
 * Feature vector for a single match
 */
export interface MatchFeatures {
  homeTeamXGHome: number;
  homeTeamXGAHome: number;
  awayTeamXGAway: number;
  awayTeamXGAAway: number;
  homeCleanSheetRate: number;
  awayFailedToScoreRate: number;
  combinedXG: number;
  xGDifference: number;
  leagueEncoded: number;
  homeAvgGoalsScored: number;
  awayAvgGoalsScored: number;
  homeAvgGoalsConceded: number;
  awayAvgGoalsConceded: number;
}

/**
 * Trained model weights and normalization parameters
 */
export interface ModelWeights {
  /** Weight for each feature */
  weights: number[];
  /** Bias term */
  bias: number;
  /** Feature normalization parameters: [mean, stddev] for each feature */
  featureNorms: Array<{ mean: number; std: number }>;
  /** Label: what this model predicts */
  label: string;
  /** Training metadata */
  metadata: {
    trainedOn: number;       // number of training samples
    accuracy: number;
    calibrationError: number; // lower is better
    trainedAt: string;
  };
}

/**
 * Default model weights based on research findings
 * These are informed by the literature on xG-based football prediction
 */
export const DEFAULT_O25_WEIGHTS: ModelWeights = {
  weights: [
    0.35,  // homeTeamXGHome (strongest predictor)
    -0.15, // homeTeamXGAHome
    0.30,  // awayTeamXGAway
    -0.12, // awayTeamXGAAway
    0.08,  // homeCleanSheetRate
    -0.10, // awayFailedToScoreRate
    0.45,  // combinedXG (very strong)
    0.10,  // xGDifference
    0.05,  // leagueEncoded
    0.12,  // homeAvgGoalsScored
    0.10,  // awayAvgGoalsScored
    -0.08, // homeAvgGoalsConceded
    -0.06, // awayAvgGoalsConceded
  ],
  bias: -2.5,
  featureNorms: [
    { mean: 1.4, std: 0.5 },   // homeXG
    { mean: 1.1, std: 0.4 },   // homeXGA
    { mean: 1.1, std: 0.4 },   // awayXG
    { mean: 1.3, std: 0.5 },   // awayXGA
    { mean: 0.35, std: 0.15 }, // CS rate
    { mean: 0.20, std: 0.10 }, // FTS rate
    { mean: 2.6, std: 0.6 },   // combined xG
    { mean: 0.0, std: 0.7 },   // xG diff
    { mean: 5.0, std: 3.0 },   // league encoded
    { mean: 1.5, std: 0.5 },   // home avg goals
    { mean: 1.3, std: 0.5 },   // away avg goals
    { mean: 1.2, std: 0.4 },   // home avg conceded
    { mean: 1.3, std: 0.4 },   // away avg conceded
  ],
  label: 'Over 2.5 Goals',
  metadata: {
    trainedOn: 0,
    accuracy: 0,
    calibrationError: 0,
    trainedAt: 'default',
  },
};

export const DEFAULT_BTTS_WEIGHTS: ModelWeights = {
  weights: [
    0.30,  // homeTeamXGHome
    0.10,  // homeTeamXGAHome (conceding xG helps BTTS)
    0.25,  // awayTeamXGAway
    0.08,  // awayTeamXGAAway
    -0.15, // homeCleanSheetRate (anti-BTTS)
    -0.20, // awayFailedToScoreRate (anti-BTTS)
    0.15,  // combinedXG
    -0.05, // xGDifference (close games = more BTTS)
    0.08,  // leagueEncoded
    0.12,  // homeAvgGoalsScored
    0.10,  // awayAvgGoalsScored
    0.15,  // homeAvgGoalsConceded (leaky defense = BTTS)
    0.12,  // awayAvgGoalsConceded
  ],
  bias: -2.0,
  featureNorms: [
    { mean: 1.4, std: 0.5 },
    { mean: 1.1, std: 0.4 },
    { mean: 1.1, std: 0.4 },
    { mean: 1.3, std: 0.5 },
    { mean: 0.35, std: 0.15 },
    { mean: 0.20, std: 0.10 },
    { mean: 2.6, std: 0.6 },
    { mean: 0.0, std: 0.7 },
    { mean: 5.0, std: 3.0 },
    { mean: 1.5, std: 0.5 },
    { mean: 1.3, std: 0.5 },
    { mean: 1.2, std: 0.4 },
    { mean: 1.3, std: 0.4 },
  ],
  label: 'BTTS Yes',
  metadata: {
    trainedOn: 0,
    accuracy: 0,
    calibrationError: 0,
    trainedAt: 'default',
  },
};

/**
 * Normalize features using z-score normalization
 */
export function normalizeFeatures(
  features: number[],
  norms: Array<{ mean: number; std: number }>
): number[] {
  return features.map((val, i) => {
    const norm = norms[i] || { mean: 0, std: 1 };
    return zScore(val, norm.mean, norm.std);
  });
}

/**
 * Extract a feature vector from match data
 */
export function extractFeatures(
  homeXG: number,
  homeXGA: number,
  awayXG: number,
  awayXGA: number,
  homeCSRate: number,
  awayFTSRate: number,
  leagueId: number,
  homeAvgGoals: number,
  homeAvgConceded: number,
  awayAvgGoals: number,
  awayAvgConceded: number
): number[] {
  return [
    homeXG,
    homeXGA,
    awayXG,
    awayXGA,
    homeCSRate,
    awayFTSRate,
    homeXG + awayXG,            // combined xG
    homeXG - awayXG,             // xG difference
    leagueId % 100,              // simplified league encoding
    homeAvgGoals,
    awayAvgGoals,
    homeAvgConceded,
    awayAvgConceded,
  ];
}

/**
 * Predict probability using a logistic regression model
 */
export function predict(features: number[], model: ModelWeights): number {
  if (features.length !== model.weights.length) {
    throw new Error(
      `Feature mismatch: ${features.length} features vs ${model.weights.length} weights`
    );
  }

  // Normalize features
  const normalized = normalizeFeatures(features, model.featureNorms);

  // Compute linear combination
  let z = model.bias;
  for (let i = 0; i < normalized.length; i++) {
    z += normalized[i] * model.weights[i];
  }

  // Apply sigmoid to get probability
  return sigmoid(z);
}

/**
 * Train a logistic regression model using gradient descent
 * This implements the actual learning process from data
 */
export function trainModel(
  trainingData: Array<{ features: number[]; label: number }>,
  learningRate: number = 0.01,
  epochs: number = 1000,
  label: string = 'Unknown'
): ModelWeights {
  const numFeatures = trainingData[0].features.length;

  // Initialize weights to small random values
  const weights = new Array(numFeatures).fill(0).map(() =>
    (Math.random() - 0.5) * 0.1
  );
  let bias = 0;

  // Compute feature normalization from training data
  const featureNorms: Array<{ mean: number; std: number }> = [];
  for (let f = 0; f < numFeatures; f++) {
    const values = trainingData.map(d => d.features[f]);
    const mean = values.reduce((a, b) => a + b, 0) / values.length;
    const variance = values.reduce((a, b) => a + (b - mean) ** 2, 0) / values.length;
    const std = Math.sqrt(variance) || 1;
    featureNorms.push({ mean, std });
  }

  // Normalize all training features
  const normalizedData = trainingData.map(d => ({
    features: normalizeFeatures(d.features, featureNorms),
    label: d.label,
  }));

  // Gradient descent
  for (let epoch = 0; epoch < epochs; epoch++) {
    let totalLoss = 0;
    const gradWeights = new Array(numFeatures).fill(0);
    let gradBias = 0;

    for (const sample of normalizedData) {
      // Forward pass
      let z = bias;
      for (let i = 0; i < numFeatures; i++) {
        z += sample.features[i] * weights[i];
      }
      const prediction = sigmoid(z);

      // Compute error
      const error = prediction - sample.label;
      totalLoss += error * error;

      // Accumulate gradients
      for (let i = 0; i < numFeatures; i++) {
        gradWeights[i] += error * sample.features[i];
      }
      gradBias += error;
    }

    // Update weights
    const n = normalizedData.length;
    for (let i = 0; i < numFeatures; i++) {
      weights[i] -= learningRate * gradWeights[i] / n;
    }
    bias -= learningRate * gradBias / n;

    // Log progress every 100 epochs
    if (epoch % 100 === 0) {
      const avgLoss = totalLoss / n;
      logger.debug(`Epoch ${epoch}: avg_loss=${avgLoss.toFixed(4)}`);
    }
  }

  // Calculate accuracy on training data
  let correct = 0;
  for (const sample of normalizedData) {
    let z = bias;
    for (let i = 0; i < numFeatures; i++) {
      z += sample.features[i] * weights[i];
    }
    const pred = sigmoid(z) >= 0.5 ? 1 : 0;
    if (pred === sample.label) correct++;
  }
  const accuracy = correct / trainingData.length;

  logger.success(`Model "${label}" trained: accuracy=${(accuracy * 100).toFixed(1)}%, samples=${trainingData.length}`);

  return {
    weights,
    bias,
    featureNorms,
    label,
    metadata: {
      trainedOn: trainingData.length,
      accuracy,
      calibrationError: 0, // Will be computed during calibration
      trainedAt: new Date().toISOString(),
    },
  };
}

/**
 * Serialize model weights to JSON for persistence
 */
export function serializeModel(model: ModelWeights): string {
  return JSON.stringify(model, null, 2);
}

/**
 * Deserialize model weights from JSON
 */
export function deserializeModel(json: string): ModelWeights {
  return JSON.parse(json) as ModelWeights;
}
