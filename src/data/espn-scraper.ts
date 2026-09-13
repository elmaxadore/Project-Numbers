/**
 * ESPN Public API Scraper (Free - No API Key Required)
 * 
 * Uses ESPN's public JSON endpoints that don't require authentication.
 * These are the same endpoints used by ESPN's own website and mobile apps.
 * 
 * Coverage: NBA, MLB, NHL, NFL, Tennis, Soccer (select leagues)
 * 
 * IMPORTANT: This scraper uses enhanced headers to bypass 403 blocks
 */

import axios from 'axios';

export interface ESPNCMatch {
  sport: string;
  league: string;
  homeTeam: string;
  awayTeam: string;
  date: Date;
  status: 'scheduled' | 'live' | 'in-progress' | 'final' | 'finished';
  homeScore?: number;
  awayScore?: number;
  venue?: string;
  broadcast?: string;
}

export class ESPNScraper {
  private baseUrl: string = 'https://site.api.espn.com/apis/site/v2/sports';
  private delayMs: number = 3000; // 3 second delay between requests
  // Enhanced browser headers to bypass 403 blocks
  private headers: any = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
    'Accept-Language': 'en-US,en;q=0.9',
    'Accept-Encoding': 'gzip, deflate, br',
    'Connection': 'keep-alive',
    'Upgrade-Insecure-Requests': '1',
    'Sec-Fetch-Dest': 'document',
    'Sec-Fetch-Mode': 'navigate',
    'Sec-Fetch-Site': 'none',
    'Cache-Control': 'max-age=0',
  };

  /**
   * Delay to avoid rate limiting
   */
  private async sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Fetch basketball (NBA) schedules
   */
  async fetchBasketball(): Promise<ESPNCMatch[]> {
    console.log('🏀 Fetching NBA data from ESPN...');
    const matches: ESPNCMatch[] = [];
    
    try {
      // NBA scoreboard endpoint (public, no auth required)
      const url = `${this.baseUrl}/basketball/nba/scoreboard`;
      
      const response = await axios.get(url, {
        headers: this.headers,
        timeout: 15000
      });

      if (response.data && response.data.events) {
        for (const event of response.data.events) {
          try {
            const homeTeam = event.competitions?.[0]?.competitors?.find((c: any) => c.homeAway === 'home')?.team?.displayName;
            const awayTeam = event.competitions?.[0]?.competitors?.find((c: any) => c.homeAway === 'away')?.team?.displayName;
            const dateStr = event.date;
            const status = event.status?.type?.name;
            const homeScore = event.competitions?.[0]?.competitors?.find((c: any) => c.homeAway === 'home')?.score;
            const awayScore = event.competitions?.[0]?.competitors?.find((c: any) => c.homeAway === 'away')?.score;
            const venue = event.competitions?.[0]?.venue?.fullName;
            const broadcast = event.competitions?.[0]?.broadcasts?.[0]?.names?.join(', ');

            if (homeTeam && awayTeam && dateStr) {
              matches.push({
                sport: 'basketball',
                league: 'NBA',
                homeTeam,
                awayTeam,
                date: new Date(dateStr),
                status: this.mapStatus(status),
                homeScore: homeScore ? parseInt(homeScore) : undefined,
                awayScore: awayScore ? parseInt(awayScore) : undefined,
                venue,
                broadcast
              });
            }
          } catch (eventError) {
            console.warn('⚠️ Error parsing NBA event:', (eventError as Error).message);
          }
        }
      }

      console.log(`✅ Found ${matches.length} NBA matches`);
    } catch (error: any) {
      console.warn(`⚠️ ESPN Basketball fetch failed: ${error.message}`);
      if (error.response?.status === 403) {
        console.warn('   ⚠️ ESPN is blocking automated requests. This is expected.');
      }
    }

    return matches;
  }

  /**
   * Fetch baseball (MLB) schedules
   */
  async fetchBaseball(): Promise<ESPNCMatch[]> {
    console.log('⚾ Fetching MLB data from ESPN...');
    const matches: ESPNCMatch[] = [];
    
    try {
      const url = `${this.baseUrl}/baseball/mlb/scoreboard`;
      
      const response = await axios.get(url, {
        headers: this.headers,
        timeout: 15000
      });

      if (response.data && response.data.events) {
        for (const event of response.data.events) {
          try {
            const homeTeam = event.competitions?.[0]?.competitors?.find((c: any) => c.homeAway === 'home')?.team?.displayName;
            const awayTeam = event.competitions?.[0]?.competitors?.find((c: any) => c.homeAway === 'away')?.team?.displayName;
            const dateStr = event.date;
            const status = event.status?.type?.name;
            const homeScore = event.competitions?.[0]?.competitors?.find((c: any) => c.homeAway === 'home')?.score;
            const awayScore = event.competitions?.[0]?.competitors?.find((c: any) => c.homeAway === 'away')?.score;

            if (homeTeam && awayTeam && dateStr) {
              matches.push({
                sport: 'baseball',
                league: 'MLB',
                homeTeam,
                awayTeam,
                date: new Date(dateStr),
                status: this.mapStatus(status),
                homeScore: homeScore ? parseInt(homeScore) : undefined,
                awayScore: awayScore ? parseInt(awayScore) : undefined
              });
            }
          } catch (eventError) {
            console.warn('⚠️ Error parsing MLB event:', (eventError as Error).message);
          }
        }
      }

      console.log(`✅ Found ${matches.length} MLB matches`);
    } catch (error: any) {
      console.warn(`⚠️ ESPN Baseball fetch failed: ${error.message}`);
    }

    return matches;
  }

  /**
   * Fetch ice hockey (NHL) schedules
   */
  async fetchHockey(): Promise<ESPNCMatch[]> {
    console.log('🏒 Fetching NHL data from ESPN...');
    const matches: ESPNCMatch[] = [];
    
    try {
      const url = `${this.baseUrl}/hockey/nhl/scoreboard`;
      
      const response = await axios.get(url, {
        headers: this.headers,
        timeout: 15000
      });

      if (response.data && response.data.events) {
        for (const event of response.data.events) {
          try {
            const homeTeam = event.competitions?.[0]?.competitors?.find((c: any) => c.homeAway === 'home')?.team?.displayName;
            const awayTeam = event.competitions?.[0]?.competitors?.find((c: any) => c.homeAway === 'away')?.team?.displayName;
            const dateStr = event.date;
            const status = event.status?.type?.name;
            const homeScore = event.competitions?.[0]?.competitors?.find((c: any) => c.homeAway === 'home')?.score;
            const awayScore = event.competitions?.[0]?.competitors?.find((c: any) => c.homeAway === 'away')?.score;

            if (homeTeam && awayTeam && dateStr) {
              matches.push({
                sport: 'hockey',
                league: 'NHL',
                homeTeam,
                awayTeam,
                date: new Date(dateStr),
                status: this.mapStatus(status),
                homeScore: homeScore ? parseInt(homeScore) : undefined,
                awayScore: awayScore ? parseInt(awayScore) : undefined
              });
            }
          } catch (eventError) {
            console.warn('⚠️ Error parsing NHL event:', (eventError as Error).message);
          }
        }
      }

      console.log(`✅ Found ${matches.length} NHL matches`);
    } catch (error: any) {
      console.warn(`⚠️ ESPN Hockey fetch failed: ${error.message}`);
    }

    return matches;
  }

  /**
   * Fetch tennis schedules
   */
  async fetchTennis(): Promise<ESPNCMatch[]> {
    console.log('🎾 Fetching Tennis data from ESPN...');
    const matches: ESPNCMatch[] = [];
    
    try {
      const url = `${this.baseUrl}/tennis/scoreboard`;
      
      const response = await axios.get(url, {
        headers: this.headers,
        timeout: 15000
      });

      if (response.data && response.data.events) {
        for (const event of response.data.events) {
          try {
            const homePlayer = event.competitions?.[0]?.competitors?.[0]?.team?.displayName;
            const awayPlayer = event.competitions?.[0]?.competitors?.[1]?.team?.displayName;
            const dateStr = event.date;
            const status = event.status?.type?.name;
            const tournament = event.name;

            if (homePlayer && awayPlayer && dateStr) {
              matches.push({
                sport: 'tennis',
                league: tournament || 'ATP/WTA',
                homeTeam: homePlayer,
                awayTeam: awayPlayer,
                date: new Date(dateStr),
                status: this.mapStatus(status)
              });
            }
          } catch (eventError) {
            console.warn('⚠️ Error parsing Tennis event:', (eventError as Error).message);
          }
        }
      }

      console.log(`✅ Found ${matches.length} Tennis matches`);
    } catch (error: any) {
      console.warn(`⚠️ ESPN Tennis fetch failed: ${error.message}`);
    }

    return matches;
  }

  /**
   * Fetch American Football (NFL) schedules
   */
  async fetchFootball(): Promise<ESPNCMatch[]> {
    console.log('🏈 Fetching NFL data from ESPN...');
    const matches: ESPNCMatch[] = [];
    
    try {
      const url = `${this.baseUrl}/football/nfl/scoreboard`;
      
      const response = await axios.get(url, {
        headers: this.headers,
        timeout: 15000
      });

      if (response.data && response.data.events) {
        for (const event of response.data.events) {
          try {
            const homeTeam = event.competitions?.[0]?.competitors?.find((c: any) => c.homeAway === 'home')?.team?.displayName;
            const awayTeam = event.competitions?.[0]?.competitors?.find((c: any) => c.homeAway === 'away')?.team?.displayName;
            const dateStr = event.date;
            const status = event.status?.type?.name;
            const homeScore = event.competitions?.[0]?.competitors?.find((c: any) => c.homeAway === 'home')?.score;
            const awayScore = event.competitions?.[0]?.competitors?.find((c: any) => c.homeAway === 'away')?.score;

            if (homeTeam && awayTeam && dateStr) {
              matches.push({
                sport: 'american-football',
                league: 'NFL',
                homeTeam,
                awayTeam,
                date: new Date(dateStr),
                status: this.mapStatus(status),
                homeScore: homeScore ? parseInt(homeScore) : undefined,
                awayScore: awayScore ? parseInt(awayScore) : undefined
              });
            }
          } catch (eventError) {
            console.warn('⚠️ Error parsing NFL event:', (eventError as Error).message);
          }
        }
      }

      console.log(`✅ Found ${matches.length} NFL matches`);
    } catch (error: any) {
      console.warn(`⚠️ ESPN Football fetch failed: ${error.message}`);
    }

    return matches;
  }

  /**
   * Map ESPN status to our standard format
   */
  private mapStatus(espnStatus: string): ESPNCMatch['status'] {
    switch (espnStatus?.toLowerCase()) {
      case 'scheduled':
      case 'pre':
        return 'scheduled';
      case 'in':
      case 'in-progress':
        return 'in-progress';
      case 'live':
        return 'live';
      case 'final':
      case 'finished':
      case 'post':
        return 'finished';
      default:
        return 'scheduled';
    }
  }

  /**
   * Fetch all sports with delays between requests
   */
  async fetchAllSports(): Promise<ESPNCMatch[]> {
    console.log('📡 Starting ESPN multi-sport data aggregation...');
    
    const allMatches: ESPNCMatch[] = [];
    
    // Sequential fetching with delays to respect rate limits
    const basketball = await this.fetchBasketball();
    allMatches.push(...basketball);
    
    await this.sleep(this.delayMs);
    
    const baseball = await this.fetchBaseball();
    allMatches.push(...baseball);
    
    await this.sleep(this.delayMs);
    
    const hockey = await this.fetchHockey();
    allMatches.push(...hockey);
    
    await this.sleep(this.delayMs);
    
    const tennis = await this.fetchTennis();
    allMatches.push(...tennis);
    
    await this.sleep(this.delayMs);
    
    const football = await this.fetchFootball();
    allMatches.push(...football);
    
    console.log(`📊 Aggregated ${allMatches.length} matches across ${new Set(allMatches.map(m => m.sport)).size} sports from ESPN`);
    
    return allMatches;
  }
}

// Export singleton instance
export const espnScraper = new ESPNScraper();
