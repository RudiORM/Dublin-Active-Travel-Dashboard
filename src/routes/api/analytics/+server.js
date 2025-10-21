// src/routes/api/analytics/+server.js
// This receives analytics data and stores it

import { json } from '@sveltejs/kit';

// In-memory store (for demo - use Vercel KV in production)
let analyticsData = [];

// CORS headers for cross-origin requests (if dashboard is on different domain)
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type'
};

export async function OPTIONS() {
  return new Response(null, { headers: corsHeaders });
}

// POST - Receive analytics data
export async function POST({ request }) {
  try {
    const data = await request.json();
    
    // Add unique ID and server timestamp
    const event = {
      id: crypto.randomUUID(),
      ...data,
      serverTimestamp: Date.now()
    };
    
    analyticsData.push(event);
    
    // Keep only last 10000 events (prevent memory overflow)
    if (analyticsData.length > 10000) {
      analyticsData = analyticsData.slice(-10000);
    }
    
    return json({ success: true }, { headers: corsHeaders });
  } catch (error) {
    return json({ error: 'Invalid data' }, { status: 400, headers: corsHeaders });
  }
}

// GET - Retrieve analytics data (for dashboard)
export async function GET({ url }) {
  const limit = parseInt(url.searchParams.get('limit') || '1000');
  const type = url.searchParams.get('type'); // 'pageview' or 'event'
  
  let filtered = analyticsData;
  
  if (type) {
    filtered = analyticsData.filter(d => d.type === type);
  }
  
  // Return most recent events
  const result = filtered.slice(-limit).reverse();
  
  // Calculate summary stats
  const pageviews = analyticsData.filter(d => d.type === 'pageview');
  const summary = {
    totalEvents: analyticsData.length,
    pageviews: pageviews.length,
    customEvents: analyticsData.filter(d => d.type === 'event').length,
    uniquePages: [...new Set(pageviews.map(d => d.url))].length
  };
  
  // Calculate page-specific stats
  const pageStats = {};
  pageviews.forEach(pv => {
    if (!pageStats[pv.url]) {
      pageStats[pv.url] = { count: 0, countries: {} };
    }
    pageStats[pv.url].count++;
    
    // Track country if available
    if (pv.country) {
      pageStats[pv.url].countries[pv.country] = (pageStats[pv.url].countries[pv.country] || 0) + 1;
    }
  });
  
  // Calculate time-based stats (by month)
  const timeStats = {};
  pageviews.forEach(pv => {
    const date = new Date(pv.timestamp);
    const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    if (!timeStats[monthKey]) {
      timeStats[monthKey] = 0;
    }
    timeStats[monthKey]++;
  });
  
  // Calculate country stats
  const countryStats = {};
  analyticsData.forEach(event => {
    if (event.country) {
      countryStats[event.country] = (countryStats[event.country] || 0) + 1;
    }
  });
  
  return json({ 
    events: result, 
    summary,
    pageStats,
    timeStats,
    countryStats
  }, { headers: corsHeaders });
}