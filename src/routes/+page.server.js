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
    // Load counter activity data from static file for eco-counter
    let counterActivity = null;
    try {
      const counterActivityPath = path.join(process.cwd(), 'static', 'counter_activity.json');
      console.log('Attempting to load counter activity from:', counterActivityPath);
      
      if (fs.existsSync(counterActivityPath)) {
        const counterActivityData = fs.readFileSync(counterActivityPath, 'utf-8');
        counterActivity = JSON.parse(counterActivityData);
        console.log('Counter activity data loaded successfully:', counterActivity.length, 'entries');
      } else {
        console.warn('counter_activity.json file does not exist at:', counterActivityPath);
        counterActivity = [];
      }
    } catch (error) {
      console.error('Error loading counter_activity.json:', error.message);
      counterActivity = [];
    }

    // Load vivacity markers data from static file
    let vivacityMarkers = null;
    try {
      const vivacityMarkersPath = path.join(process.cwd(), 'static', 'vivacity_markers.json');
      console.log('Attempting to load vivacity markers from:', vivacityMarkersPath);
      console.log('Current working directory:', process.cwd());
      console.log('Directory contents:', fs.readdirSync(process.cwd()));
      
      // Check if static directory exists
      const staticDir = path.join(process.cwd(), 'static');
      if (fs.existsSync(staticDir)) {
        console.log('Static directory exists. Contents:', fs.readdirSync(staticDir));
      } else {
        console.warn('Static directory does not exist at:', staticDir);
      }
      
      if (fs.existsSync(vivacityMarkersPath)) {
        const vivacityMarkersData = fs.readFileSync(vivacityMarkersPath, 'utf-8');
        vivacityMarkers = JSON.parse(vivacityMarkersData);
        console.log('Vivacity markers data loaded successfully:', vivacityMarkers.length, 'entries');
        
        // Generate counter activity data from vivacity markers (for vivacity use only)
        const vivacityCounterActivity = vivacityMarkers.map(marker => ({
          site_id: parseInt(marker.sensor_id),
          total_7day_count: (marker.pedestrian_total || 0) + (marker.cyclist_total || 0),
          is_active: true
        }));
        console.log('Generated counter activity from vivacity markers:', vivacityCounterActivity.length, 'entries');
      } else {
        console.warn('vivacity_markers.json file does not exist at:', vivacityMarkersPath);
        console.log('Using fallback vivacity data with names...');
        
        // Fallback with hardcoded data that includes names
        vivacityMarkers = [
          {"name":"Georges St Upper path LHS","sensor_id":"2158","lat":53.290352,"long":-6.13158,"pedestrian_total":147896,"cyclist_total":9448},
          {"name":"george St path LHS","sensor_id":"2159","lat":53.293072,"long":-6.13799,"pedestrian_total":256153,"cyclist_total":7305},
          {"name":"St Georges Upper St path LHS","sensor_id":"3763","lat":53.292042,"long":-6.13569,"pedestrian_total":315259,"cyclist_total":9253},
          {"name":"Main St path LHS","sensor_id":"3771","lat":53.28904,"long":-6.24341,"pedestrian_total":228203,"cyclist_total":15610},
          {"name":"George's St Lower path","sensor_id":"4158","lat":53.294338,"long":-6.14074,"pedestrian_total":113091,"cyclist_total":8937},
          {"name":"Main St path LHS","sensor_id":"4159","lat":53.301659,"long":-6.17776,"pedestrian_total":261025,"cyclist_total":12992},
          {"name":"DCU road outbound","sensor_id":"7487","lat":53.385639,"long":-6.25557,"pedestrian_total":152387,"cyclist_total":6995},
          {"name":"East Pier path LHS","sensor_id":"8479","lat":53.293316,"long":-6.129289,"pedestrian_total":130478,"cyclist_total":2515},
          {"name":"Drynam Heath road","sensor_id":"9510","lat":53.442619,"long":-6.1955,"pedestrian_total":6549,"cyclist_total":607},
          {"name":"Ongar Distributor Rd road","sensor_id":"9646","lat":53.392021,"long":-6.43876,"pedestrian_total":19298,"cyclist_total":2400},
          {"name":"Ongar Distributor Rd road","sensor_id":"9658","lat":53.387852,"long":-6.41443,"pedestrian_total":15240,"cyclist_total":9742},
          {"name":"Amiens St road RHS","sensor_id":"9712","lat":53.35128,"long":-6.2501,"pedestrian_total":483839,"cyclist_total":94829},
          {"name":"Seville Pl road","sensor_id":"9713","lat":53.35458,"long":-6.24669,"pedestrian_total":42935,"cyclist_total":32513},
          {"name":"Amiens St path","sensor_id":"9714","lat":53.35458,"long":-6.24669,"pedestrian_total":36136,"cyclist_total":20731},
          {"name":"Annesley Bridge Rd road","sensor_id":"9716","lat":53.360451,"long":-6.23901,"pedestrian_total":39342,"cyclist_total":54075},
          {"name":"Ongar Distributor Rd road","sensor_id":"9739","lat":53.385799,"long":-6.40337,"pedestrian_total":5992,"cyclist_total":3022},
          {"name":"Ongar Distributor Rd path","sensor_id":"9740","lat":53.385689,"long":-6.4033,"pedestrian_total":6833,"cyclist_total":3238},
          {"name":"Ongar Distributor Rd path","sensor_id":"9741","lat":53.392132,"long":-6.4386,"pedestrian_total":90,"cyclist_total":72}
        ];
        
        // Generate counter activity data from fallback markers (for vivacity use only)
        const vivacityCounterActivity = vivacityMarkers.map(marker => ({
          site_id: parseInt(marker.sensor_id),
          total_7day_count: (marker.pedestrian_total || 0) + (marker.cyclist_total || 0),
          is_active: true
        }));
        console.log('Using fallback vivacity markers with names:', vivacityMarkers.length, 'entries');
        console.log('Generated counter activity from fallback:', vivacityCounterActivity.length, 'entries');
      }
    } catch (error) {
      console.error('Error loading vivacity_markers.json:', error.message);
      console.error('Full error:', error);
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
          console.log('Eco-Counter traffic response status:', response.status);
          if (!response.ok) throw new Error(`Eco-Counter traffic HTTP error! status: ${response.status}`);
          return response.json();
        })
        .then(data => {
          console.log('Eco-Counter traffic data received:', data);
          return data;
        })
        .catch(error => {
          console.error('Eco-Counter traffic API error:', error.message);
          return null;
        }),
      
      // Eco-Counter: Sites data
      fetch('https://api.eco-counter.com/api/v2/sites?page=1&pageSize=100&sortBy=id&orderBy=asc', ecoOptions)
        .then(response => {
          console.log('Eco-Counter sites response status:', response.status);
          if (!response.ok) throw new Error(`Eco-Counter sites HTTP error! status: ${response.status}`);
          return response.json();
        })
        .then(data => {
          console.log('Eco-Counter sites data received:', data);
          return data;
        })
        .catch(error => {
          console.error('Eco-Counter sites API error:', error.message);
          return null;
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
    
    // Log any errors in the eco-counter data
    if (!ecoCounterSites) {
      console.error('Eco-Counter Sites data is null/undefined');
    }
    if (!ecoCounterTraffic) {
      console.error('Eco-Counter Traffic data is null/undefined');
    }

    console.log('=== SERVER DATA FETCH RESULTS ===');
    console.log('Eco-Counter API Key available:', !!ecoCounterApiKey);
    console.log('Vivacity API Key available:', !!vivacityApiKey);
    console.log('Eco-Counter Sites response:', ecoCounterSites);
    console.log('Eco-Counter Sites count (data property):', ecoCounterSites?.data?.length || 0);
    console.log('Eco-Counter Sites count (direct):', Array.isArray(ecoCounterSites) ? ecoCounterSites.length : 0);
    console.log('Eco-Counter Traffic response:', ecoCounterTraffic);
    console.log('Eco-Counter Traffic records (data property):', ecoCounterTraffic?.data?.length || 0);
    console.log('Eco-Counter Traffic records (direct):', Array.isArray(ecoCounterTraffic) ? ecoCounterTraffic.length : 0);
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
      ecoCounterSites: ecoCounterSites ? { data: ecoCounterSites } : null,
      ecoCounterTraffic: ecoCounterTraffic ? { data: ecoCounterTraffic } : null,
      ecoCounterError: null,
      
      // Counter activity data (for eco-counter filtering)
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
