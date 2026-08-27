/**
 * Calibration bin: groups predictions by probability range
 */
export interface CalibrationBin {
    lowerBound: number;
    upperBound: number;
    predictedMean: number;
    actualFrequency: number;
    count: number;
}
/**
 * Calibration result
 */
export interface CalibrationResult {
    bins: CalibrationBin[];
    brierScore: number;
    expectedCalibrationError: number;
    maximumCalibrationError: number;
    isWellCalibrated: boolean;
}
/**
 * Perform isotonic calibration on model predictions
 * Maps raw model outputs to calibrated probabilities using
 * a monotonic regression approach
 */
export declare function isotonicCalibration(predictions: number[], actuals: number[], numBins?: number): CalibrationResult;
/**
 * Apply calibration mapping to a raw prediction
 * Uses piecewise linear interpolation from calibration bins
 */
export declare function calibrateProbability(rawProbability: number, calibrationBins: CalibrationBin[]): number;
/**
 * Analyze model calibration and log results
 */
export declare function analyzeCalibration(result: CalibrationResult): void;
//# sourceMappingURL=calibration.d.ts.map