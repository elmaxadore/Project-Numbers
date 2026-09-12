"use strict";
// ============================================================
// Advanced Model Training with Feature Engineering
// Adds polynomial features, regularization, and probability calibration
// ============================================================
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateEnhancedTrainingData = generateEnhancedTrainingData;
exports.addPolynomialFeatures = addPolynomialFeatures;
exports.trainWithRegularization = trainWithRegularization;
exports.calibrateProbabilities = calibrateProbabilities;
exports.applyCalibration = applyCalibration;
exports.trainAndCalibrate = trainAndCalibrate;
const logistic_regression_js_1 = require("./logistic-regression.js");
const logger_js_1 = require("../utils/logger.js");
/**
 * Generate enhanced synthetic data with more realistic correlations
 */
function generateEnhancedTrainingData(numSamples = 5000, seed) {
    const data = [];
    let random = Math.random;
    if (seed !== undefined) {
        let s = seed;
        random = () => {
            s = (s * 9301 + 49297) % 233280;
            return s / 233280;
        };
    }
    for (let i = 0; i < numSamples; i++) {
        // League-specific characteristics (some leagues are higher scoring)
        const leagueTier = Math.floor(random() * 5); // 0 = top tier (higher scoring)
        const leagueFactor = 1.2 - leagueTier * 0.05;
        // Home team stats with league adjustment
        const homeXGHome = (0.8 + random() * 2.2) * leagueFactor;
        const homeXGAHome = (0.6 + random() * 1.8) / leagueFactor;
        const homeCSRate = Math.max(0.1, Math.min(0.6, 0.35 - (homeXGHome - 1.5) * 0.1 + random() * 0.15));
        // Away team stats
        const awayXGAway = (0.6 + random() * 1.8) * leagueFactor;
        const awayXGAAway = (0.7 + random() * 2.3) / leagueFactor;
        const awayFTSRate = Math.max(0.1, Math.min(0.5, 0.25 - (awayXGAway - 1.2) * 0.08 + random() * 0.12));
        const leagueId = leagueTier * 10 + Math.floor(random() * 10);
        // Average goals with correlation to xG
        const homeAvgGoals = homeXGHome * (0.9 + random() * 0.2);
        const homeAvgConceded = homeXGAHome * (0.9 + random() * 0.2);
        const awayAvgGoals = awayXGAway * (0.9 + random() * 0.2);
        const awayAvgConceded = awayXGAAway * (0.9 + random() * 0.2);
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
        // More realistic outcome generation
        // Base probability influenced by combined xG
        const baseO25 = 0.35 + (combinedXG - 2.5) * 0.12;
        // Adjust for defensive weaknesses
        const o25Prob = Math.max(0.15, Math.min(0.85, baseO25 + (homeXGAHome + awayXGAAway - 2.5) * 0.05 + (1 - homeCSRate - awayFTSRate) * 0.1));
        const o25Label = random() < o25Prob ? 1 : 0;
        // BTTS probability
        const bttsBase = 0.40 + (homeXGHome * 0.08) + (awayXGAway * 0.07);
        const bttsProb = Math.max(0.20, Math.min(0.80, bttsBase - homeCSRate * 0.35 - awayFTSRate * 0.40 + (homeXGAHome + awayXGAAway) * 0.04));
        const bttsLabel = random() < bttsProb ? 1 : 0;
        data.push({ features, o25Label, bttsLabel });
    }
    return data;
}
/**
 * Add polynomial and interaction features
 */
function addPolynomialFeatures(features) {
    const enhanced = [...features];
    // Add squared terms for key features
    enhanced.push(features[0] ** 2); // homeXG^2
    enhanced.push(features[2] ** 2); // awayXG^2
    enhanced.push(features[6] ** 2); // combinedXG^2
    // Add interaction features
    enhanced.push(features[0] * features[2]); // homeXG * awayXG
    enhanced.push(features[0] * features[4]); // homeXG * homeCSRate
    enhanced.push(features[2] * features[5]); // awayXG * awayFTSRate
    enhanced.push(features[1] * features[3]); // homeXGA * awayXGA (defensive interaction)
    // Ratio features
    enhanced.push(features[0] / (features[2] + 0.1)); // homeXG / awayXG ratio
    enhanced.push(features[6] / 13); // normalized combinedXG
    return enhanced;
}
/**
 * Train model with L2 regularization
 */
