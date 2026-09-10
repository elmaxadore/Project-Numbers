interface DecisionTree {
  feature?: number;
  threshold?: number;
  left?: DecisionTree;
  right?: DecisionTree;
  value?: number; // Leaf prediction probability
  isLeaf: boolean;
}

interface RandomForestConfig {
  nTrees: number;
  maxDepth: number;
  minSamplesSplit: number;
  minSamplesLeaf: number;
  maxFeatures: number;
  seed?: number;
}

export class RandomForestClassifier {
  private trees: DecisionTree[] = [];
  private config: RandomForestConfig;
  private nFeatures: number = 0;

  constructor(config: Partial<RandomForestConfig> = {}) {
    this.config = {
      nTrees: config.nTrees || 100,
      maxDepth: config.maxDepth || 10,
      minSamplesSplit: config.minSamplesSplit || 2,
      minSamplesLeaf: config.minSamplesLeaf || 1,
      maxFeatures: config.maxFeatures || Math.sqrt(10), // Will be set during fit
      seed: config.seed
    };
  }

  fit(X: number[][], y: number[]): void {
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

  private bootstrapSample(n: number): number[] {
    const indices: number[] = [];
    for (let i = 0; i < n; i++) {
      indices.push(Math.floor(Math.random() * n));
    }
    return indices;
  }

  private buildTree(X: number[][], y: number[], depth: number): DecisionTree {
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
    const featureIndices: number[] = [];
    while (featureIndices.length < this.config.maxFeatures!) {
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
    const leftIndices: number[] = [];
    const rightIndices: number[] = [];
    
    for (let i = 0; i < nSamples; i++) {
      if (X[i][bestFeature] <= bestThreshold) {
        leftIndices.push(i);
      } else {
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

  private calculateGain(X: number[][], y: number[], feature: number, threshold: number): number {
    const nSamples = y.length;
    const parentEntropy = this.entropy(y);
    
    const leftY: number[] = [];
    const rightY: number[] = [];
    
    for (let i = 0; i < nSamples; i++) {
      if (X[i][feature] <= threshold) {
        leftY.push(y[i]);
      } else {
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

  private entropy(y: number[]): number {
    const n = y.length;
    if (n === 0) return 0;
    
    const p = y.filter(v => v === 1).length / n;
    if (p === 0 || p === 1) return 0;
    
    return -p * Math.log2(p) - (1 - p) * Math.log2(1 - p);
  }

  predict(X: number[][]): number[] {
    const probs = this.predictProb(X);
    return probs.map(p => p >= 0.5 ? 1 : 0);
  }

  predictProb(X: number[][]): number[] {
    const allProbs: number[][] = [];
    
    for (const row of X) {
      const treeProbs: number[] = [];
      
      for (const tree of this.trees) {
        treeProbs.push(this.predictTree(tree, row));
      }
      
      // Average predictions from all trees
      allProbs.push([treeProbs.reduce((a, b) => a + b, 0) / treeProbs.length]);
    }
    
    return allProbs.map(p => p[0]);
  }

  private predictTree(node: DecisionTree, row: number[]): number {
    if (node.isLeaf) {
      return node.value!;
    }
    
    if (row[node.feature!] <= node.threshold!) {
      return this.predictTree(node.left!, row);
    } else {
      return this.predictTree(node.right!, row);
    }
  }
}

// Gradient Boosting Classifier (Simplified)
interface GradientBoostingConfig {
  nTrees: number;
  learningRate: number;
  maxDepth: number;
  minSamplesSplit: number;
}

export class GradientBoostingClassifier {
  private trees: DecisionTree[] = [];
  private initialPrediction: number = 0;
  private config: GradientBoostingConfig;

  constructor(config: Partial<GradientBoostingConfig> = {}) {
    this.config = {
      nTrees: config.nTrees || 100,
      learningRate: config.learningRate || 0.1,
      maxDepth: config.maxDepth || 3,
      minSamplesSplit: config.minSamplesSplit || 2
    };
  }

  fit(X: number[][], y: number[]): void {
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

  private fitRegressionTree(X: number[][], y: number[], depth: number = 0): DecisionTree {
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
        const leftY: number[] = [];
        const rightY: number[] = [];
        
        for (let j = 0; j < nSamples; j++) {
          if (X[j][feature] <= threshold) {
            leftY.push(y[j]);
          } else {
            rightY.push(y[j]);
          }
        }
        
        if (leftY.length === 0 || rightY.length === 0) continue;
        
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

    const leftIndices: number[] = [];
    const rightIndices: number[] = [];
    
    for (let i = 0; i < nSamples; i++) {
      if (X[i][bestFeature] <= bestThreshold) {
        leftIndices.push(i);
      } else {
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

  private mse(y: number[]): number {
    const mean = y.reduce((a, b) => a + b, 0) / y.length;
    return y.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / y.length;
  }

  private predictTreeValue(node: DecisionTree, row: number[]): number {
    if (node.isLeaf) {
      return node.value!;
    }
    
    if (row[node.feature!] <= node.threshold!) {
      return this.predictTreeValue(node.left!, row);
    } else {
      return this.predictTreeValue(node.right!, row);
    }
  }

  predict(X: number[][]): number[] {
    const probs = this.predictProb(X);
    return probs.map(p => p >= 0.5 ? 1 : 0);
  }

  predictProb(X: number[][]): number[] {
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
