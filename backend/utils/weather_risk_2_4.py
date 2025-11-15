# backend/utils/weather_risk_2_4.py
"""
Weather-Driven Risk Boxes utility functions.

This module provides functions to analyze the relationship between extreme weather
and emergency medical demand using stratified analysis.

Chart 2.4: Weather-Driven Risk Boxes (Extreme Weather Frequency vs. Demand)
- Stratify by quantiles of extreme-weather days
- Boxplots of mission distribution
- Guides contingency staffing/aircraft redundancy policies
"""

import pandas as pd
import numpy as np
from typing import Dict, List, Optional, Any
from pathlib import Path


def load_weather_data() -> pd.DataFrame:
    """Load weather data from CSV file."""
    backend_dir = Path(__file__).parent.parent
    weather_path = backend_dir / 'data' / '1_demand_forecasting' / 'maine_weather_1997_2025.csv'
    
    if not weather_path.exists():
        raise FileNotFoundError(f"Weather data not found: {weather_path}")
    
    df = pd.read_csv(weather_path)
    return df


def load_operational_with_weather() -> pd.DataFrame:
    """Load operational data with weather merged."""
    backend_dir = Path(__file__).parent.parent
    ops_weather_path = backend_dir / 'data' / 'processed' / 'operational_with_weather.csv'
    
    if ops_weather_path.exists():
        df = pd.read_csv(ops_weather_path)
        return df
    
    # If merged data doesn't exist, try to merge on the fly
    from utils.getData import read_data
    
    ops_df = read_data()
    weather_df = load_weather_data()
    
    # Simple merge: match by month/year
    ops_df['tdate'] = pd.to_datetime(ops_df['tdate'], errors='coerce')
    ops_df['year'] = ops_df['tdate'].dt.year
    ops_df['month'] = ops_df['tdate'].dt.month
    
    # Parse month from weather data
    weather_df['month_name'] = weather_df['Month'].str.split(', ').str[0]
    weather_df['year'] = weather_df['Month'].str.split(', ').str[1].astype(int)
    month_map = {
        'January': 1, 'February': 2, 'March': 3, 'April': 4, 'May': 5, 'June': 6,
        'July': 7, 'August': 8, 'September': 9, 'October': 10, 'November': 11, 'December': 12
    }
    weather_df['month'] = weather_df['month_name'].map(month_map)
    
    # Merge
    merged_df = ops_df.merge(
        weather_df[['year', 'month', 'AvgTemp', 'MinTemp', 'MaxTemp', 'Precip']],
        on=['year', 'month'],
        how='left'
    )
    
    # Rename columns to match expected format
    merged_df = merged_df.rename(columns={
        'AvgTemp': 'avg_temp',
        'MinTemp': 'min_temp',
        'MaxTemp': 'max_temp',
        'Precip': 'precip'
    })
    
    return merged_df


def define_extreme_weather_days(
    weather_df: pd.DataFrame,
    method: str = 'precipitation'
) -> pd.DataFrame:
    """
    Define extreme weather days based on various criteria.
    
    Args:
        weather_df: Weather data DataFrame
        method: Method to define extreme weather ('precipitation', 'temperature', 'combined')
    
    Returns:
        DataFrame with extreme_weather flag
    """
    df = weather_df.copy()
    
    if method == 'precipitation':
        # Define extreme precipitation (e.g., > 95th percentile)
        precip_threshold = df['Precip'].quantile(0.95) if 'Precip' in df.columns else 0
        df['extreme_weather'] = (df['Precip'] > precip_threshold).astype(int)
        
    elif method == 'temperature':
        # Define extreme temperature (very hot or very cold)
        if 'AvgTemp' in df.columns:
            temp_95th = df['AvgTemp'].quantile(0.95)
            temp_5th = df['AvgTemp'].quantile(0.05)
            df['extreme_weather'] = ((df['AvgTemp'] > temp_95th) | (df['AvgTemp'] < temp_5th)).astype(int)
        else:
            df['extreme_weather'] = 0
            
    elif method == 'combined':
        # Combine precipitation and temperature
        precip_threshold = df['Precip'].quantile(0.95) if 'Precip' in df.columns else 0
        if 'AvgTemp' in df.columns:
            temp_95th = df['AvgTemp'].quantile(0.95)
            temp_5th = df['AvgTemp'].quantile(0.05)
            extreme_temp = (df['AvgTemp'] > temp_95th) | (df['AvgTemp'] < temp_5th)
        else:
            extreme_temp = False
        
        extreme_precip = (df['Precip'] > precip_threshold) if 'Precip' in df.columns else False
        df['extreme_weather'] = (extreme_precip | extreme_temp).astype(int)
    
    return df