function trainWithRegularization(trainingData, learningRate = 0.01, epochs = 2000, lambda = 0.01, // L2 regularization strength
label = 'Unknown') {
    const numFeatures = trainingData[0].features.length;
    // Initialize weights
    const weights = new Array(numFeatures).fill(0).map(() => (Math.random() - 0.5) * 0.1);
    let bias = 0;
    // Compute normalization
    const featureNorms = [];
    for (let f = 0; f < numFeatures; f++) {
        const values = trainingData.map(d => d.features[f]);
        const mean = values.reduce((a, b) => a + b, 0) / values.length;
        const variance = values.reduce((a, b) => a + (b - mean) ** 2, 0) / values.length;
        const std = Math.sqrt(variance) || 1;
        featureNorms.push({ mean, std });
    }
    // Normalize data
    const normalizedData = trainingData.map(d => ({
        features: (0, logistic_regression_js_1.normalizeFeatures)(d.features, featureNorms),
        label: d.label,
    }));
    // Gradient descent with L2 regularization
    for (let epoch = 0; epoch < epochs; epoch++) {
        let totalLoss = 0;
        const gradWeights = new Array(numFeatures).fill(0);
        let gradBias = 0;
        for (const sample of normalizedData) {
            let z = bias;
            for (let i = 0; i < numFeatures; i++) {
                z += sample.features[i] * weights[i];
            }
            // Sigmoid with numerical stability
            const prediction = 1 / (1 + Math.exp(-Math.max(-500, Math.min(500, z))));
            const error = prediction - sample.label;
            totalLoss += error * error;
            for (let i = 0; i < numFeatures; i++) {
                gradWeights[i] += error * sample.features[i];
            }
            gradBias += error;
        }
        // Update with L2 regularization
        const n = normalizedData.length;
        for (let i = 0; i < numFeatures; i++) {
            weights[i] -= learningRate * (gradWeights[i] / n + lambda * weights[i]);
        }
        bias -= learningRate * gradBias / n;
    }
    // Calculate metrics
    let correct = 0;
    for (const sample of normalizedData) {
        let z = bias;
        for (let i = 0; i < numFeatures; i++) {
            z += sample.features[i] * weights[i];
        }
        const pred = 1 / (1 + Math.exp(-z)) >= 0.5 ? 1 : 0;
        if (pred === sample.label)
            correct++;
    }
    const accuracy = correct / trainingData.length;
    logger_js_1.logger.success(`Model "${label}" trained with L2 reg (λ=${lambda}): accuracy=${(accuracy * 100).toFixed(1)}%, samples=${trainingData.length}`);
    return {
        weights,
        bias,
        featureNorms,
        label,
        metadata: {
            trainedOn: trainingData.length,
            accuracy,
            calibrationError: 0,
            trainedAt: new Date().toISOString(),
        },
    };
}
/**
 * Platt scaling for probability calibration
 */
function calibrateProbabilities(model, calibrationData) {
    // Fit logistic regression on model outputs
    const probs = calibrationData.map(d => (0, logistic_regression_js_1.predict)(d.features, model));
    const labels = calibrationData.map(d => d.label);
    // Simple Platt scaling: find optimal a, b such that calibrated_prob = sigmoid(a * prob + b)
    let a = 1.0;
    let b = 0.0;
    // Grid search for optimal parameters
    let bestNLL = Infinity;
    for (const testA of [0.5, 0.75, 1.0, 1.25, 1.5, 2.0]) {
        for (const testB of [-0.5, -0.25, 0, 0.25, 0.5]) {
            let nll = 0;
            for (let i = 0; i < probs.length; i++) {
                const calibrated = 1 / (1 + Math.exp(-(testA * probs[i] + testB)));
                const p = labels[i] === 1 ? calibrated : 1 - calibrated;
                nll -= Math.log(Math.max(p, 1e-10));
            }
            if (nll < bestNLL) {
                bestNLL = nll;
                a = testA;
                b = testB;
            }
        }
    }
    logger_js_1.logger.debug(`Platt scaling: a=${a.toFixed(3)}, b=${b.toFixed(3)}, NLL=${bestNLL.toFixed(3)}`);
    return { a, b };
}
/**
 * Apply calibration to model predictions
 */
function applyCalibration(prob, a, b) {
    return 1 / (1 + Math.exp(-(a * prob + b)));
}
/**
 * Train and calibrate model
 */
function trainAndCalibrate(trainData, valData, label, usePolyFeatures = false) {
    // Optionally add polynomial features
    const processedTrain = usePolyFeatures
        ? trainData.map(d => ({ features: addPolynomialFeatures(d.features), label: d.label }))
        : trainData;
    const processedVal = usePolyFeatures
        ? valData.map(d => ({ features: addPolynomialFeatures(d.features), label: d.label }))
        : valData;
    // Train with regularization
    const model = trainWithRegularization(processedTrain, 0.01, 2000, 0.005, label);
    // Calibrate on validation set
    const calibration = calibrateProbabilities(model, processedVal);
    const calibratedModel = {
        ...model,
        calibration,
    };
    // Evaluate calibrated model
    let correct = 0;
    for (const sample of processedVal) {
        const prob = (0, logistic_regression_js_1.predict)(sample.features, model);
        const calibratedProb = applyCalibration(prob, calibration.a, calibration.b);
        const pred = calibratedProb >= 0.5 ? 1 : 0;
        if (pred === sample.label)
            correct++;
    }
    const accuracy = correct / valData.length;
    logger_js_1.logger.success(`Calibrated ${label} model accuracy: ${(accuracy * 100).toFixed(1)}%`);
    return { model: calibratedModel, accuracy };
}
//# sourceMappingURL=advanced-trainer.js.map