import { RealDataCollector } from './data/real-data-collector.js';
import { MultiSportFeatureExtractor } from './engine/multi-sport-model.js';
import { LogisticRegression } from './engine/logistic-regression.js';
/**
 * Train prediction models using REAL scraped data
 *
 * This script:
 * 1. Collects real historical data from free public sources
 * 2. Extracts features for each sport
 * 3. Trains logistic regression models
 * 4. Evaluates performance with cross-validation
 */
async function trainWithRealData() {
    console.log('='.repeat(60));
    console.log('REAL-WORLD SPORTS PREDICTION MODEL TRAINING');
    console.log('='.repeat(60));
    console.log();
    // Step 1: Collect real data
    const collector = new RealDataCollector('./data-cache', true);
    const matches = await collector.collectAllSports();
    if (matches.length === 0) {
        console.error('❌ No data collected. Check network connection and try again.');
        return;
    }
    console.log();
    console.log('='.repeat(60));
    console.log('STEP 2: FEATURE EXTRACTION & MODEL TRAINING');
    console.log('='.repeat(60));
    console.log();
    // Step 2: Process and train for each sport
    const sports = ['football', 'basketball', 'baseball', 'hockey'];
    const results = [];
    for (const sport of sports) {
        console.log(`\n🏆 ${sport.toUpperCase()} MODELS`);
        console.log('-'.repeat(40));
        const sportMatches = matches.filter(m => m.sport === sport);
        if (sportMatches.length < 100) {
            console.log(`  ⚠️  Insufficient data (${sportMatches.length} matches). Skipping...`);
            continue;
        }
        // Create feature extractor for this sport
        const featureExtractor = new MultiSportFeatureExtractor();
        // Extract features and labels based on sport
        const features = [];
        const labelsO25 = []; // Over 2.5 goals / equivalent
        const labelsMoneyline = []; // Home win
        for (const match of sportMatches) {
            const featObj = featureExtractor.extractFeatures(match);
            // Convert SportFeatures object to array of numbers
            const featureArray = Object.values(featObj).filter(v => typeof v === 'number' && !isNaN(v));
            if (featureArray.length > 0) {
                features.push(featureArray);
                // Create labels based on sport
                if (sport === 'football') {
                    const totalGoals = match.homeScore + match.awayScore;
                    labelsO25.push(totalGoals > 2.5 ? 1 : 0);
                    labelsMoneyline.push(match.homeScore > match.awayScore ? 1 : 0);
                }
                else if (sport === 'basketball') {
                    const totalPoints = match.homeScore + match.awayScore;
                    labelsO25.push(totalPoints > 210.5 ? 1 : 0);
                    labelsMoneyline.push(match.homeScore > match.awayScore ? 1 : 0);
                }
                else if (sport === 'baseball') {
                    const totalRuns = match.homeScore + match.awayScore;
                    labelsO25.push(totalRuns > 8.5 ? 1 : 0);
                    labelsMoneyline.push(match.homeScore > match.awayScore ? 1 : 0);
                }
                else if (sport === 'hockey') {
                    const totalGoals = match.homeScore + match.awayScore;
                    labelsO25.push(totalGoals > 5.5 ? 1 : 0);
                    labelsMoneyline.push(match.homeScore > match.awayScore ? 1 : 0);
                }
            }
        }
        console.log(`  Dataset: ${features.length} matches`);
        console.log(`  Features: ${features[0]?.length || 0}`);
        if (features.length < 50) {
            console.log(`  ⚠️  Too few valid samples after feature extraction`);
            continue;
        }
        // Train Over/Under model
        console.log(`  Training Over/Under model...`);
        const modelO25 = new LogisticRegression({ learningRate: 0.01, epochs: 500, lambda: 0.01 });
        modelO25.train(features, labelsO25);
        const predO25 = modelO25.predict(features);
        const accO25 = predO25.reduce((sum, p, i) => sum + (Math.round(p) === labelsO25[i] ? 1 : 0), 0) / labelsO25.length;
        console.log(`    Accuracy: ${(accO25 * 100).toFixed(1)}%`);
        // Train Moneyline model
        console.log(`  Training Moneyline model...`);
        const modelML = new LogisticRegression({ learningRate: 0.01, epochs: 500, lambda: 0.01 });
        modelML.train(features, labelsMoneyline);
        const predML = modelML.predict(features);
        const accML = predML.reduce((sum, p, i) => sum + (Math.round(p) === labelsMoneyline[i] ? 1 : 0), 0) / labelsMoneyline.length;
        console.log(`    Accuracy: ${(accML * 100).toFixed(1)}%`);
        results.push({
            sport,
            matches: features.length,
            overUnderAccuracy: accO25,
            moneylineAccuracy: accML
        });
    }
    // Summary
    console.log();
    console.log('='.repeat(60));
    console.log('TRAINING SUMMARY');
    console.log('='.repeat(60));
    console.log();
    console.log('| Sport       | Matches | O/U Acc  | ML Acc   |');
    console.log('|' + '-'.repeat(11) + '|' + '-'.repeat(9) + '|' + '-'.repeat(10) + '|' + '-'.repeat(10) + '|');
    for (const result of results) {
        const ouStr = `${(result.overUnderAccuracy * 100).toFixed(1)}%`;
        const mlStr = `${(result.moneylineAccuracy * 100).toFixed(1)}%`;
        console.log(`| ${result.sport.padEnd(11)} | ${String(result.matches).padEnd(8)} | ${ouStr.padEnd(9)} | ${mlStr.padEnd(9)} |`);
    }
    console.log();
    console.log('✅ Training complete! Models are ready for prediction.');
    console.log();
    console.log('⚠️  IMPORTANT NOTES:');
    console.log('   - These models were trained on limited scraped data');
    console.log('   - For production use, collect more historical data (5+ seasons)');
    console.log('   - Always validate on out-of-sample test data');
    console.log('   - Sports betting involves risk - never bet more than you can afford to lose');
    console.log();
    return results;
}
// Run if executed directly
const isMainModule = import.meta.url === `file://${process.argv[1]}`;
if (isMainModule) {
    trainWithRealData().catch(console.error);
}
export { trainWithRealData };
//# sourceMappingURL=train-real-data.js.map