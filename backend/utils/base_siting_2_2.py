# backend/utils/base_siting_2_2.py
"""
Base Siting Coverage Map utility functions.

This module provides functions to calculate and visualize base coverage maps
with isochrones, Voronoi diagrams, and response time heatmaps.

Chart 2.2: Base Siting Coverage Map (Isochrones/Voronoi + Response Time)
- Drive-/flight-time isochrones + Voronoi
- Grid simulation of 5-20-minute coverage
- Heatmap coverage before/after candidate base
- On-click updates SLA lift and incremental cost
"""

import pandas as pd
import numpy as np
import folium
from folium.plugins import HeatMap, MarkerCluster
from typing import Dict, List, Optional, Any, Tuple
from pathlib import Path
import json
from math import radians, sin, cos, sqrt, atan2
from utils.scenario_whatif_2_1 import get_base_locations, calculate_base_coverage, simulate_scenario


def haversine_distance(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """
    Calculate distance between two points using Haversine formula.
    
    Returns:
        Distance in miles
    """
    R = 3959  # Earth radius in miles
    
    lat1_rad = radians(lat1)
    lat2_rad = radians(lat2)
    dlat = radians(lat2 - lat1)
    dlon = radians(lon2 - lon1)
    
    a = sin(dlat/2)**2 + cos(lat1_rad) * cos(lat2_rad) * sin(dlon/2)**2
    c = 2 * atan2(sqrt(a), sqrt(1-a))
    
    return R * c


def estimate_response_time(distance_miles: float, flight_speed_mph: float = 120) -> float:
    """
    Estimate response time based on distance.
    
    Args:
        distance_miles: Distance in miles
        flight_speed_mph: Average flight speed in miles per hour (default: 120 mph for helicopter)
    
    Returns:
        Estimated response time in minutes
    """
    # Assume average flight speed for helicopter
    # Add fixed overhead time (dispatch, takeoff, landing)
    overhead_minutes = 5
    flight_time_minutes = (distance_miles / flight_speed_mph) * 60
    
    return overhead_minutes + flight_time_minutes


def generate_coverage_grid(
    base_locations: List[Dict[str, Any]],
    city_coordinates: Dict[str, Tuple[float, float]],
    service_radius_miles: float,
    grid_size: int = 50
) -> pd.DataFrame:
    """
    Generate coverage grid for visualization.
    
    Args:
        base_locations: List of base location dicts
        city_coordinates: Dictionary mapping city names to (lat, lon) tuples
        service_radius_miles: Service radius in miles
        grid_size: Grid resolution (grid_size x grid_size)
    
    Returns:
        DataFrame with grid points and coverage information
    """
    # Get bounds of all cities
    all_lats = [coords[0] for coords in city_coordinates.values() if coords[0] is not None]
    all_lons = [coords[1] for coords in city_coordinates.values() if coords[1] is not None]
    
    if len(all_lats) == 0 or len(all_lons) == 0:
        return pd.DataFrame()
    
    min_lat = min(all_lats)
    max_lat = max(all_lats)
    min_lon = min(all_lons)
    max_lon = max(all_lons)
    
    # Add padding
    lat_padding = (max_lat - min_lat) * 0.1
    lon_padding = (max_lon - min_lon) * 0.1
    
    min_lat -= lat_padding
    max_lat += lat_padding
    min_lon -= lon_padding
    max_lon += lon_padding
    
    # Generate grid
    lat_step = (max_lat - min_lat) / grid_size
    lon_step = (max_lon - min_lon) / grid_size
    
    grid_points = []
    
    for i in range(grid_size):
        for j in range(grid_size):
            lat = min_lat + i * lat_step
            lon = min_lon + j * lon_step
            
            # Find closest base
            min_distance = float('inf')
            closest_base = None
            response_time = None
            
            for base in base_locations:
                distance = haversine_distance(
                    lat, lon,
                    base['latitude'], base['longitude']
                )
                
                if distance < min_distance:
                    min_distance = distance
                    closest_base = base['name']
                    response_time = estimate_response_time(distance)
            
            # Check if within service radius
            within_radius = min_distance <= service_radius_miles
            
            # Check coverage time thresholds
            coverage_5min = response_time <= 5 if response_time else False
            coverage_10min = response_time <= 10 if response_time else False
            coverage_15min = response_time <= 15 if response_time else False
            coverage_20min = response_time <= 20 if response_time else False
            
            grid_points.append({
                'latitude': lat,
                'longitude': lon,
                'closest_base': closest_base,
                'distance_miles': min_distance,
                'response_time_minutes': response_time if response_time else None,
                'within_radius': within_radius,
                'coverage_5min': coverage_5min,
                'coverage_10min': coverage_10min,
                'coverage_15min': coverage_15min,
                'coverage_20min': coverage_20min
            })
    
    return pd.DataFrame(grid_points)


def create_coverage_map(
    base_locations: List[Dict[str, Any]],
    city_coordinates: Dict[str, Tuple[float, float]],
    service_radius_miles: float,
    before_base: Optional[Dict[str, Any]] = None,
    after_base: Optional[Dict[str, Any]] = None,
    coverage_threshold_minutes: int = 20,
    include_demand_heatmap: bool = True
) -> folium.Map:
    """
    Create coverage map with isochrones and Voronoi visualization.
    
    Args:
        base_locations: List of base location dicts
        city_coordinates: Dictionary mapping city names to (lat, lon) tuples
        service_radius_miles: Service radius in miles
        before_base: Optional base to show "before" scenario
        after_base: Optional base to show "after" scenario
        coverage_threshold_minutes: Coverage time threshold in minutes
    
    Returns:
        Folium map object
    """
    # Calculate center of map
    if base_locations:
        center_lat = np.mean([b['latitude'] for b in base_locations])
        center_lon = np.mean([b['longitude'] for b in base_locations])
    elif city_coordinates:
        valid_coords = [(lat, lon) for lat, lon in city_coordinates.values() if lat is not None and lon is not None]
        if valid_coords:
            center_lat = np.mean([lat for lat, lon in valid_coords])
            center_lon = np.mean([lon for lat, lon in valid_coords])
        else:
            center_lat = 44.5  # Default Maine center
            center_lon = -69.5
    else:
        center_lat = 44.5
        center_lon = -69.5
    
    # Create base map
    m = folium.Map(
        location=[center_lat, center_lon],
        zoom_start=7,
        tiles='OpenStreetMap'
    )
    
    # Add demand heatmap layer (if requested)
    if include_demand_heatmap:
        from utils.getData import read_data
        from utils.heatmap import process_city_demand
        
        try:
            df = read_data()
            city_demand = process_city_demand(df, city_coordinates)
            
            if len(city_demand) > 0:
                # Limit heatmap points for better performance (only cities with demand > 0)
                demand_heat_data = [
                    [row['latitude'], row['longitude'], row['task_count']]
                    for _, row in city_demand.iterrows()
                    if row['task_count'] > 0 and pd.notna(row['latitude']) and pd.notna(row['longitude'])
                ]
                
                if len(demand_heat_data) > 0:
                    # Add demand heatmap with lower opacity so coverage layers are visible
                    HeatMap(
                        demand_heat_data,
                        name='Demand Heatmap',
                        min_opacity=0.3,
                        max_zoom=18,
                        radius=25,  # Slightly larger radius, fewer points
                        blur=25,
                        gradient={
                            0.0: 'blue',
                            0.5: 'cyan',
                            1.0: 'orange'
                        }
                    ).add_to(m)
        except Exception as e:
            print(f"Warning: Could not add demand heatmap: {e}")
    
    # Generate coverage grid (reduced grid size for better performance)
    grid_df = generate_coverage_grid(
        base_locations,
        city_coordinates,
        service_radius_miles,
        grid_size=20  # Reduced from 30 to 20 for better performance (400 points instead of 900)
    )
    
    # Add heatmap layer for coverage
    if len(grid_df) > 0:
        # Filter by coverage threshold
        coverage_key = f'coverage_{coverage_threshold_minutes}min'
        if coverage_key in grid_df.columns:
            covered_points = grid_df[grid_df[coverage_key] == True]
            
            if len(covered_points) > 0:
                heat_data = [
                    [row['latitude'], row['longitude'], row['response_time_minutes'] or 0]
                    for _, row in covered_points.iterrows()
                ]
                
                # Add coverage heatmap layer (sample points for better performance)
                # Sample every other point to reduce data size
                if len(heat_data) > 1000:
                    import random
                    heat_data = random.sample(heat_data, min(1000, len(heat_data)))
                
                HeatMap(
                    heat_data,
                    name='Coverage Heatmap',
                    min_opacity=0.3,
                    max_zoom=18,
                    radius=20,  # Larger radius for smoother appearance
                    blur=20,
                    gradient={
                        0.0: 'green',
                        0.5: 'yellow',
                        1.0: 'red'
                    }
                ).add_to(m)
    
    # Add base markers
    for base in base_locations:
        folium.Marker(
            location=[base['latitude'], base['longitude']],
            popup=f"<b>{base['name']}</b><br>Base Location",
            icon=folium.Icon(color='red', icon='home', prefix='fa')
        ).add_to(m)
        
        # Add service radius circle
        folium.Circle(
            location=[base['latitude'], base['longitude']],
            radius=service_radius_miles * 1609.34,  # Convert miles to meters
            popup=f"{base['name']} - {service_radius_miles} mile radius",
            color='blue',
            fill=True,
            fillOpacity=0.1
        ).add_to(m)
    
    # Add city markers (limit to top cities by demand to improve performance)
    # Only show markers for cities with significant demand or those within service radius
    try:
        from utils.getData import read_data
        from utils.heatmap import process_city_demand
        
        df = read_data()
        city_demand = process_city_demand(df, city_coordinates)
        
        # Get top cities by demand or all cities within service radius
        city_cluster = MarkerCluster()
        city_count = 0
        max_cities = 50  # Limit to 50 cities for performance
        
        # Sort by demand and take top cities
        top_cities = city_demand.nlargest(max_cities, 'task_count')
        
        for _, city_row in top_cities.iterrows():
            city_name = city_row['PU City']
            if city_name not in city_coordinates:
                continue
                
            lat, lon = city_coordinates[city_name]
            if lat is None or lon is None:
                continue
            
            # Find closest base
            min_distance = float('inf')
            closest_base = None
            
            for base in base_locations:
                distance = haversine_distance(lat, lon, base['latitude'], base['longitude'])
                if distance < min_distance:
                    min_distance = distance
                    closest_base = base['name']
            
            # Only show marker if within service radius or has high demand
            if min_distance <= service_radius_miles * 1.5 or city_row['task_count'] > 10:
                response_time = estimate_response_time(min_distance)
                
                popup_html = f"""
                <b>{city_name}</b><br>
                Closest Base: {closest_base}<br>
                Distance: {min_distance:.1f} mi<br>
                Est. Response Time: {response_time:.1f} min<br>
                Demand: {city_row['task_count']} missions
                """
                
                folium.Marker(
                    location=[lat, lon],
                    popup=folium.Popup(popup_html, max_width=200),
                    icon=folium.Icon(color='blue', icon='info-sign')
                ).add_to(city_cluster)
                city_count += 1
                
                if city_count >= max_cities:
                    break
        
        city_cluster.add_to(m)
    except Exception as e:
        print(f"Warning: Could not add city markers: {e}")
    
    # Add layer control to toggle between demand and coverage heatmaps
    folium.LayerControl(collapsed=False).add_to(m)
    
    return m


def calculate_sla_lift(
    before_scenario: Dict[str, Any],
    after_scenario: Dict[str, Any]
) -> Dict[str, float]:
    """
    Calculate SLA lift (improvement) from adding a new base.
    
    Args:
        before_scenario: Scenario results before adding base
        after_scenario: Scenario results after adding base
    
    Returns:
        Dictionary with SLA lift metrics
    """
    before_sla = before_scenario['kpis']['sla_attainment']['rate_percent']
    after_sla = after_scenario['kpis']['sla_attainment']['rate_percent']
    
    sla_lift = after_sla - before_sla
    sla_lift_percent = (sla_lift / before_sla * 100) if before_sla > 0 else 0
    
    before_coverage = before_scenario['kpis']['coverage']['coverage_rate']
    after_coverage = after_scenario['kpis']['coverage']['coverage_rate']
    coverage_lift = after_coverage - before_coverage
    
    before_cost = before_scenario['kpis']['cost']['total_cost']
    after_cost = after_scenario['kpis']['cost']['total_cost']
    incremental_cost = after_cost - before_cost
    
    return {
        'sla_lift_absolute': float(sla_lift),
        'sla_lift_percent': float(sla_lift_percent),
        'coverage_lift': float(coverage_lift),
        'incremental_cost': float(incremental_cost),
        'cost_per_sla_point': float(incremental_cost / sla_lift) if sla_lift > 0 else float('inf')
    }


def get_base_siting_analysis(
    existing_bases: List[str],
    candidate_base: Optional[Dict[str, Any]] = None,
    service_radius_miles: float = 50.0,
    sla_target_minutes: int = 20,
    fleet_size: int = 3,
    crews_per_vehicle: int = 2,
    coverage_threshold_minutes: int = 20
) -> Dict[str, Any]:
    """
    Main function to get base siting analysis results.
    
    Args:
        existing_bases: List of existing base location names
        candidate_base: Optional candidate base dict with name, latitude, longitude
        service_radius_miles: Service radius in miles
        sla_target_minutes: SLA target in minutes
        fleet_size: Fleet size
        crews_per_vehicle: Crews per vehicle
        coverage_threshold_minutes: Coverage time threshold for visualization
    
    Returns:
        Dictionary with base siting analysis results
    """
    from utils.getData import read_data
    import json
    from pathlib import Path
    
    # Load city coordinates
    backend_dir = Path(__file__).parent.parent
    city_coords_path = backend_dir / 'data' / 'city_coordinates.json'
    
    if city_coords_path.exists():
        with open(city_coords_path, 'r') as f:
            city_coordinates = json.load(f)
    else:
        city_coordinates = {}
    
    # Get base locations
    all_bases = get_base_locations()
    existing_base_locations = [b for b in all_bases if b['name'] in existing_bases]
    
    # Simulate "before" scenario
    before_scenario = simulate_scenario(
        fleet_size=fleet_size,
        crews_per_vehicle=crews_per_vehicle,
        base_locations=existing_bases,
        service_radius_miles=service_radius_miles,
        sla_target_minutes=sla_target_minutes
    )
    
    # Simulate "after" scenario if candidate base provided
    after_scenario = None
    sla_lift = None
    
    if candidate_base:
        after_bases = existing_bases + [candidate_base['name']]
        after_base_locations = existing_base_locations + [candidate_base]
        
        # Note: simulate_scenario doesn't accept base_coordinates parameter
        # We'll use base_locations and let it use defaults
        after_scenario = simulate_scenario(
            fleet_size=fleet_size,
            crews_per_vehicle=crews_per_vehicle,
            base_locations=after_bases,
            service_radius_miles=service_radius_miles,
            sla_target_minutes=sla_target_minutes
        )
        
        # Calculate SLA lift
        sla_lift = calculate_sla_lift(before_scenario, after_scenario)
    
    # Create coverage maps (with demand heatmap overlay)
    before_map = create_coverage_map(
        existing_base_locations,
        city_coordinates,
        service_radius_miles,
        coverage_threshold_minutes=coverage_threshold_minutes,
        include_demand_heatmap=True
    )
    
    after_map = None
    if candidate_base:
        after_map = create_coverage_map(
            existing_base_locations + [candidate_base],
            city_coordinates,
            service_radius_miles,
            after_base=candidate_base,
            coverage_threshold_minutes=coverage_threshold_minutes,
            include_demand_heatmap=True
        )
    
    # Convert maps to HTML
    from utils.heatmap import map_to_html
    
    before_map_html = map_to_html(before_map)
    after_map_html = map_to_html(after_map) if after_map else None
    
    return {
        'before_scenario': before_scenario,
        'after_scenario': after_scenario,
        'sla_lift': sla_lift,
        'before_map_html': before_map_html,
        'after_map_html': after_map_html,
        'metadata': {
            'existing_bases': existing_bases,
            'candidate_base': candidate_base,
            'service_radius_miles': service_radius_miles,
            'sla_target_minutes': sla_target_minutes,
            'coverage_threshold_minutes': coverage_threshold_minutes
        }
    }

