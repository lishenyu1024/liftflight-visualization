# backend/utils/demographics_1_3.py
"""
Demographics vs. Demand Elasticity utility functions.

This module provides functions to analyze the relationship between demographic factors
and emergency medical demand elasticity at the county level.

Chart 1.3: Demographics vs. Demand Elasticity (Scatter + Fit / Marginal Effects)
- County-level regressions of missions per 1,000 vs. growth rate, 65+ share, disease burden
- Show elasticity coefficients with CIs and marginal impact bars by cohort
"""

import pandas as pd
import numpy as np
from typing import Dict, List, Optional, Any, Tuple
from pathlib import Path
try:
    from scipy import stats
    SCIPY_AVAILABLE = True
except ImportError:
    SCIPY_AVAILABLE = False
    print("Warning: scipy not available. Some features may be limited.")

try:
    import statsmodels.api as sm
    from statsmodels.stats.outliers_influence import variance_inflation_factor
    STATSMODELS_AVAILABLE = True
except ImportError:
    STATSMODELS_AVAILABLE = False
    print("Warning: statsmodels not available. Some features may be limited.")


def classify_diagnosis(diagnosis: str) -> str:
    """
    Classify diagnosis into cohort categories: geriatrics, pediatrics, trauma, or other.
    
    Args:
        diagnosis: Diagnosis string
    
    Returns:
        Category: 'geriatrics', 'pediatrics', 'trauma', or 'other'
    """
    if pd.isna(diagnosis) or not isinstance(diagnosis, str):
        return 'other'
    
    diagnosis_lower = diagnosis.lower()
    
    # Geriatric keywords
    geriatric_keywords = ['elderly', 'fall', 'fracture', 'hip', 'stroke', 'dementia', 
                          'alzheimer', 'osteoporosis', 'syncope', 'delirium']
    if any(kw in diagnosis_lower for kw in geriatric_keywords):
        return 'geriatrics'
    
    # Pediatric keywords
    pediatric_keywords = ['pediatric', 'child', 'infant', 'newborn', 'neonatal', 
                          'peds', 'juvenile', 'adolescent']
    if any(kw in diagnosis_lower for kw in pediatric_keywords):
        return 'pediatrics'
    
    # Trauma keywords
    trauma_keywords = ['trauma', 'injury', 'accident', 'head injury', 'laceration',
                       'contusion', 'abrasion', 'motor vehicle', 'mva', 'mvc']
    if any(kw in diagnosis_lower for kw in trauma_keywords):
        return 'trauma'
    
    return 'other'


def get_county_demographics_data(year: int) -> pd.DataFrame:
    """
    Get county-level demographic data for a given year.
    
    Args:
        year: Year to get data for
    
    Returns:
        DataFrame with columns: county, total_population, population_65plus, pct_65plus
    """
    backend_dir = Path(__file__).parent.parent
    age_path = backend_dir / 'data' / 'processed' / 'age_structure_2010_2026.csv'
    
    if not age_path.exists():
        raise FileNotFoundError(f"Age structure data not found: {age_path}")
    
    age_df = pd.read_csv(age_path)
    age_df['county'] = age_df['county'].str.upper()
    
    # Filter by year
    year_data = age_df[age_df['year'] == year].copy()
    
    return year_data[['county', 'total_population', 'population_65plus', 'pct_65plus']]


def calculate_population_growth_rate(start_year: int, end_year: int) -> pd.DataFrame:
    """
    Calculate population growth rate by county between two years.
    
    Args:
        start_year: Start year
        end_year: End year
    
    Returns:
        DataFrame with columns: county, growth_rate, start_population, end_population
    """
    backend_dir = Path(__file__).parent.parent
    
    # Try age structure data first (has more years)
    age_path = backend_dir / 'data' / 'processed' / 'age_structure_2010_2026.csv'
    
    growth_data = []
    
    if age_path.exists():
        age_df = pd.read_csv(age_path)
        age_df['county'] = age_df['county'].str.upper()
        
        for county in age_df['county'].unique():
            county_data = age_df[age_df['county'] == county].sort_values('year')
            
            start_pop = county_data[county_data['year'] == start_year]['total_population'].values
            end_pop = county_data[county_data['year'] == end_year]['total_population'].values
            
            if len(start_pop) > 0 and len(end_pop) > 0 and start_pop[0] > 0:
                growth_rate = ((end_pop[0] - start_pop[0]) / start_pop[0]) * 100
                growth_data.append({
                    'county': county,
                    'growth_rate': growth_rate,
                    'start_population': int(start_pop[0]),
                    'end_population': int(end_pop[0])
                })
    
    # Also try county population data (2020-2024)
    pop_path = backend_dir / 'data' / 'processed' / 'county_population_2020_2024.csv'
    if pop_path.exists() and start_year >= 2020 and end_year <= 2024:
        pop_df = pd.read_csv(pop_path)
        pop_df['county'] = pop_df['county'].str.upper()
        
        for county in pop_df['county'].unique():
            county_data = pop_df[pop_df['county'] == county].sort_values('year')
            
            start_pop = county_data[county_data['year'] == start_year]['population'].values
            end_pop = county_data[county_data['year'] == end_year]['population'].values
            
            if len(start_pop) > 0 and len(end_pop) > 0 and start_pop[0] > 0:
                growth_rate = ((end_pop[0] - start_pop[0]) / start_pop[0]) * 100
                # Update if already exists, or add new
                existing = [i for i, item in enumerate(growth_data) if item['county'] == county]
                if existing:
                    growth_data[existing[0]]['growth_rate'] = growth_rate
                    growth_data[existing[0]]['start_population'] = int(start_pop[0])
                    growth_data[existing[0]]['end_population'] = int(end_pop[0])
                else:
                    growth_data.append({
                        'county': county,
                        'growth_rate': growth_rate,
                        'start_population': int(start_pop[0]),
                        'end_population': int(end_pop[0])
                    })
    
    return pd.DataFrame(growth_data)


