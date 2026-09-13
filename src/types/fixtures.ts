export interface Fixture {
  fixture: {
    id: number;
    leagueId: number;
    leagueName: string;
    homeTeam: {
      id: number;
      name: string;
    };
    awayTeam: {
      id: number;
      name: string;
    };
    date: string;
    status: 'scheduled' | 'finished' | 'cancelled';
  };
  expectedStats: {
    fixtureId: number;
    homeTeamStats: TeamVenueStats;
    awayTeamStats: TeamVenueStats;
    combinedExpectedGoals: number;
    combinedExpectedConceded: number;
    fixtureXG: number;
  } | null;
  odds: Array<{
    bookmaker: string;
    market: string;
    value: number;
  }>;
  leagueFilterPassed: boolean;
  sampleSizeFilterPassed: boolean;
  outlierFlags: {
    isRunawayGiant: boolean;
    homeCleanSheetRate: number;
    awayFailedToScoreRate: number;
  };
}

export interface TeamVenueStats {
  gamesPlayed: number;
  wins: number;
  draws: number;
  losses: number;
  goalsFor: number;
  goalsAgainst: number;
  cleanSheets: number;
  failedToScore: number;
  avgGoalsScored: number;
  avgGoalsConceded: number;
  xG?: number;
  xGA?: number;
  cleanSheetRate?: number;
  failedToScoreRate?: number;
}
