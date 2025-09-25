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
      console.log('Attempting to load counter activity from:', counterActivityPath);
      
      if (fs.existsSync(counterActivityPath)) {
        const counterActivityData = fs.readFileSync(counterActivityPath, 'utf-8');
        counterActivity = JSON.parse(counterActivityData);
        console.log('Counter activity data loaded successfully:', counterActivity.length, 'entries');
      } else {
        console.warn('counter_activity.json file does not exist at:', counterActivityPath);
        console.log('Using hardcoded fallback for counter activity data...');
        
        // Fallback with hardcoded data for Vercel deployment
        counterActivity = [
          {"site_id":100000425,"total_7day_count":375123.0,"is_active":true},
          {"site_id":100001297,"total_7day_count":0.0,"is_active":false},
          {"site_id":100001484,"total_7day_count":996563.0,"is_active":true},
          {"site_id":100001485,"total_7day_count":4097306.0,"is_active":true},
          {"site_id":100001486,"total_7day_count":0.0,"is_active":false},
          {"site_id":100001487,"total_7day_count":0.0,"is_active":false},
          {"site_id":100001488,"total_7day_count":0.0,"is_active":false},
          {"site_id":100001489,"total_7day_count":3994042.0,"is_active":true},
          {"site_id":100001491,"total_7day_count":6043927.0,"is_active":true},
          {"site_id":100003429,"total_7day_count":147121.0,"is_active":true},
          {"site_id":100003430,"total_7day_count":56737.0,"is_active":true},
          {"site_id":100006259,"total_7day_count":14441402.0,"is_active":true},
          {"site_id":100006267,"total_7day_count":14066740.0,"is_active":true},
          {"site_id":100006278,"total_7day_count":858207.0,"is_active":true},
          {"site_id":100006286,"total_7day_count":4197903.0,"is_active":true},
          {"site_id":100007092,"total_7day_count":0.0,"is_active":false},
          {"site_id":100007101,"total_7day_count":0.0,"is_active":false},
          {"site_id":100007106,"total_7day_count":2940232.0,"is_active":true},
          {"site_id":100007778,"total_7day_count":5500938.0,"is_active":true},
          {"site_id":100007793,"total_7day_count":1141812.0,"is_active":true},
          {"site_id":100007794,"total_7day_count":1940981.0,"is_active":true},
          {"site_id":100012163,"total_7day_count":1081.0,"is_active":true},
          {"site_id":100016243,"total_7day_count":67169.0,"is_active":true},
          {"site_id":100023988,"total_7day_count":223304.0,"is_active":true},
          {"site_id":100027140,"total_7day_count":134180.0,"is_active":true},
          {"site_id":100027167,"total_7day_count":509471.0,"is_active":true},
          {"site_id":100027179,"total_7day_count":989469.0,"is_active":true},
          {"site_id":100027458,"total_7day_count":0.0,"is_active":false},
          {"site_id":100030845,"total_7day_count":0.0,"is_active":false},
          {"site_id":100030846,"total_7day_count":4532434.0,"is_active":true},
          {"site_id":100030847,"total_7day_count":6481867.0,"is_active":true},
          {"site_id":100030848,"total_7day_count":11403469.0,"is_active":true},
          {"site_id":100034543,"total_7day_count":323418.0,"is_active":true},
          {"site_id":100034544,"total_7day_count":290863.0,"is_active":true},
          {"site_id":100034545,"total_7day_count":0.0,"is_active":false},
          {"site_id":100041484,"total_7day_count":22976.0,"is_active":true},
          {"site_id":100041485,"total_7day_count":22433.0,"is_active":true},
          {"site_id":100041486,"total_7day_count":0.0,"is_active":false},
          {"site_id":100041487,"total_7day_count":90047.0,"is_active":true},
          {"site_id":100043587,"total_7day_count":0.0,"is_active":false},
          {"site_id":100046611,"total_7day_count":677737.0,"is_active":true},
          {"site_id":100049048,"total_7day_count":0.0,"is_active":false},
          {"site_id":100049049,"total_7day_count":0.0,"is_active":false},
          {"site_id":100049050,"total_7day_count":0.0,"is_active":false},
          {"site_id":100049051,"total_7day_count":352.0,"is_active":true},
          {"site_id":100049052,"total_7day_count":0.0,"is_active":false},
          {"site_id":100049053,"total_7day_count":0.0,"is_active":false},
          {"site_id":100049327,"total_7day_count":12687.0,"is_active":true},
          {"site_id":100049328,"total_7day_count":138912.0,"is_active":true},
          {"site_id":100050524,"total_7day_count":875712.0,"is_active":true},
          {"site_id":100050525,"total_7day_count":6203248.0,"is_active":true},
          {"site_id":100050526,"total_7day_count":3114361.0,"is_active":true},
          {"site_id":100057291,"total_7day_count":0.0,"is_active":false},
          {"site_id":100057964,"total_7day_count":0.0,"is_active":false},
          {"site_id":100057965,"total_7day_count":0.0,"is_active":false},
          {"site_id":100057966,"total_7day_count":0.0,"is_active":false},
          {"site_id":100059508,"total_7day_count":234323.0,"is_active":true},
          {"site_id":100059509,"total_7day_count":359.0,"is_active":true},
          {"site_id":100063159,"total_7day_count":857448.0,"is_active":true},
          {"site_id":100063160,"total_7day_count":1136839.0,"is_active":true},
          {"site_id":100063161,"total_7day_count":0.0,"is_active":false},
          {"site_id":100063162,"total_7day_count":0.0,"is_active":false},
          {"site_id":100063163,"total_7day_count":1412252.0,"is_active":true},
          {"site_id":100063164,"total_7day_count":316621.0,"is_active":true},
          {"site_id":100063165,"total_7day_count":0,"is_active":false},
          {"site_id":100063166,"total_7day_count":4287579.0,"is_active":true},
          {"site_id":100063167,"total_7day_count":0.0,"is_active":false},
          {"site_id":100063168,"total_7day_count":0.0,"is_active":false},
          {"site_id":100063169,"total_7day_count":0.0,"is_active":false},
          {"site_id":100063170,"total_7day_count":1988437.0,"is_active":true},
          {"site_id":100063178,"total_7day_count":646534.0,"is_active":true},
          {"site_id":100063179,"total_7day_count":1363629.0,"is_active":true},
          {"site_id":100063180,"total_7day_count":502442.0,"is_active":true},
          {"site_id":100064636,"total_7day_count":35293.0,"is_active":true},
          {"site_id":100064763,"total_7day_count":208120.0,"is_active":true},
          {"site_id":300014830,"total_7day_count":0.0,"is_active":false},
          {"site_id":300014831,"total_7day_count":251579.0,"is_active":true},
          {"site_id":300014832,"total_7day_count":125982.0,"is_active":true},
          {"site_id":300014833,"total_7day_count":0.0,"is_active":false},
          {"site_id":300015980,"total_7day_count":628189.0,"is_active":true},
          {"site_id":300017046,"total_7day_count":465692.0,"is_active":true},
          {"site_id":300017047,"total_7day_count":307020.0,"is_active":true},
          {"site_id":300017324,"total_7day_count":0.0,"is_active":false},
          {"site_id":300020592,"total_7day_count":115261.0,"is_active":true},
          {"site_id":300020593,"total_7day_count":66903.0,"is_active":true},
          {"site_id":300040955,"total_7day_count":987120.0,"is_active":true},
          {"site_id":300041339,"total_7day_count":8473.0,"is_active":true},
          {"site_id":300050015,"total_7day_count":146058.0,"is_active":true}
        ];
        console.log('Using hardcoded counter activity data:', counterActivity.length, 'entries');
      }
    } catch (error) {
      console.error('Error loading counter_activity.json:', error.message);
      console.error('Full error:', error);
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
      } else {
        console.warn('vivacity_markers.json file does not exist at:', vivacityMarkersPath);
        console.log('Trying fallback with hardcoded data...');
        
        // Fallback with hardcoded data for Vercel deployment
        vivacityMarkers = [
          {"sensor_id":"2158","lat":53.290352,"long":-6.13158,"pedestrian_total":150954,"cyclist_total":10448},
          {"sensor_id":"2159","lat":53.293072,"long":-6.13799,"pedestrian_total":264953,"cyclist_total":7732},
          {"sensor_id":"3763","lat":53.292042,"long":-6.13569,"pedestrian_total":325289,"cyclist_total":9685},
          {"sensor_id":"3771","lat":53.28904,"long":-6.24341,"pedestrian_total":239536,"cyclist_total":15717},
          {"sensor_id":"4158","lat":53.294338,"long":-6.14074,"pedestrian_total":113179,"cyclist_total":9228},
          {"sensor_id":"4159","lat":53.301659,"long":-6.17776,"pedestrian_total":249785,"cyclist_total":8691},
          {"sensor_id":"7487","lat":53.385639,"long":-6.25557,"pedestrian_total":99424,"cyclist_total":6006},
          {"sensor_id":"8479","lat":53.293316,"long":-6.129289,"pedestrian_total":140066,"cyclist_total":2553},
          {"sensor_id":"9712","lat":53.35128,"long":-6.2501,"pedestrian_total":464138,"cyclist_total":94010},
          {"sensor_id":"9713","lat":53.35458,"long":-6.24669,"pedestrian_total":85103,"cyclist_total":70842},
          {"sensor_id":"9714","lat":53.35458,"long":-6.24669,"pedestrian_total":70926,"cyclist_total":41910},
          {"sensor_id":"9716","lat":53.360451,"long":-6.23901,"pedestrian_total":38310,"cyclist_total":56898}
        ];
        console.log('Using hardcoded vivacity markers:', vivacityMarkers.length, 'entries');
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
