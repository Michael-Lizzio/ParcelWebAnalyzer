# Parcel Web Analyzer: A Geospatial Tool for Home Buying Decisions
**IGME 382 - Maps, Mapping, and Geospatial Technologies**
**Final Project Report**
**Michael Lizzio**

---

## 1. Topic

### Research Question
**Which residential parcels in the Seattle area best match personalized home-buying requirements based on proximity to amenities like restaurants, schools, parks, and other points of interest?**

### Why This Matters
Finding the right home is about more than square footage and price—it's about **livability**. Walkability to restaurants, access to parks, proximity to schools, and distance from busy streets all play crucial roles in neighborhood quality of life. However, evaluating these factors across hundreds or thousands of properties is time-consuming and difficult to visualize.

This project was inspired by my sister's recent home search in Seattle, where she outlined specific criteria: walkable restaurants, nearby parks and trails, and quiet streets away from major thoroughfares. Her requirements directly shaped the spatial analysis factors examined in this tool.

The **Parcel Web Analyzer** transforms abstract spatial data into actionable insights by allowing users to define custom priorities, visualize proximity-based scores across residential parcels, and make data-driven decisions about where to live. This approach bridges the gap between GIS analysis and real-world decision-making, demonstrating how geospatial technologies can solve everyday problems.

---

## 2. Data

### 2.1 King County Parcel Data
**Source**: King County Open Data Portal
**URL**: https://gis-kingcounty.opendata.arcgis.com/maps/8058a0c540434dadbe3ea0ade6565143

**What It Represents**: This polygon dataset contains property boundaries for every parcel in King County, Washington. Each feature includes attributes such as parcel ID, land use classification, property type, and assessed value.

**Why I Chose It**: The parcel layer serves as the geographic foundation for the analysis. Unlike aggregate census data, parcel-level granularity allows individual properties to be scored and compared. The updated version I used (compared to my original proposal) includes detailed land use classifications, which were essential for filtering out commercial properties, vacant land, and non-residential parcels.

**Modifications**: See Section 3.1 for ArcGIS Pro workflow.

### 2.2 OpenStreetMap Amenities (via Overpass API)
**Source**: OpenStreetMap via Overpass API
**URL**: https://overpass-api.de/

**What It Represents**: OpenStreetMap (OSM) is a collaborative, open-source mapping project containing millions of points of interest worldwide. Amenities include restaurants, cafés, schools, grocery stores, parks, transit stops, and more—all contributed and maintained by volunteers.

**Why I Chose It**: Instead of downloading the entire **OpenStreetMap Amenities for North America** dataset from ArcGIS Living Atlas (as originally proposed), I integrated the **Overpass API** directly into my application. This approach offers several advantages:
- **Efficiency**: Only downloads amenities within the user's selected bounding box, rather than processing millions of features across North America
- **Real-time data**: Queries live OSM data, ensuring amenities are up-to-date
- **Scalability**: Works anywhere in the world with OSM coverage, not just Seattle

The Overpass API returns amenities as GeoJSON point features, which are then used in proximity calculations.

### 2.3 Why I Didn't Use the Parks Dataset
In my original proposal, I planned to include the **King County Parks** polygon dataset. However, I discovered that OpenStreetMap already includes parks as amenity features (tagged as `leisure=park`, `amenity=park`, etc.), eliminating the need for a separate parks layer. This simplified the workflow and kept all amenity data in a consistent format.

---

## 3. Methods

### 3.1 Data Modification in ArcGIS Pro

#### Workflow Overview
The raw King County parcel dataset contains **over 500,000 parcels**, including commercial properties, industrial zones, vacant land, parks, and government-owned land. To create a manageable and relevant dataset for residential home-buying analysis, I performed the following modifications:

**Step 1: Select by Attributes - Filter Residential Parcels**
- Opened the King County parcel layer in ArcGIS Pro
- Used **Select by Attributes** to filter parcels where the land use classification indicated residential use
- Excluded commercial (`PRESENT_USE` contains "commercial"), vacant (`PRESENT_USE` = "vacant"), and non-residential properties
- This reduced the dataset significantly by removing irrelevant parcels

**Step 2: Create Study Area - Clip to Target Zip Codes**
- Rather than analyzing the entire county, I defined a **study area** using specific zip codes in the Seattle metro area
- Used **Select by Location** to identify parcels within the target zip codes
- This reduced the dataset from ~500,000 parcels to approximately **20,000 residential parcels**

**Step 3: Export and Save**
- Exported the filtered parcels as a new GeoPackage: `Seattle_Residential_Parcels.gpkg`
- This optimized dataset serves as the base layer for all subsequent analysis