def calculate_extreme_weather_frequency(
    weather_df: pd.DataFrame,
    aggregation_level: str = 'month'
) -> pd.DataFrame:
    """
    Calculate frequency of extreme weather days by time period.
    
    Args:
        weather_df: Weather data with extreme_weather flag
        aggregation_level: 'month', 'year', or 'quarter'
    
    Returns:
        DataFrame with extreme weather frequency by period
    """
    df = weather_df.copy()
    
    # Parse date from Month column (format: "Month, Year")
    if 'Month' in df.columns:
        df['month_name'] = df['Month'].str.split(', ').str[0]
        df['year'] = df['Month'].str.split(', ').str[1].astype(int)
        month_map = {
            'January': 1, 'February': 2, 'March': 3, 'April': 4, 'May': 5, 'June': 6,
            'July': 7, 'August': 8, 'September': 9, 'October': 10, 'November': 11, 'December': 12
        }
        df['month'] = df['month_name'].map(month_map)
        df['date'] = pd.to_datetime(df[['year', 'month']].assign(day=1))
    elif 'Date' in df.columns:
        df['date'] = pd.to_datetime(df['Date'], errors='coerce')
    elif 'Year' in df.columns and 'month' in df.columns:
        df['date'] = pd.to_datetime(df[['Year', 'month']].assign(day=1))
    else:
        raise ValueError("Cannot parse date from weather data")
    
    df = df[df['date'].notna()]
    
    # Aggregate by period
    if aggregation_level == 'month':
        df['period'] = df['date'].dt.to_period('M')
    elif aggregation_level == 'quarter':
        df['period'] = df['date'].dt.to_period('Q')
    elif aggregation_level == 'year':
        df['period'] = df['date'].dt.year
    else:
        raise ValueError(f"Unknown aggregation_level: {aggregation_level}")
    
    # Calculate extreme weather frequency
    period_agg = df.groupby('period').agg({
        'extreme_weather': 'sum',  # Count of extreme weather days
        'date': 'count'  # Total days in period
    }).reset_index()
    period_agg.columns = ['period', 'extreme_days', 'total_days']
    period_agg['extreme_frequency'] = period_agg['extreme_days'] / period_agg['total_days'] * 100
    
    return period_agg


def stratify_by_weather_quantiles(
    merged_df: pd.DataFrame,
    quantiles: List[float] = [0.0, 0.25, 0.5, 0.75, 1.0]
) -> pd.DataFrame:
    """
    Stratify operational data by extreme weather frequency quantiles.
    
    Args:
        merged_df: Operational data with weather information
        quantiles: List of quantile thresholds
    
    Returns:
        DataFrame with weather_quantile label added
    """
    df = merged_df.copy()
    
    # Extract date from operational data
    df['tdate'] = pd.to_datetime(df['tdate'], errors='coerce')
    df = df[df['tdate'].notna()]
    df['year'] = df['tdate'].dt.year
    df['month'] = df['tdate'].dt.month
    
    # Get weather data and calculate extreme weather frequency
    weather_df = load_weather_data()
    weather_df = define_extreme_weather_days(weather_df, method='precipitation')
    weather_freq = calculate_extreme_weather_frequency(weather_df, aggregation_level='month')
    
    # Convert period to year-month for merging
    weather_freq['year'] = weather_freq['period'].astype(str).str[:4].astype(int)
    weather_freq['month'] = weather_freq['period'].astype(str).str[5:7].astype(int)
    
    # Merge weather frequency with operational data
    df = df.merge(
        weather_freq[['year', 'month', 'extreme_frequency']],
        on=['year', 'month'],
        how='left'
    )
    
    # Calculate quantiles of extreme_frequency
    df['extreme_frequency'] = df['extreme_frequency'].fillna(0)
    quantile_values = df['extreme_frequency'].quantile(quantiles).values
    
    # Assign quantile labels
    def assign_quantile(value):
        for i in range(len(quantile_values) - 1):
            if quantile_values[i] <= value < quantile_values[i + 1]:
                return f"Q{i+1} ({quantile_values[i]:.1f}-{quantile_values[i+1]:.1f}%)"
        return f"Q{len(quantile_values)} ({quantile_values[-1]:.1f}%+)"
    
    df['weather_quantile'] = df['extreme_frequency'].apply(assign_quantile)
    
    return df


