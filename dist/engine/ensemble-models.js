export class RandomForestClassifier {
    trees = [];
    config;
    nFeatures = 0;
    constructor(config = {}) {
        this.config = {
            nTrees: config.nTrees || 100,
            maxDepth: config.maxDepth || 10,
            minSamplesSplit: config.minSamplesSplit || 2,
            minSamplesLeaf: config.minSamplesLeaf || 1,
            maxFeatures: config.maxFeatures || Math.sqrt(10), // Will be set during fit
            seed: config.seed
        };
    }
    fit(X, y) {
        const nSamples = X.length;
        const nFeatures = X[0].length;
        this.nFeatures = nFeatures;
        if (!this.config.maxFeatures) {
            this.config.maxFeatures = Math.floor(Math.sqrt(nFeatures));
        }
        console.log(`Training Random Forest with ${this.config.nTrees} trees...`);
        for (let i = 0; i < this.config.nTrees; i++) {
            // Bootstrap sample
            const bootstrapIndices = this.bootstrapSample(nSamples);
            const XBoot = bootstrapIndices.map(idx => X[idx]);
            const yBoot = bootstrapIndices.map(idx => y[idx]);
            // Train tree with feature randomness
            const tree = this.buildTree(XBoot, yBoot, 0);
            this.trees.push(tree);
            if ((i + 1) % 20 === 0) {
                console.log(`  Trained ${i + 1}/${this.config.nTrees} trees`);
            }
        }
    }
    bootstrapSample(n) {
        const indices = [];
        for (let i = 0; i < n; i++) {
            indices.push(Math.floor(Math.random() * n));
        }
        return indices;
    }
    buildTree(X, y, depth) {
        const nSamples = y.length;
        const nPos = y.filter(v => v === 1).length;
        const nNeg = nSamples - nPos;
        // Stopping conditions
        if (depth >= this.config.maxDepth ||
            nSamples < this.config.minSamplesSplit ||
            nPos === 0 || nNeg === 0 ||
            nSamples < this.config.minSamplesLeaf * 2) {
            return {
                isLeaf: true,
                value: nPos / nSamples
            };
        }
        // Select random features
        const featureIndices = [];
        while (featureIndices.length < this.config.maxFeatures) {
            const idx = Math.floor(Math.random() * this.nFeatures);
            if (!featureIndices.includes(idx)) {
                featureIndices.push(idx);
            }
        }
        // Find best split
        let bestFeature = 0;
        let bestThreshold = 0;
        let bestGain = -Infinity;
        for (const feature of featureIndices) {
            const values = [...new Set(X.map(row => row[feature]))].sort((a, b) => a - b);
            for (let i = 0; i < values.length - 1; i++) {
                const threshold = (values[i] + values[i + 1]) / 2;
                const gain = this.calculateGain(X, y, feature, threshold);
                if (gain > bestGain) {
                    bestGain = gain;
                    bestFeature = feature;
                    bestThreshold = threshold;
                }
            }
        }
        if (bestGain <= 0) {
            return {
                isLeaf: true,
                value: nPos / nSamples
            };
        }
        // Split data
        const leftIndices = [];
        const rightIndices = [];
        for (let i = 0; i < nSamples; i++) {
            if (X[i][bestFeature] <= bestThreshold) {
                leftIndices.push(i);
            }
            else {
                rightIndices.push(i);
            }
        }
        if (leftIndices.length === 0 || rightIndices.length === 0) {
            return {
                isLeaf: true,
                value: nPos / nSamples
            };
        }
        const XLeft = leftIndices.map(i => X[i]);
        const yLeft = leftIndices.map(i => y[i]);
        const XRight = rightIndices.map(i => X[i]);
        const yRight = rightIndices.map(i => y[i]);
        return {
            isLeaf: false,
            feature: bestFeature,
            threshold: bestThreshold,
            left: this.buildTree(XLeft, yLeft, depth + 1),
            right: this.buildTree(XRight, yRight, depth + 1)
        };
    }
    calculateGain(X, y, feature, threshold) {
        const nSamples = y.length;
        const parentEntropy = this.entropy(y);
        const leftY = [];
        const rightY = [];
        for (let i = 0; i < nSamples; i++) {
            if (X[i][feature] <= threshold) {
                leftY.push(y[i]);
            }
            else {
                rightY.push(y[i]);
            }
        }
        if (leftY.length === 0 || rightY.length === 0) {
            return 0;
        }
        const leftEntropy = this.entropy(leftY);
        const rightEntropy = this.entropy(rightY);
        const weightedChildEntropy = (leftY.length * leftEntropy + rightY.length * rightEntropy) / nSamples;
        return parentEntropy - weightedChildEntropy;
    }
    entropy(y) {
        const n = y.length;
        if (n === 0)
            return 0;
        const p = y.filter(v => v === 1).length / n;
        if (p === 0 || p === 1)
            return 0;
        return -p * Math.log2(p) - (1 - p) * Math.log2(1 - p);
    }
    predict(X) {
        const probs = this.predictProb(X);
        return probs.map(p => p >= 0.5 ? 1 : 0);
    }
    predictProb(X) {
        const allProbs = [];
        for (const row of X) {
            const treeProbs = [];
            for (const tree of this.trees) {
                treeProbs.push(this.predictTree(tree, row));
            }
            // Average predictions from all trees
            allProbs.push([treeProbs.reduce((a, b) => a + b, 0) / treeProbs.length]);
        }
        return allProbs.map(p => p[0]);
    }
    predictTree(node, row) {
        if (node.isLeaf) {
            return node.value;
        }
        if (row[node.feature] <= node.threshold) {
            return this.predictTree(node.left, row);
        }
        else {
            return this.predictTree(node.right, row);
        }
    }
}
export class GradientBoostingClassifier {
    trees = [];
    initialPrediction = 0;
    config;
    constructor(config = {}) {
        this.config = {
            nTrees: config.nTrees || 100,
            learningRate: config.learningRate || 0.1,
            maxDepth: config.maxDepth || 3,
            minSamplesSplit: config.minSamplesSplit || 2
        };
    }
    fit(X, y) {
        const nSamples = X.length;
        // Initialize with log odds
        const nPos = y.filter(v => v === 1).length;
        this.initialPrediction = Math.log(nPos / (nSamples - nPos));
        let predictions = Array(nSamples).fill(this.initialPrediction);
        console.log(`Training Gradient Boosting with ${this.config.nTrees} trees...`);
        for (let i = 0; i < this.config.nTrees; i++) {
            // Calculate residuals (gradient of log loss)
            const probs = predictions.map(p => 1 / (1 + Math.exp(-p)));
            const residuals = y.map((val, idx) => val - probs[idx]);
            // Fit tree to residuals
            const tree = this.fitRegressionTree(X, residuals);
            this.trees.push(tree);
            // Update predictions
            for (let j = 0; j < nSamples; j++) {
                const leafValue = this.predictTreeValue(tree, X[j]);
                predictions[j] += this.config.learningRate * leafValue;
            }
            if ((i + 1) % 20 === 0) {
                console.log(`  Trained ${i + 1}/${this.config.nTrees} trees`);
            }
        }
    }
    fitRegressionTree(X, y, depth = 0) {
        const nSamples = y.length;
        if (depth >= this.config.maxDepth || nSamples < this.config.minSamplesSplit) {
            return {
                isLeaf: true,
                value: y.reduce((a, b) => a + b, 0) / nSamples
            };
        }
        // Find best split (MSE reduction)
        let bestFeature = 0;
        let bestThreshold = 0;
        let bestMSE = Infinity;
        const nFeatures = X[0].length;
        const parentMSE = this.mse(y);
        for (let feature = 0; feature < nFeatures; feature++) {
            const values = [...new Set(X.map(row => row[feature]))].sort((a, b) => a - b);
            for (let i = 0; i < values.length - 1; i++) {
                const threshold = (values[i] + values[i + 1]) / 2;
                const leftY = [];
                const rightY = [];
                for (let j = 0; j < nSamples; j++) {
                    if (X[j][feature] <= threshold) {
                        leftY.push(y[j]);
                    }
                    else {
                        rightY.push(y[j]);
                    }
                }
                if (leftY.length === 0 || rightY.length === 0)
                    continue;
                const weightedMSE = (leftY.length * this.mse(leftY) + rightY.length * this.mse(rightY)) / nSamples;
                if (weightedMSE < bestMSE) {
                    bestMSE = weightedMSE;
                    bestFeature = feature;
                    bestThreshold = threshold;
                }
            }
        }
        if (bestMSE >= parentMSE) {
            return {
                isLeaf: true,
                value: y.reduce((a, b) => a + b, 0) / nSamples
            };
        }
        const leftIndices = [];
        const rightIndices = [];
        for (let i = 0; i < nSamples; i++) {
            if (X[i][bestFeature] <= bestThreshold) {
                leftIndices.push(i);
            }
            else {
                rightIndices.push(i);
            }
        }
        const XLeft = leftIndices.map(i => X[i]);
        const yLeft = leftIndices.map(i => y[i]);
        const XRight = rightIndices.map(i => X[i]);
        const yRight = rightIndices.map(i => y[i]);
        return {
            isLeaf: false,
            feature: bestFeature,
            threshold: bestThreshold,
            left: this.fitRegressionTree(XLeft, yLeft, depth + 1),
            right: this.fitRegressionTree(XRight, yRight, depth + 1)
        };
    }
    mse(y) {
        const mean = y.reduce((a, b) => a + b, 0) / y.length;
        return y.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / y.length;
    }
    predictTreeValue(node, row) {
        if (node.isLeaf) {
            return node.value;
        }
        if (row[node.feature] <= node.threshold) {
            return this.predictTreeValue(node.left, row);
        }
        else {
            return this.predictTreeValue(node.right, row);
        }
    }
    predict(X) {
        const probs = this.predictProb(X);
        return probs.map(p => p >= 0.5 ? 1 : 0);
    }
    predictProb(X) {
        const predictions = X.map(row => {
            let pred = this.initialPrediction;
            for (const tree of this.trees) {
                pred += this.config.learningRate * this.predictTreeValue(tree, row);
            }
            return 1 / (1 + Math.exp(-pred));
        });
        return predictions;
    }
}
//# sourceMappingURL=ensemble-models.js.map