**Why This Matters**: Filtering the data in ArcGIS Pro significantly improved performance in my Python application. Working with 20,000 parcels instead of 500,000 made spatial joins, buffering, and scoring computationally feasible without requiring a high-performance server.

**Screenshots**: *(Include screenshots of ArcGIS Pro showing the selection workflow, attribute table, and exported dataset)*

---

### 3.2 Python/GeoPandas + Mapbox Web Application

#### Technology Stack
The core geospatial tool is a **Flask-based web application** combining:
- **Backend**: Python, Flask, GeoPandas, Shapely
- **Frontend**: JavaScript (ES6 modules), Mapbox GL JS
- **Spatial Operations**: GeoPandas for buffering, spatial joins, and scoring
- **Visualization**: Mapbox GL JS for interactive map rendering

#### How the Application Works

**1. Upload Parcels**
- Users upload a parcel dataset (Shapefile, GeoPackage, or GeoJSON)
- Backend processes the file using GeoPandas, converts to WGS84 (EPSG:4326), and extracts the bounding box
- The extent is displayed on the map as a blue dashed outline

**2. Draw Selection Area**
- Users draw a polygon on the map using Mapbox Draw to define their area of interest
- The selection bbox is sent to the backend

**3. Analyze Selection**
- Backend clips parcels to the selected area
- Makes a request to the **Overpass API** to fetch OSM amenities within the same bbox
- Returns both parcels (as polygons) and amenities (as points) to the frontend
- Map displays green parcel outlines and colored amenity points

**4. Define Requirements**
- Users add **requirements** via a modal interface:
  - Select amenity types (restaurants, schools, cafés, grocery stores, etc.)
  - Group multiple amenities under a single label (e.g., "Food" = restaurants + cafés + bars)
  - Set distance radius (in miles)
  - Set mode of travel (walk, bike, drive) with associated speeds
- Requirements are displayed in a sidebar with **priority order** (drag to reorder)
- Each requirement can be toggled "active" or "inactive"

**5. Process Requirements (Scoring Algorithm)**
- When the user clicks **"Process Requirements"**, the backend performs spatial analysis:

**Proximity Counting**:
  - For each active requirement, create a buffer around every amenity of that type using the specified radius
  - Perform a **spatial join** to count how many amenities of each type fall within each parcel's buffer
  - Store counts in separate fields: `cnt_restaurant`, `cnt_school`, `cnt_cafe`, etc.

**Weighted Scoring**:
  - Requirements are weighted by **priority order** using a **triangular weighting formula**:
    - For each priority position *i* (where i=1 is highest priority), calculate raw weight: `k*(k+1)/2` where `k = n - i + 1`
    - Example: 2 requirements → raw weights [3, 1] → normalized to [75%, 25%]
    - Example: 3 requirements → raw weights [6, 3, 1] → normalized to [60%, 30%, 10%]
  - This creates a steeper drop-off than linear weights, emphasizing higher priorities
  - For each parcel, calculate: `score_raw = Σ(weight_i × count_i)` across all requirement groups
  - Normalize by subtracting the minimum score (so the lowest-scoring parcel gets 0)
  - Create a 0-1 normalized score: `score_norm = (score - min) / (max - min)`

