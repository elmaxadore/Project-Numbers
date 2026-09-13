/**
 * Local SQLite Cache for Fast Fixture Access
 * Stores all fixtures from CSV, RSS, and scraping sources
 * Bot reads from this cache instead of hitting external APIs
 */

import * as fs from 'fs';
import * as path from 'path';

const CACHE_FILE = path.join(process.cwd(), 'data-cache/fixtures-cache.json');

interface CachedFixture {
  id: string;
  date: string;
  time?: string;
  homeTeam: string;
  awayTeam: string;
  league: string;
  sport: string;
  source: 'csv' | 'rss' | 'api' | 'scraper';
  raw?: any;
}

export function initializeCache(): void {
  const dir = path.dirname(CACHE_FILE);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  
  if (!fs.existsSync(CACHE_FILE)) {
    fs.writeFileSync(CACHE_FILE, JSON.stringify([], null, 2));
  }
}

export function loadCache(): CachedFixture[] {
  if (!fs.existsSync(CACHE_FILE)) {
    initializeCache();
    return [];
  }
  
  try {
    const content = fs.readFileSync(CACHE_FILE, 'utf-8');
    return JSON.parse(content) as CachedFixture[];
  } catch (error: any) {
    console.warn('⚠️ Error loading cache, initializing fresh:', error.message);
    initializeCache();
    return [];
  }
}

export function saveCache(fixtures: CachedFixture[]): void {
  initializeCache();
  fs.writeFileSync(CACHE_FILE, JSON.stringify(fixtures, null, 2));
  console.log(`✅ Cache saved: ${fixtures.length} fixtures`);
}

export function addFixtures(newFixtures: CachedFixture[]): void {
  const existing = loadCache();
  const existingIds = new Set(existing.map(f => f.id));
  
  let added = 0;
  for (const fixture of newFixtures) {
    if (!existingIds.has(fixture.id)) {
      existing.push(fixture);
      added++;
    }
  }
  
  saveCache(existing);
  console.log(`➕ Added ${added} new fixtures to cache`);
}

export function getFixturesForDate(date: string): CachedFixture[] {
  const all = loadCache();
  return all.filter(f => f.date === date);
}

export function getUpcomingFixtures(daysAhead: number = 7): CachedFixture[] {
  const all = loadCache();
  const today = new Date();
  const future = new Date(today);
  future.setDate(today.getDate() + daysAhead);
  
  return all.filter(f => {
    const fixtureDate = new Date(f.date);
    return fixtureDate >= today && fixtureDate <= future;
  }).sort((a, b) => a.date.localeCompare(b.date));
}

export function clearOldCache(daysToKeep: number = 3): void {
  const all = loadCache();
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - daysToKeep);
  
  const filtered = all.filter(f => {
    const fixtureDate = new Date(f.date);
    return fixtureDate >= cutoff;
  });
  
  saveCache(filtered);
  console.log(`🧹 Cleared old cache: ${all.length - filtered.length} fixtures removed`);
}

// CLI execution
const isMainModule = import.meta.url === `file://${process.argv[1]}`;
if (isMainModule) {
  initializeCache();
  console.log('📊 Cache initialized');
  console.log(`   File: ${CACHE_FILE}`);
  console.log(`   Current fixtures: ${loadCache().length}`);
}