def calculate_disease_burden(df: pd.DataFrame, county: str, year: int) -> Dict[str, float]:
    """
    Calculate disease burden by cohort for a county and year.
    
    Args:
        df: Operational data with Diagnosis column
        county: County name
        year: Year
    
    Returns:
        Dictionary with burden metrics by cohort
    """
    # Filter by county and year
    county_data = df[
        (df['PU City.1'].str.upper() == county.upper()) & 
        (df['year'] == year) &
        (df['Diagnosis'].notna())
    ].copy()
    
    if len(county_data) == 0:
        return {
            'geriatrics': 0.0,
            'pediatrics': 0.0,
            'trauma': 0.0,
            'other': 0.0,
            'total': 0.0
        }
    
    # Classify diagnoses
    county_data['cohort'] = county_data['Diagnosis'].apply(classify_diagnosis)
    
    # Count by cohort
    cohort_counts = county_data['cohort'].value_counts()
    total = len(county_data)
    
    result = {
        'geriatrics': float(cohort_counts.get('geriatrics', 0) / total * 100) if total > 0 else 0.0,
        'pediatrics': float(cohort_counts.get('pediatrics', 0) / total * 100) if total > 0 else 0.0,
        'trauma': float(cohort_counts.get('trauma', 0) / total * 100) if total > 0 else 0.0,
        'other': float(cohort_counts.get('other', 0) / total * 100) if total > 0 else 0.0,
        'total': float(total)
    }
    
    return result


def aggregate_county_data(
    df: pd.DataFrame,
    year: int,
    start_year_for_growth: Optional[int] = None,
    end_year_for_growth: Optional[int] = None
) -> pd.DataFrame:
    """
    Aggregate operational data by county and merge with demographic data.
    
    Args:
        df: Operational data
        year: Year to analyze
        start_year_for_growth: Start year for growth rate calculation (default: year - 1)
        end_year_for_growth: End year for growth rate calculation (default: year)
    
    Returns:
        DataFrame with county-level aggregated data
    """
    if start_year_for_growth is None:
        start_year_for_growth = year - 1
    if end_year_for_growth is None:
        end_year_for_growth = year
    
    # Extract year from dates
    df['tdate'] = pd.to_datetime(df['tdate'], errors='coerce')
    df['year'] = df['tdate'].dt.year
    df = df[df['year'] == year]
    
    # Filter Maine counties only
    maine_counties = [
        'ANDROSCOGGIN', 'AROOSTOOK', 'CUMBERLAND', 'FRANKLIN', 'HANCOCK',
        'KENNEBEC', 'KNOX', 'LINCOLN', 'OXFORD', 'PENOBSCOT', 'PISCATAQUIS',
        'SAGADAHOC', 'SOMERSET', 'WALDO', 'WASHINGTON', 'YORK'
    ]
    
    df['PU City.1'] = df['PU City.1'].str.upper()
    df = df[df['PU City.1'].isin(maine_counties)]
    
    # Aggregate by county
    county_agg = df.groupby('PU City.1').agg({
        'Incident Number': 'count'  # Count missions
    }).reset_index()
    county_agg.columns = ['county', 'total_missions']
    
    # Get demographic data
    demographics = get_county_demographics_data(year)
    demographics['county'] = demographics['county'].str.upper()
    
    # Merge demographics
    result = county_agg.merge(demographics, on='county', how='inner')
    
    # Calculate missions per 1,000 population
    result['missions_per_1000'] = (result['total_missions'] / result['total_population']) * 1000
    
    # Calculate population growth rate
    growth_df = calculate_population_growth_rate(start_year_for_growth, end_year_for_growth)
    growth_df['county'] = growth_df['county'].str.upper()
    result = result.merge(growth_df[['county', 'growth_rate']], on='county', how='left')
    result['growth_rate'] = result['growth_rate'].fillna(0.0)
    
    # Calculate disease burden by cohort
    disease_burdens = []
    for _, row in result.iterrows():
        burden = calculate_disease_burden(df, row['county'], year)
        disease_burdens.append({
            'county': row['county'],
            'geriatrics_burden': burden['geriatrics'],
            'pediatrics_burden': burden['pediatrics'],
            'trauma_burden': burden['trauma'],
            'other_burden': burden['other']
        })
    
    burden_df = pd.DataFrame(disease_burdens)
    result = result.merge(burden_df, on='county', how='left')
    
    # Fill missing burden data with 0
    for col in ['geriatrics_burden', 'pediatrics_burden', 'trauma_burden', 'other_burden']:
        result[col] = result[col].fillna(0.0)
    
    return result


