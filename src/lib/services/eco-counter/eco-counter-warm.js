/**
 * Warm eco-counter combined site+traffic from page `data` before the provider mounts,
 * so the first paint can reuse the same structure as load (mirrors Vivacity citywide warm).
 */

import {
	processEcoCounterLocations,
	processEcoCounterTraffic,
	combineEcoCounterData
} from './eco-counter-processor.js';

/**
 * @param {Object|null} serverData - page data (ecoCounterSites, ecoCounterTraffic, counterActivity, …)
 * @returns {Array<Object>|null}
 */
export function buildEcoCounterCombinedFromServer(serverData) {
	if (!serverData || serverData.ecoCounterError) return null;
	const sitesData = serverData.ecoCounterSites;
	const trafficData = serverData.ecoCounterTraffic;
	if (!sitesData || !trafficData) return null;

	const counterActivity = serverData.counterActivity || [];
	const allLocations = processEcoCounterLocations(sitesData);
	const activeLocations = allLocations.filter((location) => {
		const activityData = counterActivity.find((a) => a.site_id === location.id);
		return activityData && activityData.is_active === true;
	});
	const locationsWithActivity = activeLocations.map((location) => {
		const activityData = counterActivity.find((a) => a.site_id === location.id);
		return {
			...location,
			total_7day_count: activityData ? activityData.total_7day_count : 0
		};
	});
	const trafficList = processEcoCounterTraffic(trafficData, sitesData);
	return combineEcoCounterData(locationsWithActivity, trafficList);
}

let cachedCombined = null;

/** Call from +page (browser) as early as possible with `data`. */
export function warmEcoCounterFromPageData(pageData) {
	if (typeof window === 'undefined') return;
	cachedCombined = buildEcoCounterCombinedFromServer(pageData);
}

/** Provider: prefer warm result to avoid redoing work on first load. */
export function peekEcoCounterCombinedCache() {
	return cachedCombined;
}
