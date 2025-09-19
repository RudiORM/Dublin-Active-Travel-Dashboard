/**
 * Eco-Counter Colors Configuration
 * Defines colors for eco-counter markers and visualizations
 */

// Color scheme for eco-counter markers and travel modes
export const ECO_COUNTER_COLORS = {
	
	pedestrian: '#CC3311',
	bike: '#33BBEE'
};

/**
 * Get color for eco-counter marker or travel mode
 * @param {string} type - The type ('default', 'selected', 'hover', 'pedestrian', 'bike') or locationId
 * @param {boolean} isSelected - Whether this location is selected
 * @returns {string} - Color hex code
 */
export function getEcoCounterColor(type = 'default', isSelected = false) {
	// Handle legacy usage with locationId
	if (isSelected) {
		return ECO_COUNTER_COLORS.selected;
	}
	
	// Return color for specific type
	return ECO_COUNTER_COLORS[type] || ECO_COUNTER_COLORS.default;
}

/**
 * Get all available colors for eco-counter visualizations
 * @returns {Object} - Color configuration object
 */
export function getEcoCounterColors() {
	return ECO_COUNTER_COLORS;
}

export function getSelectionColor() {
	return '#F8D463';
}

