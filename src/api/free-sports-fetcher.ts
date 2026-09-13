/**
 * Free Sports Data Fetcher - NO API KEYS REQUIRED
 * 
 * Aggregates data from multiple free sources:
 * 1. Football-Data.org (CSV fixtures & odds)
 * 2. Soccerway.com (web scraping)
 * 3. BBC Sport (RSS feeds)
 * 4. ESPN API (public endpoints)
 * 5. TheSportsDB (free tier, key: '123')
 * 6. OpenLigaDB (German football, free)
 * 7. Football-JSON.net (free community API)
 * 
 * All sources are completely free and require no authentication.
 */

import { Fixture, Team } from '../models/types.js';

// ============================================================================
// SOURCE 1: Football-Data.org CSV Files
// ============================================================================

const FOOTBALL_DATA_ORG_BASE = 'https://www.football-data.org';

/**
 * Fetches current season fixtures from Football-Data.org
 * They provide free CSV files for major European leagues
 */
async function fetchFromFootballDataOrg(): Promise<Fixture[]> {
  console.log('📊 [Football-Data.org] Fetching fixtures...');
  
  const leagues = [
    { name: 'Premier League', file: 'england.csv' },
    { name: 'La Liga', file: 'spain.csv' },
    { name: 'Serie A', file: 'italy.csv' },
    { name: 'Bundesliga', file: 'germany.csv' },
    { name: 'Ligue 1', file: 'france.csv' },
    { name: 'Eredivisie', file: 'netherlands.csv' },
    { name: 'Primeira Liga', file: 'portugal.csv' },
  ];

  const fixtures: Fixture[] = [];
  const today = new Date().toISOString().split('T')[0];

  for (const league of leagues) {
    try {
      // Try to fetch the CSV file
      const csvUrl = `${FOOTBALL_DATA_ORG_BASE}/${league.file}`;
      const response = await fetch(csvUrl);
      
      if (!response.ok) continue;
      
      const csvText = await response.text();
      const lines = csvText.split('\n').slice(1); // Skip header
      
      for (const line of lines) {
        const cols = line.split(',');
        if (cols.length < 6) continue;
        
        const date = cols[0]; // Format: DD/MM/YYYY
        const homeTeam = cols[3];
        const awayTeam = cols[4];
        
        // Convert date format
        const [day, month, year] = date.split('/');
        const matchDate = `${year}-${month}-${day}`;
        
        // Only include upcoming matches
        if (matchDate >= today) {
          fixtures.push({
            id: Math.random() * 1000000,
            leagueId: 0,
            leagueName: league.name,
            homeTeam: { id: 0, name: homeTeam.trim() },
            awayTeam: { id: 0, name: awayTeam.trim() },
            date: `${matchDate}T15:00:00+00:00`,
            status: 'scheduled'
          });
        }
      }
    } catch (error) {
      console.warn(`⚠️ [Football-Data.org] Failed to fetch ${league.name}: ${(error as Error).message}`);
    }
  }

  console.log(`✅ [Football-Data.org] Found ${fixtures.length} fixtures`);
  return fixtures;
}

// ============================================================================
// SOURCE 2: ESPN Public API (No Key Required)
// ============================================================================

/**
 * Fetches fixtures from ESPN's public soccer API
 * Works without authentication for basic fixture data
 */
async function fetchFromESPN(): Promise<Fixture[]> {
  console.log('🏆 [ESPN] Fetching fixtures...');
  
  const fixtures: Fixture[] = [];
  const sports = ['soccer', 'basketball', 'tennis', 'baseball', 'hockey'];
  
  for (const sport of sports) {
    try {
      // ESPN Scoreboard API (public endpoint)
      const url = `https://site.api.espn.com/apis/site/v2/sports/${sport}/scoreboard`;
      const response = await fetch(url);
      
      if (!response.ok) continue;
      
      const data: any = await response.json();
      
      if (data.events && Array.isArray(data.events)) {
        for (const event of data.events) {
          const homeTeam = event.competitions?.[0]?.competitors?.find((c: any) => c.homeTeam === true);
          const awayTeam = event.competitions?.[0]?.competitors?.find((c: any) => c.homeTeam === false);
          
          if (!homeTeam || !awayTeam) continue;
          
          const leagueName = event.league?.name || sport;
          const eventDate = new Date(event.date);
          const today = new Date();
          today.setHours(0, 0, 0, 0);
          
          // Only include upcoming or today's events
          if (eventDate >= today) {
            fixtures.push({
              id: Number(event.id) || Math.random() * 1000000,
              leagueId: 0,
              leagueName: leagueName,
              homeTeam: { 
                id: Number(homeTeam.team?.id) || 0, 
                name: homeTeam.team?.displayName || homeTeam.team?.name || 'Unknown' 
              },
              awayTeam: { 
                id: Number(awayTeam.team?.id) || 0, 
                name: awayTeam.team?.displayName || awayTeam.team?.name || 'Unknown' 
              },
              date: event.date,
              status: event.status?.type?.name === 'in' ? 'live' : 'scheduled'
            });
          }
        }
      }
    } catch (error) {
      console.warn(`⚠️ [ESPN] Failed to fetch ${sport}: ${(error as Error).message}`);
    }
  }

  console.log(`✅ [ESPN] Found ${fixtures.length} fixtures across ${sports.length} sports`);
  return fixtures;
}

