import { OutcomeFeatureExtractor } from './outcome-feature-extractor.js';
export class MultinomialLogisticRegression {
    weights = []; // [3 classes][nFeatures]
    biases = [0, 0, 0];
    featureMeans = [];
    featureStds = [];
    isTrained = false;
    learningRate = 0.1;
    epochs = 100;
    lambda = 0.01; // L2 regularization
    train(features, labels) {
        const nSamples = features.length;
        const nFeatures = features[0].length;
        const nClasses = 3; // Home, Draw, Away
        // Normalize features
        this.featureMeans = new Array(nFeatures).fill(0);
        for (const feat of features) {
            for (let j = 0; j < nFeatures; j++) {
                this.featureMeans[j] += feat[j];
            }
        }
        for (let j = 0; j < nFeatures; j++) {
            this.featureMeans[j] /= nSamples;
        }
        this.featureStds = new Array(nFeatures).fill(0);
        for (const feat of features) {
            for (let j = 0; j < nFeatures; j++) {
                this.featureStds[j] += Math.pow(feat[j] - this.featureMeans[j], 2);
            }
        }
        for (let j = 0; j < nFeatures; j++) {
            this.featureStds[j] = Math.sqrt(this.featureStds[j] / nSamples) || 1;
        }
        const normalizedFeatures = features.map(f => f.map((val, j) => (val - this.featureMeans[j]) / this.featureStds[j]));
        // Initialize weights with Xavier initialization
        this.weights = [];
        for (let c = 0; c < nClasses; c++) {
            const row = [];
            for (let j = 0; j < nFeatures; j++) {
                row.push((Math.random() - 0.5) * 0.01);
            }
            this.weights.push(row);
        }
        this.biases = [0, 0, 0];
        // Softmax regression training
        for (let epoch = 0; epoch < this.epochs; epoch++) {
            let totalLoss = 0;
            // Gradient accumulators
            const gradWeights = this.weights.map(w => new Array(w.length).fill(0));
            const gradBiases = [0, 0, 0];
            for (let i = 0; i < nSamples; i++) {
                const x = normalizedFeatures[i];
                const y = labels[i];
                // Forward pass - compute logits
                const logits = this.weights.map((w, c) => w.reduce((sum, wj, j) => sum + wj * x[j], this.biases[c]));
                // Softmax
                const maxLogit = Math.max(...logits);
                const expLogits = logits.map(l => Math.exp(l - maxLogit));
                const sumExp = expLogits.reduce((a, b) => a + b, 0);
                const probs = expLogits.map(e => e / sumExp);
                // Cross-entropy loss
                totalLoss -= Math.log(probs[y] + 1e-10);
                // Backward pass - compute gradients
                for (let c = 0; c < nClasses; c++) {
                    const error = probs[c] - (c === y ? 1 : 0);
                    gradBiases[c] += error;
                    for (let j = 0; j < nFeatures; j++) {
                        gradWeights[c][j] += error * x[j];
                    }
                }
            }
            // Update weights with L2 regularization
            for (let c = 0; c < nClasses; c++) {
                this.biases[c] -= this.learningRate * gradBiases[c] / nSamples;
                for (let j = 0; j < nFeatures; j++) {
                    const grad = gradWeights[c][j] / nSamples + this.lambda * this.weights[c][j];
                    this.weights[c][j] -= this.learningRate * grad;
                }
            }
        }
        this.isTrained = true;
    }
    predict(features) {
        if (!this.isTrained) {
            return [0.33, 0.33, 0.34];
        }
        // Normalize
        const normalized = features.map((val, j) => (val - this.featureMeans[j]) / this.featureStds[j]);
        // Compute logits
        const logits = this.weights.map((w, c) => w.reduce((sum, wj, j) => sum + wj * normalized[j], this.biases[c]));
        // Softmax
        const maxLogit = Math.max(...logits);
        const expLogits = logits.map(l => Math.exp(l - maxLogit));
        const sumExp = expLogits.reduce((a, b) => a + b, 0);
        const probs = expLogits.map(e => e / sumExp);
        return probs;
    }
    getWeights() {
        return {
            weights: this.weights,
            biases: this.biases,
            means: this.featureMeans,
            stds: this.featureStds
        };
    }
    setWeights(weights, biases, means, stds) {
        this.weights = weights;
        this.biases = biases;
        this.featureMeans = means;
        this.featureStds = stds;
        this.isTrained = true;
    }
}
export class OutcomeModel {
    model = new MultinomialLogisticRegression();
    featureExtractor = new OutcomeFeatureExtractor();
    calibrationSlopes = [1, 1, 1];
    calibrationIntercepts = [0, 0, 0];
    train(matches) {
        // Sort by date
        const sortedMatches = [...matches].sort((a, b) => a.date.getTime() - b.date.getTime());
        const features = [];
        const labels = []; // 0=Home, 1=Draw, 2=Away
        // Use time-series split: train on first 80%, test on last 20%
        const splitIndex = Math.floor(sortedMatches.length * 0.8);
        const trainMatches = sortedMatches.slice(0, splitIndex);
        const testMatches = sortedMatches.slice(splitIndex);
        console.log(`Training on ${trainMatches.length} matches, testing on ${testMatches.length} matches`);
        // Extract features for training
        for (const match of trainMatches) {
            if (match.result === undefined)
                continue;
            const historicalContext = sortedMatches.filter(m => m.date < match.date);
            const feats = this.featureExtractor.extractFeatures(match, historicalContext);
            if (feats) {
                const featureVector = this.featuresToArray(feats);
                features.push(featureVector);
                if (match.result === 'H')
                    labels.push(0);
                else if (match.result === 'D')
                    labels.push(1);
                else
                    labels.push(2);
            }
        }
        if (features.length < 100) {
            throw new Error('Not enough training data');
        }
        // Train model
        this.model.train(features, labels);
        // Calibrate probabilities (simple temperature scaling)
        this.calibrate(trainMatches, sortedMatches);
        // Evaluate on test set
        const results = this.evaluate(testMatches, sortedMatches);
        return results;
    }
    calibrate(trainMatches, allMatches) {
        // Simple calibration: adjust based on observed vs predicted frequencies
        const predictions = [];
        const actuals = [];
        for (const match of trainMatches) {
            if (match.result === undefined)
                continue;
            const historicalContext = allMatches.filter(m => m.date < match.date);
            const feats = this.featureExtractor.extractFeatures(match, historicalContext);
            if (feats) {
                const featureVector = this.featuresToArray(feats);
                const probs = this.model.predict(featureVector);
                predictions.push(probs);
                if (match.result === 'H')
                    actuals.push(0);
                else if (match.result === 'D')
                    actuals.push(1);
                else
                    actuals.push(2);
            }
        }
        // Calculate calibration adjustments (simplified)
        for (let c = 0; c < 3; c++) {
            const avgPred = predictions.reduce((sum, p) => sum + p[c], 0) / predictions.length;
            const avgActual = actuals.filter(a => a === c).length / actuals.length;
            if (avgPred > 0.01) {
                this.calibrationSlopes[c] = avgActual / avgPred;
                this.calibrationSlopes[c] = Math.max(0.5, Math.min(2.0, this.calibrationSlopes[c]));
            }
        }
    }
    evaluate(testMatches, allMatches) {
        let correct = 0;
        const confusionMatrix = [
            [0, 0, 0], // Actual Home
            [0, 0, 0], // Actual Draw
            [0, 0, 0] // Actual Away
        ];
        for (const match of testMatches) {
            if (match.result === undefined)
                continue;
            const historicalContext = allMatches.filter(m => m.date < match.date);
            const feats = this.featureExtractor.extractFeatures(match, historicalContext);
            if (!feats)
                continue;
            const featureVector = this.featuresToArray(feats);
            const [homeProb, drawProb, awayProb] = this.model.predict(featureVector);
            // Apply calibration
            const calibratedProbs = this.applyCalibration([homeProb, drawProb, awayProb]);
            const predicted = calibratedProbs.indexOf(Math.max(...calibratedProbs));
            let actual;
            if (match.result === 'H')
                actual = 0;
            else if (match.result === 'D')
                actual = 1;
            else
                actual = 2;
            confusionMatrix[actual][predicted]++;
            if (predicted === actual) {
                correct++;
            }
        }
        const total = testMatches.filter(m => m.result !== undefined).length;
        const accuracy = total > 0 ? correct / total : 0;
        console.log('\nConfusion Matrix:');
        console.log('           Pred H  Pred D  Pred A');
        console.log(`Actual H   ${confusionMatrix[0][0].toString().padStart(6)}  ${confusionMatrix[0][1].toString().padStart(6)}  ${confusionMatrix[0][2].toString().padStart(6)}`);
        console.log(`Actual D   ${confusionMatrix[1][0].toString().padStart(6)}  ${confusionMatrix[1][1].toString().padStart(6)}  ${confusionMatrix[1][2].toString().padStart(6)}`);
        console.log(`Actual A   ${confusionMatrix[2][0].toString().padStart(6)}  ${confusionMatrix[2][1].toString().padStart(6)}  ${confusionMatrix[2][2].toString().padStart(6)}`);
        console.log(`\nTest Accuracy: ${(accuracy * 100).toFixed(2)}%`);
        return { accuracy, confusionMatrix };
    }
    predictMatch(match, historicalData) {
        const feats = this.featureExtractor.extractFeatures(match, historicalData);
        if (!feats) {
            return null;
        }
        const featureVector = this.featuresToArray(feats);
        const [homeProb, drawProb, awayProb] = this.model.predict(featureVector);
        // Apply calibration
        const calibrated = this.applyCalibration([homeProb, drawProb, awayProb]);
        // Determine prediction
        const maxProb = Math.max(...calibrated);
        let predictedOutcome = 'H';
        if (calibrated[1] === maxProb)
            predictedOutcome = 'D';
        else if (calibrated[2] === maxProb)
            predictedOutcome = 'A';
        // Calculate confidence (0-100)
        // Confidence is based on how much the top probability exceeds the others
        const sortedProbs = [...calibrated].sort((a, b) => b - a);
        const confidence = Math.min(100, Math.max(0, (sortedProbs[0] - sortedProbs[1]) * 200 + // Gap between top 2
            (sortedProbs[0] - 0.33) * 100 // How much above random
        ));
        return {
            homeProb: calibrated[0],
            drawProb: calibrated[1],
            awayProb: calibrated[2],
            confidence: Math.round(confidence),
            predictedOutcome
        };
    }
    applyCalibration(probs) {
        const calibrated = probs.map((p, c) => p * this.calibrationSlopes[c] + this.calibrationIntercepts[c]);
        // Renormalize to sum to 1
        const sum = calibrated.reduce((a, b) => a + b, 0);
        return calibrated.map(p => p / sum);
    }
    featuresToArray(feats) {
        return [
            feats.homeElo,
            feats.awayElo,
            feats.eloDiff,
            feats.homeFormPoints,
            feats.awayFormPoints,
            feats.homeFormGoalsFor,
            feats.homeFormGoalsAgainst,
            feats.awayFormGoalsFor,
            feats.awayFormGoalsAgainst,
            feats.homeGoalsPerGame,
            feats.awayGoalsPerGame,
            feats.homeGoalsConcededPerGame,
            feats.awayGoalsConcededPerGame,
            feats.homeShotsPerGame,
            feats.awayShotsPerGame,
            feats.homeShotsOnTargetPerGame,
            feats.awayShotsOnTargetPerGame,
            feats.h2hHomeWins,
            feats.h2hDraws,
            feats.h2hAwayWins,
            feats.impliedHomeProb,
            feats.impliedDrawProb,
            feats.impliedAwayProb,
            feats.marketMargin,
            feats.isWeekend ? 1 : 0,
            feats.daysSinceLastGame
        ];
    }
}
//# sourceMappingURL=outcome-model.js.map