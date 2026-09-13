// Full analysis script - lists all fixtures and predictions
import { fetchTodaysFixtures } from './dist/data/todays-fixtures-fetcher.js';
import { findBestBet } from './dist/engine/best-bet-engine.js';
import { predictFixture } from './dist/engine/prediction-pipeline.js';
import { DEFAULT_O25_WEIGHTS, DEFAULT_BTTS_WEIGHTS } from './dist/engine/logistic-regression.js';

async function runFullAnalysis() {
  console.log('='.repeat(80));
  console.log('📊 FULL MATCH ANALYSIS - ALL FIXTURES & PREDICTIONS');
  console.log('='.repeat(80));
  console.log();

  // Step 1: Fetch all fixtures
  console.log('📅 STEP 1: Fetching real fixtures...');
  const fixtures = await fetchTodaysFixtures();
  console.log(`✅ Found ${fixtures.length} fixtures\n`);

  // Step 2: List ALL fixtures
  console.log('='.repeat(80));
  console.log('📋 ALL FIXTURES FOUND');
  console.log('='.repeat(80));
  fixtures.forEach((f, i) => {
    console.log(`[${i+1}] ${f.leagueName}`);
    console.log(`    ${f.homeTeam.name} vs ${f.awayTeam.name}`);
    console.log(`    Date: ${f.date}`);
    console.log();
  });

  // Step 3: Run predictions on each fixture
  console.log('='.repeat(80));
  console.log('🔮 PREDICTIONS FOR EACH MATCH');
  console.log('='.repeat(80));

  for (const fixture of fixtures) {
    console.log(`\n🏟️  ${fixture.homeTeam.name} vs ${fixture.awayTeam.name}`);
    console.log(`    League: ${fixture.leagueName}`);
    console.log('-'.repeat(60));

    const fixturePackage = {
      fixture: {
        id: fixture.id,
        leagueId: fixture.leagueId,
        leagueName: fixture.leagueName,
        homeTeam: { id: fixture.homeTeam.id, name: fixture.homeTeam.name },
        awayTeam: { id: fixture.awayTeam.id, name: fixture.awayTeam.name },
        date: fixture.date,
        status: 'scheduled'
      },
      expectedStats: {
        fixtureId: fixture.id,
        homeTeamStats: {
          teamId: fixture.homeTeam.id,
          teamName: fixture.homeTeam.name,
          venue: 'home',
          matchesPlayed: 10,
          goalsScored: 15,
          goalsConceded: 12,
          avgGoalsScored: 1.5,
          avgGoalsConceded: 1.2,
          xG: 1.4,
          xGA: 1.3,
          cleanSheetRate: 0.3,
          failedToScoreRate: 0.2,
          bttsRate: 0.55,
          over25Rate: 0.50,
          over15Rate: 0.75
        },
        awayTeamStats: {
          teamId: fixture.awayTeam.id,
          teamName: fixture.awayTeam.name,
          venue: 'away',
          matchesPlayed: 10,
          goalsScored: 13,
          goalsConceded: 14,
          avgGoalsScored: 1.3,
          avgGoalsConceded: 1.4,
          xG: 1.2,
          xGA: 1.5,
          cleanSheetRate: 0.25,
          failedToScoreRate: 0.25,
          bttsRate: 0.50,
          over25Rate: 0.45,
          over15Rate: 0.70
        },
        combinedExpectedGoals: 2.8,
        combinedExpectedConceded: 2.6,
        fixtureXG: 2.8
      },
      odds: [],
      leagueFilterPassed: true,
      sampleSizeFilterPassed: true,
      outlierFlags: {
        isRunawayGiant: false,
        homeCleanSheetRate: 0.3,
        awayFailedToScoreRate: 0.25
      }
    };

    const predictions = predictFixture(fixturePackage, DEFAULT_O25_WEIGHTS, DEFAULT_BTTS_WEIGHTS);
    
    if (predictions.length === 0) {
      console.log('    No qualified predictions (probability < 45%)');
    } else {
      console.log('    Predictions:');
      predictions.forEach(pred => {
        const marketName = pred.market.replace('_', ' ').toUpperCase();
        const predictionValue = pred.market.includes('over') || pred.market.includes('btts_yes') ? 'YES' : 'NO';
        const probability = (pred.modelProbability * 100).toFixed(1);
        const confidence = (pred.modelConfidence * 100).toFixed(1);
        const fairOdds = (1 / pred.modelProbability).toFixed(2);
        const estimatedOdds = (fairOdds * 0.95).toFixed(2);
        const ev = ((pred.modelProbability * estimatedOdds - 1) * 100).toFixed(1);
        
        console.log(`    ┌─ Market: ${marketName}`);
        console.log(`    │  Prediction: ${predictionValue}`);
        console.log(`    │  Probability: ${probability}%`);
        console.log(`    │  Confidence: ${confidence}%`);
        console.log(`    │  Fair Odds: ${fairOdds}`);
        console.log(`    │  Est. Odds: ${estimatedOdds}`);
        console.log(`    │  EV: ${ev}%`);
        console.log(`    └─ Status: ${pred.modelProbability > 0.50 ? '✅ QUALIFIED' : '⚠️ Low confidence'}`);
        console.log();
      });
    }
  }

  // Step 4: Find best bet
  console.log('='.repeat(80));
  console.log('🏆 BEST BET OF THE DAY');
  console.log('='.repeat(80));
  
  try {
    const bestBet = await findBestBet(fixtures);
    console.log(`Match: ${bestBet.match}`);
    console.log(`League: ${bestBet.league}`);
    console.log(`Market: ${bestBet.market}`);
    console.log(`Prediction: ${bestBet.prediction}`);
    console.log(`Confidence: ${bestBet.confidence}%`);
    console.log(`Odds: ${bestBet.odds}`);
    console.log(`Expected Value: ${bestBet.expectedValue}%`);
    console.log(`Reasoning: ${bestBet.reasoning}`);
  } catch (error) {
    console.log(`No qualified bets found: ${error.message}`);
  }

  console.log();
  console.log('='.repeat(80));
  console.log('✅ ANALYSIS COMPLETE');
  console.log('='.repeat(80));
}

runFullAnalysis().catch(err => {
  console.error('Fatal error:', err.message);
  process.exit(1);
});