def run_regression(
    data: pd.DataFrame,
    dependent_var: str = 'missions_per_1000',
    independent_vars: Optional[List[str]] = None
) -> Dict[str, Any]:
    """
    Run regression analysis on county-level data.
    
    Args:
        data: DataFrame with county-level aggregated data
        dependent_var: Dependent variable name
        independent_vars: List of independent variable names
    
    Returns:
        Dictionary with regression results including coefficients, CIs, R-squared, etc.
    """
    if independent_vars is None:
        independent_vars = ['pct_65plus', 'growth_rate']
    
    # Prepare data
    y = data[dependent_var].values
    X_data = data[independent_vars].copy()
    
    # Add constant for intercept
    X_data['const'] = 1.0
    X = X_data.values
    
    # Numpy fallback: simple linear regression using numpy
    coefficients, residuals, rank, s = np.linalg.lstsq(X, y, rcond=None)
    coef_dict = dict(zip(independent_vars + ['intercept'], coefficients))
    
    # Calculate R-squared
    y_pred = X @ coefficients
    ss_res = np.sum((y - y_pred) ** 2)
    ss_tot = np.sum((y - np.mean(y)) ** 2)
    r_squared = 1 - (ss_res / ss_tot) if ss_tot > 0 else 0.0
    
    # Simple confidence intervals (approximate)
    n = len(y)
    mse = ss_res / (n - len(coefficients)) if (n - len(coefficients)) > 0 else ss_res
    try:
        se = np.sqrt(np.diag(np.linalg.pinv(X.T @ X)) * mse)
        if SCIPY_AVAILABLE:
            t_critical = stats.t.ppf(0.975, n - len(coefficients)) if (n - len(coefficients)) > 0 else 1.96
        else:
            t_critical = 1.96  # Z-score approximation
        ci_lower = coefficients - t_critical * se
        ci_upper = coefficients + t_critical * se
    except:
        # Fallback: use simple approximation
        ci_lower = coefficients * 0.8
        ci_upper = coefficients * 1.2
    
    numpy_result = {
        'coefficients': coef_dict,
        'conf_intervals': {
            var: {'lower': float(ci_lower[i]), 'upper': float(ci_upper[i])}
            for i, var in enumerate(independent_vars + ['intercept'])
        },
        'r_squared': float(r_squared),
        'method': 'numpy_lstsq',
        'p_values': {var: 0.05 for var in independent_vars + ['intercept']}  # Placeholder
    }
    
    # Use statsmodels for better statistics
    if STATSMODELS_AVAILABLE:
        try:
            model = sm.OLS(y, X).fit()
            
            coef_dict = {}
            ci_dict = {}
            p_dict = {}
            
            # Get confidence intervals
            ci_df = model.conf_int(alpha=0.05)
            # Handle both DataFrame and numpy array cases
            if isinstance(ci_df, pd.DataFrame):
                ci_values = ci_df.values
            else:
                # It's a numpy array
                ci_values = ci_df
            
            # Map coefficients to variable names
            var_names = independent_vars + ['const']
            for i, var in enumerate(var_names):
                if i < len(model.params):
                    # Handle both Series and array cases for params
                    if isinstance(model.params, pd.Series):
                        coef_value = float(model.params.iloc[i])
                    else:
                        coef_value = float(model.params[i])
                    
                    coef_dict[var] = coef_value
                    ci_dict[var] = {'lower': float(ci_values[i, 0]), 'upper': float(ci_values[i, 1])}
                    
                    # Handle pvalues similarly
                    if isinstance(model.pvalues, pd.Series):
                        p_dict[var] = float(model.pvalues.iloc[i])
                    else:
                        p_dict[var] = float(model.pvalues[i])
            
            return {
                'coefficients': coef_dict,
                'conf_intervals': ci_dict,
                'r_squared': float(model.rsquared),
                'adj_r_squared': float(model.rsquared_adj),
                'f_statistic': float(model.fvalue),
                'p_values': p_dict,
                'method': 'statsmodels_ols',
                'summary': str(model.summary())
            }
        except Exception as e:
            # Fallback to numpy if statsmodels fails
            print(f"Warning: statsmodels regression failed: {e}, using numpy fallback")
            return numpy_result
    
    # Return the numpy fallback result (already computed above)
    return numpy_result


