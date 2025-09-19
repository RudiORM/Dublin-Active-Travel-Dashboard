/**
 * Vivacity-Counter Colors Configuration
 * Defines colors for vivacity-counter markers and visualizations
 */

// Color scheme for vivacity-counter markers and travel modes
export const VIVACITY_COUNTER_COLORS = {
	
	pedestrian: '#CC3311',
	bike: '#33BBEE'
};

/**
 * Get color for vivacity-counter marker or travel mode
 * @param {string} type - The type ('default', 'selected', 'hover', 'pedestrian', 'bike') or locationId
 * @param {boolean} isSelected - Whether this location is selected
 * @returns {string} - Color hex code
 */
export function getVivacityCounterColor(type = 'default', isSelected = false) {
	// Handle legacy usage with locationId
	if (isSelected) {
		return VIVACITY_COUNTER_COLORS.selected;
	}
	
	// Return color for specific type
	return VIVACITY_COUNTER_COLORS[type] || VIVACITY_COUNTER_COLORS.default;
}

/**
 * Get all available colors for vivacity-counter visualizations
 * @returns {Object} - Color configuration object
 */
export function getVivacityCounterColors() {
	return VIVACITY_COUNTER_COLORS;
}
