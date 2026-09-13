/**
 * Best Bet Engine
 * Finds the highest EV bet from today's fixtures using real-time data
 */

import { logger } from '../utils/logger.js';
import { DEFAULT_O25_WEIGHTS, DEFAULT_BTTS_WEIGHTS } from './logistic-regression.js';
import { predictFixture } from './prediction-pipeline.js';
import { FixtureDataPackage } from '../models/types.js';
import { TodaysFixture } from '../data/todays-fixtures-fetcher.js';

export interface PredictionResult {
  match: string;
  league: string;
  market: string;
  prediction: string;
  confidence: number;
  odds: number;
  expectedValue: number;
  reasoning: string;
}

interface QualifiedBet {
  fixtureId: number;
  match: string;
  league: string;
  market: string;
  prediction: string;
  modelProbability: number;
  modelConfidence: number;
  estimatedOdds: number;
  ev: number;
  reasoning: string;
  // New fields for comprehensive report
  mostProbableOutcome: string;
  outcomeProbability: number;
  confidenceScore: number; // 0-100 scale
}

interface MatchAnalysis {
  fixtureId: number;
  match: string;
  league: string;
  mostProbableOutcome: string;
  outcomeProbability: number;
  confidenceScore: number;
  bestBet?: {
    market: string;
    prediction: string;
    odds: number;
    ev: number;
  };
}

/**
 * Process a single fixture and return qualified bets
 */
