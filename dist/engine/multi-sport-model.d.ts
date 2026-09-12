import { MultiSportMatch } from '../data/multi-sport-generator.js';
/**
 * Feature extraction for multi-sport prediction models
 */
export interface SportFeatures {
    homeTeamForm: number;
    awayTeamForm: number;
    homeTeamRank: number;
    awayTeamRank: number;
    rankDiff: number;
    formDiff: number;
    homeAdvantage: number;
    football_homeXGLast5?: number;
    football_awayXGLast5?: number;
    football_homeGoalsLast5?: number;
    football_awayGoalsLast5?: number;
    football_homeCleanSheets?: number;
    football_awayCleanSheets?: number;
    football_homeBTTSRate?: number;
    football_awayBTTSRate?: number;
    football_combinedXG?: number;
    football_xgDiff?: number;
    basketball_homePPGLast5?: number;
    basketball_awayPPGLast5?: number;
    basketball_homeOPPGlast5?: number;
    basketball_awayOPPGlast5?: number;
    basketball_homeReboundsLast5?: number;
    basketball_awayReboundsLast5?: number;
    basketball_homeAssistsLast5?: number;
    basketball_awayAssistsLast5?: number;
    basketball_homeThreePointPct?: number;
    basketball_awayThreePointPct?: number;
    basketball_ppgDiff?: number;
    basketball_oppgDiff?: number;
    basketball_totalExpectation?: number;
    tennis_player1Rank?: number;
    tennis_player2Rank?: number;
    tennis_rankDiff?: number;
    tennis_player1FirstServePct?: number;
    tennis_player2FirstServePct?: number;
    tennis_serveDiff?: number;
    tennis_surfaceClay?: number;
    tennis_surfaceGrass?: number;
    tennis_surfaceHard?: number;
    tennis_surfaceCarpet?: number;
    baseball_homeERA?: number;
    baseball_awayERA?: number;
    baseball_eraDiff?: number;
    baseball_homeBattingAvg?: number;
    baseball_awayBattingAvg?: number;
    baseball_battingDiff?: number;
    baseball_pitcherERA?: number;
    baseball_homeHomeRuns?: number;
    baseball_awayHomeRuns?: number;
    hockey_homeGoalsForLast5?: number;
    hockey_awayGoalsForLast5?: number;
    hockey_homeGoalsAgainstLast5?: number;
    hockey_awayGoalsAgainstLast5?: number;
    hockey_goalDiff?: number;
    hockey_homeSavePct?: number;
    hockey_awaySavePct?: number;
    hockey_savePctDiff?: number;
    hockey_homePowerPlayPct?: number;
    hockey_awayPowerPlayPct?: number;
}
export declare class MultiSportFeatureExtractor {
    /**
     * Extract features from a match for ML model
     */
    extractFeatures(match: MultiSportMatch): SportFeatures;
    /**
     * Convert features to array for ML model
     */
    featuresToArray(features: SportFeatures, sport: string): number[];
}
/**
 * Multi-sport prediction targets
 */
export interface PredictionTargets {
    sport: string;
    market: string;
    label: number;
    probability?: number;
}
export declare class MultiSportLabelGenerator {
    /**
     * Generate training labels from match results
     */
    generateLabels(match: MultiSportMatch): PredictionTargets[];
}
export declare const featureExtractor: MultiSportFeatureExtractor;
export declare const labelGenerator: MultiSportLabelGenerator;
//# sourceMappingURL=multi-sport-model.d.ts.map