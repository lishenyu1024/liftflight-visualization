# EDA Plan

Since the dataset is not yet available, this EDA plan is based on the project requirements and expected KPIs.

---

## 1. Data Overview
- Understand the data structure: number of tables, key relationships
- Check data quality: missing values, outliers, duplicates, inconsistent types
- Generate summary statistics to assess completeness

**Figure 1: Data Quality Check - Missing Values by Field**  
[Description: Bar chart showing the percentage of missing values in key data fields (e.g., "Income Level," "Placement Date," "Home Visits," "Last Contact Date").]

---

## 2. Demographics and Client Trends
**Metrics:** Gender, income, race, ethnicity, age distributions

**EDA Focus:**
- Calculate descriptive statistics
- Create histograms and pie charts for demographic breakdowns
- Explore differences across groups (e.g., income by race or gender)

**Figure 2: Gender Distribution**  
[Description: Pie chart showing the percentage breakdown of clients by gender.]

**Figure 3: Income Level Distribution**  
[Description: Bar chart displaying the count of households by income category (Very Low, Low, Moderate).]

**Figure 4: Race/Ethnicity Breakdown**  
[Description: Horizontal bar chart showing client distribution across different racial/ethnic groups.]



---

## 3. Housing Trends Over Time
**Metric:** Households housed per month

**EDA Focus:**
- Use time series plots to detect seasonal patterns
- Evaluate if housing demand changes across different periods

**Figure 5: Monthly Housing Placement Trends**  
[Description: Time series line chart showing households housed per month with a trend line to identify seasonal patterns.]

**Figure 6: Housing Success Rate Over Time**  
[Description: Line chart displaying the monthly housing success rate (housed/intake %) with moving average.]

---

## 4. Staff Performance Tracking
**Metrics:** Task completion rate, service hours, interventions

**EDA Focus:**
- Compare staff performance using bar charts and boxplots
- Identify outliers and improvement opportunities

**Figure 7: Staff Performance Rankings**  
[Description: Horizontal bar chart showing total interventions or home visits per staff member, sorted from highest to lowest.]

**Figure 8: Task Completion Rate by Staff**  
[Description: Boxplot comparing task completion rates across staff members, highlighting outliers.]

---

## 5. At-Risk Client Identification
**Risk indicators:** Days since last contact, missed appointments, overdue follow-ups

**EDA Focus:**
- Identify risk thresholds (e.g., >30 days without follow-up)
- Visualize distribution of risk indicators


**Figure 9: At-Risk Households Summary**  
[Description: Color-coded card or table showing counts of households in different risk categories (high risk: >30 days, medium risk: 15-30 days, low risk: <15 days).]

---

# Reproducibility


All code generating the exploratory data analysis charts above has been committed to this project's GitHub repository. We will ensure any collaborator can run these scripts using the React framework or alternatives, analyzing the same input dataset to produce identical results and charts.

---

# Unexpected Challenges or Risks to Project Success

1.  **Data Availability/API Delays:** The greatest unforeseen risk is that the **actual availability** of data from the **Bonterra Apricot API** may be later than the expected $\mathbf{10/10}$.
2. **Data Quality Challenges:** Excessively high missing rates in critical $[demographic/income]$ fields may render certain designed KPIs **inaccurate to compute**.

---