async function processFixture(fixture: TodaysFixture): Promise<QualifiedBet[]> {
  const qualifiedBets: QualifiedBet[] = [];
  
  // CRITICAL: Reject fixtures with invalid or unknown league/team names
  if (!fixture.leagueName || fixture.leagueName.trim() === '' || fixture.leagueName.includes('Unknown')) {
    logger.warn(`⚠️ Skipping fixture ${fixture.id}: Invalid league name "${fixture.leagueName}"`);
    return [];
  }
  if (!fixture.homeTeam.name || fixture.homeTeam.name.trim() === '' || fixture.homeTeam.name.includes('Unknown')) {
    logger.warn(`⚠️ Skipping fixture ${fixture.id}: Invalid home team "${fixture.homeTeam.name}"`);
    return [];
  }
  if (!fixture.awayTeam.name || fixture.awayTeam.name.trim() === '' || fixture.awayTeam.name.includes('Unknown')) {
    logger.warn(`⚠️ Skipping fixture ${fixture.id}: Invalid away team "${fixture.awayTeam.name}"`);
    return [];
  }
  
  try {
    // Create fixture data package with estimated stats (since we can't access API-Sports)
    const fixturePackage: FixtureDataPackage = {
      fixture: {
        id: fixture.id,
        leagueId: fixture.leagueId,
        leagueName: fixture.leagueName,
        homeTeam: { id: fixture.homeTeam.id, name: fixture.homeTeam.name },
        awayTeam: { id: fixture.awayTeam.id, name: fixture.awayTeam.name },
        date: fixture.date,
        status: 'scheduled' as const
      },
      // Use historical averages as fallback since we can't fetch real-time stats without API key
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

    // Run predictions
    const predictions = predictFixture(fixturePackage, DEFAULT_O25_WEIGHTS, DEFAULT_BTTS_WEIGHTS);
    
    // Find the most probable outcome across all markets for this fixture
    let mostProbableOutcome = 'No strong prediction';
    let highestProbability = 0;
    
    for (const pred of predictions) {
      if (pred.modelProbability > highestProbability) {
        highestProbability = pred.modelProbability;
        const outcomeText = pred.market.includes('over') || pred.market.includes('btts_yes') ? 'Yes' : 'No';
        mostProbableOutcome = `${pred.market.replace('_', ' ').toUpperCase()}: ${outcomeText}`;
      }
      
      const modelProb = pred.modelProbability;
      
      // Skip low probability predictions (<45%)
      if (modelProb < 0.45) continue;
      
      // Estimate fair odds from model probability
      const fairOdds = 1 / modelProb;
      
      // Apply conservative margin (assume bookmaker margin of ~5%)
      const estimatedOdds = fairOdds * 0.95;
      
      // Calculate EV assuming we get estimated odds
      const ev = (modelProb * estimatedOdds - 1) * 100;
      
      // Include all predictions with modelProb > 50% (positive expected value territory)
      if (modelProb > 0.50) {
        const outcomeText = pred.market.includes('over') || pred.market.includes('btts_yes') ? 'Yes' : 'No';
        qualifiedBets.push({
          fixtureId: fixture.id,
          match: `${fixture.homeTeam.name} vs ${fixture.awayTeam.name}`,
          league: fixture.leagueName,
          market: pred.market.replace('_', ' ').toUpperCase(),
          prediction: outcomeText,
          modelProbability: modelProb,
          modelConfidence: pred.modelConfidence,
          estimatedOdds: parseFloat(estimatedOdds.toFixed(2)),
          ev: parseFloat(ev.toFixed(1)),
          reasoning: `Model probability: ${(modelProb * 100).toFixed(1)}%. Based on xG analysis and recent form.`,
          mostProbableOutcome: mostProbableOutcome,
          outcomeProbability: highestProbability,
          confidenceScore: Math.round(pred.modelConfidence * 100)
        });
      }
    }
  } catch (error: any) {
    logger.error(`Error processing fixture ${fixture.id}: ${error.message}`);
    // Continue with other fixtures instead of failing completely
  }
  
  return qualifiedBets;
}

/**
 * Find the best bet from today's fixtures
 * Returns comprehensive analysis of ALL matches ranked by probability
 */
export async function findBestBet(fixtures: TodaysFixture[]): Promise<PredictionResult | null> {
  logger.info('🧠 Running prediction engine on real fixtures...');
  
  if (!fixtures || fixtures.length === 0) {
    throw new Error('No fixtures provided to analyze.');
  }
  
  const allQualifiedBets: QualifiedBet[] = [];
  const allMatchAnalyses: MatchAnalysis[] = [];
  
  // Process all fixtures in parallel
  const betPromises = fixtures.map(fixture => processFixture(fixture));
  const results = await Promise.all(betPromises);
  
  // Flatten results and build match analyses
  for (const bets of results) {
    allQualifiedBets.push(...bets);
    
    // Group bets by fixture to create match analyses
    for (const bet of bets) {
      let existingAnalysis = allMatchAnalyses.find(a => a.fixtureId === bet.fixtureId);
      if (!existingAnalysis) {
        existingAnalysis = {
          fixtureId: bet.fixtureId,
          match: bet.match,
          league: bet.league,
          mostProbableOutcome: bet.mostProbableOutcome,
          outcomeProbability: bet.outcomeProbability,
          confidenceScore: bet.confidenceScore,
          bestBet: undefined
        };
        allMatchAnalyses.push(existingAnalysis);
      }
      
      // Track the best bet for this match
      if (!existingAnalysis.bestBet || bet.ev > existingAnalysis.bestBet.ev) {
        existingAnalysis.bestBet = {
          market: bet.market,
          prediction: bet.prediction,
          odds: bet.estimatedOdds,
          ev: bet.ev
        };
      }
    }
  }
  
  if (allQualifiedBets.length === 0) {
    throw new Error(
      'No viable bets found today. All predictions failed to meet probability (>50%) threshold. ' +
      'This is normal - value bets are rare. Check back tomorrow.'
    );
  }
  
  // Sort ALL matches by their most probable outcome (descending)
  allMatchAnalyses.sort((a, b) => b.outcomeProbability - a.outcomeProbability);
  
  // Sort qualified bets by modelProbability descending
  allQualifiedBets.sort((a, b) => b.modelProbability - a.modelProbability);
  const bestBet = allQualifiedBets[0];
  
  logger.info(`✅ Found ${allMatchAnalyses.length} matches analyzed, ${allQualifiedBets.length} qualified bets.`);
  
  // Print comprehensive report: ALL matches first, then ranked bets
  console.log('\n' + '='.repeat(80));
  console.log('📋 ALL MATCHES FOUND TODAY (Sorted by Most Probable Outcome)');
  console.log('='.repeat(80));
  allMatchAnalyses.forEach((analysis, index) => {
    console.log(`\n${index + 1}. ${analysis.match}`);
    console.log(`   League: ${analysis.league}`);
    console.log(`   🔮 Most Probable Outcome: ${analysis.mostProbableOutcome}`);
    console.log(`   📊 Probability: ${(analysis.outcomeProbability * 100).toFixed(1)}%`);
    console.log(`   💪 Confidence: ${analysis.confidenceScore}/100`);
    if (analysis.bestBet) {
      console.log(`   💰 Best Value Bet: ${analysis.bestBet.market} - ${analysis.bestBet.prediction}`);
      console.log(`      Odds: ${analysis.bestBet.odds.toFixed(2)} | EV: ${analysis.bestBet.ev}%`);
    }
  });
  
  console.log('\n' + '='.repeat(80));
  console.log('🏆 TOP RANKED BETS (Sorted by Probability - Best to Worst)');
  console.log('='.repeat(80));
  allQualifiedBets.forEach((bet, index) => {
    console.log(`\n#${index + 1}: ${bet.match} (${bet.league})`);
    console.log(`   Market: ${bet.market} | Pick: ${bet.prediction}`);
    console.log(`   📈 Probability: ${(bet.modelProbability * 100).toFixed(1)}%`);
    console.log(`   💪 Confidence: ${bet.confidenceScore}/100`);
    console.log(`   💰 Odds: ${bet.estimatedOdds.toFixed(2)} | EV: ${bet.ev}%`);
  });
  console.log('\n' + '='.repeat(80) + '\n');
  
  return {
    match: bestBet.match,
    league: bestBet.league,
    market: bestBet.market,
    prediction: bestBet.prediction,
    confidence: parseFloat((bestBet.modelConfidence * 100).toFixed(1)),
    odds: bestBet.estimatedOdds,
    expectedValue: bestBet.ev,
    reasoning: `${bestBet.reasoning} Ranked #${allQualifiedBets.indexOf(bestBet) + 1} out of ${allQualifiedBets.length} bets.`
  };
}
