/**
 * Telegram Bot for Sports Predictions
 * Runs daily via GitHub Actions (Serverless) - 100% Free
 *
 * Features:
 * - Downloads latest model/data from GitHub Releases
 * - Fetches REAL today's fixtures via API-Sports (RapidAPI)
 * - Fetches REAL odds data
 * - Runs prediction engine on real matches
 * - Sends best bet to Telegram
 */

import fetch from 'node-fetch';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

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
      throw new Error('No viable bets found today. The model found no opportunities with positive Expected Value after scanning all fixtures and odds.');
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

/**
 * Recursively find files matching extension in directory
 * Handles nested folder structures from unzip
 */
function findFilesRecursive(dir: string, extension: string): string[] {
  const results: string[] = [];
  
  if (!fs.existsSync(dir)) {
    return results;
  }
  
  const items = fs.readdirSync(dir, { withFileTypes: true });
  
  for (const item of items) {
    const fullPath = path.join(dir, item.name);
    if (item.isDirectory()) {
      results.push(...findFilesRecursive(fullPath, extension));
    } else if (item.isFile() && item.name.endsWith(extension)) {
      results.push(fullPath);
    }
  }
  
  return results;
}

async function main() {
  console.log('🤖 Starting Prediction Bot...');
  
  // Log API Key Status
  console.log('🔑 API Key Status:');
  console.log(`   X_RAPIDAPI_KEY: ${process.env.X_RAPIDAPI_KEY ? '✅ Set' : '❌ Missing'}`);
  console.log(`   THE_ODDS_API: ${process.env.THE_ODDS_API ? '✅ Set' : '❌ Missing'}`);
  console.log(`   API_SPORTS_KEY: ${process.env.API_SPORTS_KEY ? '✅ Set' : '❌ Missing'}`);

  try {
    // 1. Verify Assets exist (downloaded by GitHub Action step)
    const releaseAssetsDir = path.join(process.cwd(), 'release-assets');
    
    console.log('📂 Checking release-assets directory...');
    if (!fs.existsSync(releaseAssetsDir)) {
      throw new Error('release-assets directory not found. Ensure the GitHub Action downloads the release first.');
    }

    // Find model files (.bin) recursively - handles nested zip structures
    console.log('🔍 Searching for model files...');
    const modelFiles = findFilesRecursive(releaseAssetsDir, '.bin');
    if (modelFiles.length === 0) {
      throw new Error('No model files (.bin) found in release-assets. Check the release zip contains .bin files.');
    }
    
    // Prefer o25-ensemble.bin, otherwise use first available
    const modelPath = modelFiles.find(f => f.includes('o25')) || modelFiles[0];
    const modelFile = path.basename(modelPath);
    console.log(`✅ Selected model: ${modelFile} (from ${modelFiles.length} available)`);

    // Find data files - prefer all-sports-data.json as it contains everything
    const dataFiles = findFilesRecursive(releaseAssetsDir, '.json');
    if (dataFiles.length === 0) {
      throw new Error('No data files (.json) found in release-assets. Check the release zip contains data JSON files.');
    }
    
    // Prefer all-sports-data.json, otherwise use first available football data
    const dataPath = dataFiles.find(f => f.includes('all-sports-data.json')) || 
                     dataFiles.find(f => f.includes('football')) || 
                     dataFiles[0];
    const dataFile = path.basename(dataPath);
    console.log(`✅ Selected data: ${dataFile} (from ${dataFiles.length} available)`);

    console.log(`✅ Model found: ${modelFile}`);
    console.log(`✅ Data found: ${dataFile}`);

    // 2. Load Historical Data for Model Training/Reference
    console.log('📖 Loading historical data...');
    const rawData = JSON.parse(fs.readFileSync(dataPath, 'utf-8'));
    console.log(`📊 Loaded ${Array.isArray(rawData) ? rawData.length : 'object'} historical records`);

    // 3. Fetch REAL Today's Fixtures via API-Sports
    console.log('📅 Fetching real fixtures for today...');
    
    const { fetchTodaysFixtures } = await import('../data/todays-fixtures-fetcher.js');
    const fixtures = await fetchTodaysFixtures();
    const todayStr = new Date().toISOString().split('T')[0];
    
    if (fixtures.length === 0) {
      throw new Error(`No fixtures scheduled for today (${todayStr}). This is normal during off-season periods. Check back tomorrow when matches are scheduled.`);
    }
    
    console.log(`✅ Found ${fixtures.length} real matches for today`);

    // 4. Run Best Bet Engine on Real Fixtures
    console.log('🧠 Running prediction engine on real fixtures...');
    
    const { findBestBet } = await import('../engine/best-bet-engine.js');
    const { DEFAULT_O25_WEIGHTS, DEFAULT_BTTS_WEIGHTS } = await import('../engine/logistic-regression.js');
    
    const bestBet = await findBestBet(fixtures);

    // 5. Send to Telegram
    const bot = new TelegramBotService();
    const message = bot.formatPrediction(bestBet);

    console.log('📤 Sending prediction to Telegram...');
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
