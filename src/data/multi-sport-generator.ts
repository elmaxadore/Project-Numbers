import { MatchData, TeamStats, apiFetcher } from './sports-scraper.js';

/**
 * Multi-Sport Data Generator
 * Generates realistic historical data for multiple sports for ML training
 */

export interface MultiSportMatch extends MatchData {
  // Common features across sports
  homeTeamForm?: number; // Last 5 games performance (0-1)
  awayTeamForm?: number;
  homeTeamRank?: number;
  awayTeamRank?: number;
  headToHeadHomeWins?: number;
  headToHeadAwayWins?: number;
  headToHeadDraws?: number;
  
  // Sport-specific features
  football?: {
    homeXGLast5?: number;
    awayXGLast5?: number;
    homeGoalsLast5?: number;
    awayGoalsLast5?: number;
    homeCleanSheets?: number;
    awayCleanSheets?: number;
    homeBTTSRate?: number;
    awayBTTSRate?: number;
  };
  
  basketball?: {
    homePPGLast5?: number; // Points per game
    awayPPGLast5?: number;
    homeOPPGlast5?: number; // Opponent points per game
    awayOPPGlast5?: number;
    homeReboundsLast5?: number;
    awayReboundsLast5?: number;
    homeAssistsLast5?: number;
    awayAssistsLast5?: number;
    homeThreePointPct?: number;
    awayThreePointPct?: number;
  };
  
  tennis?: {
    player1Rank?: number;
    player2Rank?: number;
    player1Aces?: number;
    player2Aces?: number;
    player1DoubleFaults?: number;
    player2DoubleFaults?: number;
    player1FirstServePct?: number;
    player2FirstServePct?: number;
    surface: 'clay' | 'grass' | 'hard' | 'carpet';
  };
  
  baseball?: {
    homeERA?: number;
    awayERA?: number;
    homeBattingAvg?: number;
    awayBattingAvg?: number;
    homeHomeRuns?: number;
    awayHomeRuns?: number;
    pitcherERA?: number;
    pitcherWHIP?: number;
  };
  
  hockey?: {
    homeGoalsForLast5?: number;
    awayGoalsForLast5?: number;
    homeGoalsAgainstLast5?: number;
    awayGoalsAgainstLast5?: number;
    homeSavePct?: number;
    awaySavePct?: number;
    homePowerPlayPct?: number;
    awayPowerPlayPct?: number;
  };
}

export class MultiSportDataGenerator {
  private sports: string[] = ['football', 'basketball', 'tennis', 'baseball', 'hockey'];
  
  constructor() {}
  
  /**
   * Generate comprehensive historical dataset for all sports
   */
  async generateHistoricalData(
    seasons: number = 3,
    matchesPerSeason: number = 500
  ): Promise<MultiSportMatch[]> {
    console.log(`Generating ${seasons} seasons of multi-sport data...`);
    
    const allMatches: MultiSportMatch[] = [];
    
    // Fetch real data if available, otherwise generate synthetic
    const realData = await apiFetcher.getAllData();
    
    // Augment with synthetic historical data
    for (const sport of this.sports) {
      console.log(`Generating ${sport} data...`);
      const sportMatches = this.generateSportSpecificData(
        sport,
        seasons,
        matchesPerSeason
      );
      allMatches.push(...sportMatches);
    }
    
    // Add real data if available
    allMatches.push(...this.convertRealToMultiSport(realData));
    
    console.log(`Generated ${allMatches.length} total matches across ${this.sports.length} sports`);
    return allMatches;
  }
  
  /**
   * Generate sport-specific synthetic data with realistic statistics
   */
  private generateSportSpecificData(
    sport: string,
    seasons: number,
    matchesPerSeason: number
  ): MultiSportMatch[] {
    const matches: MultiSportMatch[] = [];
    const now = new Date();
    
    switch (sport) {
      case 'football':
        return this.generateFootballData(seasons, matchesPerSeason, now);
      case 'basketball':
        return this.generateBasketballData(seasons, matchesPerSeason, now);
      case 'tennis':
        return this.generateTennisData(seasons, matchesPerSeason, now);
      case 'baseball':
        return this.generateBaseballData(seasons, matchesPerSeason, now);
      case 'hockey':
        return this.generateHockeyData(seasons, matchesPerSeason, now);
      default:
        return [];
    }
  }
  
