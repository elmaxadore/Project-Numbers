import { MatchData } from '../data/outcome-data-collector.js';
export interface OutcomeFeatures {
    homeElo: number;
    awayElo: number;
    eloDiff: number;
    homeFormPoints: number;
    awayFormPoints: number;
    homeFormGoalsFor: number;
    homeFormGoalsAgainst: number;
    awayFormGoalsFor: number;
    awayFormGoalsAgainst: number;
    homeGoalsPerGame: number;
    awayGoalsPerGame: number;
    homeGoalsConcededPerGame: number;
    awayGoalsConcededPerGame: number;
    homeShotsPerGame: number;
    awayShotsPerGame: number;
    homeShotsOnTargetPerGame: number;
    awayShotsOnTargetPerGame: number;
    h2hHomeWins: number;
    h2hDraws: number;
    h2hAwayWins: number;
    impliedHomeProb: number;
    impliedDrawProb: number;
    impliedAwayProb: number;
    marketMargin: number;
    isWeekend: boolean;
    daysSinceLastGame: number;
}
export declare class OutcomeFeatureExtractor {
    private teamStats;
    private h2hRecords;
    extractFeatures(match: MatchData, historicalData: MatchData[]): OutcomeFeatures | null;
    private buildTeamStats;
    private updateTeamStats;
    private buildH2HRecords;
    private calculateElo;
    private calculateDaysSinceLastGame;
    getFeatureNames(): string[];
}
//# sourceMappingURL=outcome-feature-extractor.d.ts.map