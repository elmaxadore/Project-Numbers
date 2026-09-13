import axios from 'axios';
import * as cheerio from 'cheerio';
import { parse } from 'csv-parse/sync';
import { Fixture } from '../models/types.js';
import { logger } from '../utils/logger.js';

/**
 * FREE SOURCE AGGREGATOR
 * Aggregates data from multiple free sources to maximize coverage without API keys.
 * 
 * Sources (TESTED & VERIFIED):
 * 1. TheSportsDB (Global Soccer/Basketball) - ✅ WORKING
 * 2. OpenLigaDB (German Leagues - Bundesliga, DFB-Pokal) - ✅ WORKING
 * 
 * Sources REMOVED (not working):
 * - ESPN: Returns 403 Forbidden (blocks automated requests)
 * - BBC Sport: No structured fixture data available via scraping
 * - Football-JSON.net: Domain not resolving (service down)
 */

export class FreeSourceAggregator {
  private static readonly USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36';

  /**
   * Main entry point: Fetch fixtures from ALL free sources in parallel
   */
  public static async fetchAllFixtures(dateStr: string): Promise<Fixture[]> {
    logger.info(`🌐 Aggregating free data sources for ${dateStr}...`);
    
    // Only use verified working sources: TheSportsDB and OpenLigaDB
    const results = await Promise.allSettled([
      this.fetchTheSportsDB(dateStr),
      this.fetchOpenLigaDB(dateStr),
      // ESPN removed: Returns 403 Forbidden
      // BBC Sport removed: No structured fixture data
      // Football-JSON removed: Domain not resolving
    ]);

    let allFixtures: Fixture[] = [];

    results.forEach((result, index) => {
      const sourceName = ['TheSportsDB', 'OpenLigaDB'][index];
      if (result.status === 'fulfilled') {
        const fixtures = result.value;
        logger.info(`✅ ${sourceName}: Found ${fixtures.length} fixtures`);
        allFixtures = [...allFixtures, ...fixtures];
      } else {
        logger.warn(`❌ ${sourceName}: Failed to fetch - ${result.reason}`);
      }
    });

    // Deduplicate fixtures (same teams, same date)
    const uniqueFixtures = this.deduplicateFixtures(allFixtures);
    logger.info(`🧹 Deduplicated total: ${uniqueFixtures.length} unique fixtures`);

    return uniqueFixtures;
  }

  /**
   * Source 1: TheSportsDB (Free Tier, Key: '123')
   * Covers: Global Soccer, Basketball, Tennis, etc.
   */
  private static async fetchTheSportsDB(dateStr: string): Promise<Fixture[]> {
    const apiKey = '123'; // Public free key
    const baseUrl = 'https://www.thesportsdb.com/api/v1/json/' + apiKey;
    
    try {
      // Strategy: Fetch "Next Events" for major leagues AND "Events on Date"
      // Since 'lookallnext' returns upcoming events, we filter by date client-side
      const response = await axios.get(`${baseUrl}/lookallnext.php`, {
        headers: { 'User-Agent': this.USER_AGENT },
        timeout: 8000
      });

      if (!response.data || !response.data.events) {
        return [];
      }

      const events = response.data.events.filter((e: any) => e.dateEvent === dateStr);
      
      return events.map((event: any) => ({
        id: event.idEvent ? `tsdb-${event.idEvent}` : Math.floor(Math.random() * 1000000),
        leagueId: event.idLeague || 0,
        leagueName: event.strLeague || 'Unknown League',
        homeTeam: { id: event.idHomeTeam || 0, name: event.strHomeTeam || 'Unknown Home' },
        awayTeam: { id: event.idAwayTeam || 0, name: event.strAwayTeam || 'Unknown Away' },
        date: new Date(`${event.dateEvent}T${event.strTime || '12:00:00'}`).toISOString(),
        status: 'scheduled' as const
      }));
    } catch (error) {
      logger.warn(`TheSportsDB fetch error: ${error instanceof Error ? error.message : 'Unknown error'}`);
      return [];
    }
  }

  /**
   * Source 2: OpenLigaDB (Completely Free, No Key)
   * Covers: German Bundesliga 1 & 2, DFB-Pokal
   */
  private static async fetchOpenLigaDB(dateStr: string): Promise<Fixture[]> {
    try {
      // OpenLigaDB doesn't support date-based filtering directly in a simple endpoint
      // We fetch current matchdays for active leagues and filter by date
      const leagues = [
        'bl1', // Bundesliga 1
        'bl2', // Bundesliga 2
        'dfb'  // DFB Pokal
      ];

      let fixtures: Fixture[] = [];

      for (const league of leagues) {
        try {
          // Fetch current matchgroup/matchday
          const response = await axios.get(
            `https://api.openligadb.de/getmatchdata/${league}/${new Date().getFullYear()}`,
            { timeout: 5000 }
          );

          if (Array.isArray(response.data)) {
            const dayFixtures = response.data
              .filter((match: any) => {
                if (!match.matchDateTime) return false;
                const matchDate = match.matchDateTime.split('T')[0];
                return matchDate === dateStr;
              })
              .map((match: any) => ({
                id: match.matchID || Math.floor(Math.random() * 1000000),
                leagueId: 0,
                leagueName: league === 'bl1' ? 'German Bundesliga' : league === 'bl2' ? 'German 2. Bundesliga' : 'DFB Pokal',
                homeTeam: { id: match.team1?.teamId || 0, name: match.team1?.teamName || 'Unknown Home' },
                awayTeam: { id: match.team2?.teamId || 0, name: match.team2?.teamName || 'Unknown Away' },
                date: new Date(match.matchDateTime).toISOString(),
                status: match.MatchIsFinished ? 'finished' as const : 'scheduled' as const
              }));
            
            fixtures = [...fixtures, ...dayFixtures];
          }
        } catch (err) {
          // Skip individual league failures
          continue;
        }
      }

      return fixtures;
    } catch (error) {
      logger.warn(`OpenLigaDB fetch error: ${error instanceof Error ? error.message : 'Unknown error'}`);
      return [];
    }
  }

  /**
   * Deduplicate fixtures based on Team Names + Date
   * Prevents showing "Man Utd vs Liverpool" twice if found by both TheSportsDB and OpenLigaDB
   */
  private static deduplicateFixtures(fixtures: any[]): Fixture[] {
    const seen = new Set<string>();
    const unique: Fixture[] = [];

    for (const fixture of fixtures) {
      // Create a normalized key: "HOME_TEAM|AWAY_TEAM|DATE"
      const home = fixture.homeTeam.name.toLowerCase().replace(/[^a-z0-9]/g, '');
      const away = fixture.awayTeam.name.toLowerCase().replace(/[^a-z0-9]/g, '');
      const date = fixture.date.split('T')[0];
      
      // Sort names to catch "A vs B" and "B vs A" duplicates if order varies
      const sortedTeams = [home, away].sort();
      const key = `${sortedTeams[0]}|${sortedTeams[1]}|${date}`;

      if (!seen.has(key)) {
        seen.add(key);
        unique.push(fixture as Fixture);
      }
    }

    return unique;
  }
}
