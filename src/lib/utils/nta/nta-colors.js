/**
 * Color utilities for NTA and BusConnects infrastructure visualization
 * Provides colors and sizing for different infrastructure types
 */

// Color palette for NTA cdo_1 types (matching actual data)
export const NTA_BIKE_COLORS = {
	'Painted cycle lane': '#F39984',      // Sea Green - dedicated trails
	'Footway level cycle track': '#EBD599',          // Royal Blue - cycle lanes
	'Segregated cycle lane': '#A6DCF3',         // Lime Green - cycle tracks
	'Shared foot and cycle path road adjacent': '#CCCCCC',            // Forest Green - greenways
	'Traffic free': '#999999',         // Goldenrod - shared paths
	'Bus lane': '#33BBEE',          // Blue Violet - contraflow
	'Signed route': '#FF8C00'        // Dark Orange - advisory lanes
};

// Color palette for BusConnects cdo_1 types
export const BUSCONNECTS_CDO1_COLORS = {
	'SurfaceChange': '#F39984',       // Orange - surface changes
	'NewInfrastructure': '#1E90FF',   // Dodger Blue - new infrastructure
	'Upgrade': '#32CD32',             // Lime Green - upgrades
	'Maintenance': '#FFD700',         // Gold - maintenance
	'Reconstruction': '#DC143C',      // Crimson - reconstruction
	'Resurfacing': '#9370DB',         // Medium Purple - resurfacing
	'WidthChange': '#20B2AA',         // Light Sea Green - width changes
	'Protection': '#FF1493',
	'TrafficFree':'#EBD599',
	'SegregatedCycleLane': '#A6DCF3',
"SignedRoute":'#CCCCCC'  }       

// Default colors
export const DEFAULT_NTA_COLOR = '#FF6B35';
export const DEFAULT_BUSCONNECTS_COLOR = '#FF6B35';

/**
 * Get color for NTA BIKE type
 * @param {string} bikeType - Type of bike infrastructure
 * @returns {string} Hex color code
 */
export function getNTABikeColor(bikeType) {
	return NTA_BIKE_COLORS[bikeType] || DEFAULT_NTA_COLOR;
}

/**
 * Get color for BusConnects cdo_1 type
 * @param {string} cdo1Type - Type of BusConnects infrastructure change
 * @returns {string} Hex color code
 */
export function getBusConnectsCdo1Color(cdo1Type) {
	return BUSCONNECTS_CDO1_COLORS[cdo1Type] || DEFAULT_BUSCONNECTS_COLOR;
}

/**
 * Get color based on data source and property value
 * @param {string} dataSource - 'nta' or 'busconnects'
 * @param {string} propertyValue - Value of the property (BIKE or cdo_1)
 * @returns {string} Hex color code
 */
export function getInfrastructureColor(dataSource, propertyValue) {
	if (dataSource === 'busconnects') {
		return getBusConnectsCdo1Color(propertyValue);
	} else {
		return getNTABikeColor(propertyValue);
	}
}

/**
 * Get default color for data source (legacy function)
 * @param {string} routeName - Name of the route (unused, kept for compatibility)
 * @returns {string} Hex color code
 */
export function getRouteColor(routeName) {
	return DEFAULT_NTA_COLOR;
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
