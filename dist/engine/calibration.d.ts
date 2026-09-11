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
 * IsotonicCalibrator class for probability calibration
 * Fits a monotonic function to map raw predictions to calibrated probabilities
 */
export declare class IsotonicCalibrator {
    private points;
    /**
     * Fit the calibrator on training data
     */
    fit(predictions: number[], actuals: number[]): void;
    private pava;
    /**
     * Calibrate raw predictions
     */
    calibrate(predictions: number[]): number[];
    private interpolate;
}
/**
 * Analyze model calibration and log results
 */
export declare function analyzeCalibration(result: CalibrationResult): void;
//# sourceMappingURL=calibration.d.ts.map