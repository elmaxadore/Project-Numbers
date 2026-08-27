import { TeamVenueStats } from '../models/types.js';
export interface BallersTeamSeasonStats {
    team: {
        id: number;
        name: string;
    };
    league: {
        id: number;
        name: string;
    };
    season: number;
    statistics: {
        matches_played: number;
        goals_scored: number;
        goals_conceded: number;
        expected_goals: number;
        expected_goals_against: number;
        clean_sheets: number;
        failed_to_score: number;
        both_teams_to_score: number;
        shots_per_game: number;
        shots_on_target_per_game: number;
    };
    home?: {
        matches_played: number;
        goals_scored: number;
        goals_conceded: number;
        expected_goals: number;
        expected_goals_against: number;
        clean_sheets: number;
        failed_to_score: number;
        both_teams_to_score: number;
    };
    away?: {
        matches_played: number;
        goals_scored: number;
        goals_conceded: number;
        expected_goals: number;
        expected_goals_against: number;
        clean_sheets: number;
        failed_to_score: number;
        both_teams_to_score: number;
    };
}
export interface BallersMatch {
    id: number;
    league: {
        id: number;
        name: string;
    };
    home_team: {
        id: number;
        name: string;
    };
    away_team: {
        id: number;
        name: string;
    };
    start: string;
    stats: {
        home: {
            expected_goals: number;
            expected_goals_against: number;
            goals: number;
            shots: number;
            shots_on_target: number;
        };
        away: {
            expected_goals: number;
            expected_goals_against: number;
            goals: number;
            shots: number;
            shots_on_target: number;
        };
    };
    odds?: {
        home: number;
        draw: number;
        away: number;
    };
}
/**
 * Get team season statistics with xG data
 */
export declare function getTeamSeasonStats(teamId: number, leagueId: number, season: number): Promise<BallersTeamSeasonStats | null>;
/**
 * Get upcoming fixtures with xG predictions
 */
export declare function getUpcomingFixtures(leagueId: number, page?: number): Promise<BallersMatch[]>;
/**
 * Get match details with full xG breakdown
 */
export declare function getMatchDetails(matchId: number): Promise<BallersMatch | null>;
/**
 * Convert ballers stats to our TeamVenueStats format
 */
export declare function toTeamVenueStats(stats: BallersTeamSeasonStats, venue: 'home' | 'away'): TeamVenueStats;
/**
 * Get the number of API requests used today
 */
export declare function getRequestCount(): number;
//# sourceMappingURL=ballers.d.ts.map