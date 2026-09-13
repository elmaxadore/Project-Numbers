const API_KEY = '123'; // Free public key for TheSportsDB
const BASE_URL = 'https://www.thesportsdb.com/api/v1/json';
/**
 * Fetches fixtures for a specific date from TheSportsDB
 * Uses eventsnextleague endpoint for top leagues (more reliable than lookallnext)
 * Also tries lookallnext.php as fallback to catch ALL sports/leagues
 */
export async function getFixturesByDate(dateStr) {
    console.log(`📡 [TheSportsDB] Fetching fixtures for ${dateStr}...`);
    try {
        // Fetch upcoming fixtures from major leagues
        const leagueIds = [4328, 4335, 4331, 4332, 4334, 4344, 4351, 4346, 4356, 4370]; // EPL, La Liga, Serie A, Bundesliga, Ligue 1, Eredivisie, Championship, Primeira Liga, MLS, Brasileirao
        const allEvents = [];
        // Method 1: Fetch from specific major leagues
        for (const leagueId of leagueIds) {
            const url = `${BASE_URL}/${API_KEY}/eventsnextleague.php?id=${leagueId}`;
            const response = await fetch(url);
            if (response.ok) {
                const data = await response.json();
                if (data.events && Array.isArray(data.events)) {
                    // Filter events matching the requested date
                    const leagueEvents = data.events.filter((e) => e.dateEvent === dateStr);
                    allEvents.push(...leagueEvents);
                }
            }
        }
        // Method 2: Fallback - Fetch ALL upcoming events across all sports/leagues
        try {
            const allNextUrl = `${BASE_URL}/${API_KEY}/lookallnext.php`;
            const allNextResponse = await fetch(allNextUrl);
            if (allNextResponse.ok) {
                const allNextData = await allNextResponse.json();
                if (allNextData.events && Array.isArray(allNextData.events)) {
                    // Filter for soccer/football events on the target date
                    const soccerEvents = allNextData.events.filter((e) => e.dateEvent === dateStr &&
                        e.strSport === 'Soccer');
                    // Add events that aren't already in our list (avoid duplicates)
                    const existingIds = new Set(allEvents.map(e => e.idEvent));
                    for (const event of soccerEvents) {
                        if (!existingIds.has(event.idEvent)) {
                            allEvents.push(event);
                        }
                    }
                }
            }
        }
        catch (err) {
            console.log(`⚠️ [TheSportsDB] lookallnext.php failed: ${err.message}`);
        }
        if (allEvents.length === 0) {
            return []; // No fixtures found
        }
        console.log(`✅ [TheSportsDB] Found ${allEvents.length} soccer matches for ${dateStr}`);
        // CRITICAL: Filter out events with unknown/null league or team names
        const validEvents = allEvents.filter((event) => {
            const hasValidLeague = event.strLeague && event.strLeague.trim() !== '';
            const hasValidHomeTeam = event.strHomeTeam && event.strHomeTeam.trim() !== '';
            const hasValidAwayTeam = event.strAwayTeam && event.strAwayTeam.trim() !== '';
            if (!hasValidLeague || !hasValidHomeTeam || !hasValidAwayTeam) {
                console.log(`⚠️ [TheSportsDB] Discarding event with invalid  ${event.strHomeTeam || 'Unknown'} vs ${event.strAwayTeam || 'Unknown'} (League: ${event.strLeague || 'Unknown'})`);
                return false;
            }
            return true;
        });
        if (validEvents.length === 0) {
            console.log(`⚠️ [TheSportsDB] All ${allEvents.length} events were discarded due to invalid data`);
            return [];
        }
        console.log(`✅ [TheSportsDB] ${validEvents.length} valid events after filtering`);
        return validEvents.map((event) => ({
            id: Number(event.idEvent),
            leagueId: Number(event.idLeague),
            leagueName: event.strLeague,
            homeTeam: {
                id: Number(event.idHomeTeam),
                name: event.strHomeTeam
            },
            awayTeam: {
                id: Number(event.idAwayTeam),
                name: event.strAwayTeam
            },
            date: event.dateEvent + 'T' + (event.strTime || '15:00:00') + '+00:00',
            status: 'scheduled'
        }));
    }
    catch (error) {
        console.error(`❌ [TheSportsDB] Error fetching fixtures: ${error.message}`);
        throw error; // Propagate to main handler
    }
}
/**
 * Optional: Fetch odds for a specific event ID (Free tier limited)
 * Returns empty array if no odds available (common for free tier)
 */
export async function getOddsForEvent(eventId) {
    const url = `${BASE_URL}/${API_KEY}/lookateventdetails.php?id=${eventId}`;
    try {
        const response = await fetch(url);
        const data = await response.json();
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
                    { value: 'Away', odd: 0 } // Not always provided
                ]
            }];
    }
    catch {
        return [];
    }
}
//# sourceMappingURL=thesportsdb-api.js.map