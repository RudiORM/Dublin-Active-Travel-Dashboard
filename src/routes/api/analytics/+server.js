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
  const summary = {
    totalEvents: analyticsData.length,
    pageviews: analyticsData.filter(d => d.type === 'pageview').length,
    customEvents: analyticsData.filter(d => d.type === 'event').length,
    uniquePages: [...new Set(analyticsData.filter(d => d.type === 'pageview').map(d => d.url))].length
  };
  
  return json({ events: result, summary }, { headers: corsHeaders });
}