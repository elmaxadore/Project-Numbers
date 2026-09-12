/**
 * The Odds API Fixtures & Odds Fetcher
 * 
 * Uses The Odds API (https://the-odds-api.com) to fetch:
 * - REAL upcoming fixtures for today
 * - REAL bookmaker odds (1xBet, Bet365, etc.)
 * 
 * Free Tier: 500 calls/month (~16 calls/day)
 * Perfect for daily prediction bots!
 */

import fetch from 'node-fetch';
import { CONFIG } from '../config.js';
import { logger } from '../utils/logger.js';

export interface OddsApiFixture {
  fixtureId: number;
  date: string;
  timestamp: number;
  league: {
    id: number;
    name: string;
    country: string;
  };
  homeTeam: {
    id: number;
    name: string;
  };
  awayTeam: {
    id: number;
    name: string;
  };
  venue: {
    name: string;
    city: string;
  };
  status: 'NS' | '1H' | 'HT' | '2H' | 'FT' | 'POSTP' | 'CANC';
  odds?: {
    homeWin: number;
    draw: number;
    awayWin: number;
    over25: number;
    under25: number;
    bttsYes: number;
    bttsNo: number;
  };
}

interface OddsApiResponse {
  id: string;
  sport_key: string;
  sport_title: string;
  commence_time: string;
  home_team: string;
  away_team: string;
  bookmakers: Array<{
    key: string;
    title: string;
    markets: Array<{
      key: string;
      outcomes: Array<{
        name: string;
        price: number;
        point?: number;
      }>;
    }>;
  }>;
}

export class TheOddsApiFetcher {
  private apiKey: string;
  private requestCount: number = 0;
  private readonly MONTHLY_LIMIT = 500;

  constructor() {
    // Support both THE_ODDS_API and ODDS_API_KEY
    this.apiKey = CONFIG.oddsApiKey || '';
  }

  /**
   * Get today's date in YYYY-MM-DD format
   */
  private getTodayDate(): string {
    return new Date().toISOString().split('T')[0];
  }

  /**
   * Fetch fixtures with odds from The Odds API
   * Supports multiple soccer leagues
   */
  async fetchFixturesWithOdds(): Promise<OddsApiFixture[]> {
    if (!this.apiKey) {
      logger.warn('⚠️ THE_ODDS_API not configured. Falling back to simulated fixtures.');
      return [];
    }

    // Soccer leagues available on The Odds API (free tier)
    const leagues = [
      { key: 'soccer_epl', name: 'Premier League', country: 'England', id: 39 },
      { key: 'soccer_germany_bundesliga', name: 'Bundesliga', country: 'Germany', id: 78 },
      { key: 'soccer_italy_serie_a', name: 'Serie A', country: 'Italy', id: 135 },
      { key: 'soccer_spain_la_liga', name: 'La Liga', country: 'Spain', id: 140 },
      { key: 'soccer_france_ligue_one', name: 'Ligue 1', country: 'France', id: 61 },
      { key: 'soccer_uefa_champs_league', name: 'UEFA Champions League', country: 'Europe', id: 2 },
      { key: 'soccer_uefa_europa_league', name: 'UEFA Europa League', country: 'Europe', id: 3 },
      { key: 'soccer_netherlands_eredivisie', name: 'Eredivisie', country: 'Netherlands', id: 88 },
      { key: 'soccer_portugal_primeira_liga', name: 'Primeira Liga', country: 'Portugal', id: 94 },
    ];

    const allFixtures: OddsApiFixture[] = [];

    for (const league of leagues) {
      if (this.requestCount >= this.MONTHLY_LIMIT) {
        logger.warn(`🚫 Monthly API limit reached (${this.MONTHLY_LIMIT} calls). Stopping.`);
        break;
      }

      try {
        // Fetch fixtures with odds for this league
        // Markets: h2h (1X2), totals (Over/Under), btts (Both Teams to Score)
        const url = `https://api.the-odds-api.com/v4/sports/${league.key}/odds?apiKey=${this.apiKey}&regions=eu&markets=h2h,totals,btts&oddsFormat=decimal`;
        
        logger.info(`📡 Fetching ${league.name} fixtures from The Odds API... (${this.requestCount + 1}/${this.MONTHLY_LIMIT})`);
        
        const response = await fetch(url);
        this.requestCount++;

        if (!response.ok) {
          if (response.status === 429) {
            logger.error('❌ Rate limit exceeded. The Odds API returns 429.');
            break;
          }
          logger.warn(`⚠️ ${league.name} API error: ${response.status} ${response.statusText}`);
          continue;
        }

        const data = await response.json() as OddsApiResponse[];
        
        if (!data || data.length === 0) {
          logger.info(`ℹ️ No fixtures found for ${league.name} today.`);
          continue;
        }

        logger.info(`✓ Found ${data.length} fixtures in ${league.name}`);

        // Parse fixtures
        for (const event of data) {
          // Filter only today's fixtures
          const eventDate = event.commence_time.split('T')[0];
          const today = this.getTodayDate();
          
          if (eventDate !== today) {
            continue; // Skip non-today fixtures
          }

          // Extract odds from bookmakers (average across all bookmakers)
          const odds = this.extractAverageOdds(event.bookmakers);

          // Generate a unique fixture ID
          const fixtureId = this.generateFixtureId(event.id, league.id);

          allFixtures.push({
            fixtureId,
            date: event.commence_time,
            timestamp: new Date(event.commence_time).getTime() / 1000,
            league: {
              id: league.id,
              name: league.name,
              country: league.country,
            },
            homeTeam: {
              id: this.hashTeamId(event.home_team, league.id),
              name: event.home_team,
            },
            awayTeam: {
              id: this.hashTeamId(event.away_team, league.id),
              name: event.away_team,
            },
            venue: {
              name: `${event.home_team} Home`,
              city: league.country,
            },
            status: 'NS', // Not Started
            odds,
          });
        }

        // Add small delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 300));

      } catch (error) {
        logger.error(`Failed to fetch ${league.name}: ${(error as Error).message}`);
      }
    }

    logger.info(`✅ Total fixtures fetched from The Odds API: ${allFixtures.length}`);
    return allFixtures;
  }

