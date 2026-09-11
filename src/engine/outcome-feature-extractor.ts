import { MatchData } from '../data/outcome-data-collector.js';

export interface OutcomeFeatures {
  // Team strength features
  homeElo: number;
  awayElo: number;
  eloDiff: number;
  
  // Form features (last 5 games)
  homeFormPoints: number; // Points from last 5 home games
  awayFormPoints: number; // Points from last 5 away games
  homeFormGoalsFor: number;
  homeFormGoalsAgainst: number;
  awayFormGoalsFor: number;
  awayFormGoalsAgainst: number;
  
  // Season statistics
  homeGoalsPerGame: number;
  awayGoalsPerGame: number;
  homeGoalsConcededPerGame: number;
  awayGoalsConcededPerGame: number;
  homeShotsPerGame: number;
  awayShotsPerGame: number;
  homeShotsOnTargetPerGame: number;
  awayShotsOnTargetPerGame: number;
  
  // Head-to-head
  h2hHomeWins: number;
  h2hDraws: number;
  h2hAwayWins: number;
  
  // Market features
  impliedHomeProb: number;
  impliedDrawProb: number;
  impliedAwayProb: number;
  marketMargin: number;
  
  // Additional context
  isWeekend: boolean;
  daysSinceLastGame: number;
}

export class OutcomeFeatureExtractor {
  private teamStats = new Map<string, {
    games: number;
    points: number;
    goalsFor: number;
    goalsAgainst: number;
    shots: number;
    shotsOnTarget: number;
    homeGames: number;
    homePoints: number;
    homeGoalsFor: number;
    homeGoalsAgainst: number;
    awayGames: number;
    awayPoints: number;
    awayGoalsFor: number;
    awayGoalsAgainst: number;
    recentGames: Array<{ date: Date; result: 'W' | 'D' | 'L'; goalsFor: number; goalsAgainst: number; isHome: boolean }>;
  }>();
  
  private h2hRecords = new Map<string, {
    homeWins: number;
    draws: number;
    awayWins: number;
    games: Array<{ date: Date; homeTeam: string; awayTeam: string; homeGoals: number; awayGoals: number }>;
  }>();
  
  extractFeatures(match: MatchData, historicalData: MatchData[]): OutcomeFeatures | null {
    // Build team statistics from historical data (only matches before current match)
    this.buildTeamStats(historicalData, match.date);
    
    // Build H2H records
    this.buildH2HRecords(historicalData, match.date);
    
    const homeStats = this.teamStats.get(match.homeTeam);
    const awayStats = this.teamStats.get(match.awayTeam);
    
    if (!homeStats || !awayStats) {
      return null; // Not enough data
    }
    
    // Calculate Elo ratings (simplified)
    const homeElo = this.calculateElo(homeStats);
    const awayElo = this.calculateElo(awayStats);
    
    // Form points (last 5 games)
    const homeRecent = homeStats.recentGames.slice(-5);
    const awayRecent = awayStats.recentGames.slice(-5);
    
    const homeFormPoints = homeRecent
      .filter(g => g.isHome)
      .reduce((sum, g) => sum + (g.result === 'W' ? 3 : g.result === 'D' ? 1 : 0), 0);
    
    const awayFormPoints = awayRecent
      .filter(g => !g.isHome)
      .reduce((sum, g) => sum + (g.result === 'W' ? 3 : g.result === 'D' ? 1 : 0), 0);
    
    const homeFormGoalsFor = homeRecent.filter(g => g.isHome).reduce((sum, g) => sum + g.goalsFor, 0);
    const homeFormGoalsAgainst = homeRecent.filter(g => g.isHome).reduce((sum, g) => sum + g.goalsAgainst, 0);
    const awayFormGoalsFor = awayRecent.filter(g => !g.isHome).reduce((sum, g) => sum + g.goalsFor, 0);
    const awayFormGoalsAgainst = awayRecent.filter(g => !g.isHome).reduce((sum, g) => sum + g.goalsAgainst, 0);
    
    // Season averages
    const homeGames = Math.max(1, homeStats.games);
    const awayGames = Math.max(1, awayStats.games);
    
    const homeGoalsPerGame = homeStats.goalsFor / homeGames;
    const awayGoalsPerGame = awayStats.goalsFor / awayGames;
    const homeGoalsConcededPerGame = homeStats.goalsAgainst / homeGames;
    const awayGoalsConcededPerGame = awayStats.goalsAgainst / awayGames;
    const homeShotsPerGame = homeStats.shots / homeGames;
    const awayShotsPerGame = awayStats.shots / awayGames;
    const homeShotsOnTargetPerGame = homeStats.shotsOnTarget / homeGames;
    const awayShotsOnTargetPerGame = awayStats.shotsOnTarget / awayGames;
    
    // H2H record
    const h2hKey = [match.homeTeam, match.awayTeam].sort().join('|');
    const h2h = this.h2hRecords.get(h2hKey);
    const h2hHomeWins = h2h?.homeWins || 0;
    const h2hDraws = h2h?.draws || 0;
    const h2hAwayWins = h2h?.awayWins || 0;
    
    // Implied probabilities from odds
    const impliedHomeProb = match.homeWinOdds ? 1 / match.homeWinOdds : 0.33;
    const impliedDrawProb = match.drawOdds ? 1 / match.drawOdds : 0.28;
    const impliedAwayProb = match.awayWinOdds ? 1 / match.awayWinOdds : 0.33;
    const marketMargin = (impliedHomeProb + impliedDrawProb + impliedAwayProb) - 1;
    
    // Context
    const isWeekend = match.date.getDay() === 0 || match.date.getDay() === 6;
    const daysSinceLastGame = this.calculateDaysSinceLastGame(homeStats, awayStats, match.date);
    
    return {
      homeElo,
      awayElo,
      eloDiff: homeElo - awayElo,
      homeFormPoints,
      awayFormPoints,
      homeFormGoalsFor,
      homeFormGoalsAgainst,
      awayFormGoalsFor,
      awayFormGoalsAgainst,
      homeGoalsPerGame,
      awayGoalsPerGame,
      homeGoalsConcededPerGame,
      awayGoalsConcededPerGame,
      homeShotsPerGame,
      awayShotsPerGame,
      homeShotsOnTargetPerGame,
      awayShotsOnTargetPerGame,
      h2hHomeWins,
      h2hDraws,
      h2hAwayWins,
      impliedHomeProb,
      impliedDrawProb,
      impliedAwayProb,
      marketMargin,
      isWeekend,
      daysSinceLastGame
    };
  }
  
