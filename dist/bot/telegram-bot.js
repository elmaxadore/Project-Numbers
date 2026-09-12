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
        function getAllFiles(dirPath, arrayOfFiles = []) {
            const entries = fs.readdirSync(dirPath, { withFileTypes: true });
            for (const entry of entries) {
                const fullPath = path.join(dirPath, entry.name);
                if (entry.isDirectory()) {
                    getAllFiles(fullPath, arrayOfFiles);
                }
                else if (entry.isFile()) {
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