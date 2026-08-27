/** League with baseline scoring characteristics */
export interface League {
    id: number;
    name: string;
    country: string;
    avgGoalsPerMatch: number;
    over25Rate: number;
    bttsRate: number;
    tier: number;
}
/** A single football fixture/match */
export interface Fixture {
    id: number;
    leagueId: number;
    leagueName: string;
    homeTeam: Team;
    awayTeam: Team;
    date: string;
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
    avgGoalsScored: number;
    avgGoalsConceded: number;
    xG: number;
    xGA: number;
    cleanSheetRate: number;
    failedToScoreRate: number;
    bttsRate: number;
    over25Rate: number;
    over15Rate: number;
}
/** Fixture-level aggregated stats combining home+away splits */
export interface FixtureExpectedStats {
    fixtureId: number;
    homeTeamStats: TeamVenueStats;
    awayTeamStats: TeamVenueStats;
    combinedExpectedGoals: number;
    combinedExpectedConceded: number;
    fixtureXG: number;
}
/** Bookmaker odds for a specific market */
export interface MarketOdds {
    fixtureId: number;
    bookmaker: string;
    market: BettingMarket;
    homeOdds: number | null;
    drawOdds: number | null;
    awayOdds: number | null;
    overOdds: number | null;
    underOdds: number | null;
    yesOdds: number | null;
    noOdds: number | null;
    timestamp: string;
}
export type BettingMarket = 'over_1.5_goals' | 'over_2.5_goals' | 'btts_yes' | 'match_result';
/** Model prediction output */
export interface ModelPrediction {
    fixtureId: number;
    market: BettingMarket;
    modelProbability: number;
    modelConfidence: number;
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
    value: number;
    hasEdge: boolean;
}
/** Final betting ticket / recommendation */
export interface BettingTicket {
    fixtureId: number;
    league: string;
    homeTeam: string;
    awayTeam: string;
    fixtureDate: string;
    market: BettingMarket;
    modelPrediction: number;
    bookmakerOdds: number;
    bookmakerName: string;
    impliedProbability: number;
    calculatedValue: number;
    recommendedStake: number;
    kellyFraction: number;
    confidence: string;
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
    roi: number;
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
    apiSportsKey: string;
    oddsPapiKey: string;
    oddsApiKey: string;
    ballersKey: string;
    minAvgGoals: number;
    minBttsRate: number;
    minSampleSize: number;
    minMatchesForStats: number;
    valueThreshold: number;
    minConfidence: number;
    bankroll: number;
    kellyFractionCap: number;
    fixedStakePercentage: number;
    runawayGiantCleanSheetThreshold: number;
    runawayGiantTopN: number;
    recentMatchesWindow: number;
    seasons: number;
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
//# sourceMappingURL=types.d.ts.map