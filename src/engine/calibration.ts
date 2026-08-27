// ============================================================
// Model Calibration
// Ensures predicted probabilities match real-world frequencies
// Critical for betting: calibration > accuracy
// ============================================================

import { logger } from '../utils/logger.js';

/**
 * Calibration bin: groups predictions by probability range
 */
export interface CalibrationBin {
  lowerBound: number;
  upperBound: number;
  predictedMean: number;  // average model prediction
  actualFrequency: number; // actual outcome rate
  count: number;
}

/**
 * Calibration result
 */
export interface CalibrationResult {
  bins: CalibrationBin[];
  brierScore: number;       // lower is better (0-1)
  expectedCalibrationError: number; // lower is better
  maximumCalibrationError: number;
  isWellCalibrated: boolean; // ECE < 0.05
}

/**
 * Perform isotonic calibration on model predictions
 * Maps raw model outputs to calibrated probabilities using
 * a monotonic regression approach
 */
export function isotonicCalibration(
  predictions: number[],
  actuals: number[],
  numBins: number = 10
): CalibrationResult {
  if (predictions.length !== actuals.length) {
    throw new Error('Predictions and actuals must have the same length');
  }

  const n = predictions.length;

  // Sort by predicted probability
  const indexed = predictions.map((p, i) => ({
    predicted: p,
    actual: actuals[i],
  }));
  indexed.sort((a, b) => a.predicted - b.predicted);

  // Create calibration bins
  const bins: CalibrationBin[] = [];
  const binSize = Math.ceil(n / numBins);

  for (let b = 0; b < numBins; b++) {
    const start = b * binSize;
    const end = Math.min(start + binSize, n);
    if (start >= n) break;

    const binSlice = indexed.slice(start, end);
    const lowerBound = binSlice[0].predicted;
    const upperBound = binSlice[binSlice.length - 1].predicted;
    const predictedMean = binSlice.reduce((sum, x) => sum + x.predicted, 0) / binSlice.length;
    const actualFrequency = binSlice.reduce((sum, x) => sum + x.actual, 0) / binSlice.length;

    bins.push({
      lowerBound,
      upperBound,
      predictedMean,
      actualFrequency,
      count: binSlice.length,
    });
  }

  // Calculate Brier score
  let brierSum = 0;
  for (let i = 0; i < n; i++) {
    brierSum += (predictions[i] - actuals[i]) ** 2;
  }
  const brierScore = brierSum / n;

  // Calculate Expected Calibration Error (ECE)
  let eceSum = 0;
  let maxCE = 0;
  for (const bin of bins) {
    if (bin.count === 0) continue;
    const weight = bin.count / n;
    const calError = Math.abs(bin.predictedMean - bin.actualFrequency);
    eceSum += weight * calError;
    maxCE = Math.max(maxCE, calError);
  }

  const isWellCalibrated = eceSum < 0.05;

  return {
    bins,
    brierScore,
    expectedCalibrationError: eceSum,
    maximumCalibrationError: maxCE,
    isWellCalibrated,
  };
}

/**
 * Apply calibration mapping to a raw prediction
 * Uses piecewise linear interpolation from calibration bins
 */
export function calibrateProbability(
  rawProbability: number,
  calibrationBins: CalibrationBin[]
): number {
  if (calibrationBins.length === 0) return rawProbability;

  // Find the bin that contains this probability
  for (const bin of calibrationBins) {
    if (rawProbability >= bin.lowerBound && rawProbability <= bin.upperBound) {
      if (bin.predictedMean === bin.lowerBound) {
        return bin.actualFrequency;
      }
      // Interpolate within the bin
      const t = (rawProbability - bin.lowerBound) / (bin.upperBound - bin.lowerBound);
      return bin.lowerBound + t * (bin.actualFrequency - bin.predictedMean);
    }
  }

  // If outside all bins, use nearest bin
  const nearest = calibrationBins.reduce((best, bin) => {
    const dist = Math.abs(rawProbability - bin.predictedMean);
    const bestDist = Math.abs(rawProbability - best.predictedMean);
    return dist < bestDist ? bin : best;
  });

  return nearest.actualFrequency;
}

/**
 * Analyze model calibration and log results
 */
export function analyzeCalibration(result: CalibrationResult): void {
  logger.info('=== Calibration Analysis ===');
  logger.info(`Brier Score: ${result.brierScore.toFixed(4)} (lower is better, 0 = perfect)`);
  logger.info(`Expected Calibration Error: ${(result.expectedCalibrationError * 100).toFixed(2)}%`);
  logger.info(`Maximum Calibration Error: ${(result.maximumCalibrationError * 100).toFixed(2)}%`);
  logger.info(`Well Calibrated: ${result.isWellCalibrated ? '✅ Yes' : '❌ No (needs recalibration)'}`);

  logger.info('\nCalibration Bins:');
  for (const bin of result.bins) {
    const gap = Math.abs(bin.predictedMean - bin.actualFrequency);
    const indicator = gap < 0.05 ? '✅' : gap < 0.10 ? '⚠️' : '❌';
    logger.info(
      `  ${indicator} [${(bin.predictedMean * 100).toFixed(1)}%] → actual ${(bin.actualFrequency * 100).toFixed(1)}% (n=${bin.count})`
    );
  }
}
