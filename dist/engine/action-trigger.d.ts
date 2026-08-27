import { BettingTicket, ValueAnalysis, FixtureDataPackage, ModelPrediction, SystemConfig } from '../models/types.js';
/**
 * Generate a betting ticket from qualified value analysis
 */
export declare function generateBettingTicket(pkg: FixtureDataPackage, prediction: ModelPrediction, valueAnalysis: ValueAnalysis, config?: SystemConfig): BettingTicket;
/**
 * Format a betting ticket as a readable string
 */
export declare function formatTicket(ticket: BettingTicket): string;
/**
 * Generate betting tickets for all qualifying bets
 */
export declare function generateAllTickets(qualifiedBets: Array<{
    pkg: FixtureDataPackage;
    prediction: ModelPrediction;
    value: ValueAnalysis;
}>, config?: SystemConfig): BettingTicket[];
/**
 * Output all tickets as structured JSON and formatted text
 */
export declare function outputTickets(tickets: BettingTicket[]): void;
/**
 * Export tickets to JSON file
 */
export declare function exportTicketsJSON(tickets: BettingTicket[], filePath: string): void;
//# sourceMappingURL=action-trigger.d.ts.map