**6. Visualize Scored Parcels**
- Scored parcels are rendered as **filled polygons** with a blue color gradient:
  - Light blue (#eff6ff) = low scores
  - Medium blue (#3b82f6) = mid-range scores
  - Dark blue (#1e3a8a) = high scores
- Original green parcel outlines are hidden
- A status indicator shows **"Up to date"**, **"Outdated"**, or **"Not processed"** based on whether requirements have changed since scoring

**7. Explore Individual Parcels**
- Click on a parcel to:
  - See a **popup** with the parcel's score and amenity counts
  - **Highlight** the parcel with a thicker border
  - **Filter amenities** on the map to show only those within the parcel's requirement distances
- Click elsewhere to reset and show all amenities again

**8. Download Results**
- Users can download scored parcels as:
  - **GeoJSON**: Preserves all fields, compatible with QGIS, ArcGIS, and web apps
  - **Shapefile** (zipped): Traditional GIS format, field names truncated to 10 characters (e.g., `cnt_restau` instead of `cnt_restaurant`)

---

### 3.3 Issues Encountered and Solutions

**Issue 1: Performance with Large Datasets**
**Problem**: Initially tested with the full 500,000-parcel King County dataset. Spatial joins took 2-3 minutes and frequently caused browser timeouts.
**Solution**: Pre-filtered parcels in ArcGIS Pro to 20,000 residential parcels in the study area. Processing time reduced to ~5 seconds.

**Issue 2: Overpass API Rate Limiting**
**Problem**: During testing, repeated requests to Overpass API occasionally hit rate limits.
**Solution**: Added error handling to retry after delays and cached amenity data in the browser session to avoid redundant requests.

**Issue 3: Parcel ID Consistency**
**Problem**: Different parcel datasets use different field names for unique IDs (`PARCEL_ID`, `PIN`, `OBJECTID`, etc.).
**Solution**: Implemented a fallback ID selection algorithm in `scoring.py` that tries common field names and auto-generates IDs if none exist.

**Issue 4: Field Name Truncation in Shapefiles**
**Problem**: Shapefile format limits field names to 10 characters, truncating names like `cnt_restaurant` to `cnt_restau`.
**Solution**: Documented this limitation in the UI and user guide. GeoJSON download preserves full names.

**Issue 5: Mapbox Feature State for Highlighting**
**Problem**: Highlighting selected parcels using Mapbox's `setFeatureState` requires features to have numeric IDs or use `promoteId`.
**Solution**: Configured the map source to use `promoteId: "parcel_id"` to enable feature-state highlighting without modifying source data.

---

### 3.4 Changes from Original Proposal

**1. Dropped King County Parks Dataset**
Originally planned to include a separate parks polygon layer. Since OSM already includes parks as amenities, this was unnecessary and would have complicated the workflow.

**2. Switched from Living Atlas to Overpass API**
Instead of downloading the entire OpenStreetMap Amenities for North America layer (~10GB+), I integrated the Overpass API to fetch amenities on-demand. This makes the tool more efficient, scalable, and globally applicable.

**3. Added Mapbox for Visualization**
While the proposal mentioned "ArcGIS Online web map," I opted for **Mapbox GL JS** instead. Mapbox offers:
- Faster rendering for large datasets
- More flexible styling and interactivity
- Better support for custom JavaScript-based features (like dynamic scoring and click interactions)
- Prior professional experience with Mapbox made it a natural choice

**4. Expanded Scoring Functionality**
The original proposal described a simple proximity-based score. The final implementation includes:
- **Grouped amenities** (e.g., "Food" includes restaurants, cafés, bars, ice cream shops)
- **Priority-based triangular weighting** (higher priorities get exponentially more weight)
- **Per-amenity-type counts** (shows exactly how many of each amenity type are nearby)
- **Interactive status tracking** (alerts users when requirements are outdated)

**5. Did Not Implement Custom Data Upload**
Originally planned to allow users to upload **custom datasets** (e.g., parks, main streets, airports) and assign them as requirements. Due to time constraints, I focused on core functionality with OSM amenities. This remains a high-priority future enhancement.

---

## 4. Results

### Key Findings

The Parcel Web Analyzer successfully produces **interactive, proximity-based suitability scores** for residential parcels in the Seattle area. Key findings include:

**1. Spatial Clustering Around Urban Centers**
Parcels with the highest scores (darkest blue) are concentrated in **downtown Seattle, Capitol Hill, Fremont, and Ballard**—areas with dense restaurant clusters, grocery stores, and transit access. This aligns with expectations for walkable, amenity-rich neighborhoods.

**2. Suburban Parcels Score Lower**
Residential areas farther from urban centers (e.g., outer zip codes) receive significantly lower scores due to fewer amenities within walking distance. This reflects the car-dependent nature of suburban neighborhoods.

**3. Bias Toward Main Streets**
Parcels located on or near **main commercial corridors** (e.g., Broadway, University Way, Greenwood Ave) score disproportionately higher because these streets have the highest concentration of restaurants and shops. This reveals a limitation: the tool currently **favors busy streets** over quiet residential blocks, which may not align with all users' preferences.

**4. Customizability Enables Diverse Use Cases**
By adjusting requirement priorities and distances, users can:
- Prioritize schools over restaurants (for families with children)
- Emphasize grocery stores and pharmacies (for older adults)
- Focus on parks and trails (for outdoor enthusiasts)

**5. Real-Time Interactivity Enhances Exploration**
Users can click on individual parcels to see **exactly which amenities** contributed to the score (e.g., "3 restaurants, 1 grocery store, 2 cafés within 0.5 miles"). This granular insight helps users understand *why* a parcel scored well or poorly.

---

## 5. Discussion

### 5.1 Interpretation of Results

The spatial patterns revealed by the Parcel Web Analyzer confirm what local residents already know intuitively: **Seattle's walkable neighborhoods are concentrated in the urban core**. However, the tool goes beyond intuition by **quantifying** walkability and proximity in a replicable, data-driven way.

The bias toward main streets highlights an important trade-off: **amenity access vs. neighborhood tranquility**. Many home buyers want to be *near* restaurants and shops but not *on* the noisy street where they're located. Ideally, the tool would incorporate data on traffic volume, noise levels, or street classifications to penalize parcels on arterials—but this data was not available in OSM.

### 5.2 Limitations

**1. Data Quality and Completeness**
- **OpenStreetMap coverage varies** by region. In Seattle, OSM is well-maintained, but rural areas or less-populated regions may have incomplete amenity data.
- **Missing attributes**: Some amenities lack names or are tagged inconsistently (e.g., "café" vs. "coffee shop").

**2. Proximity ≠ Accessibility**
- The tool calculates **straight-line (Euclidean) distance** rather than **walking distance along streets**. A parcel 0.5 miles from a grocery store "as the crow flies" might require a 0.8-mile walk due to street layout.
- Future versions could integrate **network analysis** (using OSM street networks) to calculate true walkable distances.

**3. Bias Toward Main Streets**
- Parcels on busy commercial streets score higher, even though many buyers prefer quieter residential blocks.
- **Solution**: Add a "main street avoidance" requirement where users can penalize parcels within X feet of arterial roads.

**4. Lack of Custom Data Upload**
- Users cannot upload their own datasets (e.g., school districts, flood zones, crime hotspots).
- This limits the tool's applicability for specialized analyses.

**5. Scoring Assumes Equal Importance Within Groups**
- When grouping amenities (e.g., "Food" = restaurants + cafés + bars), each type is weighted equally. Some users might prefer to weigh sit-down restaurants more heavily than fast food, which the current system doesn't support.

**6. Shapefile Field Name Truncation**
- Shapefile format limits field names to 10 characters, which can make downloaded data less readable. GeoJSON export avoids this issue.

### 5.3 Ethics and Privacy Concerns

**1. Potential for Misuse: Identifying Vulnerable Properties**
One concern is that the tool could be used to identify properties **far from police stations**, which might make them targets for crime. For example, a burglar could use the tool to filter parcels with low proximity to law enforcement and emergency services.

**Mitigation**: This is a limitation of public data in general—parcel boundaries and amenity locations are already publicly available through King County and OSM. The tool simply aggregates this information. However, future versions could include a **disclaimer** warning against misuse.

**2. Privacy: No Personal Data Collected**
The tool does not collect, store, or display personal information about property owners. All data is aggregated from public sources (parcel boundaries and OSM amenities), so privacy risks are minimal.

**3. Equity Concerns: Reinforcing Gentrification Patterns?**
By highlighting "desirable" neighborhoods (high walkability, amenity access), the tool could inadvertently reinforce gentrification trends. However, it also democratizes access to spatial analysis tools that were previously limited to GIS professionals, potentially helping underserved communities identify affordable, livable areas.

---

## 6. Conclusion

### What I Learned

**1. Spatial Data Transforms Abstract Numbers into Actionable Insights**
Before this project, I understood GIS in theory but hadn't fully appreciated how **visualizing spatial relationships** makes data meaningful. Seeing scored parcels as a heatmap instantly reveals patterns that would be invisible in a spreadsheet.

**2. Real-World Data is Messy**
Working with parcel data taught me that datasets rarely come "analysis-ready." Field names vary, geometries have errors, and classifications are inconsistent. Learning to clean and filter data in ArcGIS Pro was as important as the scoring algorithm itself.

**3. User Experience Matters in GIS Tools**
Traditional GIS software (ArcGIS Pro, QGIS) is powerful but has a steep learning curve. Building a **web-based interface** with Mapbox made the tool accessible to non-experts, demonstrating that GIS doesn't have to be intimidating.

**4. Triangular Weighting Creates Meaningful Priority Gradients**
The triangular weighting formula (using `k*(k+1)/2`) creates a **steeper drop-off** than linear weights, ensuring that top priorities have significantly more influence on the score. This felt more intuitive than equal weighting when testing with real-world scenarios.

**5. Geospatial Tools Can Solve Everyday Problems**
This project started with a simple question from my sister: "Where should I buy a house?" By the end, I had built a tool that could answer that question for anyone, anywhere (with OSM coverage). It reinforced my belief that **spatial analysis has real-world applications beyond academic exercises**.

---

### Next Steps and Future Improvements

**1. Upload Custom Datasets**
The highest-priority enhancement is **allowing users to upload their own spatial data**. For example:
- **Parks** (polygon data) → "Must be within 0.25 miles of a park"
- **Main streets** (line data) → "Must NOT be within 500 feet of an arterial road"
- **Flood zones** (polygon data) → "Avoid FEMA 100-year floodplains"
- **School districts** (polygon data) → "Only show parcels in Ballard High School boundary"

This would transform the tool from an **OSM-only analyzer** into a **fully customizable spatial decision support system**.

**2. Network-Based Distance Calculations**
Replace straight-line (Euclidean) distances with **true walking/driving distances** calculated using OSM street networks. Libraries like `OSMnx` (Python) or Mapbox Directions API could enable this.

**3. Main Street Avoidance Filter**
Add a requirement type: **"Avoid proximity to major roads."** This would allow users to penalize parcels on noisy, high-traffic streets while still being near amenities.

**4. Save and Share Analysis Sessions**
Allow users to:
- **Save their requirements** to a profile (e.g., "Family with Kids" = schools + parks + grocery stores)
- **Share results via URL** (e.g., `?requirements=schools:0.5,restaurants:0.3`)
- **Export reports** as PDF summaries with maps and statistics

**5. Expand Beyond Parcels**
The tool could be adapted to analyze:
- **Census block groups** (for demographic analysis)
- **Transit stops** (for public transportation accessibility studies)
- **Commercial sites** (for business location suitability)

**6. Mobile-Responsive Design**
The current web interface works on desktop browsers but isn't optimized for mobile. Adding responsive design would make the tool usable on smartphones during real-world house-hunting trips.

**7. Integration with Real Estate Listings**
Partner with real estate platforms (Zillow, Redfin) to overlay **suitability scores** on active listings. Users could filter homes not just by price and bedrooms, but by **proximity-based livability scores**.

---

## 7. Citations

### Data Sources
- **King County Parcels**: King County GIS Open Data. "Parcel Area." Accessed November 2024. https://gis-kingcounty.opendata.arcgis.com/maps/8058a0c540434dadbe3ea0ade6565143

- **OpenStreetMap Amenities**: OpenStreetMap Contributors. "Overpass API." Accessed November-December 2024. https://overpass-api.de/

### Tools and Technologies
- **GeoPandas**: Jordahl, K., et al. (2020). geopandas/geopandas: v0.8.1. Zenodo. https://doi.org/10.5281/zenodo.3946761

- **Shapely**: Gillies, S., et al. (2007-2024). Shapely: Manipulation and analysis of geometric objects. https://github.com/shapely/shapely

- **Flask**: Pallets Projects. Flask: The Python micro framework for building web applications. https://flask.palletsprojects.com/

- **Mapbox GL JS**: Mapbox. "Mapbox GL JS: Interactive Maps for the Web." https://docs.mapbox.com/mapbox-gl-js/

### References
- OpenStreetMap. "Overpass API User's Manual." Accessed December 2024. https://wiki.openstreetmap.org/wiki/Overpass_API

- ArcGIS Pro Documentation. "Geoprocessing Tools Reference." Esri. https://pro.arcgis.com/en/pro-app/latest/tool-reference/main/arcgis-pro-tool-reference.htm

- Seattle Department of Transportation. "Street Classification Map." City of Seattle Open Data Portal. https://data.seattle.gov/

---

## Appendix: Technical Specifications

### System Architecture
- **Backend**: Python 3.11, Flask 3.0, GeoPandas 0.14, Shapely 2.0
- **Frontend**: JavaScript (ES6), Mapbox GL JS 3.0, Mapbox Draw 1.5
- **Data Formats**: GeoPackage, Shapefile, GeoJSON
- **Coordinate Systems**: WGS84 (EPSG:4326) for display, UTM Zone 10N (EPSG:32610) for metric calculations

### Repository Structure
```
ParcelWebAnalyzer/
├── src/
│   ├── app/
│   │   ├── routes.py          # Flask API endpoints
│   │   ├── scoring.py         # Spatial analysis and scoring logic
│   │   ├── parcels.py         # Parcel data handling
│   │   ├── osm.py             # Overpass API integration
│   │   └── requirements.py    # Requirement persistence
│   ├── static/
│   │   ├── css/styles.css     # UI styling
│   │   └── js/
│   │       ├── main.js        # App initialization
│   │       ├── map.js         # Mapbox integration
│   │       ├── api.js         # API client
│   │       ├── ui.js          # UI event handlers
│   │       └── requirements/  # Requirements management modules
│   └── templates/
│       └── index.html         # Main application page
├── data/
│   └── parcels/              # Uploaded parcel datasets (user-specific)
└── README.md                 # Project overview and usage instructions
```

---

**End of Report**
