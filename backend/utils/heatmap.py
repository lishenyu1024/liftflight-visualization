import folium
import json
import os
from folium.plugins import HeatMap
import pandas as pd
from typing import Dict, Tuple, Optional, List


def get_city_coordinates() -> Dict[str, Tuple[float, float]]:
    """
    Load city coordinates from JSON file.
    
    Returns:
        Dictionary mapping city names to (latitude, longitude) tuples.
    """
    with open(os.path.join(os.path.dirname(__file__), '..','data', 'city_coordinates.json'), 'r') as f:
        city_coordinates = json.load(f)
    return city_coordinates


def process_city_demand(
    df: pd.DataFrame,
    city_coordinates: Optional[Dict[str, Tuple[float, float]]] = None
) -> pd.DataFrame:
    """
    Process city demand data and add coordinate information.
    
    Args:
        df: DataFrame containing 'PU City' column
        city_coordinates: Dictionary mapping city names to (lat, lon) tuples.
                         If None, uses default coordinates.
    
    Returns:
        Processed DataFrame with latitude, longitude, and task_count columns.
    """
    if city_coordinates is None:
        city_coordinates = get_city_coordinates()
    
    # Aggregate task demand by city
    city_demand = df.groupby('PU City').size().reset_index(name='task_count')
    
    # Add coordinates
    city_demand['latitude'] = city_demand['PU City'].apply(
        lambda x: city_coordinates.get(x, (None, None))[0]
    )
    city_demand['longitude'] = city_demand['PU City'].apply(
        lambda x: city_coordinates.get(x, (None, None))[1]
    )
    
    # Remove rows with missing coordinates
    city_demand.dropna(subset=['latitude', 'longitude'], inplace=True)
    
    return city_demand


def create_heatmap(
    city_demand: pd.DataFrame,
    center_lat: Optional[float] = None,
    center_lon: Optional[float] = None,
    zoom_start: int = 6,
    radius: int = 10
) -> folium.Map:
    """
    Create a heatmap visualization.
    
    Args:
        city_demand: DataFrame containing latitude, longitude, and task_count columns
        center_lat: Map center latitude. If None, uses mean of data latitudes.
        center_lon: Map center longitude. If None, uses mean of data longitudes.
        zoom_start: Initial zoom level
        radius: Heatmap radius
    
    Returns:
        folium.Map object
    """
    if center_lat is None:
        center_lat = city_demand['latitude'].mean()
    if center_lon is None:
        center_lon = city_demand['longitude'].mean()
    
    m = folium.Map(
        location=[center_lat, center_lon],
        zoom_start=zoom_start
    )
    # Prepare heatmap data: [[lat, lon, weight], ...]
    heatmap_data = city_demand[['latitude', 'longitude', 'task_count']].values.tolist()
    
    # Add heatmap layer
    HeatMap(data=heatmap_data, radius=radius).add_to(m)
    
    return m

def generate_city_demand_heatmap(
    df: pd.DataFrame,
    city_coordinates: Optional[Dict[str, Tuple[float, float]]] = None,
    zoom_start: int = 6,
    radius: int = 10
) -> folium.Map:
    """
    Complete workflow: Generate heatmap from raw data.
    
    Args:
        df: Raw DataFrame containing 'PU City' column
        city_coordinates: Dictionary mapping city names to coordinates
        zoom_start: Initial zoom level
        radius: Heatmap radius
    
    Returns:
        folium.Map object
    """
    # Process data
    city_demand = process_city_demand(df, city_coordinates)
    
    # Generate map
    m = create_heatmap(city_demand, zoom_start=zoom_start, radius=radius)
    
    return m

def map_to_html(map_obj: folium.Map) -> str:
    """
    Convert folium map object to HTML string.
    
    Args:
        map_obj: folium.Map object
    
    Returns:
        HTML string
    """
    return map_obj._repr_html_()