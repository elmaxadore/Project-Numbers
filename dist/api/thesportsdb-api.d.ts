import { Fixture } from '../models/types.js';
/**
 * Fetches fixtures for a specific date from TheSportsDB
 * Uses eventsnextleague endpoint for top leagues (more reliable than lookallnext)
 * Also tries lookallnext.php as fallback to catch ALL sports/leagues
 */
export declare function getFixturesByDate(dateStr: string): Promise<Fixture[]>;
/**
 * Optional: Fetch odds for a specific event ID (Free tier limited)
 * Returns empty array if no odds available (common for free tier)
 */
export declare function getOddsForEvent(eventId: number): Promise<any[]>;
//# sourceMappingURL=thesportsdb-api.d.ts.map