import { ECO_COUNTER_API, VIVACITY_API } from '$env/static/private';
import { env } from '$env/dynamic/private';
import fs from 'fs';
import path from 'path';

export async function load() {
  // Try SvelteKit env first, then fallback to process.env for development
  const ecoCounterApiKey = ECO_COUNTER_API || env.ECO_COUNTER_API || process.env.ECO_COUNTER_API;
  const vivacityApiKey = VIVACITY_API || env.VIVACITY_API || process.env.VIVACITY_API;
  
  if (!ecoCounterApiKey) {
    throw new Error('ECO_COUNTER_API environment variable is not set');
  }

  // Set up Eco-Counter request options
  const ecoOptions = {
    method: 'GET',
    headers: {
      accept: 'application/json', 
      'X-API-KEY': ecoCounterApiKey
    }
  };

  // Set up Vivacity request options (if API key available)
  const vivacityOptions = vivacityApiKey ? {
    method: 'GET',
    headers: {
      'Accept': 'application/json',
      'x-vivacity-api-key': vivacityApiKey
    }
  } : null;

  try {
    // Load counter activity data from static file
    let counterActivity = null;
    try {
      const counterActivityPath = path.join(process.cwd(), 'static', 'counter_activity.json');
      const counterActivityData = fs.readFileSync(counterActivityPath, 'utf-8');
      counterActivity = JSON.parse(counterActivityData);
      console.log('Counter activity data loaded:', counterActivity.length, 'entries');
    } catch (error) {
      console.warn('Could not load counter_activity.json:', error.message);
      counterActivity = [];
    }

    // Load vivacity markers data from static file
    let vivacityMarkers = null;
    try {
      const vivacityMarkersPath = path.join(process.cwd(), 'static', 'vivacity_markers.json');
      const vivacityMarkersData = fs.readFileSync(vivacityMarkersPath, 'utf-8');
      vivacityMarkers = JSON.parse(vivacityMarkersData);
      console.log('Vivacity markers data loaded:', vivacityMarkers.length, 'entries');
    } catch (error) {
      console.warn('Could not load vivacity_markers.json:', error.message);
      vivacityMarkers = [];
    }

    // Calculate date range for last 7 days (Vivacity API limit for 1h buckets is 169h)
    // Align to hour boundaries for Vivacity API
    const to = new Date();
    to.setMinutes(0, 0, 0); // Set to top of current hour
    
    const from = new Date(to.getTime() - (7 * 24 * 60 * 60 * 1000)); // 7 days ago
    from.setMinutes(0, 0, 0); // Set to top of hour
    
    // Format dates to match Vivacity API format: YYYY-MM-DDTHH:mm:ss.000Z
    const fromISO = from.toISOString().replace(/\.\d{3}Z$/, '.000Z');
    const toISO = to.toISOString().replace(/\.\d{3}Z$/, '.000Z');

    // Set up all API calls
    const promises = [
      // Eco-Counter: Traffic data
      fetch('https://api.eco-counter.com/api/v2/statistical/adt/by/site?dateRange=lastMonth&groupBy=siteAndTravelMode&travelModes=pedestrian&travelModes=bike', ecoOptions)
        .then(response => {
          if (!response.ok) throw new Error(`Eco-Counter traffic HTTP error! status: ${response.status}`);
          return response.json();
        }),
      
      // Eco-Counter: Sites data
      fetch('https://api.eco-counter.com/api/v2/sites?page=1&pageSize=100&sortBy=id&orderBy=asc', ecoOptions)
        .then(response => {
          if (!response.ok) throw new Error(`Eco-Counter sites HTTP error! status: ${response.status}`);
          return response.json();
        })
    ];

    // Add Vivacity API calls if API key is available
    if (vivacityOptions) {
      // Vivacity: Counter data
      const vivacityUrl = `https://api.vivacitylabs.com/countline/counts?countline_ids=22988&from=${fromISO}&to=${toISO}&time_bucket=1h&fill_zeros=true`;

      console.log('Vivacity URL:', vivacityUrl);
      
      promises.push(
        fetch(vivacityUrl, vivacityOptions)
          .then(response => {
            if (!response.ok) throw new Error(`Vivacity counts HTTP error! status: ${response.status}`);
            return response.json();
          })
          .catch(error => {
            console.warn('Vivacity counts API error:', error.message);
            return null; // Return null if Vivacity fails
          })
      );

      // Vivacity: Counter locations metadata
      promises.push(
        fetch('https://api.vivacitylabs.com/hardware/metadata', vivacityOptions)
          .then(response => {
            if (!response.ok) throw new Error(`Vivacity metadata HTTP error! status: ${response.status}`);
            return response.json();
          })
          .catch(error => {
            console.warn('Vivacity metadata API error:', error.message);
            return null;
          })
      );
    } else {
      // Add null placeholders if no Vivacity API key
      promises.push(Promise.resolve(null));
      promises.push(Promise.resolve(null));
    }

    const [ecoCounterTraffic, ecoCounterSites, vivacityData, vivacityMetadata] = await Promise.all(promises);

    console.log('=== SERVER DATA FETCH RESULTS ===');
    console.log('Eco-Counter API Key available:', !!ecoCounterApiKey);
    console.log('Vivacity API Key available:', !!vivacityApiKey);
    console.log('Eco-Counter Sites count:', ecoCounterSites?.data?.length || 0);
    console.log('Eco-Counter Traffic records:', ecoCounterTraffic?.data?.length || 0);
    console.log('Vivacity Data available:', !!vivacityData);
    console.log('Vivacity Data structure:', vivacityData ? Object.keys(vivacityData) : 'null');
    console.log('Vivacity Metadata available:', !!vivacityMetadata);
    console.log('Vivacity Metadata structure:', vivacityMetadata ? Object.keys(vivacityMetadata) : 'null');

    // Process vivacity metadata to extract countlines for each sensor
    let processedVivacityMarkers = vivacityMarkers;
    if (vivacityMetadata && vivacityMarkers) {
      console.log('Processing vivacity metadata to extract countlines...');
      processedVivacityMarkers = vivacityMarkers.map(marker => {
        const sensorId = marker.sensor_id;
        const sensorMetadata = vivacityMetadata[sensorId];
        
        let countlines = [];
        if (sensorMetadata && sensorMetadata.view_points) {
          // Extract all countlines from all view_points
          Object.values(sensorMetadata.view_points).forEach(viewPoint => {
            if (viewPoint.countlines) {
              Object.entries(viewPoint.countlines).forEach(([countlineId, countlineData]) => {
                countlines.push({
                  id: countlineId,
                  name: countlineData.name,
                  description: countlineData.description,
                  direction: countlineData.direction
                });
              });
            }
          });
        }
        
        console.log(`Sensor ${sensorId}: found ${countlines.length} countlines`);
        
        return {
          ...marker,
          countlines: countlines
        };
      });
      
      console.log('Processed vivacity markers with countlines:', processedVivacityMarkers.length);
    }
  


    if (vivacityData) {
      console.log('Vivacity Data sample:', JSON.stringify(vivacityData, null, 2).substring(0, 500) + '...');
    }
    if (vivacityMetadata) {
      console.log('Vivacity Metadata sample:', JSON.stringify(vivacityMetadata, null, 2).substring(0, 500) + '...');
    }

    return {
      // Eco-Counter data (maintain existing structure for compatibility)
      ecoCounterSites: ecoCounterSites,
      ecoCounterTraffic: ecoCounterTraffic,
      ecoCounterError: null,
      
      // Counter activity data
      counterActivity: counterActivity,
      
      // Vivacity data (new structure)
      vivacityCounterSites: vivacityMetadata,
      vivacityCounterTraffic: vivacityData,
      vivacityMarkers: processedVivacityMarkers, // Add the static markers data with pedestrian_total and countlines
      vivacityCounterError: vivacityApiKey ? null : 'VIVACITY_API environment variable is not set'
    };
    
  } catch (error) {
    console.error('Server: Error fetching data:', error);
    
    // Return error structure that maintains compatibility
    return {
      ecoCounterSites: null,
      ecoCounterTraffic: null,
      ecoCounterError: error.message,
      counterActivity: [],
      vivacityCounterSites: null,
      vivacityCounterTraffic: null,
      vivacityMarkers: [],
      vivacityCounterError: error.message
    };
  }
}