def calculate_marginal_effects(
    data: pd.DataFrame,
    regression_results: Dict[str, Any],
    cohort: str = 'geriatrics'
) -> Dict[str, float]:
    """
    Calculate marginal effects by cohort.
    
    Args:
        data: County-level aggregated data
        regression_results: Results from run_regression
        cohort: Cohort name ('geriatrics', 'pediatrics', 'trauma')
    
    Returns:
        Dictionary with marginal effect statistics
    """
    burden_col = f'{cohort}_burden'
    
    if burden_col not in data.columns:
        return {
            'mean': 0.0,
            'median': 0.0,
            'std': 0.0,
            'min': 0.0,
            'max': 0.0
        }
    
    cohort_data = data[burden_col].values
    
    # Calculate marginal effect (simplified: using burden as proxy for elasticity)
    # In reality, this would be the partial derivative or coefficient from a regression
    # For now, we calculate the correlation and average impact
    
    missions_per_1000 = data['missions_per_1000'].values
    
    if len(cohort_data) > 1 and np.std(cohort_data) > 0:
        correlation = np.corrcoef(cohort_data, missions_per_1000)[0, 1]
        # Marginal effect approximation: correlation * std(missions) / std(burden)
        marginal_effect = correlation * (np.std(missions_per_1000) / np.std(cohort_data)) if np.std(cohort_data) > 0 else 0
    else:
        marginal_effect = 0.0
        correlation = 0.0
    
    return {
        'mean': float(np.mean(cohort_data)),
        'median': float(np.median(cohort_data)),
        'std': float(np.std(cohort_data)),
        'min': float(np.min(cohort_data)),
        'max': float(np.max(cohort_data)),
        'marginal_effect': float(marginal_effect),
        'correlation': float(correlation)
    }


def get_demographics_elasticity(
    year: int,
    start_year_for_growth: Optional[int] = None,
    end_year_for_growth: Optional[int] = None,
    independent_vars: Optional[List[str]] = None
) -> Dict[str, Any]:
    """
    Main function to get demographics elasticity analysis results.
    
    Args:
        year: Year to analyze
        start_year_for_growth: Start year for growth rate calculation
        end_year_for_growth: End year for growth rate calculation
        independent_vars: List of independent variables for regression
    
    Returns:
        Dictionary with analysis results
    """
    from utils.getData import read_data
    
    if independent_vars is None:
        independent_vars = ['pct_65plus', 'growth_rate']
    
    df = read_data()
    county_data = aggregate_county_data(df, year, start_year_for_growth, end_year_for_growth)
    
    # Run regression
    regression_results = run_regression(county_data, 'missions_per_1000', independent_vars)
    
    # Calculate marginal effects by cohort
    marginal_effects = {}
    for cohort in ['geriatrics', 'pediatrics', 'trauma']:
        marginal_effects[cohort] = calculate_marginal_effects(county_data, regression_results, cohort)
    
    # Prepare scatter plot data
    scatter_data = []
    for _, row in county_data.iterrows():
        scatter_data.append({
            'county': row['county'],
            'missions_per_1000': float(row['missions_per_1000']),
            'pct_65plus': float(row['pct_65plus']),
            'growth_rate': float(row['growth_rate']),
            'total_missions': int(row['total_missions']),
            'total_population': int(row['total_population'])
        })
    
    # Calculate fitted values for regression line
    fitted_values = []
    if 'pct_65plus' in independent_vars and 'pct_65plus' in regression_results['coefficients']:
        x_min = county_data['pct_65plus'].min()
        x_max = county_data['pct_65plus'].max()
        x_range = np.linspace(x_min, x_max, 50)
        
        coef = regression_results['coefficients']
        intercept = coef.get('intercept', 0)
        pct_65plus_coef = coef.get('pct_65plus', 0)
        growth_coef = coef.get('growth_rate', 0)
        
        # Calculate fitted values (using mean growth_rate for the line)
        mean_growth = county_data['growth_rate'].mean()
        
        for x in x_range:
            y_fitted = intercept + pct_65plus_coef * x + growth_coef * mean_growth
            fitted_values.append({
                'x': float(x),
                'y': float(y_fitted)
            })
    
    return {
        'scatter_data': scatter_data,
        'fitted_values': fitted_values,
        'regression_results': regression_results,
        'marginal_effects': marginal_effects,
        'metadata': {
            'year': year,
            'n_counties': len(county_data),
            'independent_vars': independent_vars
        }
    }

