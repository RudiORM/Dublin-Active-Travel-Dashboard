import { ECO_COUNTER_API, VIVACITY_API } from '$env/static/private';
import { env } from '$env/dynamic/private';
import { resolveVivacityMarkerDisplayName } from '$lib/services/vivacity-counter/vivacity-counter-processor.js';
import {
	normalizeVivacityHardwareMetadataRoot,
	extractCountlinesFromSensorMetadata,
	pickSensorHardwareRecord
} from '$lib/server/vivacity-metadata-merge.js';
import {
	describeVivacityMetadataPayload,
	logVivacitySsrMerge
} from '$lib/server/vivacity-load-diagnostics.js';
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
    let counterActivity = [];
    try {
      // Try multiple possible paths for production vs development
      const possiblePaths = [
        path.join(process.cwd(), 'static', 'counter_activity.json'),
        path.join(process.cwd(), 'my-app', 'static', 'counter_activity.json'),
        path.join(process.cwd(), '..', 'static', 'counter_activity.json'),
        './static/counter_activity.json'
      ];
      
      let counterActivityData = null;

      for (const counterActivityPath of possiblePaths) {
        if (fs.existsSync(counterActivityPath)) {
          counterActivityData = fs.readFileSync(counterActivityPath, 'utf-8');
          break;
        }
      }
      
      if (counterActivityData) {
        counterActivity = JSON.parse(counterActivityData);
      } else {
        counterActivity = [];
      }
    } catch {
      counterActivity = [];
    }

    // Load vivacity markers data from static file
    let vivacityMarkers = [];
    try {
      // Try multiple possible paths for production vs development
      const possiblePaths = [
        path.join(process.cwd(), 'static', 'vivacity_markers.json'),
        path.join(process.cwd(), 'my-app', 'static', 'vivacity_markers.json'),
        path.join(process.cwd(), '..', 'static', 'vivacity_markers.json'),
        './static/vivacity_markers.json'
      ];
      
      let vivacityMarkersData = null;

      for (const vivacityMarkersPath of possiblePaths) {
        if (fs.existsSync(vivacityMarkersPath)) {
          vivacityMarkersData = fs.readFileSync(vivacityMarkersPath, 'utf-8');
          break;
        }
      }
      
      if (vivacityMarkersData) {
        vivacityMarkers = JSON.parse(vivacityMarkersData);
      } else {
        vivacityMarkers = [];
      }
    } catch {
      vivacityMarkers = [];
    }

    // Set up all API calls
    const promises = [
      // Eco-Counter: Traffic data
      fetch('https://api.eco-counter.com/api/v2/statistical/adt/by/site?dateRange=lastMonth&groupBy=siteAndTravelMode&travelModes=pedestrian&travelModes=bike', ecoOptions)
        .then(response => {
          if (!response.ok) throw new Error(`Eco-Counter traffic HTTP error! status: ${response.status}`);
          return response.json();
        })
        .then(data => {
          return data;
        })
        .catch(error => {
          return null;
        }),
      
      // Eco-Counter: Sites data
      fetch('https://api.eco-counter.com/api/v2/sites?page=1&pageSize=100&sortBy=id&orderBy=asc', ecoOptions)
        .then(response => {
          if (!response.ok) throw new Error(`Eco-Counter sites HTTP error! status: ${response.status}`);
          return response.json();
        })
        .then(data => {
          return data;
        })
        .catch(error => {
          return null;
        })
    ];

    // Add Vivacity API calls if API key is available
    if (vivacityOptions) {
      // Vivacity: Counter locations metadata
      promises.push(
        fetch('https://api.vivacitylabs.com/hardware/metadata', vivacityOptions)
          .then(response => {
            if (!response.ok) throw new Error(`Vivacity metadata HTTP error! status: ${response.status}`);
            return response.json();
          })
          .catch((error) => {
            console.warn('[+page.server] Vivacity /hardware/metadata request failed:', error?.message || error);
            return null;
          })
      );
    } else {
      // Null placeholder if no Vivacity API key
      promises.push(Promise.resolve(null));
    }

    const [ecoCounterTraffic, ecoCounterSites, vivacityMetadata] = await Promise.all(promises);

    // Static markers have no countlines — merge from /hardware/metadata (shape varies by API version).
    const normalizedVivacityMeta = normalizeVivacityHardwareMetadataRoot(vivacityMetadata);
    let processedVivacityMarkers = vivacityMarkers;
    if (Array.isArray(vivacityMarkers) && vivacityMarkers.length > 0) {
      if (!normalizedVivacityMeta && vivacityApiKey) {
        console.warn(
          '[+page.server] Vivacity hardware/metadata missing or unrecognized — markers will have no countlines (citywide & per-sensor charts need these). Induction-loop data is unrelated (Eco Counter API).'
        );
      }
      processedVivacityMarkers = vivacityMarkers.map((marker) => {
        const sensorMetadata = normalizedVivacityMeta
          ? pickSensorHardwareRecord(normalizedVivacityMeta, marker.sensor_id)
          : undefined;
        const countlines = extractCountlinesFromSensorMetadata(sensorMetadata);
        return {
          ...marker,
          name: resolveVivacityMarkerDisplayName(marker, sensorMetadata),
          countlines
        };
      });
      if (normalizedVivacityMeta && vivacityMarkers.length > 0) {
        const withCountlines = processedVivacityMarkers.filter((m) => (m.countlines || []).length > 0).length;
        if (withCountlines === 0) {
          console.warn(
            '[+page.server] Vivacity metadata parsed but no countlines on any marker — check sensor_id vs metadata keys.',
            { markerCount: vivacityMarkers.length, metaKeysSample: Object.keys(normalizedVivacityMeta).slice(0, 8) }
          );
        }
      }

      const markersWithCl = processedVivacityMarkers.filter((m) => (m.countlines || []).length > 0).length;
      const sampleMarkers = processedVivacityMarkers.slice(0, 4).map((m) => ({
        sensor_id: m.sensor_id,
        countlines: (m.countlines || []).length,
        firstCountlineId: (m.countlines || [])[0]?.id ?? null
      }));
      logVivacitySsrMerge({
        staticMarkerCount: vivacityMarkers.length,
        hasVivacityApiKey: Boolean(vivacityApiKey),
        rawMetaDiag: describeVivacityMetadataPayload(vivacityMetadata),
        normalizedKeyCount: normalizedVivacityMeta ? Object.keys(normalizedVivacityMeta).length : 0,
        normalizedKeysSample: normalizedVivacityMeta ? Object.keys(normalizedVivacityMeta).slice(0, 10) : [],
        markersWithCountlines: markersWithCl,
        sampleMarkers
      });
    } else if (vivacityApiKey) {
      console.info('[DATD Vivacity] SSR merge skipped: no rows in static/vivacity_markers.json', {
        vivacityMarkersLength: Array.isArray(vivacityMarkers) ? vivacityMarkers.length : 'not-array'
      });
    }

    return {
      // Eco-Counter data (maintain existing structure for compatibility)
      ecoCounterSites: ecoCounterSites ? { data: ecoCounterSites } : null,
      ecoCounterTraffic: ecoCounterTraffic ? { data: ecoCounterTraffic } : null,
      ecoCounterError: null,
      
      // Counter activity data (for eco-counter filtering - from counter_activity.json)
      counterActivity: counterActivity,
      
      // Vivacity data (separate from eco-counter)
      vivacityMarkers: processedVivacityMarkers, // Static markers data with lat/long and totals
      vivacityCounterError: vivacityApiKey ? null : 'VIVACITY_API environment variable is not set'
    };
    
  } catch (error) {
    
    // Return error structure that maintains compatibility
    return {
      ecoCounterSites: null,
      ecoCounterTraffic: null,
      ecoCounterError: error.message,
      counterActivity: [],
      vivacityMarkers: [],
      vivacityCounterError: error.message
    };
  }
}
