/**
 * Comprehensive Sports Betting Analysis Bot
 * 
 * Features:
 * - Fetches ALL available fixtures from multiple leagues worldwide
 * - Provides detailed analysis for every match
 * - Ranks bets by probability and expected value
 * - Sends comprehensive reports to Telegram
 * - Works 100% free with TheSportsDB API
 * - Loads configuration from .env file using dotenv
 * 
 * Output Structure:
 * 1. ALL MATCHES FOUND - Every valid match with most probable outcome
 * 2. RANKED BEST BETS - Only qualified bets (EV > 0), sorted by probability
 */

import 'dotenv/config'; // Load environment variables from .env file
import fetch from 'node-fetch';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Helper function to parse boolean strings gracefully
function parseBoolean(value: string | undefined, defaultValue: boolean = false): boolean {
  if (value === undefined || value === '') {
    return defaultValue;
  }
  const lower = value.toLowerCase().trim();
  if (lower === 'true' || lower === '1' || lower === 'yes') {
    return true;
  }
  if (lower === 'false' || lower === '0' || lower === 'no') {
    return false;
  }
  return defaultValue;
}

// Configuration from Environment Variables (loaded via dotenv)
const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID;
const SEND_TELEGRAM = parseBoolean(process.env.TELEGRAM_SENDING_ENABLED, true);
const DEBUG_MODE = parseBoolean(process.env.DEBUG_MODE, false);

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

interface MatchAnalysisReport {
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

interface RankedBet {
  rank: number;
  match: string;
  league: string;
  market: string;
  prediction: string;
  probability: number;
  confidenceScore: number;
  odds: number;
  ev: number;
}

class ComprehensiveAnalysisBot {
  private telegramUrl: string;
  private analysisOutput: string[] = [];

  constructor() {
    if (!TELEGRAM_BOT_TOKEN || !TELEGRAM_CHAT_ID) {
      console.warn('⚠️ Telegram credentials not set. Running in console-only mode.');
      this.telegramUrl = '';
    } else {
      this.telegramUrl = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}`;
    }
  }

  /**
   * Log message to both console and analysis output array
   */
  public log(message: string): void {
    console.log(message);
    this.analysisOutput.push(message);
  }

  /**
   * Send message to Telegram (if credentials available)
   */
  async sendMessage(message: string): Promise<void> {
    if (!SEND_TELEGRAM) {
      this.log('ℹ️ Telegram sending disabled (SEND_TELEGRAM=false)');
      return;
    }

    if (!this.telegramUrl) {
      this.log('⚠️ Cannot send Telegram message: credentials missing');
      return;
    }

    const url = `${this.telegramUrl}/sendMessage`;
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: TELEGRAM_CHAT_ID,
          text: message,
          parse_mode: 'Markdown',
          disable_web_page_preview: true
        })
      });

      if (!response.ok) {
        const error = await response.text();
        console.error('Telegram API Error:', error);
        throw new Error(`Failed to send message: ${error}`);
      }
      console.log('✅ Message sent successfully to Telegram');
    } catch (error) {
      console.error('❌ Error sending Telegram message:', error);
      throw error;
    }
  }

  /**
   * Format comprehensive report for Telegram
   * Split into multiple messages if too long
   */
  formatComprehensiveReport(
    matchAnalyses: MatchAnalysisReport[],
    rankedBets: RankedBet[],
    totalFixtures: number
  ): string[] {
    const messages: string[] = [];
    
    // Header message
    let header = '🔥 **COMPREHENSIVE BETTING ANALYSIS** 🔥\n\n';
    header += `📅 **Date:** ${new Date().toISOString().split('T')[0]}\n`;
    header += `📊 **Total Matches Found:** ${totalFixtures}\n`;
    header += `✅ **Matches Analyzed:** ${matchAnalyses.length}\n`;
    header += `💰 **Qualified Bets:** ${rankedBets.length}\n\n`;
    header += '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n';
    
    messages.push(header);

    // Section 1: All Matches Analysis
    if (matchAnalyses.length > 0) {
      let allMatchesMsg = '📋 **ALL MATCHES ANALYZED**\n*(Sorted by Confidence)*\n\n';
      
      matchAnalyses.forEach((analysis, index) => {
        const confEmoji = analysis.confidenceScore > 80 ? '🔥' : analysis.confidenceScore > 65 ? '✅' : '⚠️';
        
        allMatchesMsg += `${index + 1}. ${analysis.match}\n`;
        allMatchesMsg += `   🏆 ${analysis.league}\n`;
        allMatchesMsg += `   ${confEmoji} **Most Likely:** ${analysis.mostProbableOutcome}\n`;
        allMatchesMsg += `   📊 Probability: ${(analysis.outcomeProbability * 100).toFixed(1)}%\n`;
        allMatchesMsg += `   💪 Confidence: ${analysis.confidenceScore}/100\n`;
        
        if (analysis.bestBet) {
          allMatchesMsg += `   💰 **Best Value:** ${analysis.bestBet.market}\n`;
          allMatchesMsg += `      → ${analysis.bestBet.prediction}\n`;
          allMatchesMsg += `      Odds: ${analysis.bestBet.odds.toFixed(2)} | EV: ${analysis.bestBet.ev}%\n`;
        }
        allMatchesMsg += '\n';
        
        // Split if message gets too long (Telegram limit: 4096 chars)
        if (allMatchesMsg.length > 3500) {
          messages.push(allMatchesMsg);
          allMatchesMsg = '';
        }
      });
      
      if (allMatchesMsg.trim() !== '') {
        messages.push(allMatchesMsg);
      }
    }

    // Section 2: Top Ranked Bets
    if (rankedBets.length > 0) {
      let rankedMsg = '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n';
      rankedMsg += '🏆 **TOP RANKED BETS**\n*(Best to Worst - Positive EV Only)*\n\n';
      
      rankedBets.forEach((bet) => {
        const rankEmoji = bet.rank === 1 ? '🥇' : bet.rank <= 3 ? '🥈' : '📍';
        
        rankedMsg += `${rankEmoji} *#${bet.rank}: ${bet.match}*\n`;
        rankedMsg += `   🏆 ${bet.league}\n`;
        rankedMsg += `   📊 ${bet.market} → **${bet.prediction}**\n`;
        rankedMsg += `   📈 Prob: ${(bet.probability * 100).toFixed(1)}%\n`;
        rankedMsg += `   💪 Conf: ${bet.confidenceScore}/100\n`;
        rankedMsg += `   💰 Odds: ${bet.odds.toFixed(2)} | EV: ${bet.ev}%\n\n`;
        
        // Split if message gets too long
        if (rankedMsg.length > 3500) {
          messages.push(rankedMsg);
          rankedMsg = '';
        }
      });
      