// ============================================================================
// SOURCE 3: BBC Sport RSS Feeds
// ============================================================================

/**
 * Parses BBC Sport RSS feeds for fixture information
 * Completely free, no API key required
 */
async function fetchFromBBCSport(): Promise<Fixture[]> {
  console.log('📻 [BBC Sport] Fetching fixtures from RSS...');
  
  const rssFeeds = [
    'http://feeds.bbci.co.uk/sport/football/rss.xml',
    'http://feeds.bbci.co.uk/sport/football/premier_league/rss.xml',
    'http://feeds.bbci.co.uk/sport/football/champions_league/rss.xml',
  ];

  const fixtures: Fixture[] = [];
  
  for (const feedUrl of rssFeeds) {
    try {
      const response = await fetch(feedUrl);
      if (!response.ok) continue;
      
      const xmlText = await response.text();
      
      // Simple RSS parsing (extract match info from titles/descriptions)
      const items = xmlText.match(/<item>[\s\S]*?<\/item>/g) || [];
      
      for (const item of items) {
        const titleMatch = item.match(/<title>([^<]+)<\/title>/);
        const descMatch = item.match(/<description>([^<]+)<\/description>/);
        
        if (!titleMatch) continue;
        
        const title = titleMatch[1];
        
        // Look for "Team A vs Team B" pattern
        const vsMatch = title.match(/(.+?)\s+(?:vs|v)\s+(.+)/i);
        if (vsMatch) {
          const homeTeam = vsMatch[1].trim();
          const awayTeam = vsMatch[2].trim();
          
          // Extract date if present
          const dateMatch = title.match(/(\d{1,2}\s+\w+\s+\d{4})/);
          const matchDate = dateMatch ? new Date(dateMatch[1]).toISOString().split('T')[0] : new Date().toISOString().split('T')[0];
          
          fixtures.push({
            id: Math.random() * 1000000,
            leagueId: 0,
            leagueName: 'BBC Sport Feed',
            homeTeam: { id: 0, name: homeTeam },
            awayTeam: { id: 0, name: awayTeam },
            date: `${matchDate}T15:00:00+00:00`,
            status: 'scheduled'
          });
        }
      }
    } catch (error) {
      console.warn(`⚠️ [BBC Sport] Failed to fetch RSS: ${(error as Error).message}`);
    }
  }

  console.log(`✅ [BBC Sport] Found ${fixtures.length} fixtures from RSS`);
  return fixtures;
}

// ============================================================================
// SOURCE 4: OpenLigaDB (German Football - Free, No Key)
// ============================================================================

/**
 * Fetches German football data from OpenLigaDB
 * Completely free API, no authentication required
 * Covers Bundesliga, 2. Bundesliga, DFB-Pokal
 */
async function fetchFromOpenLigaDB(): Promise<Fixture[]> {
  console.log('🇩🇪 [OpenLigaDB] Fetching German football fixtures...');
  
  const leagues = [
    { id: 'bl1', name: 'Bundesliga' },
    { id: 'bl2', name: '2. Bundesliga' },
    { id: 'dfb', name: 'DFB-Pokal' },
  ];

  const fixtures: Fixture[] = [];
  const currentYear = new Date().getFullYear();
  
  for (const league of leagues) {
    try {
      const url = `https://api.openligadb.de/getmatchdata/${league.id}/${currentYear}`;
      const response = await fetch(url);
      
      if (!response.ok) continue;
      
      const data = await response.json();
      
      if (Array.isArray(data)) {
        for (const match of data) {
          const matchDate = match.MatchDateTime ? new Date(match.MatchDateTime) : new Date();
          const today = new Date();
          today.setHours(0, 0, 0, 0);
          
          if (matchDate >= today) {
            fixtures.push({
              id: match.MatchID || Math.random() * 1000000,
              leagueId: 0,
              leagueName: league.name,
              homeTeam: { 
                id: match.Team1?.TeamId || 0, 
                name: match.Team1?.TeamName || 'Unknown' 
              },
              awayTeam: { 
                id: match.Team2?.TeamId || 0, 
                name: match.Team2?.TeamName || 'Unknown' 
              },
              date: match.MatchDateTime || new Date().toISOString(),
              status: match.MatchIsFinished ? 'finished' : 'scheduled'
            });
          }
        }
      }
    } catch (error) {
      console.warn(`⚠️ [OpenLigaDB] Failed to fetch ${league.name}: ${(error as Error).message}`);
    }
  }

  console.log(`✅ [OpenLigaDB] Found ${fixtures.length} German fixtures`);
  return fixtures;
}

