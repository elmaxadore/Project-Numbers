// ============================================================
// System Configuration
// ============================================================

import { SystemConfig } from './models/types.js';

function env(key: string, fallback: string = ''): string {
  return process.env[key] || fallback;
}

function envNum(key: string, fallback: number): number {
  const val = process.env[key];
  return val ? parseFloat(val) : fallback;
}

export const CONFIG: SystemConfig = {
  // API keys from environment
  apiSportsKey: env('API_SPORTS_KEY'),
  oddsPapiKey: env('ODDS_PAPI_KEY'),
  oddsApiKey: env('ODDS_API_KEY'),
  ballersKey: env('BALLERS_KEY'),

  // League filter thresholds (from the paper)
  minAvgGoals: envNum('MIN_AVG_GOALS', 2.80),
  minBttsRate: envNum('MIN_BTTS_RATE', 0.53),

  // Model thresholds
  minSampleSize: envNum('MIN_SAMPLE_SIZE', 10),
  minMatchesForStats: envNum('MIN_MATCHES_FOR_STATS', 8),

  // Value calculation
  valueThreshold: envNum('VALUE_THRESHOLD', 0.02),       // 2% edge minimum
  minConfidence: envNum('MIN_CONFIDENCE', 0.4),

  // Staking
  bankroll: envNum('BANKROLL', 1000),
  kellyFractionCap: envNum('KELLY_FRACTION_CAP', 0.25),  // quarter-Kelly
  fixedStakePercentage: envNum('FIXED_STAKE_PCT', 0.02), // 2% of bankroll

  // Outlier detection
  runawayGiantCleanSheetThreshold: envNum('RUNAWAY_CS_THRESHOLD', 0.45),
  runawayGiantTopN: envNum('RUNAWAY_TOP_N', 3),

  // Data settings
  recentMatchesWindow: envNum('MATCHES_WINDOW', 15),
  seasons: envNum('SEASONS', 3),
};

/**
 * Validate that critical config is present
 */
export function validateConfig(): { valid: boolean; missing: string[] } {
  const missing: string[] = [];

  if (!CONFIG.apiSportsKey) missing.push('API_SPORTS_KEY');
  if (!CONFIG.ballersKey) missing.push('BALLERS_KEY');

  return {
    valid: missing.length === 0,
    missing,
  };
}
