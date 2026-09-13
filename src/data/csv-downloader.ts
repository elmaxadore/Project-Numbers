/**
 * Football-Data.co.uk CSV Downloader
 * Downloads historical and current season CSV files for 25+ European leagues
 * Saves to local cache for fast bot access
 */

import * as fs from 'fs';
import * as path from 'path';
import { parse } from 'csv-parse/sync';

const CACHE_DIR = path.join(process.cwd(), 'src/data/csv-cache');

// League mappings: League Name -> Football-Data.co.uk URL pattern (2026/2027 season)
const LEAGUE_URLS: Record<string, string> = {
  'EPL': 'https://www.football-data.co.uk/mmz4281/2627/E0.csv',
  'ELC': 'https://www.football-data.co.uk/mmz4281/2627/E1.csv',
  'SP1': 'https://www.football-data.co.uk/mmz4281/2627/SP1.csv',
  'SP2': 'https://www.football-data.co.uk/mmz4281/2627/SP2.csv',
  'IT1': 'https://www.football-data.co.uk/mmz4281/2627/I1.csv',
  'IT2': 'https://www.football-data.co.uk/mmz4281/2627/I2.csv',
  'D1': 'https://www.football-data.co.uk/mmz4281/2627/D1.csv',
  'D2': 'https://www.football-data.co.uk/mmz4281/2627/D2.csv',
  'F1': 'https://www.football-data.co.uk/mmz4281/2627/F1.csv',
  'F2': 'https://www.football-data.co.uk/mmz4281/2627/F2.csv',
  'N1': 'https://www.football-data.co.uk/mmz4281/2627/N1.csv',
  'B1': 'https://www.football-data.co.uk/mmz4281/2627/B1.csv',
  'P1': 'https://www.football-data.co.uk/mmz4281/2627/P1.csv',
  'T1': 'https://www.football-data.co.uk/mmz4281/2627/T1.csv',
  'G1': 'https://www.football-data.co.uk/mmz4281/2627/G1.csv',
};

interface MatchRecord {
  date: string;
  homeTeam: string;
  awayTeam: string;
  homeGoals?: number;
  awayGoals?: number;
  league: string;
  raw: any;
}

export async function downloadAllLeagueCSVs(): Promise<void> {
  console.log('📥 Downloading football data CSVs...');
  
  if (!fs.existsSync(CACHE_DIR)) {
    fs.mkdirSync(CACHE_DIR, { recursive: true });
  }

  const fetch = (await import('node-fetch')).default;
  
  const leagueEntries = Object.entries(LEAGUE_URLS);
  const totalLeagues = leagueEntries.length;
  
  for (let i = 0; i < leagueEntries.length; i++) {
    const [leagueCode, url] = leagueEntries[i];
    try {
      const filePath = path.join(CACHE_DIR, `${leagueCode}_current.csv`);
      console.log(`   [${i + 1}/${totalLeagues}] Downloading ${leagueCode}...`);
      
      const response = await fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.5',
        }
      });
      
      if (!response.ok) {
        console.warn(`   ⚠️ Failed to download ${leagueCode}: ${response.status}`);
        continue;
      }
      
      const csvContent = await response.text();
      fs.writeFileSync(filePath, csvContent);
      console.log(`   ✅ ${leagueCode} saved (${csvContent.length} bytes)`);
      
      // Add delay between requests to avoid rate limiting (1-2 seconds)
      if (i < leagueEntries.length - 1) {
        const delay = Math.floor(Math.random() * 1000) + 1000; // 1-2 seconds
        await new Promise(resolve => setTimeout(resolve, delay));
      }
      
    } catch (error: any) {
      console.warn(`   ❌ Error downloading ${leagueCode}: ${error.message}`);
      // Add longer delay on error before retrying next league
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
  }
  
  console.log('✅ CSV download complete');
}

export function readMatchesForDate(targetDate: string): MatchRecord[] {
  const matches: MatchRecord[] = [];
  const targetStr = new Date(targetDate).toLocaleDateString('en-GB'); // DD/MM/YYYY format
  
  if (!fs.existsSync(CACHE_DIR)) {
    console.warn('⚠️ CSV cache directory not found');
    return matches;
  }

  const files = fs.readdirSync(CACHE_DIR).filter(f => f.endsWith('.csv'));
  
  for (const file of files) {
    const filePath = path.join(CACHE_DIR, file);
    const leagueCode = file.replace('_current.csv', '');
    
    try {
      const csvContent = fs.readFileSync(filePath, 'utf-8');
      const records = parse(csvContent, {
        columns: true,
        skip_empty_lines: true,
        relax_column_count: true
      });
      
      for (const record of records) {
        const dateStr = record.Date;
        if (!dateStr) continue;
        
        // Parse DD/MM/YYYY or DD/MM/YY format
        const parts = dateStr.split('/');
        if (parts.length !== 3) continue;
        
        const day = parseInt(parts[0]);
        const month = parseInt(parts[1]) - 1; // JS months are 0-indexed
        let year = parseInt(parts[2]);
        
        // Handle 2-digit years (e.g., "24" -> 2024)
        if (year < 100) {
          year += 2000;
        }
        
        const matchDate = new Date(year, month, day);
        const matchDateStr = matchDate.toISOString().split('T')[0];
        
        if (matchDateStr === targetDate) {
          matches.push({
            date: matchDateStr,
            homeTeam: record.HomeTeam || 'Unknown',
            awayTeam: record.AwayTeam || 'Unknown',
            homeGoals: record.FTHG ? parseInt(record.FTHG) : undefined,
            awayGoals: record.FTAG ? parseInt(record.FTAG) : undefined,
            league: leagueCode,
            raw: record
          });
        }
      }
    } catch (error: any) {
      console.warn(`⚠️ Error reading ${file}: ${error.message}`);
    }
  }
  
  return matches;
}

export function getAllUpcomingMatches(daysAhead: number = 7): MatchRecord[] {
  const matches: MatchRecord[] = [];
  const today = new Date();
  
  for (let i = 0; i < daysAhead; i++) {
    const checkDate = new Date(today);
    checkDate.setDate(today.getDate() + i);
    const dateStr = checkDate.toISOString().split('T')[0];
    matches.push(...readMatchesForDate(dateStr));
  }
  
  return matches;
}

// CLI execution
const isMainModule = import.meta.url === `file://${process.argv[1]}`;
if (isMainModule) {
  downloadAllLeagueCSVs().then(() => {
    console.log('\n📊 Sample matches for today:');
    const today = new Date().toISOString().split('T')[0];
    const matches = readMatchesForDate(today);
    console.log(`Found ${matches.length} matches for ${today}`);
    matches.slice(0, 5).forEach(m => {
      console.log(`   ${m.homeTeam} vs ${m.awayTeam} (${m.league})`);
    });
  });
}