  private generateFootballData(
    seasons: number,
    matchesPerSeason: number,
    now: Date
  ): MultiSportMatch[] {
    const matches: MultiSportMatch[] = [];
    const leagues = [
      'Premier League', 'La Liga', 'Bundesliga', 'Serie A', 'Ligue 1',
      'Eredivisie', 'Primeira Liga', 'Championship', 'MLS', 'Brasileirão'
    ];
    
    const teamsByLeague: Record<string, string[]> = {
      'Premier League': ['Man City', 'Liverpool', 'Arsenal', 'Chelsea', 'Man Utd', 'Spurs', 'Newcastle', 'Villa'],
      'La Liga': ['Real Madrid', 'Barcelona', 'Atletico', 'Sevilla', 'Real Sociedad', 'Valencia'],
      'Bundesliga': ['Bayern', 'Dortmund', 'Leipzig', 'Leverkusen', 'Frankfurt', 'Wolfsburg'],
      'Serie A': ['Inter', 'Milan', 'Juventus', 'Napoli', 'Roma', 'Lazio'],
      'Ligue 1': ['PSG', 'Marseille', 'Lyon', 'Monaco', 'Lille', 'Rennes']
    };
    
    for (let season = 0; season < seasons; season++) {
      const seasonDate = new Date(now.getTime() - season * 365 * 24 * 60 * 60 * 1000);
      
      for (let i = 0; i < matchesPerSeason; i++) {
        const league = leagues[Math.floor(Math.random() * leagues.length)];
        const teams = teamsByLeague[league] || ['Team A', 'Team B', 'Team C', 'Team D'];
        
        const homeIdx = Math.floor(Math.random() * teams.length);
        let awayIdx = Math.floor(Math.random() * teams.length);
        while (awayIdx === homeIdx) {
          awayIdx = Math.floor(Math.random() * teams.length);
        }
        
        const homeTeam = teams[homeIdx];
        const awayTeam = teams[awayIdx];
        
        // Generate realistic stats
        const homeStrength = 0.5 + Math.random() * 0.4;
        const awayStrength = 0.5 + Math.random() * 0.4;
        
        const homeXG = Math.max(0, (homeStrength * 2.5) + (Math.random() - 0.5) * 1.5);
        const awayXG = Math.max(0, (awayStrength * 2.0) + (Math.random() - 0.5) * 1.5);
        
        const homeGoals = Math.floor(Math.max(0, homeXG + (Math.random() - 0.5) * 2));
        const awayGoals = Math.floor(Math.max(0, awayXG + (Math.random() - 0.5) * 2));
        
        const isFinished = Math.random() > 0.1;
        
        matches.push({
          sport: 'football',
          league,
          homeTeam,
          awayTeam,
          date: new Date(seasonDate.getTime() - Math.random() * 300 * 24 * 60 * 60 * 1000),
          status: isFinished ? 'finished' : 'scheduled',
          homeScore: isFinished ? homeGoals : undefined,
          awayScore: isFinished ? awayGoals : undefined,
          homeTeamForm: 0.4 + Math.random() * 0.4,
          awayTeamForm: 0.4 + Math.random() * 0.4,
          homeTeamRank: Math.floor(1 + Math.random() * 20),
          awayTeamRank: Math.floor(1 + Math.random() * 20),
          odds: {
            homeWin: 1.2 + Math.random() * 4,
            draw: 2.5 + Math.random() * 2,
            awayWin: 1.5 + Math.random() * 5,
            over25: 1.5 + Math.random() * 1.5,
            under25: 2.0 + Math.random() * 1.5,
            bttsYes: 1.6 + Math.random() * 1.5,
            bttsNo: 2.0 + Math.random() * 1.5
          },
          stats: {
            homeXG: isFinished ? homeXG : undefined,
            awayXG: isFinished ? awayXG : undefined,
            homeShots: isFinished ? Math.floor(8 + Math.random() * 15) : undefined,
            awayShots: isFinished ? Math.floor(6 + Math.random() * 12) : undefined,
            homePossession: isFinished ? Math.floor(40 + Math.random() * 30) : undefined,
            awayPossession: isFinished ? Math.floor(40 + Math.random() * 30) : undefined
          },
          football: {
            homeXGLast5: 1.0 + Math.random() * 2.0,
            awayXGLast5: 0.8 + Math.random() * 1.8,
            homeGoalsLast5: Math.floor(5 + Math.random() * 10),
            awayGoalsLast5: Math.floor(4 + Math.random() * 9),
            homeCleanSheets: Math.floor(Math.random() * 5),
            awayCleanSheets: Math.floor(Math.random() * 5),
            homeBTTSRate: 0.4 + Math.random() * 0.4,
            awayBTTSRate: 0.4 + Math.random() * 0.4
          }
        });
      }
    }
    
    return matches;
  }
  
