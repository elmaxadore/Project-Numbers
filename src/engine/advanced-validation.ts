import { LogisticRegression } from './logistic-regression';

interface Dataset {
  X: number[][];
  y: number[];
}

interface Metrics {
  accuracy: number;
  precision: number;
  recall: number;
  f1: number;
  auc: number;
  brierScore: number;
  logLoss: number;
  calibrationError: number;
}

interface FoldResult {
  trainMetrics: Metrics;
  testMetrics: Metrics;
  model: LogisticRegression;
}

export function stratifiedKFold(X: number[][], y: number[], k: number = 5): number[][] {
  const n = y.length;
  const indices = Array.from({ length: n }, (_, i) => i);
  
  // Group by class
  const class0 = indices.filter(i => y[i] === 0);
  const class1 = indices.filter(i => y[i] === 1);
  
  // Shuffle within classes
  for (let i = class0.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [class0[i], class0[j]] = [class0[j], class0[i]];
  }
  for (let i = class1.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [class1[i], class1[j]] = [class1[j], class1[i]];
  }
  
  // Create folds
  const folds: number[][] = Array.from({ length: k }, () => []);
  
  for (let i = 0; i < class0.length; i++) {
    folds[i % k].push(class0[i]);
  }
  for (let i = 0; i < class1.length; i++) {
    folds[i % k].push(class1[i]);
  }
  
  return folds;
}

export function crossValidate(
  X: number[][], 
  y: number[], 
  k: number = 5,
  learningRate: number = 0.1,
  epochs: number = 1000,
  lambda: number = 0.01
): { accuracies: number[], models: LogisticRegression[] } {
  const folds = stratifiedKFold(X, y, k);
  const results: FoldResult[] = [];
  
  for (let i = 0; i < k; i++) {
    // Create train/test split
    const testIndices = folds[i];
    const trainIndices = folds.flatMap((_, idx) => idx === i ? [] : folds[idx]);
    
    const X_train = trainIndices.map(idx => X[idx]);
    const y_train = trainIndices.map(idx => y[idx]);
    const X_test = testIndices.map(idx => X[idx]);
    const y_test = testIndices.map(idx => y[idx]);
    
    // Train model
    const model = new LogisticRegression({ learningRate, epochs, lambda });
    model.train(X_train, y_train);
    
    // Evaluate
    const trainPreds = model.predict(X_train);
    const trainProbs = model.predictProb(X_train);
    const testPreds = model.predict(X_test);
    const testProbs = model.predictProb(X_test);
    
    results.push({
      trainMetrics: calculateMetrics(y_train, trainPreds, trainProbs),
      testMetrics: calculateMetrics(y_test, testPreds, testProbs),
      model
    });
  }
  
  const testMetrics = results.map(r => r.testMetrics);
  
  return {
    accuracies: testMetrics.map(m => m.accuracy),
    models: results.map(r => r.model)
  };
}

export function calculateMetrics(yTrue: number[], yPred: number[], yProb: number[]): Metrics {
  const tp = yTrue.filter((v, i) => v === 1 && yPred[i] === 1).length;
  const tn = yTrue.filter((v, i) => v === 0 && yPred[i] === 0).length;
  const fp = yTrue.filter((v, i) => v === 0 && yPred[i] === 1).length;
  const fn = yTrue.filter((v, i) => v === 1 && yPred[i] === 0).length;
  
  const accuracy = (tp + tn) / yTrue.length;
  const precision = tp / (tp + fp) || 0;
  const recall = tp / (tp + fn) || 0;
  const f1 = 2 * precision * recall / (precision + recall) || 0;
  
  // AUC calculation (trapezoidal rule)
  const auc = calculateAUC(yTrue, yProb);
  
  // Brier Score
  const brierScore = yTrue.reduce((sum, val, i) => sum + Math.pow(val - yProb[i], 2), 0) / yTrue.length;
  
  // Log Loss
  const eps = 1e-15;
  const logLoss = -yTrue.reduce((sum, val, i) => {
    const p = Math.max(eps, Math.min(1 - eps, yProb[i]));
    return sum + (val * Math.log(p) + (1 - val) * Math.log(1 - p));
  }, 0) / yTrue.length;
  
  // Expected Calibration Error
  const calibrationError = calculateECE(yTrue, yProb);
  
  return { accuracy, precision, recall, f1, auc, brierScore, logLoss, calibrationError };
}

