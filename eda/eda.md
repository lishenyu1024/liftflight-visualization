# Exploratory Data Analysis (EDA) Plan for LifeFlight Resource Optimization Tool

**Status:** Draft - Based on project scope and expected data fields.
**Project:** LifeFlight Strategic Resource Planning & Optimization Tool

---

## 1. Data Overview and Quality Assessment (Key Feature: Predictive Analytics)

**Goal:** Understand the structure of historical operational data and assess its suitability for long-term predictive modeling.

**Expected Data Fields:** Flight/Mission ID, Call Time/Date, Location (Lat/Long or County), Base Location, Patient Acuity, Transport Time, Weather Conditions, Asset Type, Maintenance/Downtime Logs.

| EDA Focus | Figure Title | Description of Results |
| :--- | :--- | :--- |
| **Data Quality Check** | **Figure 1: Critical Field Completeness** | Bar chart showing the **percentage of missing values** in key data fields (e.g., "Patient Acuity," "Weather Conditions at Call Site," "Mission Duration"). High missing rates in external factor fields will be a major risk for predictive modeling. |
| **Descriptive Statistics** | **Figure 2: Total Historical Missions (5-10 Year)** | Single Card/Summary: Total number of historical missions, average mission duration, and average daily/monthly call volume. |
| **Data Structure** | *No Figure Needed* | Summary of the number of tables, key relationships (e.g., Mission table to Asset Log table), and time coverage of the data. |

---

## 2. Geographic Demand Patterns (Key Feature: Demand Forecasting & Base Location Optimization)

**Goal:** Identify where current and historical demand is concentrated and assess the geographic distribution of **unmet demand** (if data on declined missions is available).

**Metrics:** Call density, service area coverage, patient origin/destination.

| EDA Focus | Figure Title | Description of Results |
| :--- | :--- | :--- |
| **Geographic Concentration** | **Figure 3: Mission Demand Heatmap by County** | **Heatmap/Choropleth Map** visualizing the count of missions originated per Maine County over the last year. This identifies **current high-demand zones** and potential service gaps. |
| **Distance/Travel Analysis** | **Figure 4: Distribution of Base-to-Scene Travel Time** | **Histogram/Box Plot** showing the distribution of travel times from the nearest LifeFlight base to the mission call location. This helps set baseline performance and identify **outliers** (exceptionally long travel times). |
| **Unmet Demand** | **Figure 5: Quantified Unmet Demand Density** | If available, a **Map** or **Bar Chart** showing the location and frequency of **unmet demand** (missions declined due to resource unavailability) to guide new base location evaluation (e.g., Aroostook County). |

---

## 3. Temporal and External Factor Trends (Key Feature: Impact of External Factors)

**Goal:** Analyze demand patterns over time, and explore correlations with seasonal and external variables.

**Metrics:** Monthly/Weekly call volume, correlation with weather/demographics.

| EDA Focus | Figure Title | Description of Results |
| :--- | :--- | :--- |
| **Seasonal and Weekly Patterns** | **Figure 6: Average Missions by Month and Day of Week** | **Grouped Bar Chart** or **Line Plot** showing the average mission volume (count) grouped by **Month** (seasonal patterns) and by **Day of the Week** (operational peaks). |
| **External Correlation** | **Figure 7: Demand Correlation with Weather** | **Scatter Plot** or **Correlation Heatmap** analyzing the relationship between mission volume and key external variables like temperature, precipitation, or severe weather events. This is crucial for **predictive model feature engineering**. |
| **Impact of External Events** | **Figure 8: Missions Before vs. After Hospital Closure** | **Annotated Time Series Plot** showing mission volume change before and after a known major external event (e.g., a **hospital closure** in a service area), highlighting the impact. |

---

## 4. Resource and Asset Utilization (Key Feature: Resource Optimization)

**Goal:** Evaluate current asset utilization and capacity constraints to support 'what-if' scenario modeling.

**Metrics:** Asset utilization rate, downtime, capacity vs. demand.

| EDA Focus | Figure Title | Description of Results |
| :--- | :--- | :--- |
| **Asset Utilization** | **Figure 9: Asset Utilization Rate by Aircraft** | **Horizontal Bar Chart** showing the **utilization rate** (flight hours / total available hours) for each LifeFlight asset, identifying underutilized or overutilized aircraft. |
| **Capacity vs. Demand** | **Figure 10: Current Unfilled Demand Analysis** | **Area Chart** or **Stacked Bar Chart** comparing the total **Demand** (calls received) vs. **Capacity** (missions successfully flown) vs. **Lost/Unmet Demand** (missions declined due to unavailability) over a rolling period. |
| **Downtime Analysis** | **Figure 11: Base Downtime Reasons** | **Pie Chart** or **Bar Chart** showing the breakdown of total asset **downtime** by reason (e.g., maintenance, weather, staff availability) across all bases. |

---

## Unexpected Challenges or Risks to Project Success

1.  **Data Granularity for Prediction:** The predictive models rely heavily on integrating **external factors** (weather, demographics). If the historical operational data only provides **County-level** location or lacks precise **time stamps**, the accuracy of hyperlocal or hourly demand forecasts will be severely limited.
2.  **Unmet Demand Quantification:** The ability to evaluate **Resource Optimization** (e.g., new base locations) critically depends on accurately quantifying **Unmet Demand**. If the historical data **does not explicitly log declined missions** with sufficient detail (reason, location, time), the core optimization features may be based on proxy metrics only.
3.  **Data Linkage Complexity:** Successfully linking LifeFlight's operational data with **external datasets** Roux-LifeFlight-Xfer (Census demographics, NOAA weather data) requires complex data engineering and high-quality geospatial matching, which poses a significant technical challenge.
