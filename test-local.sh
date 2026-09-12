#!/bin/bash
# Local test script for the prediction bot
# Run this after setting your API keys

echo "🧪 Testing Sports Betting Bot Locally"
echo "======================================"

# Check required env vars
echo ""
echo "🔑 Checking environment variables..."
if [ -z "$TELEGRAM_BOT_TOKEN" ]; then
  echo "⚠️  TELEGRAM_BOT_TOKEN not set"
else
  echo "✅ TELEGRAM_BOT_TOKEN set"
fi

if [ -z "$TELEGRAM_CHAT_ID" ]; then
  echo "⚠️  TELEGRAM_CHAT_ID not set"
else
  echo "✅ TELEGRAM_CHAT_ID set"
fi

if [ -z "$X_RAPIDAPI_KEY" ] && [ -z "$API_SPORTS_KEY" ]; then
  echo "⚠️  Neither X_RAPIDAPI_KEY nor API_SPORTS_KEY set"
else
  echo "✅ API key for fixtures set"
fi

echo ""
echo "📂 Checking release-assets directory..."
if [ ! -d "./release-assets" ]; then
  echo "❌ release-assets directory not found"
  exit 1
fi

echo "📁 Files in release-assets:"
ls -la ./release-assets/*.bin ./release-assets/*.json 2>/dev/null || echo "No .bin or .json files found"

echo ""
echo "🚀 Running bot..."
node dist/bot/telegram-bot.js
