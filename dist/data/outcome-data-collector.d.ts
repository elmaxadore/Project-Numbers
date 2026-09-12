export interface MatchData {
    date: Date;
    homeTeam: string;
    awayTeam: string;
    homeGoals?: number;
    awayGoals?: number;
    result?: 'H' | 'D' | 'A';
    league: string;
    season: string;
    homeShots?: number;
    awayShots?: number;
    homeShotsOnTarget?: number;
    awayShotsOnTarget?: number;
    homeCorners?: number;
    awayCorners?: number;
    homeFouls?: number;
    awayFouls?: number;
    homeYellowCards?: number;
    awayYellowCards?: number;
    homeRedCards?: number;
    awayRedCards?: number;
    homeWinOdds?: number;
    drawOdds?: number;
    awayWinOdds?: number;
    over25Odds?: number;
    under25Odds?: number;
    bttsYesOdds?: number;
    bttsNoOdds?: number;
}
export declare class RealDataCollector {
    private cacheDir;
    constructor();
    collectAllData(): Promise<MatchData[]>;
    private fetchLeagueSeason;
    private parseCSV;
    private parseCSVLine;
    private parseDate;
    private parseOdds;
    private sleep;
    get_cached_data(): MatchData[];
}
//# sourceMappingURL=outcome-data-collector.d.ts.map