  private buildTeamStats(matches: MatchData[], cutoffDate: Date): void {
    this.teamStats.clear();
    
    const sortedMatches = [...matches]
      .filter(m => m.date < cutoffDate && m.result !== undefined)
      .sort((a, b) => a.date.getTime() - b.date.getTime());
    
    for (const match of sortedMatches) {
      this.updateTeamStats(match);
    }
  }
  
  private updateTeamStats(match: MatchData): void {
    if (match.result === undefined) return;
    
    const homeResult = match.result === 'H' ? 'W' : match.result === 'D' ? 'D' : 'L';
    const awayResult = match.result === 'A' ? 'W' : match.result === 'D' ? 'D' : 'L';
    
    // Update home team
    if (!this.teamStats.has(match.homeTeam)) {
      this.teamStats.set(match.homeTeam, {
        games: 0, points: 0, goalsFor: 0, goalsAgainst: 0,
        shots: 0, shotsOnTarget: 0,
        homeGames: 0, homePoints: 0, homeGoalsFor: 0, homeGoalsAgainst: 0,
        awayGames: 0, awayPoints: 0, awayGoalsFor: 0, awayGoalsAgainst: 0,
        recentGames: []
      });
    }
    
    const homeStats = this.teamStats.get(match.homeTeam)!;
    homeStats.games++;
    homeStats.goalsFor += match.homeGoals || 0;
    homeStats.goalsAgainst += match.awayGoals || 0;
    homeStats.shots += match.homeShots || 0;
    homeStats.shotsOnTarget += match.homeShotsOnTarget || 0;
    homeStats.homeGames++;
    homeStats.homeGoalsFor += match.homeGoals || 0;
    homeStats.homeGoalsAgainst += match.awayGoals || 0;
    
    if (match.result === 'H') {
      homeStats.points += 3;
      homeStats.homePoints += 3;
    } else if (match.result === 'D') {
      homeStats.points += 1;
      homeStats.homePoints += 1;
    }
    
    homeStats.recentGames.push({
      date: match.date,
      result: homeResult,
      goalsFor: match.homeGoals || 0,
      goalsAgainst: match.awayGoals || 0,
      isHome: true
    });
    
    // Update away team
    if (!this.teamStats.has(match.awayTeam)) {
      this.teamStats.set(match.awayTeam, {
        games: 0, points: 0, goalsFor: 0, goalsAgainst: 0,
        shots: 0, shotsOnTarget: 0,
        homeGames: 0, homePoints: 0, homeGoalsFor: 0, homeGoalsAgainst: 0,
        awayGames: 0, awayPoints: 0, awayGoalsFor: 0, awayGoalsAgainst: 0,
        recentGames: []
      });
    }
    
    const awayStats = this.teamStats.get(match.awayTeam)!;
    awayStats.games++;
    awayStats.goalsFor += match.awayGoals || 0;
    awayStats.goalsAgainst += match.homeGoals || 0;
    awayStats.shots += match.awayShots || 0;
    awayStats.shotsOnTarget += match.awayShotsOnTarget || 0;
    awayStats.awayGames++;
    awayStats.awayGoalsFor += match.awayGoals || 0;
    awayStats.awayGoalsAgainst += match.homeGoals || 0;
    
    if (match.result === 'A') {
      awayStats.points += 3;
      awayStats.awayPoints += 3;
    } else if (match.result === 'D') {
      awayStats.points += 1;
      awayStats.awayPoints += 1;
    }
    
    awayStats.recentGames.push({
      date: match.date,
      result: awayResult,
      goalsFor: match.awayGoals || 0,
      goalsAgainst: match.homeGoals || 0,
      isHome: false
    });
  }
  
