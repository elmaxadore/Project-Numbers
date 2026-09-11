import * as fs from 'fs';
import * as path from 'path';
import { RealDataCollector } from './data/outcome-data-collector.js';
import { OutcomeModel } from './engine/outcome-model.js';

async function main() {
  console.log('🏆 Football Match Outcome Predictor with Confidence Scoring\n');
  console.log('=' .repeat(60));
  
  // Step 1: Load or collect data
  const collector = new RealDataCollector();
  let matches = collector.get_cached_data();
  
  if (matches.length === 0) {
    console.log('📥 No cached data found. Collecting from football-data.co.uk...');
    matches = await collector.collectAllData();
  } else {
    console.log(`✅ Loaded ${matches.length} cached matches`);
  }
  
  if (matches.length < 1000) {
    console.error('❌ Not enough data for training. Need at least 1000 matches.');
    process.exit(1);
  }
  
  // Filter to only matches with results and odds
  const validMatches = matches.filter(m => 
    m.result !== undefined && 
    m.homeWinOdds !== undefined && 
    m.drawOdds !== undefined && 
    m.awayWinOdds !== undefined
  );
  
  console.log(`📊 Valid matches for training: ${validMatches.length}`);
  
  // Group by league to check viability
  const leagueStats = new Map<string, { total: number; homeWins: number; draws: number; awayWins: number }>();
  for (const match of validMatches) {
    if (!leagueStats.has(match.league)) {
      leagueStats.set(match.league, { total: 0, homeWins: 0, draws: 0, awayWins: 0 });
    }
    const stats = leagueStats.get(match.league)!;
    stats.total++;
    if (match.result === 'H') stats.homeWins++;
    else if (match.result === 'D') stats.draws++;
    else stats.awayWins++;
  }
  
  console.log('\n📈 League Distribution:');
  for (const [league, stats] of leagueStats) {
    const homePct = ((stats.homeWins / stats.total) * 100).toFixed(1);
    const drawPct = ((stats.draws / stats.total) * 100).toFixed(1);
    const awayPct = ((stats.awayWins / stats.total) * 100).toFixed(1);
    console.log(`   ${league}: ${stats.total} matches (H: ${homePct}%, D: ${drawPct}%, A: ${awayPct}%)`);
  }
  
  // Step 2: Train the model
  console.log('\n' + '='.repeat(60));
  console.log('🧠 Training Multinomial Logistic Regression Model...');
  console.log('=' .repeat(60));
  
  const model = new OutcomeModel();
  
  try {
    const results = model.train(validMatches);
    
    console.log('\n✅ Training Complete!');
    console.log(`   Test Accuracy: ${(results.accuracy * 100).toFixed(2)}%`);
  } catch (error) {
    console.error('❌ Training failed:', (error as Error).message);
    process.exit(1);
  }
  
  // Step 3: Backtest on most recent season
  console.log('\n' + '='.repeat(60));
  console.log('🔍 Backtesting on Recent Matches...');
  console.log('=' .repeat(60));
  
  const sortedMatches = [...validMatches].sort((a, b) => b.date.getTime() - a.date.getTime());
  const recentSeason = sortedMatches.slice(0, Math.min(500, sortedMatches.length));
  
  let correct = 0;
  let totalBets = 0;
  let profit = 0;
  let stake = 0;
  
  const highConfidenceBets: Array<{
    match: string;
    league: string;
    date: Date;
    prediction: 'H' | 'D' | 'A';
    confidence: number;
    odds: number;
    result: 'H' | 'D' | 'A';
    won: boolean;
  }> = [];
  
  for (const match of recentSeason) {
    const historicalContext = validMatches.filter(m => m.date < match.date);
    
    if (historicalContext.length < 100) continue;
    
    const prediction = model.predictMatch(match, historicalContext);
    
    if (!prediction) continue;
    
    totalBets++;
    
    // Get odds for predicted outcome
    let odds = 0;
    if (prediction.predictedOutcome === 'H') odds = match.homeWinOdds || 0;
    else if (prediction.predictedOutcome === 'D') odds = match.drawOdds || 0;
    else odds = match.awayWinOdds || 0;
    
    if (odds === 0) continue;
    
    const won = prediction.predictedOutcome === match.result;
    
    if (won) {
      correct++;
      profit += (odds - 1) * 10; // £10 stake
      stake += 10;
    } else {
      profit -= 10;
      stake += 10;
    }
    
    if (prediction.confidence >= 70) {
      highConfidenceBets.push({
        match: `${match.homeTeam} vs ${match.awayTeam}`,
        league: match.league,
        date: match.date,
        prediction: prediction.predictedOutcome,
        confidence: prediction.confidence,
        odds,
        result: match.result!,
        won
      });
    }
  }
  
  const winRate = totalBets > 0 ? (correct / totalBets * 100) : 0;
  const roi = stake > 0 ? (profit / stake * 100) : 0;
  
  console.log(`\n📊 Backtest Results (${recentSeason.length} most recent matches):`);
  console.log(`   Total Bets: ${totalBets}`);
  console.log(`   Correct: ${correct}`);
  console.log(`   Win Rate: ${winRate.toFixed(2)}%`);
  console.log(`   Total Stake: £${stake}`);
  console.log(`   Profit: £${profit.toFixed(2)}`);
  console.log(`   ROI: ${roi.toFixed(2)}%`);
  
  // Show high confidence bets
  if (highConfidenceBets.length > 0) {
    console.log(`\n⭐ High Confidence Bets (≥70% confidence): ${highConfidenceBets.length}`);
    
    let hcCorrect = 0;
    let hcProfit = 0;
    
    for (const bet of highConfidenceBets.slice(0, 10)) {
      hcCorrect += bet.won ? 1 : 0;
      hcProfit += bet.won ? (bet.odds - 1) * 10 : -10;
      
      console.log(`   ${bet.date.toLocaleDateString()} | ${bet.league}`);
      console.log(`      ${bet.match}`);
      console.log(`      Prediction: ${bet.prediction} | Confidence: ${bet.confidence}% | Odds: ${bet.odds.toFixed(2)}`);
      console.log(`      Result: ${bet.result} | ${bet.won ? '✅ WON' : '❌ LOST'}\n`);
    }
    
    if (highConfidenceBets.length > 10) {
      console.log(`   ... and ${highConfidenceBets.length - 10} more high-confidence bets`);
    }
    
    const hcRoi = highConfidenceBets.length > 0 ? (hcProfit / (highConfidenceBets.length * 10) * 100) : 0;
    console.log(`\n   High Confidence Performance:`);
    console.log(`      Win Rate: ${(hcCorrect / highConfidenceBets.length * 100).toFixed(2)}%`);
    console.log(`      ROI: ${hcRoi.toFixed(2)}%`);
  }
  
  // Step 4: Demo predictions for upcoming matches (simulated)
  console.log('\n' + '='.repeat(60));
  console.log('🎯 Sample Match Predictions (from test set)');
  console.log('=' .repeat(60));
  
  const sampleMatches = recentSeason.slice(0, 5);
  
  for (const match of sampleMatches) {
    const historicalContext = validMatches.filter(m => m.date < match.date);
    const prediction = model.predictMatch(match, historicalContext);
    
    if (!prediction) continue;
    
    console.log(`\n🏟️  ${match.homeTeam} vs ${match.awayTeam} (${match.league})`);
    console.log(`   Date: ${match.date.toLocaleDateString()}`);
    console.log(`   Probabilities: H ${prediction.homeProb.toFixed(1)}% | D ${prediction.drawProb.toFixed(1)}% | A ${prediction.awayProb.toFixed(1)}%`);
    console.log(`   Prediction: ${prediction.predictedOutcome === 'H' ? 'HOME WIN' : prediction.predictedOutcome === 'D' ? 'DRAW' : 'AWAY WIN'}`);
    console.log(`   Confidence: ${prediction.confidence}/100`);
    console.log(`   Actual Result: ${match.result === 'H' ? 'HOME WIN' : match.result === 'D' ? 'DRAW' : 'AWAY WIN'} ${prediction.predictedOutcome === match.result ? '✅' : '❌'}`);
  }
  
  console.log('\n' + '='.repeat(60));
  console.log('✅ Analysis Complete!');
  console.log('=' .repeat(60));
  console.log('\n⚠️  Disclaimer: Past performance does not guarantee future results.');
  console.log('   Sports betting involves risk. Never bet more than you can afford to lose.');
}

main().catch(console.error);
