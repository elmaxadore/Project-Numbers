/**
 * Telegram Bot for Sports Predictions
 * Runs via GitHub Actions (Serverless) - 100% Free
 *
 * Features:
 * - Downloads latest model/data from GitHub Releases
 * - Runs inference
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
class TelegramBotService {
    telegramUrl;
    constructor() {
        if (!TELEGRAM_BOT_TOKEN || !TELEGRAM_CHAT_ID) {
            throw new Error('Missing Telegram credentials. Set TELEGRAM_BOT_TOKEN and TELEGRAM_CHAT_ID in secrets.');
        }
        this.telegramUrl = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}`;
    }
    async sendMessage(message) {
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
        }
        catch (error) {
            console.error('Error sending Telegram message:', error);
            throw error;
        }
    }
    formatPrediction(result) {
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
    try {
        // 1. Verify Assets exist (downloaded by GitHub Action step)
        const releaseAssetsDir = path.join(process.cwd(), 'release-assets');
        console.log('📂 Checking release-assets directory...');
        if (!fs.existsSync(releaseAssetsDir)) {
            throw new Error('release-assets directory not found. Ensure the GitHub Action downloads the release first.');
        }
        const files = fs.readdirSync(releaseAssetsDir);
        console.log('📁 Files in release-assets:', files);
        // Find model and data files
        const modelFile = files.find(f => f.endsWith('.bin'));
        const dataFile = files.find(f => f.endsWith('-data.json') || f === 'all-sports-data.json');
        if (!modelFile) {
            throw new Error('Model file (.bin) not found in release-assets. Check the release zip contains .bin files.');
        }
        if (!dataFile) {
            throw new Error('Data file (.json) not found in release-assets. Check the release zip contains data JSON files.');
        }
        const modelPath = path.join(releaseAssetsDir, modelFile);
        const dataPath = path.join(releaseAssetsDir, dataFile);
        console.log(`✅ Model found: ${modelFile}`);
        console.log(`✅ Data found: ${dataFile}`);
        // 2. Load Data
        console.log('📖 Loading historical data...');
        const rawData = JSON.parse(fs.readFileSync(dataPath, 'utf-8'));
        console.log(`📊 Loaded ${Array.isArray(rawData) ? rawData.length : 'object'} records`);
        // 3. Run Inference (Simplified for demo - integrate your actual engine here)
        console.log('🧠 Running inference on today\'s fixtures...');
        // TODO: Integrate your actual BestBetEngine here
        // const model = OutcomeModel.load(modelPath);
        // const engine = new BestBetEngine(model, rawData);
        // const bestBet = await engine.findBestBet();
        // Mock result for now (replace with real engine call above)
        const bestBet = {
            match: "Man City vs Arsenal",
            league: "Premier League",
            market: "Over 2.5 Goals",
            prediction: "Yes",
            confidence: 78.5,
            odds: 1.85,
            expectedValue: 12.4,
            reasoning: "High xG momentum for both teams. Historical H2H averages 3.2 goals. Model detects value against bookmaker odds."
        };
        // 4. Send to Telegram
        const bot = new TelegramBotService();
        const message = bot.formatPrediction(bestBet);
        console.log('📤 Sending prediction to Telegram...');
        await bot.sendMessage(message);
        console.log('✅ Bot execution complete.');
    }
    catch (error) {
        console.error('❌ Critical Error:', error);
        // Send error alert to Telegram
        try {
            const bot = new TelegramBotService();
            await bot.sendMessage(`🚨 **System Alert**\n\nThe prediction bot encountered an error:\n\n\`${error.message}\`\n\nPlease check GitHub Actions logs.`);
        }
        catch (sendError) {
            console.error('Failed to send error notification:', sendError);
        }
        process.exit(1);
    }
}
main();
//# sourceMappingURL=telegram-bot.js.map