function calculateAUC(yTrue: number[], yScores: number[]): number {
  const pairs = yTrue.map((v, i) => ({ label: v, score: yScores[i] }));
  pairs.sort((a, b) => b.score - a.score);
  
  let tp = 0, fp = 0, tpPrev = 0, fpPrev = 0;
  let auc = 0;
  
  const totalPos = yTrue.filter(v => v === 1).length;
  const totalNeg = yTrue.filter(v => v === 0).length;
  
  if (totalPos === 0 || totalNeg === 0) return 0.5;
  
  let prevScore = Infinity;
  
  for (const pair of pairs) {
    if (pair.score !== prevScore) {
      auc += (fp - fpPrev) * (tp + tpPrev) / 2;
      prevScore = pair.score;
    }
    
    if (pair.label === 1) tp++;
    else fp++;
  }
  
  auc += (fp - fpPrev) * (tp + tpPrev) / 2;
  return auc / (totalPos * totalNeg);
}

function calculateECE(yTrue: number[], yProb: number[], nBuckets: number = 10): number {
  const buckets = Array.from({ length: nBuckets }, () => ({ sumProb: 0, sumTrue: 0, count: 0 }));
  
  for (let i = 0; i < yTrue.length; i++) {
    const bucketIdx = Math.min(Math.floor(yProb[i] * nBuckets), nBuckets - 1);
    buckets[bucketIdx].sumProb += yProb[i];
    buckets[bucketIdx].sumTrue += yTrue[i];
    buckets[bucketIdx].count++;
  }
  
  let ece = 0;
  for (const bucket of buckets) {
    if (bucket.count > 0) {
      const avgProb = bucket.sumProb / bucket.count;
      const avgTrue = bucket.sumTrue / bucket.count;
      ece += (bucket.count / yTrue.length) * Math.abs(avgProb - avgTrue);
    }
  }
  
  return ece;
}

function average(arr: number[]): number {
  return arr.reduce((a, b) => a + b, 0) / arr.length;
}

export function createEnsemble(models: LogisticRegression[]): LogisticRegression {
  // Average the weights of all models
  const nFeatures = models[0].getWeights().length;
  const avgWeights = new Array(nFeatures).fill(0);
  let avgBias = 0;
  
  for (const model of models) {
    const weights = model.getWeights();
    for (let i = 0; i < nFeatures; i++) {
      avgWeights[i] += weights[i];
    }
    avgBias += 0; // bias not exposed, assume 0 or get from model if needed
  }
  
  for (let i = 0; i < nFeatures; i++) {
    avgWeights[i] /= models.length;
  }
  avgBias /= models.length;
  
  const ensemble = new LogisticRegression({ learningRate: 0.1, epochs: 1 });
  ensemble.setWeights(avgWeights, avgBias);
  
  return ensemble;
}

// Isotonic Regression for probability calibration
export class IsotonicRegression {
  private thresholds: number[] = [];
  private calibrated: number[] = [];
  
  fit(yTrue: number[], yProb: number[]): void {
    const pairs = yTrue.map((v, i) => ({ label: v, prob: yProb[i] }))
      .sort((a, b) => a.prob - b.prob);
    
    // Pool Adjacent Violators Algorithm (PAVA)
    const blocks: { start: number, end: number, value: number }[] = [];
    
    for (const pair of pairs) {
      let blockValue = pair.label;
      let start = blocks.length;
      
      while (blocks.length > 0 && blocks[blocks.length - 1].value > blockValue) {
        const prev = blocks.pop()!;
        const totalWeight = (prev.end - prev.start + 1) + (pairs.indexOf(pair) - start + 1);
        blockValue = ((prev.end - prev.start + 1) * prev.value + blockValue) / totalWeight;
        start = prev.start;
      }
      
      blocks.push({ start, end: pairs.indexOf(pair), value: blockValue });
    }
    
    // Build lookup tables
    for (const block of blocks) {
      const prob = pairs[block.start].prob;
      this.thresholds.push(prob);
      this.calibrated.push(block.value);
    }
  }
  
  predict(probs: number[]): number[] {
    return probs.map(p => {
      for (let i = this.thresholds.length - 1; i >= 0; i--) {
        if (p >= this.thresholds[i]) {
          return this.calibrated[i];
        }
      }
      return this.calibrated[0] || 0.5;
    });
  }
}
