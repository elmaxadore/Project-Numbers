"use strict";
// ============================================================
// League Filter Configuration
// Known high-opportunity leagues from the research paper
// ============================================================
Object.defineProperty(exports, "__esModule", { value: true });
exports.LEAGUE_XG_ADJUSTMENTS = exports.KNOWN_LEAGUES = void 0;
/**
 * Leagues known to be suitable for Over/Under and BTTS betting
 * Based on empirical data from the research paper
 */
exports.KNOWN_LEAGUES = [
    // Top-tier high-scoring leagues
    {
        id: 88,
        name: 'Eredivisie',
        country: 'Netherlands',
        avgGoalsPerMatch: 3.25,
        over25Rate: 0.70,
        bttsRate: 0.68,
        tier: 1,
    },
    {
        id: 78,
        name: 'Bundesliga',
        country: 'Germany',
        avgGoalsPerMatch: 3.10,
        over25Rate: 0.62,
        bttsRate: 0.55,
        tier: 1,
    },
    {
        id: 39,
        name: 'Premier League',
        country: 'England',
        avgGoalsPerMatch: 2.90,
        over25Rate: 0.58,
        bttsRate: 0.632,
        tier: 1,
    },
    {
        id: 253,
        name: 'MLS',
        country: 'USA',
        avgGoalsPerMatch: 3.11,
        over25Rate: 0.607,
        bttsRate: 0.688,
        tier: 1,
    },
    {
        id: 135,
        name: 'Serie A',
        country: 'Italy',
        avgGoalsPerMatch: 2.80,
        over25Rate: 0.56,
        bttsRate: 0.472,
        tier: 1,
    },
    {
        id: 140,
        name: 'La Liga',
        country: 'Spain',
        avgGoalsPerMatch: 2.65,
        over25Rate: 0.536,
        bttsRate: 0.571,
        tier: 1,
    },
    {
        id: 61,
        name: 'Ligue 1',
        country: 'France',
        avgGoalsPerMatch: 2.44,
        over25Rate: 0.47,
        bttsRate: 0.364,
        tier: 1,
    },
    {
        id: 94,
        name: 'Primeira Liga',
        country: 'Portugal',
        avgGoalsPerMatch: 2.79,
        over25Rate: 0.458,
        bttsRate: 0.417,
        tier: 1,
    },
    // Second-tier high-BTTS leagues
    {
        id: 89,
        name: 'Eerste Divisie',
        country: 'Netherlands',
        avgGoalsPerMatch: 3.20,
        over25Rate: 0.68,
        bttsRate: 0.65,
        tier: 2,
    },
    {
        id: 244,
        name: 'Canadian Soccer League',
        country: 'Canada',
        avgGoalsPerMatch: 6.1,
        over25Rate: 0.90,
        bttsRate: 0.80,
        tier: 1,
    },
    // Additional strong leagues
    {
        id: 88,
        name: 'Eredivisie',
        country: 'Netherlands',
        avgGoalsPerMatch: 3.25,
        over25Rate: 0.70,
        bttsRate: 0.68,
        tier: 1,
    },
    {
        id: 169,
        name: 'Super Lig',
        country: 'Turkey',
        avgGoalsPerMatch: 2.95,
        over25Rate: 0.57,
        bttsRate: 0.58,
        tier: 1,
    },
    {
        id: 203,
        name: 'Süper Lig',
        country: 'Turkey',
        avgGoalsPerMatch: 2.95,
        over25Rate: 0.57,
        bttsRate: 0.58,
        tier: 1,
    },
];
/**
 * League-specific xG baseline adjustments
 * Some leagues naturally produce higher/lower xG
 */
exports.LEAGUE_XG_ADJUSTMENTS = {
    'Eredivisie': 0.15, // Slightly higher scoring than raw goals suggest
    'Bundesliga': 0.10,
    'Premier League': 0.0,
    'MLS': 0.10,
    'Serie A': -0.05,
    'La Liga': -0.05,
    'Ligue 1': -0.15,
    'Primeira Liga': -0.10,
    'Eerste Divisie': 0.15,
};
//# sourceMappingURL=leagues.js.map