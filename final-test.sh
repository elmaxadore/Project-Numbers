#!/bin/bash
echo "=========================================="
echo "🧪 FINAL VERIFICATION TEST"
echo "=========================================="
echo ""

# Build the project
echo "📦 Building project..."
npm run build > /dev/null 2>&1

if [ $? -ne 0 ]; then
  echo "❌ Build failed!"
  exit 1
fi
echo "✅ Build successful"
echo ""

# Run the bot and capture output
echo "🤖 Running bot with future date (2026-09-13)..."
echo ""

OUTPUT=$(TELEGRAM_BOT_TOKEN='test' TELEGRAM_CHAT_ID='test' node dist/bot/telegram-bot.js 2>&1)

# Check for "Unknown" in output
UNKNOWN_COUNT=$(echo "$OUTPUT" | grep -i "unknown" | wc -l)

if [ $UNKNOWN_COUNT -gt 0 ]; then
  echo "❌ FAIL: Found 'Unknown' values in output:"
  echo "$OUTPUT" | grep -i "unknown"
  exit 1
else
  echo "✅ PASS: No 'Unknown' values found"
fi

# Check that real fixtures were found
if echo "$OUTPUT" | grep -q "Found 4 real matches"; then
  echo "✅ PASS: Real fixtures fetched successfully"
else
  echo "❌ FAIL: No real fixtures found"
  exit 1
fi

# Check that qualified bets were found
if echo "$OUTPUT" | grep -q "qualified bets"; then
  echo "✅ PASS: Qualified bets calculated"
else
  echo "❌ FAIL: No qualified bets found"
  exit 1
fi

# Check fixture names are real
if echo "$OUTPUT" | grep -q "Getafe vs Deportivo"; then
  echo "✅ PASS: Real team names detected (Getafe vs Deportivo)"
else
  echo "❌ FAIL: Fake/mock team names detected"
  exit 1
fi

# Check league names are real
if echo "$OUTPUT" | grep -q "Spanish La Liga"; then
  echo "✅ PASS: Real league names detected (Spanish La Liga)"
else
  echo "❌ FAIL: Fake/unknown league names detected"
  exit 1
fi

echo ""
echo "=========================================="
echo "✅ ALL TESTS PASSED!"
echo "=========================================="
echo ""
echo "📱 Sample output from bot:"
echo "$OUTPUT" | grep -E "(Fixture:|League:|Match:|qualified)" | head -10
echo ""