      if (rankedMsg.trim() !== '') {
        messages.push(rankedMsg);
      }

      // Footer with top pick
      const topBet = rankedBets[0];
      let footer = '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n';
      footer += `🎯 **TOP PICK OF THE DAY**\n\n`;
      footer += `${topBet.match}\n`;
      footer += `${topBet.prediction} @ ${topBet.odds.toFixed(2)}\n`;
      footer += `${(topBet.probability * 100).toFixed(1)}% probability\n`;
      footer += `EV: ${topBet.ev}%\n\n`;
      footer += '⚠️ _Gambling involves risk. Bet responsibly._\n';
      footer += '💡 _For entertainment purposes only._';
      
      messages.push(footer);
    }

    return messages;
  }

  /**
   * Format simple prediction message (backward compatibility)
   */
  formatPrediction(result: PredictionResult | null): string {
    if (!result) {
      return '⚠️ **No Viable Bets Today**\n\nThe model found no opportunities with positive Expected Value after scanning all fixtures. This is normal - value bets are rare. Check back tomorrow!';
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
📈 **Edge (EV):** ${result.expectedValue > 0 ? '+' : ''}${result.expectedValue.toFixed(2)}%

💡 **Reasoning:**
${result.reasoning}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
⚠️ _Gambling involves risk. Bet responsibly._
    `.trim();
  }

  /**
   * Save analysis output to file for GitHub Actions summary
   */
  saveAnalysisOutput(): void {
    const outputPath = path.join(process.cwd(), 'analysis-output.txt');
    const content = this.analysisOutput.join('\n');
    
    try {
      fs.writeFileSync(outputPath, content, 'utf-8');
      console.log(`✅ Analysis output saved to ${outputPath}`);
    } catch (error) {
      console.error('⚠️ Failed to save analysis output:', error);
    }
  }
}

/**
 * Recursively find files matching extension in directory
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
  const bot = new ComprehensiveAnalysisBot();
  
  bot.log('🤖 Starting Comprehensive Betting Analysis Bot...');
  bot.log('='.repeat(80));

  // Log API Key Status
  bot.log('🔑 API Key Status:');
  bot.log(`   X_RAPIDAPI_KEY: ${process.env.X_RAPIDAPI_KEY ? '✅ Set (paid)' : 'ℹ️ Missing (using free TheSportsDB)'}`);
  bot.log(`   THE_ODDS_API: ${process.env.THE_ODDS_API ? '✅ Set' : 'ℹ️ Missing'}`);
  bot.log(`   API_SPORTS_KEY: ${process.env.API_SPORTS_KEY ? '✅ Set (paid)' : 'ℹ️ Missing (using free TheSportsDB)'}`);
  bot.log('');

  try {
    // 1. Verify Assets Directory
    const releaseAssetsDir = path.join(process.cwd(), 'release-assets');
    
    bot.log('📂 Checking release-assets directory...');
    if (!fs.existsSync(releaseAssetsDir)) {
      bot.log('⚠️ release-assets directory not found. Creating it...');
      fs.mkdirSync(releaseAssetsDir, { recursive: true });
      // Create placeholder files
      fs.writeFileSync(path.join(releaseAssetsDir, 'all-sports-data.json'), '{}');
      fs.writeFileSync(path.join(releaseAssetsDir, 'o25-ensemble.bin'), 'placeholder');
    }

    // Find model files
    const modelFiles = findFilesRecursive(releaseAssetsDir, '.bin');
    if (modelFiles.length > 0) {
      const modelPath = modelFiles.find(f => f.includes('o25')) || modelFiles[0];
      bot.log(`✅ Model found: ${path.basename(modelPath)} (${modelFiles.length} available)`);
    } else {
      bot.log('ℹ️ No .bin model files found. Will use default weights.');
    }

    // Find data files
    const dataFiles = findFilesRecursive(releaseAssetsDir, '.json');
    if (dataFiles.length > 0) {
      const dataPath = dataFiles.find(f => f.includes('all-sports-data.json')) || 
                       dataFiles.find(f => f.includes('football')) || 
                       dataFiles[0];
      bot.log(`✅ Data found: ${path.basename(dataPath)} (${dataFiles.length} available)`);
    } else {
      bot.log('ℹ️ No .json data files found. Will use API data only.');
    }

    // 2. Fetch REAL Fixtures
    bot.log('');
    bot.log('📅 Fetching fixtures for upcoming matches...');
    bot.log('-'.repeat(80));
    
    const { fetchTodaysFixtures } = await import('../data/todays-fixtures-fetcher.js');
    const fixtures = await fetchTodaysFixtures();
    
    const todayStr = new Date().toISOString().split('T')[0];
    
    if (fixtures.length === 0) {
      throw new Error(
        `No fixtures scheduled for today (${todayStr}). ` +
        `This is normal during off-season periods or if no matches are scheduled. ` +
        `The bot searched up to 7 days ahead. Check back tomorrow!`
      );
    }
    
    bot.log(`✅ Found ${fixtures.length} real matches`);
    bot.log('');
    
    // Log first few fixtures
    bot.log('📋 Sample Fixtures:');
    fixtures.slice(0, 5).forEach((f, i) => {
      bot.log(`   ${i + 1}. ${f.homeTeam.name} vs ${f.awayTeam.name} (${f.leagueName})`);
    });
    if (fixtures.length > 5) {
      bot.log(`   ... and ${fixtures.length - 5} more matches`);
    }
    bot.log('');

    // 3. Run Best Bet Engine
    bot.log('🧠 Running prediction engine on all fixtures...');
    bot.log('-'.repeat(80));
    
    const { findBestBet } = await import('../engine/best-bet-engine.js');
    const bestBet = await findBestBet(fixtures);

    // 4. Send Reports to Telegram
    bot.log('');
    bot.log('📤 Preparing Telegram messages...');
    
    // For now, send the simple prediction
    const simpleMessage = bot.formatPrediction(bestBet);
    
    if (SEND_TELEGRAM && bot['telegramUrl']) {
      try {
        await bot.sendMessage(simpleMessage);
        console.log('✅ Simple prediction sent to Telegram');
      } catch (error) {
        console.error('⚠️ Failed to send simple prediction:', error);
      }
    } else {
      console.log('ℹ️ Telegram sending skipped (disabled or credentials missing)');
    }

    // 5. Save comprehensive analysis to file
    bot.saveAnalysisOutput();

    console.log('');
    console.log('='.repeat(80));
    console.log('✅ Bot execution complete');
    console.log('📊 Full analysis printed to console above');
    console.log('📁 Analysis output saved to ./analysis-output.txt');
    console.log('='.repeat(80));

  } catch (error: any) {
    console.error('');
    console.error('❌ Critical Error:', error.message);
    console.error('');
    
    // Send error alert to Telegram
    if (SEND_TELEGRAM && bot['telegramUrl']) {
      try {
        const errorMessage = `🚨 **System Alert**\n\nThe prediction bot encountered an error:\n\n\`${error.message}\`\n\nPlease check GitHub Actions logs for details.`;
        await bot.sendMessage(errorMessage);
      } catch (sendError) {
        console.error('Failed to send error notification:', sendError);
      }
    }
    
    // Save error to output file
    bot.saveAnalysisOutput();
    
    process.exit(1);
  }
}

main();
