import * as fs from 'fs';
import * as path from 'path';

export interface MatchData {
  date: Date;
  homeTeam: string;
  awayTeam: string;
  homeGoals?: number;
  awayGoals?: number;
  result?: 'H' | 'D' | 'A';
  league: string;
  season: string;
  // Basic stats
  homeShots?: number;
  awayShots?: number;
  homeShotsOnTarget?: number;
  awayShotsOnTarget?: number;
  homeCorners?: number;
  awayCorners?: number;
  homeFouls?: number;
  awayFouls?: number;
  homeYellowCards?: number;
  awayYellowCards?: number;
  homeRedCards?: number;
  awayRedCards?: number;
  // Odds
  homeWinOdds?: number;
  drawOdds?: number;
  awayWinOdds?: number;
  over25Odds?: number;
  under25Odds?: number;
  bttsYesOdds?: number;
  bttsNoOdds?: number;
}

export class RealDataCollector {
  private cacheDir = path.join(__dirname, '../../data-cache');
  
  constructor() {
    if (!fs.existsSync(this.cacheDir)) {
      fs.mkdirSync(this.cacheDir, { recursive: true });
    }
  }

  async collectAllData(): Promise<MatchData[]> {
    console.log('🔍 Collecting real historical data from football-data.co.uk...');
    
    const allMatches: MatchData[] = [];
    
    // Leagues available on football-data.co.uk
    const leagues = [
      { code: 'E0', name: 'Premier League' },
      { code: 'D1', name: 'Bundesliga' },
      { code: 'I1', name: 'Serie A' },
      { code: 'SP1', name: 'La Liga' },
      { code: 'F1', name: 'Ligue 1' },
      { code: 'N1', name: 'Eredivisie' }
    ];
    
    // Seasons from 2014-15 to 2023-24 (10 seasons)
    const seasons = [
      '2014-15', '2015-16', '2016-17', '2017-18', '2018-19',
      '2019-20', '2020-21', '2021-22', '2022-23', '2023-24'
    ];
    
    for (const league of leagues) {
      for (const season of seasons) {
        try {
          const matches = await this.fetchLeagueSeason(league.code, season, league.name);
          allMatches.push(...matches);
          console.log(`✓ ${league.name} ${season}: ${matches.length} matches`);
          
          // Rate limiting - be nice to the server
          await this.sleep(500);
        } catch (error) {
          console.warn(`⚠ Failed to fetch ${league.name} ${season}: ${(error as Error).message}`);
        }
      }
    }
    
    console.log(`\n📊 Total matches collected: ${allMatches.length}`);
    
    // Cache the data
    const cacheFile = path.join(this.cacheDir, 'football-outcomes-data.json');
    fs.writeFileSync(cacheFile, JSON.stringify(allMatches, null, 2));
    console.log(`💾 Data cached to ${cacheFile}`);
    
    return allMatches;
  }
  
  private async fetchLeagueSeason(leagueCode: string, season: string, leagueName: string): Promise<MatchData[]> {
    const cacheFile = path.join(this.cacheDir, `football-${leagueCode}-${season}.json`);
    
    // Check cache first
    if (fs.existsSync(cacheFile)) {
      const cached = JSON.parse(fs.readFileSync(cacheFile, 'utf-8'));
      return cached.map((m: any) => ({ ...m, date: new Date(m.date) }));
    }
    
    // Construct URL for football-data.co.uk
    const seasonSuffix = season.replace('-', '').slice(0, 4); // e.g., "2023-24" -> "2324"
    const url = `https://www.football-data.co.uk/mmz4281/${seasonSuffix}/${leagueCode}.csv`;
    
    try {
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      
      const csvText = await response.text();
      const matches = this.parseCSV(csvText, leagueName, season);
      
      // Cache the result
      fs.writeFileSync(cacheFile, JSON.stringify(matches));
      
      return matches;
    } catch (error) {
      console.warn(`Failed to fetch ${url}: ${(error as Error).message}`);
      return [];
    }
  }
  