  /**
   * Extract and average odds from multiple bookmakers
   */
  private extractAverageOdds(bookmakers: OddsApiResponse['bookmakers']): OddsApiFixture['odds'] {
    if (!bookmakers || bookmakers.length === 0) {
      return undefined;
    }

    let homeWinSum = 0, drawSum = 0, awayWinSum = 0;
    let over25Sum = 0, under25Sum = 0, bttsYesSum = 0, bttsNoSum = 0;
    let homeCount = 0, drawCount = 0, awayCount = 0;
    let overCount = 0, underCount = 0, bttsYesCount = 0, bttsNoCount = 0;

    for (const bookmaker of bookmakers) {
      for (const market of bookmaker.markets) {
        const marketKey = market.key.toLowerCase();

        if (marketKey === 'h2h') {
          // 1X2 Market
          for (const outcome of market.outcomes) {
            const name = outcome.name.toLowerCase();
            const price = outcome.price;

            if (name === 'draw') {
              drawSum += price;
              drawCount++;
            } else {
              // Assume home/away based on position (first is usually home, second is away)
              // But we need to match team names - simplified approach
              if (homeCount === 0) {
                homeWinSum += price;
                homeCount++;
              } else {
                awayWinSum += price;
                awayCount++;
              }
            }
          }
        }

        if (marketKey === 'totals') {
          // Over/Under Market
          for (const outcome of market.outcomes) {
            const price = outcome.price;
            const point = outcome.point;

            if (point === 2.5) {
              if (outcome.name.toLowerCase() === 'over') {
                over25Sum += price;
                overCount++;
              } else if (outcome.name.toLowerCase() === 'under') {
                under25Sum += price;
                underCount++;
              }
            }
          }
        }

        if (marketKey === 'btts') {
          // Both Teams to Score Market
          for (const outcome of market.outcomes) {
            const price = outcome.price;
            const name = outcome.name.toLowerCase();

            if (name === 'yes') {
              bttsYesSum += price;
              bttsYesCount++;
            } else if (name === 'no') {
              bttsNoSum += price;
              bttsNoCount++;
            }
          }
        }
      }
    }

    // Return averaged odds
    return {
      homeWin: homeCount > 0 ? homeWinSum / homeCount : undefined,
      draw: drawCount > 0 ? drawSum / drawCount : undefined,
      awayWin: awayCount > 0 ? awayWinSum / awayCount : undefined,
      over25: overCount > 0 ? over25Sum / overCount : undefined,
      under25: underCount > 0 ? under25Sum / underCount : undefined,
      bttsYes: bttsYesCount > 0 ? bttsYesSum / bttsYesCount : undefined,
      bttsNo: bttsNoCount > 0 ? bttsNoSum / bttsNoCount : undefined,
    };
  }

  /**
   * Generate a numeric fixture ID from string ID
   */
  private generateFixtureId(apiId: string, leagueId: number): number {
    // Create a numeric ID from the API string ID
    const hash = apiId.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    return (leagueId * 1000000) + (hash % 1000000);
  }

  /**
   * Generate a numeric team ID from team name
   */
  private hashTeamId(teamName: string, leagueId: number): number {
    const hash = teamName.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    return (leagueId * 1000) + (hash % 1000);
  }

  /**
   * Get API request count for monitoring
   */
  getRequestCount(): number {
    return this.requestCount;
  }
}
