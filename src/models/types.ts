// ============================================================
// Core Types & Interfaces for the Football Betting System
// ============================================================

/** League with baseline scoring characteristics */
export interface League {
  id: number;
  name: string;
  country: string;
  avgGoalsPerMatch: number;
  over25Rate: number;   // percentage
  bttsRate: number;     // percentage
  tier: number;         // 1 = top flight, 2 = second tier, etc.
}

/** A single football fixture/match */
export interface Fixture {
  id: number;
  leagueId: number;
  leagueName: string;
  homeTeam: Team;
  awayTeam: Team;
  date: string;         // ISO date
  status: FixtureStatus;
}

export type FixtureStatus = 'scheduled' | 'live' | 'finished';

/** Team performance metrics */
export interface Team {
  id: number;
  name: string;
}

/** Aggregated team stats for a specific venue context */
export interface TeamVenueStats {
  teamId: number;
  teamName: string;
  venue: 'home' | 'away';
  matchesPlayed: number;
  goalsScored: number;
  goalsConceded: number;
  avgGoalsScored: number;      // per match
  avgGoalsConceded: number;    // per match
  xG: number;                  // expected goals for
  xGA: number;                 // expected goals against
  cleanSheetRate: number;      // 0-1
  failedToScoreRate: number;   // 0-1
  bttsRate: number;            // 0-1
  over25Rate: number;          // 0-1
  over15Rate: number;          // 0-1
}

/** Fixture-level aggregated stats combining home+away splits */
export interface FixtureExpectedStats {
  fixtureId: number;
  homeTeamStats: TeamVenueStats;
  awayTeamStats: TeamVenueStats;
  combinedExpectedGoals: number;    // xG_home + xG_away
  combinedExpectedConceded: number; // xGA_home + xGA_away
  fixtureXG: number;                // the "Fixture Expected Goals baseline"
}

/** Bookmaker odds for a specific market */
export interface MarketOdds {
  fixtureId: number;
  bookmaker: string;
  market: BettingMarket;
  homeOdds: number | null;   // for home/away markets
  drawOdds: number | null;
  awayOdds: number | null;
  overOdds: number | null;   // for over/under markets
  underOdds: number | null;
  yesOdds: number | null;    // for BTTS
  noOdds: number | null;
  timestamp: string;
}

export type BettingMarket =
  | 'over_1.5_goals'
  | 'over_2.5_goals'
  | 'btts_yes'
  | 'match_result';

/** Model prediction output */
export interface ModelPrediction {
  fixtureId: number;
  market: BettingMarket;
  modelProbability: number;  // 0-1, the calibrated probability
  modelConfidence: number;   // 0-1, confidence in the prediction
  features: Record<string, number>;
}

/** Value calculation result */
export interface ValueAnalysis {
  fixtureId: number;
  market: BettingMarket;
  modelProbability: number;
  impliedProbability: number;
  bestOdds: number;
  bestBookmaker: string;
  value: number;              // modelProb - impliedProb
  hasEdge: boolean;           // value > threshold
}

/** Final betting ticket / recommendation */
export interface BettingTicket {
  fixtureId: number;
  league: string;
  homeTeam: string;
  awayTeam: string;
  fixtureDate: string;
  market: BettingMarket;
  modelPrediction: number;     // percentage
  bookmakerOdds: number;       // decimal
  bookmakerName: string;
  impliedProbability: number;  // percentage
  calculatedValue: number;     // percentage
  recommendedStake: number;    // percentage of bankroll
  kellyFraction: number;
  confidence: string;          // 'low' | 'medium' | 'high'
}

/** Backtesting result for a single bet */
export interface BacktestBet {
  fixtureId: number;
  date: string;
  league: string;
  market: BettingMarket;
  modelProbability: number;
  odds: number;
  value: number;
  stake: number;
  won: boolean;
  profit: number;
}

/** Backtesting summary statistics */
export interface BacktestResult {
  totalBets: number;
  wins: number;
  losses: number;
  winRate: number;
  totalStake: number;
  totalProfit: number;
  roi: number;               // percentage
  maxDrawdown: number;
  averageOdds: number;
  averageValue: number;
  betsByMarket: Record<string, {
    count: number;
    wins: number;
    roi: number;
  }>;
  betsByLeague: Record<string, {
    count: number;
    wins: number;
    roi: number;
  }>;
  period: {
    from: string;
    to: string;
  };
}

/** System configuration */
export interface SystemConfig {
  // API keys
  apiSportsKey: string;
  oddsPapiKey: string;
  oddsApiKey: string;  // The Odds API (includes 1xbet)
  ballersKey: string;

  // League filter thresholds
  minAvgGoals: number;           // default 2.80
  minBttsRate: number;           // default 0.53

  // Model thresholds
  minSampleSize: number;         // default 10
  minMatchesForStats: number;    // default 8

  // Value calculation
  valueThreshold: number;        // default 0.02 (2%)
  minConfidence: number;         // default 0.4

  // Staking
  bankroll: number;
  kellyFractionCap: number;      // max fraction of Kelly to use (e.g., 0.25 for quarter-Kelly)
  fixedStakePercentage: number;  // fallback fixed stake (% of bankroll)

  // Outlier detection
  runawayGiantCleanSheetThreshold: number; // default 0.45
  runawayGiantTopN: number;                // default 3

  // Data settings
  recentMatchesWindow: number;   // last N matches for stats, default 15
  seasons: number;               // how many seasons of data to fetch
}

/** Pre-match data package ready for the model */
export interface FixtureDataPackage {
  fixture: Fixture;
  expectedStats: FixtureExpectedStats;
  odds: MarketOdds[];
  leagueFilterPassed: boolean;
  sampleSizeFilterPassed: boolean;
  outlierFlags: OutlierFlags;
}

export interface OutlierFlags {
  isRunawayGiant: boolean;
  homeCleanSheetRate: number;
  awayFailedToScoreRate: number;
}