  private parseCSV(csvText: string, league: string, season: string): MatchData[] {
    const lines = csvText.trim().split('\n');
    if (lines.length < 2) return [];
    
    const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''));
    const matches: MatchData[] = [];
    
    for (let i = 1; i < lines.length; i++) {
      // Handle CSV with quoted fields
      const values = this.parseCSVLine(lines[i]);
      if (values.length < headers.length) continue;
      
      const row: any = {};
      headers.forEach((header, idx) => {
        row[header] = values[idx]?.trim().replace(/"/g, '') || '';
      });
      
      const date = this.parseDate(row.Date);
      if (!date) continue;
      
      const homeGoals = parseInt(row.FTHG) || 0;
      const awayGoals = parseInt(row.FTAG) || 0;
      
      let result: 'H' | 'D' | 'A' | undefined = undefined;
      if (row.FTR === 'H') result = 'H';
      else if (row.FTR === 'D') result = 'D';
      else if (row.FTR === 'A') result = 'A';
      
      // Parse odds - convert to decimal if they're in fractional format
      const homeWinOdds = this.parseOdds(row.B365H);
      const drawOdds = this.parseOdds(row.B365D);
      const awayWinOdds = this.parseOdds(row.B365A);
      
      matches.push({
        date,
        homeTeam: row.HomeTeam,
        awayTeam: row.AwayTeam,
        homeGoals,
        awayGoals,
        result,
        league,
        season,
        homeShots: parseInt(row.HS) || undefined,
        awayShots: parseInt(row.AS) || undefined,
        homeShotsOnTarget: parseInt(row.HST) || undefined,
        awayShotsOnTarget: parseInt(row.AST) || undefined,
        homeCorners: parseInt(row.HC) || undefined,
        awayCorners: parseInt(row.AC) || undefined,
        homeFouls: parseInt(row.HF) || undefined,
        awayFouls: parseInt(row.AF) || undefined,
        homeYellowCards: parseInt(row.HY) || undefined,
        awayYellowCards: parseInt(row.AY) || undefined,
        homeRedCards: parseInt(row.HR) || undefined,
        awayRedCards: parseInt(row.AR) || undefined,
        homeWinOdds,
        drawOdds,
        awayWinOdds,
        over25Odds: this.parseOdds(row.B365O25),
        under25Odds: this.parseOdds(row.B365U25),
        bttsYesOdds: undefined, // Not always available
        bttsNoOdds: undefined
      });
    }
    
    return matches;
  }
  
  private parseCSVLine(line: string): string[] {
    const values: string[] = [];
    let current = '';
    let inQuotes = false;
    
    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === ',' && !inQuotes) {
        values.push(current);
        current = '';
      } else {
        current += char;
      }
    }
    
    values.push(current);
    return values;
  }
  
  private parseDate(dateStr: string): Date | null {
    if (!dateStr) return null;
    
    // European format: DD/MM/YY
    const parts = dateStr.split('/');
    if (parts.length !== 3) return null;
    
    const day = parseInt(parts[0]);
    const month = parseInt(parts[1]) - 1; // JS months are 0-indexed
    let year = parseInt(parts[2]);
    
    // Handle 2-digit years
    if (year < 100) {
      year += year > 50 ? 1900 : 2000;
    }
    
    const date = new Date(year, month, day);
    if (isNaN(date.getTime())) return null;
    
    return date;
  }
  
  private parseOdds(oddsStr: string): number | undefined {
    if (!oddsStr || oddsStr === '-') return undefined;
    
    const odds = parseFloat(oddsStr);
    if (isNaN(odds) || odds <= 1) return undefined;
    
    return odds;
  }
  
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
  
  get_cached_data(): MatchData[] {
    const cacheFile = path.join(this.cacheDir, 'football-outcomes-data.json');
    
    if (!fs.existsSync(cacheFile)) {
      return [];
    }
    
    const data = JSON.parse(fs.readFileSync(cacheFile, 'utf-8'));
    return data.map((m: any) => ({ ...m, date: new Date(m.date) }));
  }
}