  private generateBasketballData(
    seasons: number,
    matchesPerSeason: number,
    now: Date
  ): MultiSportMatch[] {
    const matches: MultiSportMatch[] = [];
    const teams = [
      'Lakers', 'Celtics', 'Warriors', 'Nets', 'Bucks', 'Heat', 
      'Suns', '76ers', 'Mavericks', 'Nuggets', 'Clippers', 'Grizzlies'
    ];
    
    for (let season = 0; season < seasons; season++) {
      const seasonDate = new Date(now.getTime() - season * 365 * 24 * 60 * 60 * 1000);
      
      for (let i = 0; i < matchesPerSeason; i++) {
        const homeIdx = Math.floor(Math.random() * teams.length);
        let awayIdx = Math.floor(Math.random() * teams.length);
        while (awayIdx === homeIdx) {
          awayIdx = Math.floor(Math.random() * teams.length);
        }
        
        const homeTeam = `LA ${teams[homeIdx]}`;
        const awayTeam = `NY ${teams[awayIdx]}`;
        
        const homeStrength = 0.5 + Math.random() * 0.4;
        const awayStrength = 0.5 + Math.random() * 0.4;
        
        const homeScore = Math.floor(95 + homeStrength * 30 + (Math.random() - 0.5) * 20);
        const awayScore = Math.floor(90 + awayStrength * 30 + (Math.random() - 0.5) * 20);
        
        const isFinished = Math.random() > 0.1;
        
        matches.push({
          sport: 'basketball',
          league: 'NBA',
          homeTeam,
          awayTeam,
          date: new Date(seasonDate.getTime() - Math.random() * 300 * 24 * 60 * 60 * 1000),
          status: isFinished ? 'finished' : 'scheduled',
          homeScore: isFinished ? homeScore : undefined,
          awayScore: isFinished ? awayScore : undefined,
          homeTeamForm: 0.4 + Math.random() * 0.4,
          awayTeamForm: 0.4 + Math.random() * 0.4,
          homeTeamRank: Math.floor(1 + Math.random() * 30),
          awayTeamRank: Math.floor(1 + Math.random() * 30),
          odds: {
            moneylineHome: 1.2 + Math.random() * 3,
            moneylineAway: 2.0 + Math.random() * 4,
            spread: (Math.random() - 0.5) * 20,
            totalPoints: 210 + Math.random() * 20
          },
          stats: {
            homeRebounds: isFinished ? Math.floor(35 + Math.random() * 15) : undefined,
            awayRebounds: isFinished ? Math.floor(35 + Math.random() * 15) : undefined,
            homeAssists: isFinished ? Math.floor(20 + Math.random() * 10) : undefined,
            awayAssists: isFinished ? Math.floor(20 + Math.random() * 10) : undefined
          },
          basketball: {
            homePPGLast5: 105 + Math.random() * 20,
            awayPPGLast5: 100 + Math.random() * 20,
            homeOPPGlast5: 100 + Math.random() * 15,
            awayOPPGlast5: 100 + Math.random() * 15,
            homeReboundsLast5: Math.floor(40 + Math.random() * 10),
            awayReboundsLast5: Math.floor(40 + Math.random() * 10),
            homeAssistsLast5: Math.floor(22 + Math.random() * 8),
            awayAssistsLast5: Math.floor(22 + Math.random() * 8),
            homeThreePointPct: 0.32 + Math.random() * 0.12,
            awayThreePointPct: 0.32 + Math.random() * 0.12
          }
        });
      }
    }
    
    return matches;
  }
  
