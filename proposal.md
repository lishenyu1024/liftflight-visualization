# Project Name
FlightPath Optimizer

# Story
We are prototyping a sophisticated predictive analytics platform that will empower LifeFlight to strategically **forecast emergency medical demand** over a 5–10 year horizon and model **optimal resource allocation scenarios** (such as new base locations) to save more lives and ensure equitable service coverage. The platform will integrate key external data, including **population projections, historical and forecasted weather data**, and **age demographics**, to enhance the precision of demand forecasts and resource optimization.

# Stakeholder
Dan Koloski (Initial Contact), LifeFlight Staff (Eventual Users)

# Team
- **Team Lead**: Shenyu Li
- **Member**: Yantong Guo
- **Repo**: https://github.com/lishenyu1024/Emergency-Demand-Intelligence-Platform
# Data
We will use historical and current **LifeFlight operational data** (including transport volume, patient origin/destination, asset utilization) combined with the following **external data**:
- **Population data** (historical: 2012–2023, and projections for the next 5–10 years, by county/city)
- **Population age structure** data, detailing age distribution at a county/city level
- **Historical weather data** (e.g., extreme weather days, seasonal trends)
- **Weather forecast data** (for future weather scenarios)

**Data Source**: SharePoint repository accessible via Dan Koloski

# Scope & Objectives
- **Predictive analytics**
  - 5–10 year demand forecasting using historical patterns and demographic trends
  - Integration of external factors (weather patterns, population changes, hospital closures)
  - Variable adjustment capabilities (assets, geographic coverage, shifting demand)
  - Scenario comparison tools for evaluating multiple strategic options

- **Resource optimization**
  - Current capacity vs. demand analysis
  - Base location optimization (e.g., Aroostook County evaluation)
  - Unmet demand identification and quantification
  - Asset utilization metrics and recommendations

- **Interactive dashboard & reporting**
  - Real-time scenario-modeling interface
  - Customizable inputs with immediate output updates
  - Executive-ready visuals for fundraising and board presentations
  - Export capabilities for strategic planning documentation

# Visualization Plan
**Total: 5 categories, 19 core visuals**

## 1) Demand Forecasting (4 charts)
- Long-term Demand Forecast Line with Uncertainty Band (5–10 years)
- Seasonality & Day-of-Week/Hour Heatmap
- Demographics vs. Demand Elasticity (Scatter + Fit)
- External Event Impact Replay (Event Study Line)

## 2) Scenario Modeling (4 charts)
- What-If Scenario Panel (Inputs → KPI Mini-Multiples)
- Base Siting Coverage Map (Isochrones/Voronoi + Response Time)
- Service Area Sensitivity (Coverage vs. Response Time Pareto)
- Weather-Driven Risk Boxes (Extreme Weather Frequency vs. Demand)

## 3) Resource Optimization (5 charts)
- Capacity vs. Demand Match (Stacked Area/Waterfall)
- Fleet & Crew Utilization (Heatmap/Gantt)
- Unmet Demand Map + Quantification Bars
- Response-Time Distribution & SLA Attainment Curve
- Marginal Benefit of Resource Increments (Prioritization Bars)

## 4) KPI & Executive Dashboard (4 charts)
- Core KPI Bullet Charts (Board Summary)
- Trend Wall (Metric Cards + Lines)
- Cost–Benefit–Throughput Dual-Axis
- Safety & Quality SPC Control Charts

## 5) Reporting & Export (2 modules)
- Scenario Comparison Table (Exportable)
- Decision Path Sankey (Narrative)

# Technical Approach
- **Modeling**: Python (Prophet/ARIMA, LightGBM, Bayesian structural time series), causal impact methods; OR-Tools for location optimization
- **GIS**: GeoPandas / OSMnx for isochrones and coverage modeling
- **Visualization/App**: React frontend with Material-UI, Flask backend API
- **Data**: Operational logs, fleet/crew rosters, external population forecasts, weather histories and projections

# KPIs & Success Metrics
- Missions (total / per 1,000 pop)
- SLA attainment (median/95th response time)
- Unmet demand
- Transfer success rate
- Flight hours
- Fleet/Crew utilization
- Unit cost
- Safety/quality incident rates
