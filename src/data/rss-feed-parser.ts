/**
 * RSS Feed Parser for BBC Sport, Sky Sports, ESPN
 * Extracts fixture schedules from public RSS feeds
 */

import * as fs from 'fs';
import * as path from 'path';
import { parseStringPromise } from 'xml2js';

const CACHE_DIR = path.join(process.cwd(), 'src/data/rss-feeds');

// RSS Feed URLs (no API keys required)
const RSS_FEEDS: Record<string, string> = {
  'BBC_FOOTBALL': 'http://feeds.bbci.co.uk/sport/football/rss.xml',
  'BBC_PREMIER_LEAGUE': 'http://feeds.bbci.co.uk/sport/football/premier_league/rss.xml',
  'BBC_CHAMPIONS_LEAGUE': 'http://feeds.bbci.co.uk/sport/football/champions_league/rss.xml',
  'SKY_SPORTS_FOOTBALL': 'https://www.skysports.com/rss/1',
  'ESPN_SOCCER': 'http://www.espn.com/espn/rss/soccer/news',
  'ESPN_NBA': 'http://www.espn.com/espn/rss/nba/news',
  'ESPN_TENNIS': 'http://www.espn.com/espn/rss/tennis/news',
};

interface RSSMatch {
  title: string;
  link: string;
  pubDate?: string;
  description?: string;
  sport: string;
}

export async function fetchAllRSSFeeds(): Promise<RSSMatch[]> {
  const matches: RSSMatch[] = [];
  
  if (!fs.existsSync(CACHE_DIR)) {
    fs.mkdirSync(CACHE_DIR, { recursive: true });
  }

  const fetch = (await import('node-fetch')).default;
  
  for (const [feedName, url] of Object.entries(RSS_FEEDS)) {
    try {
      console.log(`📡 Fetching ${feedName}...`);
      const response = await fetch(url);
      
      if (!response.ok) {
        console.warn(`   ⚠️ Failed to fetch ${feedName}: ${response.status}`);
        continue;
      }
      
      const xmlContent = await response.text();
      const cacheFile = path.join(CACHE_DIR, `${feedName.toLowerCase()}.xml`);
      fs.writeFileSync(cacheFile, xmlContent);
      
      // Parse XML
      const result = await parseStringPromise(xmlContent);
      const items = result.rss?.channel?.[0]?.item || result.feed?.entry || [];
      
      for (const item of items) {
        const title = item.title?.[0] || item.title || 'Unknown';
        const link = item.link?.[0]?.$?.href || item.link?.[0] || item.link || '';
        const pubDate = item.pubDate?.[0] || item.published?.[0] || undefined;
        const description = item.description?.[0] || item.summary?.[0] || undefined;
        
        // Simple heuristic to detect match fixtures in titles
        if (title.includes('vs') || title.includes('-') || title.match(/\d+\s*-\s*\d+/)) {
          matches.push({
            title,
            link,
            pubDate,
            description,
            sport: feedName.split('_')[1]?.toLowerCase() || 'football'
          });
        }
      }
      
      console.log(`   ✅ ${feedName}: ${items.length} items parsed`);
      
    } catch (error: any) {
      console.warn(`   ❌ Error fetching ${feedName}: ${error.message}`);
    }
  }
  
  console.log(`✅ RSS feed parsing complete: ${matches.length} potential matches found`);
  return matches;
}

export function readCachedRSSFeeds(): RSSMatch[] {
  const matches: RSSMatch[] = [];
  
  if (!fs.existsSync(CACHE_DIR)) {
    return matches;
  }

  const files = fs.readdirSync(CACHE_DIR).filter(f => f.endsWith('.xml'));
  
  for (const file of files) {
    const filePath = path.join(CACHE_DIR, file);
    const sport = file.replace('.xml', '');
    
    try {
      const xmlContent = fs.readFileSync(filePath, 'utf-8');
      const parsed = JSON.parse(JSON.stringify(require('xml2js').parseString(xmlContent)));
      // Simplified - full implementation would properly parse XML
    } catch (error: any) {
      console.warn(`⚠️ Error reading ${file}: ${error.message}`);
    }
  }
  
  return matches;
}

// CLI execution
const isMainModule = import.meta.url === `file://${process.argv[1]}`;
if (isMainModule) {
  fetchAllRSSFeeds().then(matches => {
    console.log('\n📊 Sample matches from RSS:');
    matches.slice(0, 5).forEach(m => {
      console.log(`   [${m.sport}] ${m.title}`);
    });
  });
}