  private generateTennisData(
    seasons: number,
    matchesPerSeason: number,
    now: Date
  ): MultiSportMatch[] {
    const matches: MultiSportMatch[] = [];
    const players = [
      'Djokovic', 'Nadal', 'Federer', 'Alcaraz', 'Medvedev', 
      'Tsitsipas', 'Zverev', 'Rublev', 'Ruud', 'Hurkacz'
    ];
    const surfaces: ('clay' | 'grass' | 'hard' | 'carpet')[] = ['clay', 'grass', 'hard', 'carpet'];
    
    for (let season = 0; season < seasons; season++) {
      const seasonDate = new Date(now.getTime() - season * 365 * 24 * 60 * 60 * 1000);
      
      for (let i = 0; i < matchesPerSeason / 2; i++) {
        const player1Idx = Math.floor(Math.random() * players.length);
        let player2Idx = Math.floor(Math.random() * players.length);
        while (player2Idx === player1Idx) {
          player2Idx = Math.floor(Math.random() * players.length);
        }
        
        const surface = surfaces[Math.floor(Math.random() * surfaces.length)];
        const isFinished = Math.random() > 0.1;
        
        const player1Sets = isFinished ? Math.floor(2 + Math.random()) : 0;
        const player2Sets = isFinished ? Math.floor(0 + Math.random() * 2) : 0;
        
        matches.push({
          sport: 'tennis',
          league: surface === 'clay' ? 'French Open' : surface === 'grass' ? 'Wimbledon' : surface === 'hard' ? 'US Open' : 'ATP Finals',
          homeTeam: players[player1Idx],
          awayTeam: players[player2Idx],
          date: new Date(seasonDate.getTime() - Math.random() * 300 * 24 * 60 * 60 * 1000),
          status: isFinished ? 'finished' : 'scheduled',
          homeScore: isFinished ? player1Sets : undefined,
          awayScore: isFinished ? player2Sets : undefined,
          homeTeamForm: 0.4 + Math.random() * 0.4,
          awayTeamForm: 0.4 + Math.random() * 0.4,
          homeTeamRank: Math.floor(1 + Math.random() * 100),
          awayTeamRank: Math.floor(1 + Math.random() * 100),
          odds: {
            moneylineHome: 1.1 + Math.random() * 3,
            moneylineAway: 1.5 + Math.random() * 5
          },
          tennis: {
            player1Rank: Math.floor(1 + Math.random() * 100),
            player2Rank: Math.floor(1 + Math.random() * 100),
            player1Aces: isFinished ? Math.floor(5 + Math.random() * 15) : undefined,
            player2Aces: isFinished ? Math.floor(5 + Math.random() * 15) : undefined,
            player1DoubleFaults: isFinished ? Math.floor(1 + Math.random() * 5) : undefined,
            player2DoubleFaults: isFinished ? Math.floor(1 + Math.random() * 5) : undefined,
            player1FirstServePct: 60 + Math.random() * 20,
            player2FirstServePct: 60 + Math.random() * 20,
            surface
          }
        });
      }
    }
    
    return matches;
  }
  
  private generateBaseballData(
    seasons: number,
    matchesPerSeason: number,
    now: Date
  ): MultiSportMatch[] {
    const matches: MultiSportMatch[] = [];
    const teams = [
      'Yankees', 'Red Sox', 'Dodgers', 'Giants', 'Cubs', 
      'Cardinals', 'Astros', 'Braves', 'Mets', 'Phillies'
    ];
    
    for (let season = 0; season < seasons; season++) {
      const seasonDate = new Date(now.getTime() - season * 365 * 24 * 60 * 60 * 1000);
      
      for (let i = 0; i < matchesPerSeason; i++) {
        const homeIdx = Math.floor(Math.random() * teams.length);
        let awayIdx = Math.floor(Math.random() * teams.length);
        while (awayIdx === homeIdx) {
          awayIdx = Math.floor(Math.random() * teams.length);
        }
        
        const homeTeam = teams[homeIdx];
        const awayTeam = teams[awayIdx];
        
        const homeRuns = Math.floor(Math.random() * 8);
        const awayRuns = Math.floor(Math.random() * 7);
        const isFinished = Math.random() > 0.1;
        
        matches.push({
          sport: 'baseball',
          league: 'MLB',
          homeTeam,
          awayTeam,
          date: new Date(seasonDate.getTime() - Math.random() * 200 * 24 * 60 * 60 * 1000),
          status: isFinished ? 'finished' : 'scheduled',
          homeScore: isFinished ? homeRuns : undefined,
          awayScore: isFinished ? awayRuns : undefined,
          homeTeamForm: 0.4 + Math.random() * 0.4,
          awayTeamForm: 0.4 + Math.random() * 0.4,
          homeTeamRank: Math.floor(1 + Math.random() * 30),
          awayTeamRank: Math.floor(1 + Math.random() * 30),
          odds: {
            moneylineHome: 1.3 + Math.random() * 3,
            moneylineAway: 1.8 + Math.random() * 4,
            spread: (Math.random() - 0.5) * 3,
            totalPoints: 7 + Math.random() * 3
          },
          baseball: {
            homeERA: 3.5 + Math.random() * 2,
            awayERA: 3.5 + Math.random() * 2,
            homeBattingAvg: 0.240 + Math.random() * 0.040,
            awayBattingAvg: 0.240 + Math.random() * 0.040,
            homeHomeRuns: Math.floor(100 + Math.random() * 100),
            awayHomeRuns: Math.floor(100 + Math.random() * 100),
            pitcherERA: 2.5 + Math.random() * 3,
            pitcherWHIP: 0.9 + Math.random() * 0.6
          }
        });
      }
    }
    
    return matches;
  }
  
