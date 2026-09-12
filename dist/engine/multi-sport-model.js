export class MultiSportFeatureExtractor {
    /**
     * Extract features from a match for ML model
     */
    extractFeatures(match) {
        const homeForm = match.homeTeamForm || 0.5;
        const awayForm = match.awayTeamForm || 0.5;
        const homeRank = match.homeTeamRank || 10;
        const awayRank = match.awayTeamRank || 10;
        const baseFeatures = {
            homeTeamForm: homeForm,
            awayTeamForm: awayForm,
            homeTeamRank: homeRank,
            awayTeamRank: awayRank,
            rankDiff: (awayRank - homeRank) / 30, // Normalize
            formDiff: homeForm - awayForm,
            homeAdvantage: 0.1 // Home advantage factor
        };
        // Sport-specific feature extraction
        if (match.sport === 'football' && match.football) {
            return {
                ...baseFeatures,
                football_homeXGLast5: match.football.homeXGLast5 || 0,
                football_awayXGLast5: match.football.awayXGLast5 || 0,
                football_homeGoalsLast5: match.football.homeGoalsLast5 || 0,
                football_awayGoalsLast5: match.football.awayGoalsLast5 || 0,
                football_homeCleanSheets: match.football.homeCleanSheets || 0,
                football_awayCleanSheets: match.football.awayCleanSheets || 0,
                football_homeBTTSRate: match.football.homeBTTSRate || 0.5,
                football_awayBTTSRate: match.football.awayBTTSRate || 0.5,
                football_combinedXG: (match.football.homeXGLast5 || 1.5) + (match.football.awayXGLast5 || 1.3),
                football_xgDiff: (match.football.homeXGLast5 || 1.5) - (match.football.awayXGLast5 || 1.3)
            };
        }
        if (match.sport === 'basketball' && match.basketball) {
            const homePPG = match.basketball.homePPGLast5 || 110;
            const awayPPG = match.basketball.awayPPGLast5 || 108;
            const homeOPPG = match.basketball.homeOPPGlast5 || 108;
            const awayOPPG = match.basketball.awayOPPGlast5 || 110;
            return {
                ...baseFeatures,
                basketball_homePPGLast5: homePPG,
                basketball_awayPPGLast5: awayPPG,
                basketball_homeOPPGlast5: homeOPPG,
                basketball_awayOPPGlast5: awayOPPG,
                basketball_homeReboundsLast5: match.basketball.homeReboundsLast5 || 45,
                basketball_awayReboundsLast5: match.basketball.awayReboundsLast5 || 45,
                basketball_homeAssistsLast5: match.basketball.homeAssistsLast5 || 25,
                basketball_awayAssistsLast5: match.basketball.awayAssistsLast5 || 25,
                basketball_homeThreePointPct: match.basketball.homeThreePointPct || 0.36,
                basketball_awayThreePointPct: match.basketball.awayThreePointPct || 0.36,
                basketball_ppgDiff: homePPG - awayPPG,
                basketball_oppgDiff: awayOPPG - homeOPPG, // Lower is better for defense
                basketball_totalExpectation: (homePPG + awayOPPG + awayPPG + homeOPPG) / 2
            };
        }
        if (match.sport === 'tennis' && match.tennis) {
            const surface = match.tennis.surface;
            return {
                ...baseFeatures,
                tennis_player1Rank: match.tennis.player1Rank || 50,
                tennis_player2Rank: match.tennis.player2Rank || 50,
                tennis_rankDiff: (match.tennis.player2Rank || 50) - (match.tennis.player1Rank || 50),
                tennis_player1FirstServePct: match.tennis.player1FirstServePct || 65,
                tennis_player2FirstServePct: match.tennis.player2FirstServePct || 65,
                tennis_serveDiff: (match.tennis.player1FirstServePct || 65) - (match.tennis.player2FirstServePct || 65),
                tennis_surfaceClay: surface === 'clay' ? 1 : 0,
                tennis_surfaceGrass: surface === 'grass' ? 1 : 0,
                tennis_surfaceHard: surface === 'hard' ? 1 : 0,
                tennis_surfaceCarpet: surface === 'carpet' ? 1 : 0
            };
        }
        if (match.sport === 'baseball' && match.baseball) {
            return {
                ...baseFeatures,
                baseball_homeERA: match.baseball.homeERA || 4.0,
                baseball_awayERA: match.baseball.awayERA || 4.0,
                baseball_eraDiff: (match.baseball.awayERA || 4.0) - (match.baseball.homeERA || 4.0), // Lower ERA is better
                baseball_homeBattingAvg: match.baseball.homeBattingAvg || 0.260,
                baseball_awayBattingAvg: match.baseball.awayBattingAvg || 0.260,
                baseball_battingDiff: (match.baseball.homeBattingAvg || 0.260) - (match.baseball.awayBattingAvg || 0.260),
                baseball_pitcherERA: match.baseball.pitcherERA || 3.5,
                baseball_homeHomeRuns: match.baseball.homeHomeRuns || 150,
                baseball_awayHomeRuns: match.baseball.awayHomeRuns || 150
            };
        }
        if (match.sport === 'hockey' && match.hockey) {
            return {
                ...baseFeatures,
                hockey_homeGoalsForLast5: match.hockey.homeGoalsForLast5 || 15,
                hockey_awayGoalsForLast5: match.hockey.awayGoalsForLast5 || 15,
                hockey_homeGoalsAgainstLast5: match.hockey.homeGoalsAgainstLast5 || 12,
                hockey_awayGoalsAgainstLast5: match.hockey.awayGoalsAgainstLast5 || 12,
                hockey_goalDiff: (match.hockey.homeGoalsForLast5 || 15) - (match.hockey.awayGoalsForLast5 || 15),
                hockey_homeSavePct: match.hockey.homeSavePct || 0.91,
                hockey_awaySavePct: match.hockey.awaySavePct || 0.91,
                hockey_savePctDiff: (match.hockey.homeSavePct || 0.91) - (match.hockey.awaySavePct || 0.91),
                hockey_homePowerPlayPct: match.hockey.homePowerPlayPct || 0.20,
                hockey_awayPowerPlayPct: match.hockey.awayPowerPlayPct || 0.20
            };
        }
        return baseFeatures;
    }
    /**
     * Convert features to array for ML model
     */
    featuresToArray(features, sport) {
        const universal = [
            features.homeTeamForm,
            features.awayTeamForm,
            features.rankDiff,
            features.formDiff,
            features.homeAdvantage
        ];
        switch (sport) {
            case 'football':
                return [
                    ...universal,
                    features.football_homeXGLast5 || 0,
                    features.football_awayXGLast5 || 0,
                    features.football_combinedXG || 0,
                    features.football_xgDiff || 0,
                    features.football_homeBTTSRate || 0,
                    features.football_awayBTTSRate || 0,
                    features.football_homeCleanSheets || 0,
                    features.football_awayCleanSheets || 0
                ];
            case 'basketball':
                return [
                    ...universal,
                    features.basketball_homePPGLast5 || 0,
                    features.basketball_awayPPGLast5 || 0,
                    features.basketball_ppgDiff || 0,
                    features.basketball_oppgDiff || 0,
                    features.basketball_totalExpectation || 0,
                    features.basketball_homeReboundsLast5 || 0,
                    features.basketball_awayReboundsLast5 || 0,
                    features.basketball_homeThreePointPct || 0
                ];
            case 'tennis':
                return [
                    ...universal,
                    features.tennis_rankDiff || 0,
                    features.tennis_serveDiff || 0,
                    features.tennis_surfaceClay || 0,
                    features.tennis_surfaceGrass || 0,
                    features.tennis_surfaceHard || 0,
                    features.tennis_surfaceCarpet || 0
                ];
            case 'baseball':
                return [
                    ...universal,
                    features.baseball_eraDiff || 0,
                    features.baseball_battingDiff || 0,
                    features.baseball_pitcherERA || 0,
                    features.baseball_homeHomeRuns || 0,
                    features.baseball_awayHomeRuns || 0
                ];
            case 'hockey':
                return [
                    ...universal,
                    features.hockey_goalDiff || 0,
                    features.hockey_savePctDiff || 0,
                    features.hockey_homeGoalsForLast5 || 0,
                    features.hockey_awayGoalsForLast5 || 0,
                    features.hockey_homePowerPlayPct || 0,
                    features.hockey_awayPowerPlayPct || 0
                ];
            default:
                return universal;
        }
    }
}
export class MultiSportLabelGenerator {
    /**
     * Generate training labels from match results
     */
    generateLabels(match) {
        const targets = [];
        const homeScore = match.homeScore ?? 0;
        const awayScore = match.awayScore ?? 0;
        if (match.status !== 'finished') {
            return targets;
        }
        // Moneyline (home win)
        if (match.sport !== 'tennis') { // Tennis doesn't have draws typically
            const homeWin = homeScore > awayScore ? 1 : 0;
            targets.push({
                sport: match.sport,
                market: 'moneyline',
                label: homeWin
            });
        }
        else {
            // For tennis, homeTeam is player1
            const player1Win = homeScore > awayScore ? 1 : 0;
            targets.push({
                sport: match.sport,
                market: 'moneyline',
                label: player1Win
            });
        }
        // Sport-specific markets
        if (match.sport === 'football') {
            // Over 2.5 goals
            const totalGoals = homeScore + awayScore;
            targets.push({
                sport: 'football',
                market: 'over_under_2.5',
                label: totalGoals > 2.5 ? 1 : 0
            });
            // Both teams to score
            const btts = (homeScore > 0 && awayScore > 0) ? 1 : 0;
            targets.push({
                sport: 'football',
                market: 'btts',
                label: btts
            });
        }
        if (match.sport === 'basketball') {
            // Over/Under total points (default 220.5)
            const totalPoints = homeScore + awayScore;
            targets.push({
                sport: 'basketball',
                market: 'over_under_220.5',
                label: totalPoints > 220.5 ? 1 : 0
            });
            // Home team covers spread (default -5.5)
            const spread = homeScore - awayScore;
            targets.push({
                sport: 'basketball',
                market: 'spread_-5.5',
                label: spread > -5.5 ? 1 : 0
            });
        }
        if (match.sport === 'tennis') {
            // Total sets over 2.5
            const totalSets = homeScore + awayScore;
            targets.push({
                sport: 'tennis',
                market: 'over_under_2.5_sets',
                label: totalSets > 2.5 ? 1 : 0
            });
        }
        if (match.sport === 'baseball') {
            // Over/Under 8.5 runs
            const totalRuns = homeScore + awayScore;
            targets.push({
                sport: 'baseball',
                market: 'over_under_8.5',
                label: totalRuns > 8.5 ? 1 : 0
            });
        }
        if (match.sport === 'hockey') {
            // Over/Under 5.5 goals
            const totalGoals = homeScore + awayScore;
            targets.push({
                sport: 'hockey',
                market: 'over_under_5.5',
                label: totalGoals > 5.5 ? 1 : 0
            });
        }
        return targets;
    }
}
export const featureExtractor = new MultiSportFeatureExtractor();
export const labelGenerator = new MultiSportLabelGenerator();
//# sourceMappingURL=multi-sport-model.js.map