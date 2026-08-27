export interface ApiFixture {
    fixture: {
        id: number;
        date: string;
        timestamp: number;
        status: {
            short: string;
            long: string;
        };
    };
    league: {
        id: number;
        name: string;
        country: string;
    };
    teams: {
        home: {
            id: number;
            name: string;
            winner: boolean;
        };
        away: {
            id: number;
            name: string;
            winner: boolean;
        };
    };
    goals: {
        home: number | null;
        away: number | null;
    };
    score: {
        halftime: {
            home: number | null;
            away: number | null;
        };
        fulltime: {
            home: number | null;
            away: number | null;
        };
    };
}
/**
 * Get fixtures for a league in a specific season
 */
export declare function getFixtures(leagueId: number, season: number): Promise<ApiFixture[]>;
/**
 * Get fixtures for a specific date range
 */
export declare function getFixturesByDate(from: string, to: string, leagueId?: number): Promise<ApiFixture[]>;
export interface ApiTeamStatistic {
    team: {
        id: number;
        name: string;
    };
    fixtures: {
        played: {
            home: number;
            away: number;
            total: number;
        };
        wins: {
            home: number;
            away: number;
            total: number;
        };
        draws: {
            home: number;
            away: number;
            total: number;
        };
        loses: {
            home: number;
            away: number;
            total: number;
        };
    };
    goals: {
        for: {
            total: {
                home: number;
                away: number;
                total: number;
            };
            average: {
                home: string;
                away: string;
                total: string;
            };
        };
        against: {
            total: {
                home: number;
                away: number;
                total: number;
            };
            average: {
                home: string;
                away: string;
                total: string;
            };
        };
    };
    clean_sheet: {
        home: number;
        away: number;
        total: number;
    };
    failed_to_score: {
        home: number;
        away: number;
        total: number;
    };
    both_teams_to_score: {
        total: number;
    };
}
/**
 * Get team statistics for a league/season
 */
export declare function getTeamStatistics(leagueId: number, season: number, teamId: number): Promise<ApiTeamStatistic | null>;
export interface ApiStanding {
    league: {
        id: number;
        name: string;
        standings: Array<Array<{
            rank: number;
            team: {
                id: number;
                name: string;
            };
            points: number;
            goalsDiff: number;
            all: {
                played: number;
                win: number;
                draw: number;
                lose: number;
                goals: {
                    for: number;
                    against: number;
                };
            };
        }>>;
    };
}
/**
 * Get league standings
 */
export declare function getStandings(leagueId: number, season: number): Promise<ApiStanding | null>;
export interface ApiOdds {
    league: {
        id: number;
        name: string;
    };
    fixture: {
        id: number;
        date: string;
    };
    update: string;
    bookmakers: Array<{
        id: number;
        name: string;
        bets: Array<{
            id: number;
            name: string;
            values: Array<{
                value: string;
                odd: string;
            }>;
        }>;
    }>;
}
/**
 * Get pre-match odds for upcoming fixtures
 */
export declare function getOdds(leagueId: number, season: number, fixtureId?: number): Promise<ApiOdds[]>;
/**
 * Get head-to-head results between two teams
 */
export declare function getHeadToHead(homeTeamId: number, awayTeamId: number): Promise<ApiFixture[]>;
/**
 * Get the number of API requests used today
 */
export declare function getRequestCount(): number;
/**
 * Reset the daily request counter
 */
export declare function resetRequestCount(): void;
//# sourceMappingURL=api-sports.d.ts.map