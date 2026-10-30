/**
 * Small in-memory TTL cache for API route responses (per server instance).
 */

/**
 * @param {{ ttlMs: number, maxEntries: number }} opts
 */
export function createResponseCache({ ttlMs, maxEntries }) {
	/** @type {Map<string, { expires: number, payload: any }>} */
	const cache = new Map();

	return {
		/** @param {string} key */
		get(key) {
			const row = cache.get(key);
			if (!row) return null;
			if (Date.now() > row.expires) {
				cache.delete(key);
				return null;
			}
			return row.payload;
		},
		/** @param {string} key @param {any} payload */
		set(key, payload) {
			cache.set(key, { payload, expires: Date.now() + ttlMs });
			while (cache.size > maxEntries) {
				cache.delete(/** @type {string} */ (cache.keys().next().value));
			}
		}
	};
}
