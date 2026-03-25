# **IGME 382: Final Report**

Michael Lizzio

# **Parcel Web Analyzer: A Geospatial Tool for Home-Buying Decisions**

## **Summary:**

The Parcel Web Analyzer is a web based tool that uses geospatial tools under the hood to help the user compare residential parcels in the Seattle area using user defined proximity-based requirements (e.g. “restaurants within 0.5 miles” weighted more than “parks within 1 mile”). I used King County parcel polygons with OpenStreeMap (OSM) amenities (downloaded live using the Overpass API), then computed the amenity count per parcel and used my custom algorithm to score them. The UI consists of an interactive MapBox map and other pop-ups to set and edit the requirements and also view and download the final processed output. Users can draw an area of interest, build and reorder requirement groups, process scores, click parcels for explanations (“why did this score high?”), and export results (GeoJSON or Shapefile).

## **1\. Topic**

**Topic:**  
Evaluate neighborhoods for home buying in the Seattle area based on details like proximity to amenities such as restaurants, parks, trails, grocery stores, and other amenities.

**Spatial Question:**  
Which residential parcels in Seattle best match a set of neighborhood home buying requirements like walkability to restaurants, access to parks, quiet streets, proximity to walking trails. How does suitability vary across the city?

**Inspiration:**  
This project is inspired by my sister’s recent home buying search in Seattle and the criteria she shared: walkability to restaurants, access to parks and trails, and proximity to daily amenities. Her notes directly shaped the suitability factors I’m analyzing.

##

## **2\. Data**

### **2.1 King County Parcel Data (Polygon)**

