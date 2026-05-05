/**
 * Vivacity `GET /countline/counts` supports repeated `classes=` query params to limit returned road-user keys.
 * Keeps payloads small when we only care about walk/cycle volumes in this app.
 *
 * @see https://api.vivacitylabs.com — only `pedestrian` and `cyclist` (no motor vehicle classes).
 */
export const VIVACITY_COUNTS_CLASSES_QUERY = 'classes=pedestrian&classes=cyclist';

/**
 * @param {string} url counts URL that already includes `?…`
 * @returns {string}
 */
export function withVivacityCountsClasses(url) {
	if (!url || typeof url !== 'string') return url;
	if (url.includes('classes=pedestrian')) return url;
	return `${url}&${VIVACITY_COUNTS_CLASSES_QUERY}`;
}
