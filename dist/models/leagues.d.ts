import { League } from './types.js';
/**
 * Leagues known to be suitable for Over/Under and BTTS betting
 * Based on empirical data from the research paper
 */
export declare const KNOWN_LEAGUES: League[];
/**
 * League-specific xG baseline adjustments
 * Some leagues naturally produce higher/lower xG
 */
export declare const LEAGUE_XG_ADJUSTMENTS: Record<string, number>;
//# sourceMappingURL=leagues.d.ts.map