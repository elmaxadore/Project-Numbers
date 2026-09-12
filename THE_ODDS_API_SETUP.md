# 🎯 The Odds API Integration Guide

## Overview
Your sports prediction bot now supports **The Odds API** as the PRIMARY source for real fixtures and odds!

**Free Tier:** 500 calls/month (~16 calls/day) - Perfect for daily predictions!

## What Changed

### 1. New File: `src/data/the-odds-api-fetcher.ts`
A dedicated fetcher class that:
- Fetches REAL upcoming fixtures from 9+ soccer leagues
- Gets REAL bookmaker odds (1X2, Over/Under 2.5, BTTS)
- Averages odds across multiple bookmakers
- Filters only today's fixtures
- Tracks API usage (500 calls/month limit)

**Supported Leagues:**
- Premier League (England)
- Bundesliga (Germany)
- Serie A (Italy)
- La Liga (Spain)
- Ligue 1 (France)
- UEFA Champions League
- UEFA Europa League
- Eredivisie (Netherlands)
- Primeira Liga (Portugal)

### 2. Updated: `src/data/todays-fixtures-fetcher.ts`
Now uses a **priority-based approach**:
1. **FIRST:** The Odds API (if `THE_ODDS_API` secret is set)
2. **SECOND:** API-Football (if `API_SPORTS_KEY` secret is set)
3. **FALLBACK:** Simulated fixtures (realistic teams, generated odds)

### 3. Updated: `src/config.ts`
Now supports both environment variable names:
```typescript
oddsApiKey: env('ODDS_API_KEY') || env('THE_ODDS_API')
```

### 4. Updated: `.github/workflows/daily-prediction.yml`
Passes API keys to the bot:
```yaml
env:
  THE_ODDS_API: ${{ secrets.THE_ODDS_API }}
  API_SPORTS_KEY: ${{ secrets.API_SPORTS_KEY }}
```

## Setup Instructions

### Step 1: Get Your FREE API Key
1. Go to https://the-odds-api.com/
2. Click "Get API Key"
3. Sign up for free account
4. Copy your API key (looks like: `a1b2c3d4e5f6g7h8i9j0`)

### Step 2: Add to GitHub Secrets
1. Go to your GitHub repository
2. Click **Settings** → **Secrets and variables** → **Actions**
3. Click **New repository secret**
4. Add:
   - **Name:** `THE_ODDS_API`
   - **Value:** `your_api_key_here`
5. Click **Add secret**

### Step 3: Test Locally (Optional)
```bash
export THE_ODDS_API=your_api_key_here
npm run build
node dist/bot/telegram-bot.js
```

Look for logs like:
```
🎯 Using The Odds API as primary source...
📡 Fetching Premier League fixtures from The Odds API... (1/500)
✓ Found 8 fixtures in Premier League
✅ Got 25 fixtures from The Odds API
```

### Step 4: Deploy to GitHub Actions
1. Commit and push your changes
2. Go to **Actions** tab
3. Select **Daily Prediction Bot**
4. Click **Run workflow**
5. Check logs for API usage

## API Usage Monitoring

The Odds API has a **500 calls/month limit**. Here's how we conserve calls:

- **1 call per league** (we fetch 9 leagues = 9 calls/day max)
- **Only runs once per day** (GitHub Actions cron: 08:00 UTC)
- **~270 calls/month** worst case (well under 500 limit!)
- **Fallback enabled** if limit reached

Logs will show:
```
📡 Fetching Premier League fixtures from The Odds API... (1/500)
🚫 Monthly API limit reached (500 calls). Stopping.
⚠️ No fixtures from APIs. Using simulated fixtures as fallback.
```

## What You'll Get

### With THE_ODDS_API configured:
✅ **REAL fixtures** scheduled for today
✅ **REAL odds** from multiple bookmakers
✅ **Accurate predictions** based on actual market prices
✅ **True value bets** (EV > 5%)

Example Telegram message:
```
🔥 BEST BET OF THE DAY 🔥

🏆 League: Premier League
⚽ Match: Manchester City vs Arsenal
📊 Market: Over 2.5 Goals
🎯 Prediction: Yes

💰 Odds: 1.86
🧠 Confidence: 72.5%
📈 Edge (EV): +8.34%

💡 Reasoning:
Model probability: 58.2% vs Fair odd: 53.8%. 
Man City averaging 2.31 goals scored/0.89 conceded. 
Arsenal averaging 1.78/1.11.
```

### Without API key (fallback):
⚠️ **Simulated fixtures** (real team names, realistic matchups)
⚠️ **Generated odds** (based on team strength algorithms)
⚠️ **Still functional** but less accurate

## Troubleshooting

### "THE_ODDS_API not configured" warning
- Check secret name is exactly `THE_ODDS_API` (case-sensitive)
- Verify secret has no extra spaces
- Re-run workflow after adding secret

### "Rate limit exceeded" error
- You've used 500 calls this month
- Wait until next month resets
- Bot will automatically use simulated fixtures

### "No fixtures found"
- Might be off-season (no matches today)
- Check API status at https://the-odds-api.com/
- Bot will use simulated fixtures as fallback

### Build errors
```bash
npm run build
```
Check for TypeScript errors. Common fixes:
- Ensure all imports use `.js` extension
- Run `npm install` if modules missing

## Cost Breakdown

| Feature | Free Tier | Your Usage |
|---------|-----------|------------|
| Calls/month | 500 | ~270 (9 leagues × 30 days) |
| Calls/day | ~16 | 9 (one per league) |
| Leagues | 9 supported | All 9 used |
| Markets | h2h, totals, btts | All 3 markets |
| **Cost** | **$0** | **$0** ✅ |

## Next Steps

1. ✅ Add `THE_ODDS_API` secret to GitHub
2. ✅ Run workflow manually to test
3. ✅ Check Telegram for first real prediction
4. ✅ Monitor logs for API usage
5. ✅ Enjoy real daily predictions!

## Architecture Diagram

```
┌─────────────────────────────────────────────────────┐
│           GitHub Actions (Daily at 08:00 UTC)       │
├─────────────────────────────────────────────────────┤
│  1. Download model & data from Release              │
│  2. Run telegram-bot.ts                             │
│     └─► TodaysFixturesFetcher.getTodaysFixtures()   │
│         ├─► [PRIORITY 1] TheOddsApiFetcher          │
│         │   └─► api.the-odds-api.com/v4/sports/...  │
│         │       (9 leagues, 500 calls/month)        │
│         ├─► [PRIORITY 2] API-Football               │
│         │   └─► v3.football.api-sports.io           │
│         │       (100 calls/day)                     │
│         └─► [FALLBACK] Simulated Fixtures           │
│             └─► Real teams, generated odds          │
│                                                     │
│  3. Run model inference on each fixture             │
│  4. Calculate EV for each bet                       │
│  5. Send best bet to Telegram                       │
└─────────────────────────────────────────────────────┘
```

## Support

- The Odds API Docs: https://the-odds-api.com/quickstart.html
- GitHub Issues: Report bugs or feature requests
- Logs: Check GitHub Actions for detailed API usage

---

**Enjoy your FREE real-time sports prediction bot! 🎉**
