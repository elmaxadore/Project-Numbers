/**
 * Fetches today's fixtures from FREE sources (no paid API key required)
 * Priority: 1) Football-Data.org CSV, 2) TheSportsDB (limited), 3) Fallback to known upcoming matches
 */
import { Fixture } from '../types/fixtures.js';
export declare function getFixturesByDate(startDate: string, endDate: string): Promise<Fixture[]>;
//# sourceMappingURL=todays-fixtures-fetcher.d.ts.map