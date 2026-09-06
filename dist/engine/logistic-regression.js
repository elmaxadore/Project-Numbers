"use strict";
// ============================================================
// Phase 2: Logistic Regression Prediction Engine
// Predicts P(Over 2.5 Goals) and P(BTTS) using xG features
// ============================================================
Object.defineProperty(exports, "__esModule", { value: true });
exports.DEFAULT_BTTS_WEIGHTS = exports.DEFAULT_O25_WEIGHTS = void 0;
exports.normalizeFeatures = normalizeFeatures;
exports.extractFeatures = extractFeatures;
exports.predict = predict;
exports.trainModel = trainModel;
exports.serializeModel = serializeModel;
exports.deserializeModel = deserializeModel;
const math_js_1 = require("../utils/math.js");
const logger_js_1 = require("../utils/logger.js");
/**
 * Default model weights based on research findings
 * These are informed by the literature on xG-based football prediction
 */
exports.DEFAULT_O25_WEIGHTS = {
    weights: [
        0.42, // homeTeamXGHome (strongest predictor)
        -0.18, // homeTeamXGAHome
        0.38, // awayTeamXGAway
        -0.15, // awayTeamXGAAway
        0.10, // homeCleanSheetRate
        -0.12, // awayFailedToScoreRate
        0.55, // combinedXG (very strong)
        0.12, // xGDifference
        0.06, // leagueEncoded
        0.15, // homeAvgGoalsScored
        0.12, // awayAvgGoalsScored
        -0.10, // homeAvgGoalsConceded
        -0.08, // awayAvgGoalsConceded
    ],
    bias: -2.8,
    featureNorms: [
        { mean: 1.5, std: 0.55 }, // homeXG
        { mean: 1.2, std: 0.45 }, // homeXGA
        { mean: 1.2, std: 0.45 }, // awayXG
        { mean: 1.4, std: 0.55 }, // awayXGA
        { mean: 0.35, std: 0.15 }, // CS rate
        { mean: 0.22, std: 0.11 }, // FTS rate
        { mean: 2.7, std: 0.65 }, // combined xG
        { mean: 0.0, std: 0.75 }, // xG diff
        { mean: 5.0, std: 3.0 }, // league encoded
        { mean: 1.5, std: 0.55 }, // home avg goals
        { mean: 1.3, std: 0.55 }, // away avg goals
        { mean: 1.2, std: 0.45 }, // home avg conceded
        { mean: 1.3, std: 0.45 }, // away avg conceded
    ],
    label: 'Over 2.5 Goals',
    metadata: {
        trainedOn: 0,
        accuracy: 0,
        calibrationError: 0,
        trainedAt: 'default-v2-improved',
    },
};
exports.DEFAULT_BTTS_WEIGHTS = {
    weights: [
        0.35, // homeTeamXGHome
        0.12, // homeTeamXGAHome (conceding xG helps BTTS)
        0.30, // awayTeamXGAway
        0.10, // awayTeamXGAAway
        -0.18, // homeCleanSheetRate (anti-BTTS)
        -0.25, // awayFailedToScoreRate (anti-BTTS)
        0.20, // combinedXG
        -0.08, // xGDifference (close games = more BTTS)
        0.10, // leagueEncoded
        0.15, // homeAvgGoalsScored
        0.12, // awayAvgGoalsScored
        0.18, // homeAvgGoalsConceded (leaky defense = BTTS)
        0.15, // awayAvgGoalsConceded
    ],
    bias: -2.2,
    featureNorms: [
        { mean: 1.5, std: 0.55 },
        { mean: 1.2, std: 0.45 },
        { mean: 1.2, std: 0.45 },
        { mean: 1.4, std: 0.55 },
        { mean: 0.35, std: 0.15 },
        { mean: 0.22, std: 0.11 },
        { mean: 2.7, std: 0.65 },
        { mean: 0.0, std: 0.75 },
        { mean: 5.0, std: 3.0 },
        { mean: 1.5, std: 0.55 },
        { mean: 1.3, std: 0.55 },
        { mean: 1.2, std: 0.45 },
        { mean: 1.3, std: 0.45 },
    ],
    label: 'BTTS Yes',
    metadata: {
        trainedOn: 0,
        accuracy: 0,
        calibrationError: 0,
        trainedAt: 'default-v2-improved',
    },
};
/**
 * Normalize features using z-score normalization
 */
function normalizeFeatures(features, norms) {
    return features.map((val, i) => {
        const norm = norms[i] || { mean: 0, std: 1 };
        return (0, math_js_1.zScore)(val, norm.mean, norm.std);
    });
}
/**
 * Extract a feature vector from match data
 */
function extractFeatures(homeXG, homeXGA, awayXG, awayXGA, homeCSRate, awayFTSRate, leagueId, homeAvgGoals, homeAvgConceded, awayAvgGoals, awayAvgConceded) {
    return [
        homeXG,
        homeXGA,
        awayXG,
        awayXGA,
        homeCSRate,
        awayFTSRate,
        homeXG + awayXG, // combined xG
        homeXG - awayXG, // xG difference
        leagueId % 100, // simplified league encoding
        homeAvgGoals,
        awayAvgGoals,
        homeAvgConceded,
        awayAvgConceded,
    ];
}
/**
 * Predict probability using a logistic regression model
 */
function predict(features, model) {
    if (features.length !== model.weights.length) {
        throw new Error(`Feature mismatch: ${features.length} features vs ${model.weights.length} weights`);
    }
    // Normalize features
    const normalized = normalizeFeatures(features, model.featureNorms);
    // Compute linear combination
    let z = model.bias;
    for (let i = 0; i < normalized.length; i++) {
        z += normalized[i] * model.weights[i];
    }
    // Apply sigmoid to get probability
    return (0, math_js_1.sigmoid)(z);
}
/**
 * Train a logistic regression model using gradient descent
 * This implements the actual learning process from data
 */
function trainModel(trainingData, learningRate = 0.01, epochs = 1000, label = 'Unknown') {
    const numFeatures = trainingData[0].features.length;
    // Initialize weights to small random values
    const weights = new Array(numFeatures).fill(0).map(() => (Math.random() - 0.5) * 0.1);
    let bias = 0;
    // Compute feature normalization from training data
    const featureNorms = [];
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
            const prediction = (0, math_js_1.sigmoid)(z);
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
            logger_js_1.logger.debug(`Epoch ${epoch}: avg_loss=${avgLoss.toFixed(4)}`);
        }
    }
    // Calculate accuracy on training data
    let correct = 0;
    for (const sample of normalizedData) {
        let z = bias;
        for (let i = 0; i < numFeatures; i++) {
            z += sample.features[i] * weights[i];
        }
        const pred = (0, math_js_1.sigmoid)(z) >= 0.5 ? 1 : 0;
        if (pred === sample.label)
            correct++;
    }
    const accuracy = correct / trainingData.length;
    logger_js_1.logger.success(`Model "${label}" trained: accuracy=${(accuracy * 100).toFixed(1)}%, samples=${trainingData.length}`);
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
function serializeModel(model) {
    return JSON.stringify(model, null, 2);
}
/**
 * Deserialize model weights from JSON
 */
function deserializeModel(json) {
    return JSON.parse(json);
}
//# sourceMappingURL=logistic-regression.js.map