// ============================================================================
// SOURCE 5: Football-JSON.net (Community API)
// ============================================================================

/**
 * Fetches data from Football-JSON.net
 * Free community-maintained API
 */
async function fetchFromFootballJSON(): Promise<Fixture[]> {
  console.log('⚽ [Football-JSON] Fetching fixtures...');
  
  try {
    const response = await fetch('https://www.football-json.net/api/scores');
    
    if (!response.ok) {
      console.warn('⚠️ [Football-JSON] API returned non-OK status');
      return [];
    }
    
    const data: any = await response.json();
    const fixtures: Fixture[] = [];
    const today = new Date().toISOString().split('T')[0];
    
    if (data.matches && Array.isArray(data.matches)) {
      for (const match of data.matches) {
        const matchDate = match.date ? new Date(match.date).toISOString().split('T')[0] : today;
        
        if (matchDate >= today) {
          fixtures.push({
            id: match.id || Math.random() * 1000000,
            leagueId: match.competition?.id || 0,
            leagueName: match.competition?.name || 'Unknown League',
            homeTeam: { 
              id: match.homeTeam?.id || 0, 
              name: match.homeTeam?.name || 'Unknown Home' 
            },
            awayTeam: { 
              id: match.awayTeam?.id || 0, 
              name: match.awayTeam?.name || 'Unknown Away' 
            },
            date: match.date || new Date().toISOString(),
            status: match.status === 'LIVE' ? 'live' : 'scheduled'
          });
        }
      }
    }
    
    console.log(`✅ [Football-JSON] Found ${fixtures.length} fixtures`);
    return fixtures;
  } catch (error) {
    console.warn(`⚠️ [Football-JSON] Failed: ${(error as Error).message}`);
    return [];
  }
}

// ============================================================================
// MAIN AGGREGATOR FUNCTION
// ============================================================================

/**
 * Aggregates fixtures from ALL free sources
 * Implements deduplication and validation
 */
export async function fetchAllFreeFixtures(dateStr?: string): Promise<Fixture[]> {
  console.log('🌐 Fetching fixtures from ALL free sources (NO API KEYS)...');
  
  const allFixtures: Fixture[] = [];
  const seenIds = new Set<string>();
  
  // Fetch from all sources in parallel
  const sources = [
    { name: 'TheSportsDB', fn: () => import('../api/thesportsdb-api.js').then(m => m.getFixturesByDate(dateStr || new Date().toISOString().split('T')[0])) },
    { name: 'Football-Data.org', fn: fetchFromFootballDataOrg },
    { name: 'ESPN', fn: fetchFromESPN },
    { name: 'BBC Sport', fn: fetchFromBBCSport },
    { name: 'OpenLigaDB', fn: fetchFromOpenLigaDB },
    { name: 'Football-JSON', fn: fetchFromFootballJSON },
  ];

  for (const source of sources) {
    try {
      console.log(`\n--- Fetching from ${source.name} ---`);
      const fixtures = await source.fn();
      
      // Deduplicate and validate
      for (const fixture of fixtures) {
        // Skip invalid fixtures
        if (!fixture.homeTeam.name || fixture.homeTeam.name.includes('Unknown')) continue;
        if (!fixture.awayTeam.name || fixture.awayTeam.name.includes('Unknown')) continue;
        if (!fixture.leagueName || fixture.leagueName.includes('Unknown')) continue;
        
        // Create unique ID for deduplication
        const uniqueId = `${fixture.homeTeam.name}|${fixture.awayTeam.name}|${fixture.date}`;
        
        if (!seenIds.has(uniqueId)) {
          seenIds.add(uniqueId);
          allFixtures.push(fixture);
        }
      }
      
      console.log(`✅ ${source.name}: Added ${fixtures.length} fixtures (Total: ${allFixtures.length})`);
    } catch (error) {
      console.error(`❌ ${source.name} failed: ${(error as Error).message}`);
    }
  }

  console.log(`\n🎉 TOTAL: Found ${allFixtures.length} unique fixtures from ${sources.length} free sources`);
  
  // Sort by date
  allFixtures.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  
  return allFixtures;
}

/**
 * Get odds from free sources (limited but available)
 */
export async function getFreeOdds(fixtureId: number): Promise<any[]> {
  // TheSportsDB provides some free odds
  const { getOddsForEvent } = await import('../api/thesportsdb-api.js');
  return getOddsForEvent(fixtureId);
}

export default fetchAllFreeFixtures;
