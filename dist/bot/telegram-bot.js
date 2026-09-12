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
async function downloadAssets() {
    console.log('⬇️ Downloading latest model and data from GitHub Releases...');
    // In a real GitHub Action, we can use the GH CLI or API to get the latest release
    // For simplicity in this script, we assume files might be in a specific branch or we use the GH CLI in the action workflow
    // Here we simulate checking for local files first (which would be downloaded by the workflow step)
    const modelPath = path.join(__dirname, '../data/model-latest.bin');
    const dataPath = path.join(__dirname, '../data/cache/all-sports-data.json');
    if (!fs.existsSync(modelPath)) {
        throw new Error('Model file not found. Ensure the GitHub Action downloads the release asset first.');
    }
    if (!fs.existsSync(dataPath)) {
        throw new Error('Data cache not found. Ensure the GitHub Action downloads the release asset first.');
    }
    console.log('✅ Assets loaded successfully.');
    return { modelPath, dataPath };
}
async function main() {
    console.log('🤖 Starting Prediction Bot...');
    try {
        // 1. Download Assets
        const { modelPath, dataPath } = await downloadAssets();
        // 2. Initialize Engine
        // Note: You need to adapt your existing engine to load from these paths
        const rawData = JSON.parse(fs.readFileSync(dataPath, 'utf-8'));
        // Mock loading the model - adapt this to your actual model loading logic
        // const model = OutcomeModel.load(modelPath); 
        // const engine = new BestBetEngine(model, rawData);
        // For demonstration, we simulate the result based on your existing logic
        // In production, uncomment the real engine lines above
        console.log('🧠 Running inference on today\'s fixtures...');
        // SIMULATED RESULT (Replace with real engine call)
        // const bestBet = await engine.findBestBet(); 
        // Mocking a result for the code structure demonstration
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
        // 3. Send to Telegram
        const bot = new TelegramBotService();
        const message = bot.formatPrediction(bestBet);
        await bot.sendMessage(message);
        console.log('✅ Bot execution complete.');
    }
    catch (error) {
        console.error('❌ Critical Error:', error);
        // Send error alert to Telegram
        const bot = new TelegramBotService();
        await bot.sendMessage(`🚨 **System Alert**\n\nThe prediction bot encountered an error:\n\`${error.message}\`\n\nPlease check GitHub Actions logs.`);
        process.exit(1);
    }
}
main();
//# sourceMappingURL=telegram-bot.js.map