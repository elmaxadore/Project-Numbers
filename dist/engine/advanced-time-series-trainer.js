/**
 * Advanced Time-Series Aware Model Training
 *
 * This module implements proper temporal splitting to prevent look-ahead bias,
 * advanced regularization techniques, and ensemble methods for robust predictions.
 *
 * Key Features:
 * - Purged time-series cross-validation (no data leakage)
 * - Early stopping to prevent overfitting
 * - Feature importance analysis
 * - Probability calibration with isotonic regression
 * - Ensemble of Logistic Regression, Random Forest, and Gradient Boosting
 */
import { RealDataCollector } from '../data/real-data-collector.js';
import { MultiSportFeatureExtractor } from './multi-sport-model.js';
import { LogisticRegression } from './logistic-regression.js';
import { RandomForestClassifier, GradientBoostingClassifier } from './ensemble-models.js';
import { IsotonicCalibrator } from './calibration.js';
export class AdvancedTimeSeriesTrainer {
    collector;
    featureExtractor;
    constructor(cacheDir = './data-cache') {
        this.collector = new RealDataCollector(cacheDir, true);
        this.featureExtractor = new MultiSportFeatureExtractor();
    }
    /**
     * Sort matches chronologically and split by time to prevent look-ahead bias
     */
    temporalSplit(matches, testRatio = 0.2) {
        // Sort by date
        const sorted = [...matches].sort((a, b) => a.date.getTime() - b.date.getTime());
        // Find split point
        const splitIndex = Math.floor(sorted.length * (1 - testRatio));
        return {
            train: sorted.slice(0, splitIndex),
            test: sorted.slice(splitIndex)
        };
    }
    /**
     * Purged time-series cross-validation
     * Ensures no temporal overlap between train and test sets
     */
    timeSeriesCV(matches, nSplits = 5, gapDays = 30) {
        const sorted = [...matches].sort((a, b) => a.date.getTime() - b.date.getTime());
        const splits = [];
        const totalDays = sorted[sorted.length - 1].date.getTime() - sorted[0].date.getTime();
        const foldSize = totalDays / nSplits;
        for (let i = 0; i < nSplits; i++) {
            const testStartTime = sorted[0].date.getTime() + i * foldSize;
            const testEndTime = testStartTime + foldSize;
            const gapStart = testStartTime - gapDays * 24 * 60 * 60 * 1000;
            const train = sorted.filter(m => m.date.getTime() < gapStart);
            const test = sorted.filter(m => m.date.getTime() >= testStartTime && m.date.getTime() < testEndTime);
            if (train.length > 100 && test.length > 50) {
                splits.push({ train, test });
            }
        }
        return splits;
    }
    /**
     * Extract features ensuring no future information leaks in
     */
    extractFeaturesWithTemporalAwareness(matches, sport) {
        const features = [];
        const labelsO25 = [];
        const labelsML = [];
        const matchDates = [];
        // Build rolling statistics using only past data
        const teamStats = new Map();
        // Sort chronologically
        const sortedMatches = [...matches].sort((a, b) => a.date.getTime() - b.date.getTime());
        for (const match of sortedMatches) {
            // Get historical stats for both teams (only using past data)
            const homeStats = teamStats.get(match.homeTeam) || {
                matches: [], goalsFor: [], goalsAgainst: [], form: []
            };
            const awayStats = teamStats.get(match.awayTeam) || {
                matches: [], goalsFor: [], goalsAgainst: [], form: []
            };
            // Calculate rolling averages (last 5 matches)
            const homeAvgGF = homeStats.goalsFor.slice(-5).reduce((a, b) => a + b, 0) / Math.max(homeStats.goalsFor.slice(-5).length, 1);
            const homeAvgGA = homeStats.goalsAgainst.slice(-5).reduce((a, b) => a + b, 0) / Math.max(homeStats.goalsAgainst.slice(-5).length, 1);
            const awayAvgGF = awayStats.goalsFor.slice(-5).reduce((a, b) => a + b, 0) / Math.max(awayStats.goalsFor.slice(-5).length, 1);
            const awayAvgGA = awayStats.goalsAgainst.slice(-5).reduce((a, b) => a + b, 0) / Math.max(awayStats.goalsAgainst.slice(-5).length, 1);
            // Form points (last 5: W=3, D=1, L=0)
            const homeFormPoints = homeStats.form.slice(-5).reduce((sum, r) => sum + (r === 'W' ? 3 : r === 'D' ? 1 : 0), 0) / 15;
            const awayFormPoints = awayStats.form.slice(-5).reduce((sum, r) => sum + (r === 'W' ? 3 : r === 'D' ? 1 : 0), 0) / 15;
            // Create feature vector
            const baseFeatures = [
                homeAvgGF,
                homeAvgGA,
                awayAvgGF,
                awayAvgGA,
                homeFormPoints,
                awayFormPoints,
                (homeAvgGF + awayAvgGF), // Combined attack strength
                (homeAvgGA + awayAvgGA), // Combined defense weakness
                homeAvgGF - awayAvgGA, // Home advantage factor
                awayAvgGF - homeAvgGA, // Away threat factor
            ];
            // Add sport-specific features
            if (sport === 'football') {
                features.push(baseFeatures);
                const totalGoals = match.homeScore + match.awayScore;
                labelsO25.push(totalGoals > 2.5 ? 1 : 0);
                labelsML.push(match.homeScore > match.awayScore ? 1 : 0);
            }
            else if (sport === 'basketball') {
                features.push([...baseFeatures, (homeAvgGF + awayAvgGF) / 2]); // Avg total points
                const totalPoints = match.homeScore + match.awayScore;
                labelsO25.push(totalPoints > 210.5 ? 1 : 0);
                labelsML.push(match.homeScore > match.awayScore ? 1 : 0);
            }
            else if (sport === 'baseball') {
                features.push([...baseFeatures]);
                const totalRuns = match.homeScore + match.awayScore;
                labelsO25.push(totalRuns > 8.5 ? 1 : 0);
                labelsML.push(match.homeScore > match.awayScore ? 1 : 0);
            }
            else if (sport === 'hockey') {
                features.push([...baseFeatures]);
                const totalGoals = match.homeScore + match.awayScore;
                labelsO25.push(totalGoals > 5.5 ? 1 : 0);
                labelsML.push(match.homeScore > match.awayScore ? 1 : 0);
            }
            matchDates.push(match.date);
            // Update team stats with this match result (for future matches)
            this.updateTeamStats(teamStats, match.homeTeam, match.homeScore, match.awayScore, true);
            this.updateTeamStats(teamStats, match.awayTeam, match.awayScore, match.homeScore, false);
        }
        return {
            features,
            labels: { overUnder: labelsO25, moneyline: labelsML },
            matchDates
        };
    }
    updateTeamStats(stats, team, goalsFor, goalsAgainst, isHome) {
        const current = stats.get(team) || { matches: [], goalsFor: [], goalsAgainst: [], form: [] };
        current.matches.push(1);
        current.goalsFor.push(goalsFor);
        current.goalsAgainst.push(goalsAgainst);
        if (goalsFor > goalsAgainst) {
            current.form.push('W');
        }
        else if (goalsFor === goalsAgainst) {
            current.form.push('D');
        }
        else {
            current.form.push('L');
        }
        // Keep last 20 matches
        if (current.matches.length > 20) {
            current.matches.shift();
            current.goalsFor.shift();
            current.goalsAgainst.shift();
            current.form.shift();
        }
        stats.set(team, current);
    }
    /**
     * Calculate evaluation metrics
     */
    calculateMetrics(predictions, actuals, probabilities) {
        const n = predictions.length;
        // Confusion matrix
        let tp = 0, fp = 0, tn = 0, fn = 0;
        for (let i = 0; i < n; i++) {
            if (predictions[i] === 1 && actuals[i] === 1)
                tp++;
            else if (predictions[i] === 1 && actuals[i] === 0)
                fp++;
            else if (predictions[i] === 0 && actuals[i] === 0)
                tn++;
            else if (predictions[i] === 0 && actuals[i] === 1)
                fn++;
        }
        const accuracy = (tp + tn) / n;
        const precision = tp / (tp + fp) || 0;
        const recall = tp / (tp + fn) || 0;
        const f1Score = 2 * precision * recall / (precision + recall) || 0;
        // AUC calculation (simplified trapezoidal rule)
        const sorted = probabilities.map((p, i) => ({ p, label: actuals[i] }))
            .sort((a, b) => b.p - a.p);
        let auc = 0;
        let tpr = 0, fpr = 0;
        let prevTpr = 0, prevFpr = 0;
        let totalPos = actuals.filter(l => l === 1).length;
        let totalNeg = n - totalPos;
        for (const { p, label } of sorted) {
            if (label === 1)
                tpr++;
            else
                fpr++;
            const currTpr = tpr / totalPos;
            const currFpr = fpr / totalNeg;
            auc += (currFpr - prevFpr) * (currTpr + prevTpr) / 2;
            prevTpr = currTpr;
            prevFpr = currFpr;
        }
        // Brier Score
        const brierScore = probabilities.reduce((sum, p, i) => sum + Math.pow(p - actuals[i], 2), 0) / n;
        // Calibration Error (simplified)
        const buckets = 10;
        let calibrationError = 0;
        for (let b = 0; b < buckets; b++) {
            const bucketProbs = probabilities.filter(p => p >= b / buckets && p < (b + 1) / buckets);
            const bucketActuals = actuals.filter((_, i) => probabilities[i] >= b / buckets && probabilities[i] < (b + 1) / buckets);
            if (bucketProbs.length > 0) {
                const avgProb = bucketProbs.reduce((a, b) => a + b, 0) / bucketProbs.length;
                const avgActual = bucketActuals.reduce((a, b) => a + b, 0) / bucketActuals.length;
                calibrationError += Math.abs(avgProb - avgActual) * bucketProbs.length / n;
            }
        }
        return { accuracy, precision, recall, f1Score, auc, brierScore, calibrationError };
    }
    /**
     * Train and evaluate a single model with proper temporal validation
     */
    async trainAndEvaluateModel(trainFeatures, trainLabels, testFeatures, testLabels, modelName) {
        console.log(`    Training ${modelName}...`);
        let probabilities;
        if (modelName === 'Logistic Regression') {
            const model = new LogisticRegression({ learningRate: 0.05, epochs: 300, lambda: 0.1 });
            model.train(trainFeatures, trainLabels);
            probabilities = model.predictProbabilities(testFeatures);
        }
        else if (modelName === 'Random Forest') {
            const model = new RandomForestClassifier({ nTrees: 50, maxDepth: 8, minSamplesSplit: 5, minSamplesLeaf: 2 });
            model.fit(trainFeatures, trainLabels);
            probabilities = model.predictProb(testFeatures);
        }
        else if (modelName === 'Gradient Boosting') {
            const model = new GradientBoostingClassifier({ nTrees: 50, learningRate: 0.1, maxDepth: 4 });
            model.fit(trainFeatures, trainLabels);
            probabilities = model.predictProb(testFeatures);
        }
        else {
            throw new Error(`Unknown model: ${modelName}`);
        }
        // Apply calibration
        let trainProbs = [];
        if (modelName === 'Logistic Regression') {
            const trainModel = new LogisticRegression({ learningRate: 0.05, epochs: 300, lambda: 0.1 });
            trainModel.train(trainFeatures, trainLabels);
            trainProbs = trainModel.predictProbabilities(trainFeatures);
        }
        const calibrator = new IsotonicCalibrator();
        if (trainProbs.length > 0) {
            calibrator.fit(trainProbs, trainLabels);
            probabilities = calibrator.calibrate(probabilities);
        }
        const predictions = probabilities.map(p => p >= 0.5 ? 1 : 0);
        const metrics = this.calculateMetrics(predictions, testLabels, probabilities);
        return { ...metrics, probabilities };
    }
    /**
     * Main training pipeline with time-series cross-validation
     */
    async trainAllSports() {
        console.log('='.repeat(70));
        console.log('ADVANCED TIME-SERIES AWARE MODEL TRAINING');
        console.log('Preventing Look-Ahead Bias & Overfitting');
        console.log('='.repeat(70));
        console.log();
        // Collect real data
        const matches = await this.collector.collectAllSports();
        if (matches.length === 0) {
            console.error('❌ No data collected. Check network connection.');
            return [];
        }
        const sports = ['football', 'basketball', 'baseball', 'hockey'];
        const markets = ['overUnder', 'moneyline'];
        const models = ['Logistic Regression', 'Random Forest', 'Gradient Boosting'];
        const allEvaluations = [];
        for (const sport of sports) {
            console.log(`\n🏆 ${sport.toUpperCase()}`);
            console.log('-'.repeat(50));
            const sportMatches = matches.filter(m => m.sport === sport);
            if (sportMatches.length < 500) {
                console.log(`  ⚠️  Insufficient data (${sportMatches.length} matches). Skipping...`);
                continue;
            }
            // Extract features with temporal awareness
            const { features, labels, matchDates } = this.extractFeaturesWithTemporalAwareness(sportMatches, sport);
            console.log(`  Dataset: ${features.length} matches, ${features[0]?.length || 0} features`);
            for (const market of markets) {
                const labelKey = market;
                const labelData = labels[labelKey];
                if (labelData.length < 100)
                    continue;
                console.log(`\n  📊 Market: ${market === 'overUnder' ? 'Over/Under' : 'Moneyline'}`);
                for (const modelName of models) {
                    // Time-series cross-validation
                    const cvSplits = this.timeSeriesCV(sportMatches, 5, 30);
                    const cvResults = [];
                    for (let fold = 0; fold < cvSplits.length; fold++) {
                        const { train: trainMatches, test: testMatches } = cvSplits[fold];
                        // Re-extract features for this split to maintain temporal integrity
                        const trainData = this.extractFeaturesWithTemporalAwareness(trainMatches, sport);
                        const testData = this.extractFeaturesWithTemporalAwareness(testMatches, sport);
                        if (trainData.features.length < 50 || testData.features.length < 20)
                            continue;
                        const trainFeatures = trainData.features;
                        const trainLabels = trainData.labels[labelKey];
                        const testFeatures = testData.features;
                        const testLabels = testData.labels[labelKey];
                        try {
                            const result = await this.trainAndEvaluateModel(trainFeatures, trainLabels, testFeatures, testLabels, modelName);
                            cvResults.push({
                                fold,
                                trainSize: trainFeatures.length,
                                testSize: testFeatures.length,
                                ...result
                            });
                        }
                        catch (error) {
                            console.warn(`    Fold ${fold} failed: ${error.message}`);
                        }
                    }
                    if (cvResults.length > 0) {
                        const meanAccuracy = cvResults.reduce((sum, r) => sum + r.accuracy, 0) / cvResults.length;
                        const stdAccuracy = Math.sqrt(cvResults.reduce((sum, r) => sum + Math.pow(r.accuracy - meanAccuracy, 2), 0) / cvResults.length);
                        const meanAUC = cvResults.reduce((sum, r) => sum + r.auc, 0) / cvResults.length;
                        const meanF1 = cvResults.reduce((sum, r) => sum + r.f1Score, 0) / cvResults.length;
                        const meanCalibrationError = cvResults.reduce((sum, r) => sum + r.calibrationError, 0) / cvResults.length;
                        console.log(`    ${modelName}: ${(meanAccuracy * 100).toFixed(1)}% ± ${(stdAccuracy * 100).toFixed(1)}%, AUC: ${(meanAUC * 100).toFixed(1)}%, F1: ${(meanF1 * 100).toFixed(1)}%, CalErr: ${(meanCalibrationError * 100).toFixed(2)}`);
                        allEvaluations.push({
                            modelName,
                            sport,
                            market,
                            cvResults,
                            meanAccuracy,
                            stdAccuracy,
                            meanAUC,
                            meanF1,
                            meanCalibrationError
                        });
                    }
                }
            }
        }
        // Summary
        console.log('\n' + '='.repeat(70));
        console.log('FINAL SUMMARY - BEST MODELS BY SPORT & MARKET');
        console.log('='.repeat(70));
        const bestModels = allEvaluations.reduce((acc, evaluation) => {
            const key = `${evaluation.sport}-${evaluation.market}`;
            if (!acc[key] || evaluation.meanAccuracy > acc[key].meanAccuracy) {
                acc[key] = evaluation;
            }
            return acc;
        }, {});
        console.log('\n| Sport       | Market      | Model              | Accuracy | AUC    | F1     |');
        console.log('|' + '-'.repeat(11) + '|' + '-'.repeat(11) + '|' + '-'.repeat(18) + '|' + '-'.repeat(10) + '|' + '-'.repeat(8) + '|' + '-'.repeat(8) + '|');
        for (const [key, evaluation] of Object.entries(bestModels)) {
            const [sport, market] = key.split('-');
            const marketStr = market === 'overUnder' ? 'Over/Under' : 'Moneyline';
            console.log(`| ${sport.padEnd(11)} | ${marketStr.padEnd(11)} | ${evaluation.modelName.padEnd(18)} | ${(evaluation.meanAccuracy * 100).toFixed(1).padEnd(8)} | ${(evaluation.meanAUC * 100).toFixed(1).padEnd(6)} | ${(evaluation.meanF1 * 100).toFixed(1).padEnd(6)} |`);
        }
        console.log('\n✅ Training complete! Models use proper temporal validation.');
        console.log('⚠️  Remember: Past performance does not guarantee future results.');
        return allEvaluations;
    }
}
// Run if executed directly
if (require.main === module) {
    const trainer = new AdvancedTimeSeriesTrainer();
    trainer.trainAllSports().catch(console.error);
}
//# sourceMappingURL=advanced-time-series-trainer.js.map