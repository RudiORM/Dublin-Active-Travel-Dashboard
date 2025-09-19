/**
 * Color utilities for Strava route visualization
 * Provides colors and sizing for different routes
 */

// Color palette for different Strava routes
export const ROUTE_COLORS = {
	'Clontarf to City Center': '#33BBEE',    // Red
	'Dun Laoghaire Coastal': '#33BBEE',      // Teal
	'Dodder Greenway': '#33BBEE',            // Blue
	'Portmarnock Greenway': '#33BBEE'        // Green
};

// Default color for unknown routes
export const DEFAULT_COLOR = '#33BBEE';

/**
 * Get color for a specific route
 * @param {string} routeName - Name of the route
 * @returns {string} Hex color code
 */
export function getRouteColor(routeName) {
	return ROUTE_COLORS[routeName] || DEFAULT_COLOR;
}

/**
 * Calculate line width based on route usage data
 * @param {number} value - Usage value for the route
 * @param {number} minValue - Minimum value in dataset
 * @param {number} maxValue - Maximum value in dataset
 * @returns {number} Line width in pixels
 */
export function calculateLineWidth(value, minValue, maxValue) {
	const minWidth = 8;
	const maxWidth = 8;
	
	if (maxValue === minValue) return minWidth;
	
	const normalizedValue = (value - minValue) / (maxValue - minValue);
	return minWidth + (normalizedValue * (maxWidth - minWidth));
}

/**
 * Get opacity based on selection state
 * @param {boolean} isSelected - Whether the route is selected
 * @returns {number} Opacity value between 0 and 1
 */
export function getRouteOpacity(isSelected) {
	return isSelected ? 1.0 : 1;
}
