# Dublin Active Travel Dashboard

A comprehensive visualisation platform that combines multiple data sources to provide insights into walking and cycling patterns across Dublin. The dashboard helps stakeholders understand active travel trends and their impacts on health and environment through interactive visualizations and real-time data.

## Table of Contents
1. [Overview](#overview)
2. [Data Sources](#data-sources)
3. [Features](#features)
4. [Technical Implementation](#technical-implementation)
5. [Setup and Deployment](#setup-and-deployment)
6. [Data Processing](#data-processing)
7. [Contributing](#contributing)

## Overview <a name="overview"></a>
The Dublin Active Travel Dashboard brings together live and historical data to correlate active travel patterns with infrastructure use, public health projections and climate impact in Dublin. This interactive platform enables policymakers, researchers, and citizens to explore how cycling and walking infrastructure investments translate into real-world usage patterns and environmental benefits.

The dashboard integrates seven distinct data sources to provide a holistic view of active travel in Dublin, from high-level census statistics to real-time sensor data from individual counters.

## Data Sources <a name="data-sources"></a>

### 1. Census Travel Analysis Dataset
Census statistics around commuting patterns in Dublin, providing insights into how people travel to work across different areas of the city.

**Data Coverage:**
* 2016-2022 statistics around mode of transport to work  
* Geographic boundaries for Local Electoral areas and Electoral Divisions
* Modal split analysis at constituency level

### 2. Google Modal Split Dataset
Generated from Google's environmental insights platform for 2023, offering a contemporary view of transportation patterns across Dublin.

**Data Coverage:**
* Constituency-level transportation data
* Mode split calculations across Dublin
* Geographic boundary processing for accurate area mapping

### 3. Canal Cordon Counts
Commissioned by Dublin City Council, this long-running analysis calculates total traffic at 33 cordons along Dublin's canal network.

**Data Coverage:**
* Traffic measurements from 1997 to present
* Data collected 7-10am on a single day in November annually
* Provides historical trend analysis of canal corridor usage

### 4. Eco-Visio Counter Data
Real-time pedestrian and cycling counter information from induction loop sensors strategically placed across Dublin's active travel infrastructure.

**Data Coverage:**
* Accessed via Eco-Visio API
* Multiple temporal views available:
   * Hourly data (last 30 days)
   * Monthly aggregated data (last 2 years)
* Location-specific counter information

### 5. Vivacity Sensor Data
Real-time pedestrian and cycling counter information from computer vision sensors that use AI to detect and classify different types of traffic.

**Data Coverage:**
* Accessed via Vivacity API
* Multiple temporal views available:
   * Hourly data (last 30 days)
   * Monthly aggregated data (last 2 years)
* Advanced traffic classification capabilities

### 6. Strava Metro Dataset
Developed by Smart Dublin in partnership with Strava, this dataset extrapolates total bicycle traffic volumes from anonymized cycling app data.

**Data Coverage:**
* Extrapolates total bicycle traffic volumes from user data
* Coverage of 4 key Dublin cycling routes (2021-2023)
* Provides insights into recreational and commuting cycling patterns

### 7. Cycling Infrastructure Data
Comprehensive mapping of cycling infrastructure across Dublin from multiple authoritative sources.

**Data Sources:**
* **NTA (National Transport Authority):** Official cycling infrastructure data
* **BusConnects:** Planned and existing cycling infrastructure integrated with public transport


## Features <a name="features"></a>

### Interactive Visualizations
* **Interactive map visualization** with multiple data layer overlays
* **Real-time counter data display** with live updates from sensor networks
* **Historical trend analysis** across multiple time periods
* **District-level aggregation** for policy-relevant insights

### Health and Environmental Impact Calculations
The dashboard automatically calculates the positive impacts of active travel:
* **Premature deaths averted** through increased physical activity
* **CO2 emissions saved** by reducing car dependency
* **Congestion time avoided** through modal shift
* **Fuel cost savings** for individuals and society

### Data Exploration Tools
* **Multiple temporal views** (hourly, daily, monthly, yearly)
* **Cross-dataset correlation** between infrastructure and usage patterns
* **Export capabilities** for further analysis
* **Mobile-responsive design** for accessibility across devices

## Technical Implementation <a name="technical-implementation"></a>

### Frontend Architecture
* **Svelte/SvelteKit** for reactive, performant web application
* **TypeScript** for type safety and better developer experience
* **Component-based architecture** for maintainable code structure

### Data Integration
* **MapBox** for advanced mapping and geospatial visualization
* **API Integration** with multiple data providers:
  * Eco-Visio API for induction loop counter data
  * Vivacity API for computer vision sensor data
  * Custom data processing pipelines for census and infrastructure data

### Performance Optimizations
* **Real-time data caching** for responsive user experience
* **Progressive data loading** to handle large datasets efficiently
* **Mobile-first responsive design** for cross-device compatibility

## Setup and Deployment <a name="setup-and-deployment"></a>

### Prerequisites
* Node.js (version 18 or higher)
* npm or pnpm package manager

### Installation
```bash
# Clone the repository
git clone [repository-url]
cd my-app

# Install dependencies
npm install

# Configure environment variables
cp .env.example .env
```

### Environment Configuration
```bash
# Required
PUBLIC_MAPBOX_TOKEN=your_mapbox_token
ECO_COUNTER_API=your_eco_counter_api_key     # Eco-Counter REST v2 (induction loops)
VIVACITY_API=your_vivacity_api_key           # Vivacity (computer vision)

# Analytics (Vercel KV / Upstash Redis) — set automatically when KV is linked on Vercel
KV_REST_API_URL=...
KV_REST_API_TOKEN=...
ANALYTICS_READ_TOKEN=long_random_string      # required to read GET /api/analytics (send as `Authorization: Bearer <token>`)
```

### Development
```bash
# Start development server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview
```

### Deployment
The app is deployed on **Vercel** (`@sveltejs/adapter-auto`). It needs a server runtime — the page load and `/api/*` routes call the Eco-Counter and Vivacity APIs with private keys — so it cannot be deployed as a purely static site.

### Weekly snapshots
`.github/workflows/weekly-snapshot.yml` runs every Monday at 07:00 UTC. It runs `scripts/update_weekly_snapshots.py`, which incrementally updates `static/data/eco-counter-weekly-snapshot.json`, `static/data/vivacity-weekly-snapshot.json` and the Vivacity sensor manifest, then commits them to `main` (triggering a Vercel redeploy). It needs the `ECO_COUNTER_API` and `VIVACITY_API` repository secrets. To run it locally:

```bash
npm run update:weekly-snapshots
```

## Data Processing <a name="data-processing"></a>

### Data Pipeline Architecture
The dashboard processes data from multiple sources through a standardized pipeline:

1. **Data Ingestion:** APIs and static files are processed through dedicated service modules
2. **Data Transformation:** Raw data is cleaned, validated, and transformed into consistent formats
3. **Geospatial Processing:** Geographic data is processed for accurate map visualization
4. **Real-time Updates:** Sensor data is cached and updated at regular intervals

### Data Quality Assurance
* **Validation checks** ensure data integrity across all sources
* **Error handling** for API failures and data inconsistencies
* **Fallback mechanisms** when real-time data is unavailable

## Contributing <a name="contributing"></a>

We welcome contributions to improve the Dublin Active Travel Dashboard. Please see our contributing guidelines for:
* Code contribution standards
* Data source addition procedures
* Bug reporting and feature requests
* Documentation improvements

For technical questions or collaboration opportunities, please contact rudi@dataanddesign.ie .
