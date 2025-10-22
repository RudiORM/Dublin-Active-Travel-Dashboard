// src/routes/api/analytics/+server.js
// This receives analytics data and stores it in Vercel KV

import { json } from '@sveltejs/kit';
import { kv } from '@vercel/kv';

// CORS headers for cross-origin requests
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
    
    // Get country from Vercel's geo headers
    const country = request.headers.get('x-vercel-ip-country') || 'Unknown';
    const city = request.headers.get('x-vercel-ip-city') || '';
    
    // Add unique ID and server timestamp
    const event = {
      id: crypto.randomUUID(),
      ...data,
      country: country, // Override client-side country with server-side accurate data
      city: city,
      serverTimestamp: Date.now()
    };
    
    // Store event in KV with a key based on timestamp
    const eventKey = `event:${event.serverTimestamp}:${event.id}`;
    await kv.set(eventKey, JSON.stringify(event));
    
    // Set expiration to 90 days (optional - remove if you want to keep data forever)
    await kv.expire(eventKey, 60 * 60 * 24 * 90);
    
    return json({ success: true }, { headers: corsHeaders });
  } catch (error) {
    console.error('Error storing analytics:', error);
    return json({ error: 'Invalid data' }, { status: 400, headers: corsHeaders });
  }
}

// GET - Retrieve analytics data (for dashboard)
export async function GET({ url }) {
  try {
    // Get all event keys
    const keys = await kv.keys('event:*');
    
    // Fetch all events
    const eventPromises = keys.map(key => kv.get(key));
    const eventStrings = await Promise.all(eventPromises);
    const analyticsData = eventStrings
      .filter(e => e !== null)
      .map(e => typeof e === 'string' ? JSON.parse(e) : e);
    
    // Calculate summary stats
    const pageviews = analyticsData.filter(d => d.type === 'pageview');
    
    // Calculate unique users (based on userAgent + screenWidth + screenHeight)
    const uniqueUserIds = new Set();
    analyticsData.forEach(event => {
      if (event.userAgent && event.screenWidth && event.screenHeight) {
        const userId = `${event.userAgent}-${event.screenWidth}x${event.screenHeight}`;
        uniqueUserIds.add(userId);
      }
    });
    
    const summary = {
      totalEvents: analyticsData.length,
      pageviews: pageviews.length,
      uniqueUsers: uniqueUserIds.size,
      uniquePages: [...new Set(pageviews.map(d => d.url))].length
    };
    
    // Calculate page-specific stats
    const pageStats = {};
    pageviews.forEach(pv => {
      if (!pageStats[pv.url]) {
        pageStats[pv.url] = { count: 0, countries: {}, uniqueUsers: new Set() };
      }
      pageStats[pv.url].count++;
      
      // Track unique users per page
      if (pv.userAgent && pv.screenWidth && pv.screenHeight) {
        const userId = `${pv.userAgent}-${pv.screenWidth}x${pv.screenHeight}`;
        pageStats[pv.url].uniqueUsers.add(userId);
      }
      
      // Track country if available
      if (pv.country) {
        pageStats[pv.url].countries[pv.country] = (pageStats[pv.url].countries[pv.country] || 0) + 1;
      }
    });
    
    // Convert Set to count for JSON serialization
    Object.keys(pageStats).forEach(url => {
      pageStats[url].uniqueUsers = pageStats[url].uniqueUsers.size;
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
    
    // Get recent events (sorted by timestamp)
    const recentEvents = analyticsData
      .sort((a, b) => b.timestamp - a.timestamp)
      .slice(0, 1000);
    
    return json({ 
      events: recentEvents, 
      summary,
      pageStats,
      timeStats,
      countryStats
    }, { headers: corsHeaders });
  } catch (error) {
    console.error('Error retrieving analytics:', error);
    return json({ 
      error: 'Failed to retrieve analytics',
      events: [],
      summary: { totalEvents: 0, pageviews: 0, uniqueUsers: 0, uniquePages: 0 },
      pageStats: {},
      timeStats: {},
      countryStats: {}
    }, { status: 500, headers: corsHeaders });
  }
}