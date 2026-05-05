/**
 * Merge Vivacity countline/counts API responses (each keyed by countline id).
 */
export function mergeCountlineResponseObjects(results) {
	const out = {};
	for (const r of results) {
		if (r && typeof r === 'object' && !Array.isArray(r)) {
			Object.assign(out, r);
		}
	}
	return out;
}

/**
 * Aggregate multiple countlines into one time series (sums modes per timestamp).
 */
export function aggregateVivacityData(data) {
	if (!data || typeof data !== 'object') return [];

	const countlineKeys = Object.keys(data);
	if (countlineKeys.length === 0) return [];

	const firstCountlineData = data[countlineKeys[0]];
	if (!Array.isArray(firstCountlineData)) return [];

	const aggregatedData = firstCountlineData.map((timeEntry) => {
		const aggregatedEntry = {
			from: timeEntry.from,
			to: timeEntry.to,
			pedestrian: 0,
			cyclist: 0,
			car: 0,
			bus: 0,
			agricultural_vehicle: 0,
			cargo_bicycle: 0,
			dog: 0,
			electric_hackney_cab: 0,
			emergency_car: 0
		};

		countlineKeys.forEach((countlineId) => {
			const countlineData = data[countlineId];
			const matchingEntry = countlineData.find((entry) => entry.from === timeEntry.from);

			if (matchingEntry) {
				['clockwise', 'anti_clockwise'].forEach((direction) => {
					if (matchingEntry[direction]) {
						Object.keys(matchingEntry[direction]).forEach((vehicleType) => {
							const count = matchingEntry[direction][vehicleType] || 0;
							if (Object.prototype.hasOwnProperty.call(aggregatedEntry, vehicleType)) {
								aggregatedEntry[vehicleType] += count;
							} else {
								aggregatedEntry[vehicleType] = (aggregatedEntry[vehicleType] || 0) + count;
							}
						});
					}
				});
			}
		});

		return aggregatedEntry;
	});

	return aggregatedData;
}

/**
 * Sum pedestrian/bike (with Vivacity mode roll-ups) over citywide-aggregated daily rows
 * (`aggregateVivacityData` output — flat mode fields per row).
 */
export function sumModeFromAggregatedDailyRows(rows, mode) {
	if (!Array.isArray(rows)) return 0;
	let total = 0;
	for (const row of rows) {
		if (mode === 'pedestrian') {
			total += (row.pedestrian || 0) + (row.jogger || 0);
		} else {
			total +=
				(row.cyclist || 0) + (row.cargo_bicycle || 0) + (row.rental_bicycle || 0);
		}
	}
	return total;
}

/**
 * Sum selected travel mode over all hourly rows for one countline (raw API shape).
 */
export function sumModeFromCountlineHourlyRows(rows, mode) {
	if (!Array.isArray(rows)) return 0;
	let total = 0;
	for (const row of rows) {
		for (const direction of ['clockwise', 'anti_clockwise']) {
			const d = row[direction];
			if (!d || typeof d !== 'object') continue;
			if (mode === 'pedestrian') {
				total += (d.pedestrian || 0) + (d.jogger || 0);
			} else {
				total +=
					(d.cyclist || 0) +
					(d.cargo_bicycle || 0) +
					(d.rental_bicycle || 0);
			}
		}
	}
	return total;
}

/**
 * Pick sensor with highest mode count over last-week hourly series.
 */
export function findBusiestSensorFromHourly(hourlyByCountline, sensors, mode) {
	let best = { name: '—', total: 0, id: null };
	if (!hourlyByCountline || !sensors?.length) return best;

	for (const s of sensors) {
		const ids = s.countlineIds || [];
		let sensorTotal = 0;
		for (const clid of ids) {
			sensorTotal += sumModeFromCountlineHourlyRows(hourlyByCountline[clid], mode);
		}
		if (sensorTotal > best.total) {
			best = { name: s.name || `Sensor ${s.id}`, total: sensorTotal, id: s.id };
		}
	}
	return best;
}