  private generateHockeyData(
    seasons: number,
    matchesPerSeason: number,
    now: Date
  ): MultiSportMatch[] {
    const matches: MultiSportMatch[] = [];
    const teams = [
      'Canadiens', 'Maple Leafs', 'Bruins', 'Rangers', 'Blackhawks',
      'Red Wings', 'Penguins', 'Capitals', 'Lightning', 'Avalanche'
    ];
    
    for (let season = 0; season < seasons; season++) {
      const seasonDate = new Date(now.getTime() - season * 365 * 24 * 60 * 60 * 1000);
      
      for (let i = 0; i < matchesPerSeason; i++) {
        const homeIdx = Math.floor(Math.random() * teams.length);
        let awayIdx = Math.floor(Math.random() * teams.length);
        while (awayIdx === homeIdx) {
          awayIdx = Math.floor(Math.random() * teams.length);
        }
        
        const homeTeam = teams[homeIdx];
        const awayTeam = teams[awayIdx];
        
        const homeGoals = Math.floor(Math.random() * 5);
        const awayGoals = Math.floor(Math.random() * 4);
        const isFinished = Math.random() > 0.1;
        
        matches.push({
          sport: 'hockey',
          league: 'NHL',
          homeTeam,
          awayTeam,
          date: new Date(seasonDate.getTime() - Math.random() * 250 * 24 * 60 * 60 * 1000),
          status: isFinished ? 'finished' : 'scheduled',
          homeScore: isFinished ? homeGoals : undefined,
          awayScore: isFinished ? awayGoals : undefined,
          homeTeamForm: 0.4 + Math.random() * 0.4,
          awayTeamForm: 0.4 + Math.random() * 0.4,
          homeTeamRank: Math.floor(1 + Math.random() * 32),
          awayTeamRank: Math.floor(1 + Math.random() * 32),
          odds: {
            moneylineHome: 1.4 + Math.random() * 3,
            moneylineAway: 1.9 + Math.random() * 4,
            totalPoints: 5 + Math.random() * 2
          },
          hockey: {
            homeGoalsForLast5: Math.floor(10 + Math.random() * 10),
            awayGoalsForLast5: Math.floor(10 + Math.random() * 10),
            homeGoalsAgainstLast5: Math.floor(8 + Math.random() * 8),
            awayGoalsAgainstLast5: Math.floor(8 + Math.random() * 8),
            homeSavePct: 0.89 + Math.random() * 0.08,
            awaySavePct: 0.89 + Math.random() * 0.08,
            homePowerPlayPct: 0.15 + Math.random() * 0.15,
            awayPowerPlayPct: 0.15 + Math.random() * 0.15
          }
        });
      }
    }
    
    return matches;
  }
  
  /**
   * Convert real API data to MultiSportMatch format
   */
  private convertRealToMultiSport(realData: MatchData[]): MultiSportMatch[] {
    return realData.map(match => ({
      ...match,
      homeTeamForm: 0.5,
      awayTeamForm: 0.5,
      homeTeamRank: 10,
      awayTeamRank: 10
    }));
  }
}

export const multiSportGenerator = new MultiSportDataGenerator();
