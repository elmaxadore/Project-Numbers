#!/usr/bin/env node
/**
 * Daily Data Aggregator Cron Script
 * 
 * Runs once per day to:
 * 1. Download CSV files from Football-Data.co.uk
 * 2. Fetch RSS feeds from BBC, Sky Sports, ESPN
 * 3. Fetch live data from TheSportsDB API
 * 4. Save everything to local JSON cache
 * 
 * Bot then reads from cache instead of hitting external sources
 */

import * as path from 'path';
import * as fs from 'fs';

async function runDailyAggregation() {
  console.log('🚀 Starting daily data aggregation...');
  console.log('=' .repeat(80));
  
  const today = new Date().toISOString().split('T')[0];
  console.log(`📅 Target date: ${today}\n`);
  
  // Initialize cache
  const { initializeCache, loadCache, saveCache, addFixtures } = await import('./local-cache-manager.js');
  initializeCache();
  
  const allFixtures: any[] = [];
  
  // 1. Download and parse CSV files
  console.log('📥 Step 1: Downloading CSV files from Football-Data.co.uk...');
  try {
    const { downloadAllLeagueCSVs, readMatchesForDate } = await import('./csv-downloader.js');
    await downloadAllLeagueCSVs();
    
    const csvMatches = readMatchesForDate(today);
    console.log(`   ✅ Found ${csvMatches.length} matches in CSV cache for ${today}`);
    
    csvMatches.forEach((m, idx) => {
      allFixtures.push({
        id: `csv_${m.league}_${m.homeTeam}_${m.awayTeam}_${m.date}`,
        date: m.date,
        homeTeam: m.homeTeam,
        awayTeam: m.awayTeam,
        league: m.league,
        sport: 'soccer',
        source: 'csv' as const,
        raw: m.raw
      });
    });
  } catch (error: any) {
    console.warn('⚠️ CSV download failed:', error.message);
  }
  
  // 2. Fetch RSS feeds
  console.log('\n📡 Step 2: Fetching RSS feeds...');
  try {
    const { fetchAllRSSFeeds } = await import('./rss-feed-parser.js');
    const rssMatches = await fetchAllRSSFeeds();
    
    rssMatches.forEach((m: any) => {
      allFixtures.push({
        id: `rss_${m.sport}_${m.title}_${Date.now()}`,
        date: today,
        homeTeam: m.title.split('vs')[0]?.trim() || m.title.split('-')[0]?.trim() || 'Unknown',
        awayTeam: m.title.split('vs')[1]?.trim() || m.title.split('-')[1]?.trim() || 'Unknown',
        league: m.sport,
        sport: m.sport,
        source: 'rss' as const,
        raw: m
      });
    });
  } catch (error: any) {
    console.warn('⚠️ RSS fetch failed:', error.message);
  }
  
  // 3. Fetch from TheSportsDB API
  console.log('\n🌐 Step 3: Fetching from TheSportsDB API...');
  try {
    const { fetchTodaysFixtures } = await import('./todays-fixtures-fetcher.js');
    const apiFixtures = await fetchTodaysFixtures();
    
    console.log(`   ✅ Found ${apiFixtures.length} fixtures from API`);
    
    apiFixtures.forEach((f: any) => {
      allFixtures.push({
        id: `api_${f.id}`,
        date: f.date || today,
        homeTeam: f.homeTeam.name,
        awayTeam: f.awayTeam.name,
        league: f.leagueName,
        sport: 'soccer',
        source: 'api' as const,
        raw: f
      });
    });
  } catch (error: any) {
    console.warn('⚠️ API fetch failed:', error.message);
  }
  
  // Deduplicate by ID
  const uniqueFixtures = allFixtures.filter((f, index, self) => 
    index === self.findIndex(t => t.id === f.id)
  );
  
  // Save to cache
  console.log('\n💾 Step 4: Saving to cache...');
  const { addFixtures: addToCache } = await import('./local-cache-manager.js');
  addToCache(uniqueFixtures);
  
  // Summary
  console.log('\n' + '='.repeat(80));
  console.log('✅ Daily aggregation complete!');
  console.log(`   Total fixtures collected: ${uniqueFixtures.length}`);
  console.log(`   Cache file: data-cache/fixtures-cache.json`);
  console.log('\n📊 Fixtures by source:');
  const bySource = uniqueFixtures.reduce((acc: any, f: any) => {
    acc[f.source] = (acc[f.source] || 0) + 1;
    return acc;
  }, {});
  Object.entries(bySource).forEach(([source, count]) => {
    console.log(`   ${source}: ${count}`);
  });
  
  // Show sample fixtures
  console.log('\n📋 Sample fixtures for today:');
  uniqueFixtures.slice(0, 5).forEach((f: any) => {
    console.log(`   [${f.sport}] ${f.homeTeam} vs ${f.awayTeam} (${f.league}) - ${f.source}`);
  });
}

// Run if called directly
runDailyAggregation().catch(error => {
  console.error('❌ Aggregation failed:', error);
  process.exit(1);
});
