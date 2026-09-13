import { Fixture, Team } from '../models/types.js';

const API_KEY = '123'; // Free public key for TheSportsDB
const BASE_URL = 'https://www.thesportsdb.com/api/v1/json';

/**
 * Fetches fixtures for a specific date from TheSportsDB
 * Uses eventsnextleague endpoint for top leagues (more reliable than lookallnext)
 */
export async function getFixturesByDate(dateStr: string): Promise<Fixture[]> {
  console.log(`📡 [TheSportsDB] Fetching fixtures for ${dateStr}...`);
  
  try {
    // Fetch upcoming fixtures from major leagues
    const leagueIds = [4328, 4335, 4331, 4332, 4334, 4344]; // EPL, La Liga, Serie A, Bundesliga, Ligue 1, Eredivisie
    const allEvents: any[] = [];
    
    for (const leagueId of leagueIds) {
      const url = `${BASE_URL}/${API_KEY}/eventsnextleague.php?id=${leagueId}`;
      const response = await fetch(url);
      
      if (response.ok) {
        const data: any = await response.json();
        if (data.events && Array.isArray(data.events)) {
          // Filter events matching the requested date
          const leagueEvents = data.events.filter((e: any) => e.dateEvent === dateStr);
          allEvents.push(...leagueEvents);
        }
      }
    }
    
    if (allEvents.length === 0) {
      return [] as Fixture[]; // No fixtures found
    }

    console.log(`✅ [TheSportsDB] Found ${allEvents.length} soccer matches for ${dateStr}`);

    return allEvents.map((event: any): Fixture => ({
      id: Number(event.idEvent),
      leagueId: Number(event.idLeague),
      leagueName: event.strLeague || 'Unknown League',
      homeTeam: {
        id: Number(event.idHomeTeam),
        name: event.strHomeTeam || 'Unknown Home'
      } as Team,
      awayTeam: {
        id: Number(event.idAwayTeam),
        name: event.strAwayTeam || 'Unknown Away'
      } as Team,
      date: event.dateEvent + 'T' + (event.strTime || '15:00:00') + '+00:00',
      status: 'scheduled'
    }));

  } catch (error: any) {
    console.error(`❌ [TheSportsDB] Error fetching fixtures: ${error.message}`);
    throw error; // Propagate to main handler
  }
}

/**
 * Optional: Fetch odds for a specific event ID (Free tier limited)
 * Returns empty array if no odds available (common for free tier)
 */
export async function getOddsForEvent(eventId: number): Promise<any[]> {
  const url = `${BASE_URL}/${API_KEY}/lookateventdetails.php?id=${eventId}`;
  
  try {
    const response = await fetch(url);
    const data: any = await response.json();
    
    if (!data.event || !data.event.strOdd) {
      return [];
    }
    
    // TheSportsDB free tier often returns generic odds or null
    // We parse what we can, but rely on model probabilities if odds missing
    return [{
      bookmaker: 'TheSportsDB',
      market: 'Match Winner',
      values: [
        { value: 'Home', odd: parseFloat(data.event.strOdd) || 0 },
        { value: 'Draw', odd: 0 }, // Not always provided
        { value: 'Away', odd: 0 }  // Not always provided
      ]
    }];
  } catch {
    return [];
  }
}