def calculate_mission_distribution_by_weather(
    merged_df: pd.DataFrame,
    aggregation_level: str = 'day'
) -> Dict[str, Any]:
    """
    Calculate mission count distribution by weather quantile.
    
    Args:
        merged_df: Operational data with weather quantile labels
        aggregation_level: 'day', 'month', 'week'
    
    Returns:
        Dictionary with boxplot data for each weather quantile
    """
    df = merged_df.copy()
    
    # Extract date components
    df['tdate'] = pd.to_datetime(df['tdate'], errors='coerce')
    df = df[df['tdate'].notna()]
    
    # Aggregate by period and weather quantile
    if aggregation_level == 'day':
        df['period'] = df['tdate'].dt.date
    elif aggregation_level == 'month':
        df['period'] = df['tdate'].dt.to_period('M')
    elif aggregation_level == 'week':
        df['period'] = df['tdate'].dt.to_period('W')
    else:
        raise ValueError(f"Unknown aggregation_level: {aggregation_level}")
    
    # Count missions by period and weather quantile
    period_agg = df.groupby(['period', 'weather_quantile']).agg({
        'Incident Number': 'count'
    }).reset_index()
    period_agg.columns = ['period', 'weather_quantile', 'mission_count']
    
    # Prepare boxplot data
    boxplot_data = {}
    for quantile in period_agg['weather_quantile'].unique():
        quantile_data = period_agg[period_agg['weather_quantile'] == quantile]['mission_count'].values
        
        if len(quantile_data) > 0:
            boxplot_data[quantile] = {
                'values': quantile_data.tolist(),
                'min': float(np.min(quantile_data)),
                'q1': float(np.percentile(quantile_data, 25)),
                'median': float(np.median(quantile_data)),
                'q3': float(np.percentile(quantile_data, 75)),
                'max': float(np.max(quantile_data)),
                'mean': float(np.mean(quantile_data)),
                'std': float(np.std(quantile_data)),
                'count': int(len(quantile_data))
            }
    
    return boxplot_data


def get_weather_risk_analysis(
    method: str = 'precipitation',
    aggregation_level: str = 'day',
    quantiles: Optional[List[float]] = None
) -> Dict[str, Any]:
    """
    Main function to get weather risk analysis results.
    
    Args:
        method: Method to define extreme weather ('precipitation', 'temperature', 'combined')
        aggregation_level: Level to aggregate missions ('day', 'month', 'week')
        quantiles: List of quantile thresholds (default: [0.0, 0.25, 0.5, 0.75, 1.0])
    
    Returns:
        Dictionary with weather risk analysis results
    """
    if quantiles is None:
        quantiles = [0.0, 0.25, 0.5, 0.75, 1.0]
    
    # Load and prepare data
    ops_df = load_operational_with_weather()
    ops_df = stratify_by_weather_quantiles(ops_df, quantiles)
    
    # Calculate mission distribution
    boxplot_data = calculate_mission_distribution_by_weather(ops_df, aggregation_level)
    
    # Prepare data for visualization
    boxplot_series = []
    for quantile, stats in sorted(boxplot_data.items()):
        boxplot_series.append({
            'quantile': quantile,
            'min': stats['min'],
            'q1': stats['q1'],
            'median': stats['median'],
            'q3': stats['q3'],
            'max': stats['max'],
            'mean': stats['mean'],
            'outliers': [v for v in stats['values'] if v < stats['q1'] - 1.5 * (stats['q3'] - stats['q1']) or v > stats['q3'] + 1.5 * (stats['q3'] - stats['q1'])]
        })
    
    return {
        'boxplot_data': boxplot_series,
        'metadata': {
            'method': method,
            'aggregation_level': aggregation_level,
            'quantiles': quantiles,
            'n_quantiles': len(boxplot_series)
        }
    }