- **Source:** King County Open Data Portal (GIS)
- **Dataset:** Parcel boundaries / parcel area layer
- **URL:** [https://gis-kingcounty.opendata.arcgis.com/maps/8058a0c540434dadbe3ea0ade6565143](https://gis-kingcounty.opendata.arcgis.com/maps/8058a0c540434dadbe3ea0ade6565143)
- **What it represents:** A polygon dataset of every property parcel in King County, including land boundaries for residential, commercial, industrial, parks, government properties, and vacant land. This dataset will be used for identifying houses and show statistics for each property

### **2.2 OpenStreetMap Amenities using Overpass API (Point**

- **Source:** OpenStreetMap contributors via the Overpass API
- **URL:** [https://overpass-api.de/](https://overpass-api.de/)
- **What it represents:** A point layer derived from OpenStreetMap containing thousands of “amenity” features categorized by type, including restaurants, cafes, bars, grocery stores, schools, bike shops, and other useful walkable destinations. This dataset will be used for calculating suitability of parcels based on their proximity to these amenities.
- **Why I chose it (updated from proposal):**
  - **On-demand:** Only fetch amenities inside the user’s chosen area, instead of downloading massive regional datasets.
  - **Up-to-date:** Queries current OSM content.
  - **Scalable:** Works anywhere with decent OSM coverage, not only Seattle.

### **2.3 Dataset Change From Proposal**

In my proposal, I planned to use (1) OSM amenities from ArcGIS Living Atlas and (2) a separate King County parks layer. After looking deeper and starting implementation I changed to Overpass for amenities and relied on OSM park tags as part of the amenity system. This made it easier and kept all “requirements inputs” consistent as point features.

##

##

##

## **3\. Methods**

## **3.1 ArcGIS Pro Data Modification Workflow**

The original King County parcel dataset includes over 500,000 parcels across many land uses. To make the correct analysis I used ArcGIS Pro to produce a residential only parcel dataset excluding all commercial buildings or vacant lots.

### **Step A \- Clip to Study Area**

- **Goal:** Just to focus on one area of Seattle to be easier to use while testing instead of the entire county.
- **Process:**
  1. Add parcel layer to ArcGIS Pro.
  2. Use a study area boundary like Seattle boundary or a defined polygon/ZIP5 boundary as the clip feature.
  3. Run Clip to output a smaller parcel feature class.

### **Step B \- Filter to Residential Parcels (Select by Attributes)**

- **Goal:** Remove commercial/industrial/public/vacant parcels that don’t represent home buying candidates.
- **Process:**
  - Use Select By Attributes to select a present use description “PREUSE_DES” or some property type indicator.
  - Find all types of values that could be a home / residential prosperity (I downloaded a goejson and then ran a script to print out all PREUSE_DES types and their count).
  - Create a SQL Query to filter for the parcels you want.(Shown below)

### **Step C \- Export**

- Export selected features to a new dataset to use in the Web App (Seattle_Residential_Parcels.gpkg).

## **3.2 Other Geospatial Tool: Python/GeoPandas \+ Mapbox Web Application**

I implemented the main analysis and visualization as a Flask web application.

### **Technology**

- **Backend:** Python, Flask, GeoPandas, Shapely
- **Frontend:** JavaScript, Mapbox, Mapbox Draw
- **Operations:** buffering, spatial join counting, scoring, exporting

### **User Workflow**

1. **Load Parcels**
2. **Define Area of Interest**
3. **Fetch Amenities (Overpass)**
4. **Build Requirements**
5. **Process Requirements (Spatial Analysis \+ Scoring)**

### **Operations**

1. **Distance Handling (Correct CRS for buffering)**

- Convert geometries to a local projected system
- Convert miles meters
- Buffer amenities by the chosen meters value.

2. **Proximity Counting**

- Filter amenities to that group’s included types.
- Buffer each amenity point by the group radius.
- Spatial join parcels to buffered amenities.
- For each parcel, compute the number of amenities whose buffers intersect the parcel polygon.

3. **Priority Weighting (Triangular Weighting)**
   - Position 1 weighted the highest
   - Weighting Examples using Triangular Weighting:

   2 requirements: weights \[3, 1\], normalized \[0.75, 0.25\]

   3 requirements: weights \[6, 3, 1\], normalized \[0.60, 0.30, 0.10\]

   4 requirements: weights \[10, 6, 3, 1\], normalized \[0.50, 0.30, 0.15, 0.05\]

4. **Final Score**

- Score is the sum of all amenities x their weight

## **3.3 Visualization**

### **Parcel symbology**

- Before processing: parcels shown as outlines for context.  
  ![][image4]
- After processing: parcels filled using a single hue gradient (light to dark) to show relative suitability.  
  ![][image5]

###

###

### **Explainability**

Clicking a parcel displays:

- The parcel’s score
- Each requirement group’s count contributing to that score

![][image6]

## **3.4 Issues Encountered and Solutions (Updated)**

1. **Performance on large parcel layers**
   - **Problem:** County wide layers are too large for smooth UI interaction.
   - **Fix:** By using clip, residential filter in ArcGIS Pro (preprocessing) and having the user only select the area they want to analyze it reduces strain.

2. **Shapefile field name truncation**
   - **Problem:** 10-character field limit.
   - **Fix:** Warn users in export UIand tell them to use GEOJSON for full field names.

## **3.5 Changes**

- **OSM data source changed:** Used Overpass API instead of Living Atlas OSM layer for smaller on-demand queries.
- **Parks layer simplified:** Instead of a separate parks polygon dataset I just used parks from OSM.
- **Final product format changed:** I did not end up using an ArcGIS Online web map, instead I implemented an interactive Mapbox web app with export back into GIS formats.

## **4\. Results**

### **What the Tool Produces**

- A scored parcel layer where each parcel contains:
  - counts for each requirement group (and/or amenity types)
  - a raw score and normalized score for mapping
- An interactive map that reveals neighborhood-level patterns at a glance.

### **Findings**

1. **High Scores in clusters in mixed-use areas:**  
   When there are homes near a main street where a lot of restaurants are all clustered it gives a higher score showing more where businesses/amenities are clustered.
2. **Impact of chosen distance:**  
   Smaller walking distances like 0.25 \- 0.5 miles produce sharper contrast while larger distances reduce contrast and spread higher scores more broadly.

3. **Cluster bias appears when food dominates**  
   When restaurant amenities are top priority, parcels near commercial clusters score very high even if they conflict with a quiet streets preference (which isn’t implemented but can be sorta shown by not wanting to be within 0.1 mile of a bus stop (at main streets).  
   ![][image8]

## **5\. Discussion**

### **Interpretation**

The Parcel Web Analyzer is a tool that tries to help show where the best place to live is depending on what you value by using spatial data and a map to convey the information. By changing priorities and distances a user can quickly see how suitable shifts from one area to another.

### **Limitations**

1. **OSM completeness**  
   OSM quality is very good in Seattle but in some areas its amenities may be missing or labeled incorrectly.

2. **Euclidean distance vs network distance**  
   The tool currently measures proximity using radius buffers, not walking routes along streets. This can overestimate accessibility where barriers exist (water, highways, disconnected street networks).

3. **Quiet streets not directly modeled**  
   “Quiet streets away from arterials” was part of the inspiration, but the current scoring is primarily amenity proximity. This can favor parcels near busy corridors until this feature is implemented.

4. **Interpretation risk**  
   A high score means that it matches these chosen proximity criteria, not the best home overall. Price, safety, flood risk, school district boundaries, and personal preference still matter. It would be interesting to overlay more data in the future and even create an extension for Zillow to overlay data on the home buying experience.

### **Ethics and Privacy**

- **Privacy:** The app does not use owner names or personal data, only parcel geometry and other public information.
- **Misuse potential:** Any tool that ranks areas could be used for undesirable filtering like a criminal filtering for homes that are not within a 5 mile radius of a police station.

## **6\. Conclusion**

### **What I Learned**

1. **Preprocessing matters as much as the algorithm**  
   ArcGIS Pro data conditioning (clip/filter/export) was essential to making interactive analysis feasible.
2. **GIS tools become much more usable with good UI**  
   The operations that feel complex in ArcGIS can become simpler and easy to do when it is in a guided process and makes me think about all of the GIS tools we use for granted like Google Maps. Having to think out what the UI and workflow would be was an important planning step.
3. **Weighting impact on the map**  
   Triangular weighting produced realistic user defined priorities that had large impacts on how the map looked.

### **Next Steps / Improvements**

1. **Add an avoid busy roads factor**  
   Use Seattle's street classification data or OSM highway classifications to penalize parcels near arterials.
2. **Network based travel distance**  
   Replace buffer distance with route distance using OSM street networks
3. **Expand to let users upload a custom dataset as requirements**  
   Allow users to upload their own polygons/lines/points (flood zones, school districts, noise corridors) and treat them as criteria.
4. **Save/share data, maybe with an account.**

## **7\. Citations**

### **Data Sources**

- King County GIS Open Data. Parcel Area (parcel polygons). [https://gis-kingcounty.opendata.arcgis.com/maps/8058a0c540434dadbe3ea0ade6565143](https://gis-kingcounty.opendata.arcgis.com/maps/8058a0c540434dadbe3ea0ade6565143)
- OpenStreetMap Contributors. Overpass API. [https://overpass-api.de/](https://overpass-api.de/)
- OpenStreetMap Wiki. Overpass API documentation. [https://wiki.openstreetmap.org/wiki/Overpass_API](https://wiki.openstreetmap.org/wiki/Overpass_API)

### **Tools / Libraries**

- GeoPandas documentation. [https://geopandas.org/](https://geopandas.org/)
- Shapely documentation. [https://shapely.readthedocs.io/](https://shapely.readthedocs.io/)
- Flask documentation. [https://flask.palletsprojects.com/](https://flask.palletsprojects.com/)
- Mapbox GL JS documentation. [https://docs.mapbox.com/mapbox-gl-js/](https://docs.mapbox.com/mapbox-gl-js/)
- Mapbox Draw documentation. [https://github.com/mapbox/mapbox-gl-draw](https://github.com/mapbox/mapbox-gl-draw)

## **Other Links:**

- Live demo URL: https://youtu.be/uNQ4RlmUaS0

- Source code repository: https://github.com/Michael-Lizzio/ParcelWebAnalyzer

[image4]: images/Screenshot%202025-12-08%20231227.png
[image5]: images/Screenshot%202025-12-08%20231307.png
[image6]: images/Screenshot%202025-12-08%20231405.png
[image7]: images/Screenshot%202025-12-08%20231307.png
[image8]: images/Screenshot%202025-12-08%20232743.png
