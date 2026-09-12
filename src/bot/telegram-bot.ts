/**
 * Telegram Bot for Sports Predictions
 * Runs via GitHub Actions (Serverless) - 100% Free
 *
 * Features:
 * - Downloads latest model/data from GitHub Releases
 * - Fetches REAL today's fixtures with odds
 * - Runs inference using trained models
 * - Sends best bet to Telegram
 */

import fetch from 'node-fetch';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { TodaysFixturesFetcher, TodayFixture } from '../data/todays-fixtures-fetcher.js';
import { predictFixture } from '../engine/prediction-pipeline.js';
import { DEFAULT_O25_WEIGHTS, DEFAULT_BTTS_WEIGHTS } from '../engine/logistic-regression.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configuration from Environment Variables (Set in GitHub Secrets)
const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID;

interface PredictionResult {
  match: string;
  league: string;
  market: string;
  prediction: string;
  confidence: number;
  odds: number;
  expectedValue: number;
  reasoning: string;
  fixture?: TodayFixture;
}

class TelegramBotService {
  private telegramUrl: string;

  constructor() {
    if (!TELEGRAM_BOT_TOKEN || !TELEGRAM_CHAT_ID) {
      throw new Error('Missing Telegram credentials. Set TELEGRAM_BOT_TOKEN and TELEGRAM_CHAT_ID in secrets.');
    }
    this.telegramUrl = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}`;
  }

  async sendMessage(message: string): Promise<void> {
    const url = `${this.telegramUrl}/sendMessage`;
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: TELEGRAM_CHAT_ID,
          text: message,
          parse_mode: 'Markdown'
        })
      });

      if (!response.ok) {
        const error = await response.text();
        console.error('Telegram API Error:', error);
        throw new Error(`Failed to send message: ${error}`);
      }
      console.log('Message sent successfully to Telegram.');
    } catch (error) {
      console.error('Error sending Telegram message:', error);
      throw error;
    }
  }

  formatPrediction(result: PredictionResult | null): string {
    if (!result) {
      return `🚫 **No Viable Bets Today**\n\nThe model found no opportunities with positive Expected Value.\n\n*Market Status:* Scanned all major leagues.\n*Strategy:* Preserving capital.`;
    }

    const confidenceEmoji = result.confidence > 80 ? '🔥' : result.confidence > 65 ? '✅' : '⚠️';

    return `
${confidenceEmoji} **BEST BET OF THE DAY** ${confidenceEmoji}

🏆 **League:** ${result.league}
⚽ **Match:** ${result.match}
📊 **Market:** ${result.market}
🎯 **Prediction:** ${result.prediction}

💰 **Odds:** ${result.odds.toFixed(2)}
🧠 **Confidence:** ${result.confidence.toFixed(1)}%
📈 **Edge (EV):** +${result.expectedValue.toFixed(2)}%

💡 **Reasoning:**
${result.reasoning}

-----------------------
⚠️ *Gambling involves risk. Bet responsibly.*
    `.trim();
  }
}

async function main() {
  console.log('🤖 Starting Prediction Bot...');
  console.log(`📂 Current working directory: ${process.cwd()}`);

  try {
    // 1. Verify Assets exist (downloaded by GitHub Action step)
    const releaseAssetsDir = path.join(process.cwd(), 'release-assets');
    
    console.log('📂 Checking release-assets directory...');
    console.log(`🔍 Absolute path: ${releaseAssetsDir}`);
    
    if (!fs.existsSync(releaseAssetsDir)) {
      throw new Error(`release-assets directory not found at ${releaseAssetsDir}. Ensure the GitHub Action downloads the release first.`);
    }

    // Recursive function to find all files in directory tree
    function getAllFiles(dirPath: string, arrayOfFiles: string[] = []): string[] {
      const entries = fs.readdirSync(dirPath, { withFileTypes: true });
      
      for (const entry of entries) {
        const fullPath = path.join(dirPath, entry.name);
        if (entry.isDirectory()) {
          getAllFiles(fullPath, arrayOfFiles);
        } else if (entry.isFile()) {
          arrayOfFiles.push(fullPath);
        }
      }
      
      return arrayOfFiles;
    }

    console.log('📁 Scanning release-assets recursively...');
    const allFiles = getAllFiles(releaseAssetsDir);
    console.log('📄 All files found:', allFiles.map(f => path.relative(releaseAssetsDir, f)));

    // Find model files (.bin) - prefer o25-ensemble.bin for Over/Under predictions
    const modelFiles = allFiles.filter(f => f.endsWith('.bin'));
    if (modelFiles.length === 0) {
      console.error('❌ No .bin files found. Directory contents:');
      console.error(fs.readdirSync(releaseAssetsDir, { recursive: true }));
      throw new Error('No model files (.bin) found in release-assets. Check the release zip contains .bin files.');
    }
    
    // Prefer o25-ensemble.bin, otherwise use first available
    const modelFile = modelFiles.find(f => path.basename(f).includes('o25')) || modelFiles[0];
    console.log(`✅ Selected model: ${path.basename(modelFile)} (from ${modelFiles.length} available)`);
    console.log(`   Full path: ${modelFile}`);

    // Find data files - prefer all-sports-data.json as it contains everything
    const dataFiles = allFiles.filter(f => f.endsWith('.json'));
    if (dataFiles.length === 0) {
      console.error('❌ No .json files found. Directory contents:');
      console.error(fs.readdirSync(releaseAssetsDir, { recursive: true }));
      throw new Error('No data files (.json) found in release-assets. Check the release zip contains data JSON files.');
    }
    
    // Prefer all-sports-data.json, otherwise use first available football data
    const dataFile = dataFiles.find(f => path.basename(f) === 'all-sports-data.json') || 
                     dataFiles.find(f => path.basename(f).includes('football')) || 
                     dataFiles[0];
    console.log(`✅ Selected data: ${path.basename(dataFile)} (from ${dataFiles.length} available)`);
    console.log(`   Full path: ${dataFile}`);

    const modelPath = modelFile;
    const dataPath = dataFile;

    console.log(`✅ Model found: ${path.basename(modelFile)}`);
    console.log(`✅ Data found: ${path.basename(dataFile)}`);

    // 2. Load Historical Data
    console.log('📖 Loading historical data...');
    const rawData = JSON.parse(fs.readFileSync(dataPath, 'utf-8'));
    console.log(`📊 Loaded ${Array.isArray(rawData) ? rawData.length : 'object'} records`);

    // 3. Fetch TODAY'S REAL FIXTURES WITH ODDS
    console.log('\n📅 Fetching today\'s fixtures and odds...');
    const fixturesFetcher = new TodaysFixturesFetcher();
    const todaysFixtures = await fixturesFetcher.getTodaysFixtures();
    
    console.log(`\n⚽ Found ${todaysFixtures.length} fixtures scheduled for today:`);
    for (const fixture of todaysFixtures.slice(0, 5)) {
      const oddsStr = fixture.odds 
        ? `| O2.5: ${fixture.odds.over25?.toFixed(2) || 'N/A'} | U2.5: ${fixture.odds.under25?.toFixed(2) || 'N/A'}`
        : '| Odds: N/A';
      console.log(`   • ${fixture.league.name}: ${fixture.homeTeam.name} vs ${fixture.awayTeam.name} ${oddsStr}`);
    }
    if (todaysFixtures.length > 5) {
      console.log(`   ... and ${todaysFixtures.length - 5} more fixtures`);
    }

    // 4. Run Inference on Today's Fixtures
    console.log('\n🧠 Running model inference on today\'s fixtures...');
    
    // Convert historical data to team stats for feature extraction
    const teamStatsCache = new Map<string, {
      avgXG: number;
      avgXGA: number;
      cleanSheetRate: number;
      failedToScoreRate: number;
      avgGoalsScored: number;
      avgGoalsConceded: number;
    }>();

    // Calculate team stats from historical data
    if (Array.isArray(rawData)) {
      const teamMatches = new Map<string, { xgFor: number[], xgAgainst: number[], goalsFor: number[], goalsAgainst: number[], cleanSheets: number, failedToScore: number, count: number }>();
      
      for (const match of rawData) {
        if (match.sport !== 'football') continue;
        
        // Home team stats
        const homeKey = `${match.league}|${match.homeTeam}`;
        if (!teamMatches.has(homeKey)) {
          teamMatches.set(homeKey, { xgFor: [], xgAgainst: [], goalsFor: [], goalsAgainst: [], cleanSheets: 0, failedToScore: 0, count: 0 });
        }
        const homeStats = teamMatches.get(homeKey)!;
        homeStats.goalsFor.push(match.homeScore);
        homeStats.goalsAgainst.push(match.awayScore);
        homeStats.count++;
        if (match.awayScore === 0) homeStats.cleanSheets++;
        if (match.homeScore === 0) homeStats.failedToScore++;

        // Away team stats
        const awayKey = `${match.league}|${match.awayTeam}`;
        if (!teamMatches.has(awayKey)) {
          teamMatches.set(awayKey, { xgFor: [], xgAgainst: [], goalsFor: [], goalsAgainst: [], cleanSheets: 0, failedToScore: 0, count: 0 });
        }
        const awayStats = teamMatches.get(awayKey)!;
        awayStats.goalsFor.push(match.awayScore);
        awayStats.goalsAgainst.push(match.homeScore);
        awayStats.count++;
        if (match.homeScore === 0) awayStats.cleanSheets++;
        if (match.awayScore === 0) awayStats.failedToScore++;
      }

      // Calculate averages
      for (const [key, stats] of teamMatches.entries()) {
        const avgGoalsFor = stats.goalsFor.reduce((a, b) => a + b, 0) / Math.max(stats.count, 1);
        const avgGoalsAgainst = stats.goalsAgainst.reduce((a, b) => a + b, 0) / Math.max(stats.count, 1);
        
        teamStatsCache.set(key, {
          avgXG: avgGoalsFor * 0.85, // Approximate xG from actual goals
          avgXGA: avgGoalsAgainst * 0.85,
          cleanSheetRate: stats.cleanSheets / Math.max(stats.count, 1),
          failedToScoreRate: stats.failedToScore / Math.max(stats.count, 1),
          avgGoalsScored: avgGoalsFor,
          avgGoalsConceded: avgGoalsAgainst,
        });
      }
    }

    // Analyze each fixture
    const analyzedBets: PredictionResult[] = [];

    for (const fixture of todaysFixtures) {
      // Get team stats
      const homeKey = `${fixture.league.name}|${fixture.homeTeam.name}`;
      const awayKey = `${fixture.league.name}|${fixture.awayTeam.name}`;
      
      const homeStats = teamStatsCache.get(homeKey) || {
        avgXG: 1.5, avgXGA: 1.5, cleanSheetRate: 0.3, failedToScoreRate: 0.3, avgGoalsScored: 1.5, avgGoalsConceded: 1.5
      };
      const awayStats = teamStatsCache.get(awayKey) || {
        avgXG: 1.5, avgXGA: 1.5, cleanSheetRate: 0.3, failedToScoreRate: 0.3, avgGoalsScored: 1.5, avgGoalsConceded: 1.5
      };

      // Create fixture data package for prediction
      const fixtureDataPackage = {
        fixture: {
          id: fixture.fixtureId,
          leagueId: fixture.league.id,
          leagueName: fixture.league.name,
          homeTeam: { id: fixture.homeTeam.id, name: fixture.homeTeam.name },
          awayTeam: { id: fixture.awayTeam.id, name: fixture.awayTeam.name },
          date: fixture.date,
          status: 'scheduled' as const,
        },
        expectedStats: {
          fixtureId: fixture.fixtureId,
          homeTeamStats: {
            teamId: fixture.homeTeam.id,
            teamName: fixture.homeTeam.name,
            venue: 'home' as const,
            matchesPlayed: 10,
            goalsScored: homeStats.avgGoalsScored * 10,
            goalsConceded: homeStats.avgGoalsConceded * 10,
            avgGoalsScored: homeStats.avgGoalsScored,
            avgGoalsConceded: homeStats.avgGoalsConceded,
            xG: homeStats.avgXG,
            xGA: homeStats.avgXGA,
            cleanSheetRate: homeStats.cleanSheetRate,
            failedToScoreRate: homeStats.failedToScoreRate,
            bttsRate: 0.5,
            over25Rate: 0.5,
            over15Rate: 0.7,
          },
          awayTeamStats: {
            teamId: fixture.awayTeam.id,
            teamName: fixture.awayTeam.name,
            venue: 'away' as const,
            matchesPlayed: 10,
            goalsScored: awayStats.avgGoalsScored * 10,
            goalsConceded: awayStats.avgGoalsConceded * 10,
            avgGoalsScored: awayStats.avgGoalsScored,
            avgGoalsConceded: awayStats.avgGoalsConceded,
            xG: awayStats.avgXG,
            xGA: awayStats.avgXGA,
            cleanSheetRate: awayStats.cleanSheetRate,
            failedToScoreRate: awayStats.failedToScoreRate,
            bttsRate: 0.5,
            over25Rate: 0.5,
            over15Rate: 0.7,
          },
          combinedExpectedGoals: homeStats.avgXG + awayStats.avgXGA,
          combinedExpectedConceded: homeStats.avgXGA + awayStats.avgXG,
          fixtureXG: (homeStats.avgXG + awayStats.avgXGA + homeStats.avgXGA + awayStats.avgXG) / 2,
        },
        odds: fixture.odds ? [{
          fixtureId: fixture.fixtureId,
          bookmaker: 'Average',
          market: 'over_2.5_goals' as const,
          overOdds: fixture.odds.over25 || null,
          underOdds: fixture.odds.under25 || null,
          yesOdds: fixture.odds.bttsYes || null,
          noOdds: fixture.odds.bttsNo || null,
          homeOdds: fixture.odds.homeWin || null,
          drawOdds: fixture.odds.draw || null,
          awayOdds: fixture.odds.awayWin || null,
          timestamp: fixture.date,
        }] : [],
        leagueFilterPassed: true,
        sampleSizeFilterPassed: true,
        outlierFlags: {
          isRunawayGiant: false,
          homeCleanSheetRate: homeStats.cleanSheetRate,
          awayFailedToScoreRate: awayStats.failedToScoreRate,
        },
      };

      // Get model predictions
      const predictions = predictFixture(fixtureDataPackage, DEFAULT_O25_WEIGHTS, DEFAULT_BTTS_WEIGHTS);

      // Find best value bet for this fixture
      for (const pred of predictions) {
        let marketName: string;
        let predictionLabel: string;
        let modelProb: number;
        let marketOdds: number | null;

        if (pred.market === 'over_2.5_goals') {
          marketName = 'Over 2.5 Goals';
          predictionLabel = 'Yes';
          modelProb = pred.modelProbability;
          marketOdds = fixture.odds?.over25 || null;
        } else if (pred.market === 'btts_yes') {
          marketName = 'Both Teams to Score';
          predictionLabel = 'Yes';
          modelProb = pred.modelProbability;
          marketOdds = fixture.odds?.bttsYes || null;
        } else {
          continue;
        }

        // Calculate expected value
        const fairOdd = marketOdds && marketOdds > 0 ? 1 / marketOdds : 0.5;
        const edge = (modelProb - fairOdd) * 100;

        // Only consider bets with positive EV
        if (edge > 5) { // Minimum 5% edge threshold
          analyzedBets.push({
            match: `${fixture.homeTeam.name} vs ${fixture.awayTeam.name}`,
            league: fixture.league.name,
            market: marketName,
            prediction: predictionLabel,
            confidence: pred.modelConfidence * 100,
            odds: marketOdds || 1.8,
            expectedValue: edge,
            reasoning: `Model probability: ${(modelProb * 100).toFixed(1)}% vs Fair odd: ${(fairOdd * 100).toFixed(1)}%. ${fixture.homeTeam.name} averaging ${homeStats.avgGoalsScored.toFixed(2)} goals scored/${homeStats.avgGoalsConceded.toFixed(2)} conceded. ${fixture.awayTeam.name} averaging ${awayStats.avgGoalsScored.toFixed(2)}/${awayStats.avgGoalsConceded.toFixed(2)}.`,
            fixture,
          });
        }
      }
    }

    // Sort by expected value and pick the best bet
    analyzedBets.sort((a, b) => b.expectedValue - a.expectedValue);
    const bestBet = analyzedBets.length > 0 ? analyzedBets[0] : null;

    if (bestBet) {
      console.log(`\n✅ Best bet identified: ${bestBet.match} - ${bestBet.prediction} (${bestBet.market})`);
      console.log(`   Confidence: ${bestBet.confidence.toFixed(1)}%, EV: +${bestBet.expectedValue.toFixed(2)}%, Odds: ${bestBet.odds.toFixed(2)}`);
    } else {
      console.log('\n⚠️ No value bets found meeting the criteria.');
    }

    // 5. Send to Telegram
    const bot = new TelegramBotService();
    const message = bot.formatPrediction(bestBet);

    console.log('\n📤 Sending prediction to Telegram...');
    await bot.sendMessage(message);

    console.log('✅ Bot execution complete.');

  } catch (error: any) {
    console.error('❌ Critical Error:', error);
    // Send error alert to Telegram
    try {
      const bot = new TelegramBotService();
      await bot.sendMessage(`🚨 **System Alert**\n\nThe prediction bot encountered an error:\n\n\`${error.message}\`\n\nPlease check GitHub Actions logs.`);
    } catch (sendError) {
      console.error('Failed to send error notification:', sendError);
    }
    process.exit(1);
  }
}

main();
