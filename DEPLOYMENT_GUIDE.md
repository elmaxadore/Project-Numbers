# 🏆 100% FREE Sports Prediction Bot Setup

This guide shows you how to run your sports prediction model **completely free** using GitHub Actions and Telegram.

## 📦 Architecture Overview

```
┌─────────────────┐     ┌──────────────────┐     ┌─────────────────┐
│  GitHub Repo    │────▶│  GitHub Actions  │────▶│   Telegram Bot  │
│  (Code + Model) │     │  (Free Runner)   │     │   (Your Phone)  │
└─────────────────┘     └──────────────────┘     └─────────────────┘
        ▲                       │
        │                       │
        └───────────────────────┘
           Model/Data Storage
           (GitHub Releases)
```

**Where everything runs:**
- **Model Training**: Your local machine (when you commit updates)
- **Model Storage**: GitHub Releases (free unlimited storage for binaries)
- **Daily Predictions**: GitHub Actions runners (free 2000 minutes/month)
- **Data Storage**: GitHub Releases + Local cache in action runner
- **Notifications**: Telegram Bot API (100% free)

## 🚀 Step-by-Step Setup

### Step 1: Create Telegram Bot

1. Open Telegram and search for `@BotFather`
2. Send `/newbot` command
3. Follow prompts to name your bot (e.g., "Sports Predictor Bot")
4. **Save the API Token** (looks like: `1234567890:ABCdefGHIjklMNOpqrsTUVwxyz`)
5. Start a chat with your new bot
6. Search for `@userinfobot` and send `/start` to get your **Chat ID** (numeric ID)

### Step 2: Configure GitHub Secrets

1. Go to your GitHub repository
2. Click **Settings** → **Secrets and variables** → **Actions**
3. Click **New repository secret** for each:

| Secret Name | Value |
|-------------|-------|
| `TELEGRAM_BOT_TOKEN` | Your bot token from BotFather |
| `TELEGRAM_CHAT_ID` | Your numeric Chat ID |
| `GITHUB_TOKEN` | Auto-provided by GitHub (no action needed) |

### Step 3: Prepare Model & Data for Release

Before the workflow can run, you need to upload your trained model:

```bash
# On your local machine after training
npm run build

# Create release assets
mkdir -p release-assets
cp dist/engine/*.bin release-assets/model-latest.bin || echo "No bin file yet"
cp data-cache/all-sports-data.json release-assets/ || echo "No cache yet"

# Install GitHub CLI (if not installed)
# brew install gh  # Mac
# sudo apt install gh  # Linux

# Login to GitHub
gh auth login

# Create a release with your model
gh release create v1.0.0 \
  --title "Initial Model Release" \
  --notes "First version of prediction model" \
  release-assets/*
```

### Step 4: Enable GitHub Actions

1. Go to **Actions** tab in your GitHub repo
2. If prompted, click **I understand my workflows, go ahead and enable them**
3. Find "Daily Prediction Bot" workflow
4. Click **Run workflow** to test it manually first

### Step 5: Verify It Works

1. Check the **Actions** tab for running workflow
2. Wait for completion (~2-5 minutes)
3. Check your Telegram for the prediction message!

## 📱 How to Use From Your Phone

### Daily Automatic Predictions
- Bot sends one message daily at 08:00 UTC with the **best bet**
- Includes confidence %, odds, expected value, and reasoning

### Manual Trigger (On-Demand)
1. Go to your repo's **Actions** tab on mobile browser
2. Select "Daily Prediction Bot"
3. Click **Run workflow**
4. Get instant prediction in Telegram

### Interactive Commands (Future Enhancement)
You can extend the bot to support commands:
- `/scan` - Scan all today's matches
- `/stats` - Show recent performance
- `/leagues` - List viable leagues

## 💰 Cost Breakdown

| Service | Cost | Limits |
|---------|------|--------|
| GitHub Actions | **FREE** | 2000 minutes/month |
| GitHub Releases | **FREE** | Unlimited storage |
| Telegram Bot API | **FREE** | Unlimited messages |
| **Total** | **$0.00/month** | ✅ |

## 🔧 Troubleshooting

### "Model file not found"
- Ensure you created a GitHub Release with the `.bin` file
- Check workflow logs for download errors

### "Telegram API Error"
- Verify bot token and chat ID in secrets
- Make sure you started a chat with your bot

### "No viable bets found"
- This is normal! The model only bets when there's mathematical edge
- Means the system is working correctly (preserving capital)

## 🔄 Updating the Model

When you want to retrain with new data:

1. **Locally**: Run training script
   ```bash
   npm run train:production
   ```

2. **Commit new model**: 
   ```bash
   git add data/model-latest.bin
   git commit -m "Update model with latest data"
   git push
   ```

3. **Create new release**:
   ```bash
   gh release create v1.0.1 --title "Model Update" dist/engine/model-latest.bin
   ```

4. **Auto-deploy**: Next scheduled run will use the new model!

## 📊 Performance Monitoring

Check your bot's accuracy:
1. Track predictions sent in Telegram
2. Compare with actual results
3. Retrain monthly or when performance drops

## ⚠️ Important Notes

- **Gambling Risk**: Never bet more than you can afford to lose
- **Not Financial Advice**: These are statistical predictions only
- **Rate Limits**: GitHub Actions has 2000 min/month limit (plenty for daily runs)
- **Data Freshness**: Bot scrapes fresh data on each run if cache is old

---

**Ready to go!** Push this code to GitHub, set up secrets, and you'll receive daily predictions on Telegram for free forever. 🎉
