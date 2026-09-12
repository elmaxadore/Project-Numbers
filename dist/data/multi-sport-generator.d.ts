import { MatchData } from './sports-scraper.js';
/**
 * Multi-Sport Data Generator
 * Generates realistic historical data for multiple sports for ML training
 */
export interface MultiSportMatch extends MatchData {
    homeTeamForm?: number;
    awayTeamForm?: number;
    homeTeamRank?: number;
    awayTeamRank?: number;
    headToHeadHomeWins?: number;
    headToHeadAwayWins?: number;
    headToHeadDraws?: number;
    football?: {
        homeXGLast5?: number;
        awayXGLast5?: number;
        homeGoalsLast5?: number;
        awayGoalsLast5?: number;
        homeCleanSheets?: number;
        awayCleanSheets?: number;
        homeBTTSRate?: number;
        awayBTTSRate?: number;
    };
    basketball?: {
        homePPGLast5?: number;
        awayPPGLast5?: number;
        homeOPPGlast5?: number;
        awayOPPGlast5?: number;
        homeReboundsLast5?: number;
        awayReboundsLast5?: number;
        homeAssistsLast5?: number;
        awayAssistsLast5?: number;
        homeThreePointPct?: number;
        awayThreePointPct?: number;
    };
    tennis?: {
        player1Rank?: number;
        player2Rank?: number;
        player1Aces?: number;
        player2Aces?: number;
        player1DoubleFaults?: number;
        player2DoubleFaults?: number;
        player1FirstServePct?: number;
        player2FirstServePct?: number;
        surface: 'clay' | 'grass' | 'hard' | 'carpet';
    };
    baseball?: {
        homeERA?: number;
        awayERA?: number;
        homeBattingAvg?: number;
        awayBattingAvg?: number;
        homeHomeRuns?: number;
        awayHomeRuns?: number;
        pitcherERA?: number;
        pitcherWHIP?: number;
    };
    hockey?: {
        homeGoalsForLast5?: number;
        awayGoalsForLast5?: number;
        homeGoalsAgainstLast5?: number;
        awayGoalsAgainstLast5?: number;
        homeSavePct?: number;
        awaySavePct?: number;
        homePowerPlayPct?: number;
        awayPowerPlayPct?: number;
    };
}
export declare class MultiSportDataGenerator {
    private sports;
    constructor();
    /**
     * Generate comprehensive historical dataset for all sports
     */
    generateHistoricalData(seasons?: number, matchesPerSeason?: number): Promise<MultiSportMatch[]>;
    /**
     * Generate sport-specific synthetic data with realistic statistics
     */
    private generateSportSpecificData;
    private generateFootballData;
    private generateBasketballData;
    private generateTennisData;
    private generateBaseballData;
    private generateHockeyData;
    /**
     * Convert real API data to MultiSportMatch format
     */
    private convertRealToMultiSport;
}
export declare const multiSportGenerator: MultiSportDataGenerator;
//# sourceMappingURL=multi-sport-generator.d.ts.map