  private buildH2HRecords(matches: MatchData[], cutoffDate: Date): void {
    this.h2hRecords.clear();
    
    const sortedMatches = [...matches]
      .filter(m => m.date < cutoffDate && m.homeGoals !== undefined && m.awayGoals !== undefined)
      .sort((a, b) => a.date.getTime() - b.date.getTime());
    
    for (const match of sortedMatches) {
      const key = [match.homeTeam, match.awayTeam].sort().join('|');
      
      if (!this.h2hRecords.has(key)) {
        this.h2hRecords.set(key, { homeWins: 0, draws: 0, awayWins: 0, games: [] });
      }
      
      const record = this.h2hRecords.get(key)!;
      record.games.push({
        date: match.date,
        homeTeam: match.homeTeam,
        awayTeam: match.awayTeam,
        homeGoals: match.homeGoals!,
        awayGoals: match.awayGoals!
      });
      
      if (match.homeGoals! > match.awayGoals!) {
        record.homeWins++;
      } else if (match.homeGoals! < match.awayGoals!) {
        record.awayWins++;
      } else {
        record.draws++;
      }
    }
  }
  
  private calculateElo(stats: { games: number; points: number }): number {
    const baseElo = 1500;
    const kFactor = 32;
    const avgPointsPerGame = stats.games > 0 ? stats.points / stats.games : 0.5;
    const expectedPoints = 1.5; // Average points per game in football
    
    return baseElo + kFactor * (avgPointsPerGame - expectedPoints) * Math.sqrt(stats.games);
  }
  
  private calculateDaysSinceLastGame(
    homeStats: any, 
    awayStats: any, 
    matchDate: Date
  ): number {
    const homeLastGame = homeStats.recentGames.length > 0 
      ? homeStats.recentGames[homeStats.recentGames.length - 1].date 
      : matchDate;
    
    const awayLastGame = awayStats.recentGames.length > 0 
      ? awayStats.recentGames[awayStats.recentGames.length - 1].date 
      : matchDate;
    
    const daysHome = (matchDate.getTime() - homeLastGame.getTime()) / (1000 * 60 * 60 * 24);
    const daysAway = (matchDate.getTime() - awayLastGame.getTime()) / (1000 * 60 * 60 * 24);
    
    return Math.min(daysHome, daysAway);
  }
  
  getFeatureNames(): string[] {
    return [
      'homeElo', 'awayElo', 'eloDiff',
      'homeFormPoints', 'awayFormPoints',
      'homeFormGoalsFor', 'homeFormGoalsAgainst',
      'awayFormGoalsFor', 'awayFormGoalsAgainst',
      'homeGoalsPerGame', 'awayGoalsPerGame',
      'homeGoalsConcededPerGame', 'awayGoalsConcededPerGame',
      'homeShotsPerGame', 'awayShotsPerGame',
      'homeShotsOnTargetPerGame', 'awayShotsOnTargetPerGame',
      'h2hHomeWins', 'h2hDraws', 'h2hAwayWins',
      'impliedHomeProb', 'impliedDrawProb', 'impliedAwayProb', 'marketMargin',
      'isWeekend', 'daysSinceLastGame'
    ];
  }
}
