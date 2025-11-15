# backend/utils/scenario_whatif_2_1.py
"""
What-If Scenario Panel utility functions.

This module provides functions to simulate and evaluate different resource allocation scenarios.

Chart 2.1: What-If Scenario Panel (Inputs → KPI Mini-Multiples)
- Sidebar parameters: fleet, crews, base locations, service radius, SLA target
- Main panel: KPIs (missions, SLA attainment, unmet demand, cost) as mini-cards
- Save/compare scenarios
"""

import pandas as pd
import numpy as np
from typing import Dict, List, Optional, Any
from pathlib import Path


def get_base_locations() -> List[Dict[str, Any]]:
    """
    Get available base locations.
    
    Returns:
        List of base locations with coordinates
    """
    backend_dir = Path(__file__).parent.parent
    
    # Load city coordinates
    city_coords_path = backend_dir / 'data' / 'city_coordinates.json'
    
    if city_coords_path.exists():
        import json
        with open(city_coords_path, 'r') as f:
            city_coords = json.load(f)
        
        # Common base locations (major cities)
        common_bases = ['BANGOR', 'PORTLAND', 'LEWISTON', 'AUBURN', 'BIDDEFORD', 'SANFORD']
        
        bases = []
        for city in common_bases:
            if city in city_coords:
                coords = city_coords[city]
                bases.append({
                    'name': city,
                    'latitude': coords[0],
                    'longitude': coords[1]
                })
        
        return bases
    
    # Default base locations (Maine major cities)
    return [
        {'name': 'BANGOR', 'latitude': 44.8016, 'longitude': -68.7713},
        {'name': 'PORTLAND', 'latitude': 43.6591, 'longitude': -70.2568},
        {'name': 'LEWISTON', 'latitude': 44.1004, 'longitude': -70.2148},
        {'name': 'AUBURN', 'latitude': 44.0979, 'longitude': -70.2311},
        {'name': 'BIDDEFORD', 'latitude': 43.4926, 'longitude': -70.4534},
        {'name': 'SANFORD', 'latitude': 43.4394, 'longitude': -70.7742}
    ]


def calculate_base_coverage(
    base_locations: List[Dict[str, Any]],
    service_radius_miles: float,
    city_coordinates: Dict[str, tuple]
) -> Dict[str, List[str]]:
    """
    Calculate which cities are covered by each base within service radius.
    
    Uses simple Euclidean distance (simplified, real implementation would use driving distance).
    
    Args:
        base_locations: List of base location dicts with name, latitude, longitude
        service_radius_miles: Service radius in miles
        city_coordinates: Dictionary mapping city names to (lat, lon) tuples
    
    Returns:
        Dictionary mapping base names to lists of covered cities
    """
    coverage = {}
    
    for base in base_locations:
        base_name = base['name']
        base_lat = base['latitude']
        base_lon = base['longitude']
        covered_cities = []
        
        for city, (city_lat, city_lon) in city_coordinates.items():
            if city_lat is None or city_lon is None:
                continue
            
            # Calculate distance in miles (simplified Haversine)
            from math import radians, sin, cos, sqrt, atan2
            
            lat1, lon1 = radians(base_lat), radians(base_lon)
            lat2, lon2 = radians(city_lat), radians(city_lon)
            
            dlat = lat2 - lat1
            dlon = lon2 - lon1
            
            a = sin(dlat/2)**2 + cos(lat1) * cos(lat2) * sin(dlon/2)**2
            c = 2 * atan2(sqrt(a), sqrt(1-a))
            distance_miles = 3959 * c  # Earth radius in miles
            
            if distance_miles <= service_radius_miles:
                covered_cities.append(city)
        
        coverage[base_name] = covered_cities
    
    return coverage


def estimate_mission_capacity(
    fleet_size: int,
    crews_per_vehicle: int,
    avg_missions_per_vehicle_per_day: float = 3.0,
    operational_days_per_year: int = 365
) -> float:
    """
    Estimate total mission capacity based on fleet and crew configuration.
    
    Args:
        fleet_size: Number of vehicles
        crews_per_vehicle: Number of crews per vehicle
        avg_missions_per_vehicle_per_day: Average missions per vehicle per day
        operational_days_per_year: Operational days per year
    
    Returns:
        Estimated annual mission capacity
    """
    # Capacity = fleet_size * avg_missions_per_vehicle_per_day * operational_days
    # Crew availability factor (simplified: assume crews can cover operational needs)
    crew_factor = min(1.0, crews_per_vehicle / 2.0)  # Assume 2 crews needed for 24/7 coverage
    
    capacity = fleet_size * avg_missions_per_vehicle_per_day * operational_days_per_year * crew_factor
    
    return float(capacity)


def calculate_sla_attainment(
    coverage_cities: List[str],
    df: pd.DataFrame,
    sla_target_minutes: int
) -> Dict[str, float]:
    """
    Calculate SLA attainment rate based on coverage and historical response times.
    
    Args:
        coverage_cities: List of cities covered by bases
        df: Operational data
        sla_target_minutes: SLA target in minutes
    
    Returns:
        Dictionary with SLA metrics
    """
    # Filter data for covered cities
    covered_df = df[df['PU City'].isin(coverage_cities)].copy()
    
    if len(covered_df) == 0:
        return {
            'attainment_rate': 0.0,
            'total_missions': 0,
            'within_sla': 0,
            'avg_response_time_minutes': 0.0
        }
    
    # Calculate response times
    covered_df['tdate'] = pd.to_datetime(covered_df['tdate'], errors='coerce')
    covered_df['disptime'] = covered_df['disptime'].astype(str).str[:5]
    covered_df['enrtime'] = covered_df['enrtime'].astype(str).str[:5]
    
    covered_df['disptime_dt'] = pd.to_datetime(
        covered_df['tdate'].astype(str) + ' ' + covered_df['disptime'],
        format='%Y-%m-%d %H:%M',
        errors='coerce'
    )
    covered_df['enrtime_dt'] = pd.to_datetime(
        covered_df['tdate'].astype(str) + ' ' + covered_df['enrtime'],
        format='%Y-%m-%d %H:%M',
        errors='coerce'
    )
    
    # Calculate response time in minutes
    response_times = []
    for _, row in covered_df.iterrows():
        if pd.notna(row['disptime_dt']) and pd.notna(row['enrtime_dt']):
            if row['enrtime_dt'] < row['disptime_dt']:
                rt = (row['enrtime_dt'] + pd.Timedelta(days=1) - row['disptime_dt']).total_seconds() / 60
            else:
                rt = (row['enrtime_dt'] - row['disptime_dt']).total_seconds() / 60
            response_times.append(rt)
        else:
            response_times.append(None)
    
    covered_df['response_time_minutes'] = response_times
    
    # Filter valid response times
    valid_rt = covered_df['response_time_minutes'].dropna()
    
    if len(valid_rt) == 0:
        return {
            'attainment_rate': 0.0,
            'total_missions': len(covered_df),
            'within_sla': 0,
            'avg_response_time_minutes': 0.0
        }
    
    within_sla = (valid_rt <= sla_target_minutes).sum()
    total = len(valid_rt)
    attainment_rate = (within_sla / total * 100) if total > 0 else 0.0
    avg_response_time = float(valid_rt.mean())
    
    return {
        'attainment_rate': float(attainment_rate),
        'total_missions': int(total),
        'within_sla': int(within_sla),
        'avg_response_time_minutes': avg_response_time
    }


def estimate_unmet_demand(
    historical_missions: int,
    capacity: float,
    coverage_rate: float = 1.0
) -> Dict[str, float]:
    """
    Estimate unmet demand based on historical missions, capacity, and coverage.
    
    Args:
        historical_missions: Historical annual mission count
        capacity: Estimated annual capacity
        coverage_rate: Percentage of demand area covered (0-1)
    
    Returns:
        Dictionary with unmet demand metrics
    """
    # Adjust historical missions by coverage rate
    covered_demand = historical_missions * coverage_rate
    
    # Unmet demand is the difference between covered demand and capacity
    unmet = max(0, covered_demand - capacity)
    unmet_rate = (unmet / covered_demand * 100) if covered_demand > 0 else 0.0
    
    return {
        'unmet_missions': float(unmet),
        'unmet_rate': float(unmet_rate),
        'covered_demand': float(covered_demand),
        'capacity': float(capacity)
    }


def estimate_cost(
    fleet_size: int,
    crews_per_vehicle: int,
    base_count: int,
    base_operational_cost_per_year: float = 500000.0,
    vehicle_cost_per_year: float = 100000.0,
    crew_cost_per_year: float = 80000.0
) -> Dict[str, float]:
    """
    Estimate annual operational cost.
    
    Args:
        fleet_size: Number of vehicles
        crews_per_vehicle: Number of crews per vehicle
        base_count: Number of bases
        base_operational_cost_per_year: Annual operational cost per base
        vehicle_cost_per_year: Annual cost per vehicle
        crew_cost_per_year: Annual cost per crew member
    
    Returns:
        Dictionary with cost breakdown
    """
    base_cost = base_count * base_operational_cost_per_year
    vehicle_cost = fleet_size * vehicle_cost_per_year
    crew_cost = fleet_size * crews_per_vehicle * crew_cost_per_year
    
    total_cost = base_cost + vehicle_cost + crew_cost
    
    return {
        'total_cost': float(total_cost),
        'base_cost': float(base_cost),
        'vehicle_cost': float(vehicle_cost),
        'crew_cost': float(crew_cost),
        'cost_per_mission': float(total_cost / 1000)  # Estimate based on 1000 missions
    }


def simulate_scenario(
    fleet_size: int,
    crews_per_vehicle: int,
    base_locations: List[str],
    service_radius_miles: float,
    sla_target_minutes: int,
    base_coordinates: Optional[List[Dict[str, Any]]] = None
) -> Dict[str, Any]:
    """
    Simulate a scenario and calculate KPIs.
    
    Args:
        fleet_size: Number of vehicles
        crews_per_vehicle: Number of crews per vehicle
        base_locations: List of base location names
        service_radius_miles: Service radius in miles
        sla_target_minutes: SLA target in minutes
        base_coordinates: Optional list of base location dicts (if None, uses defaults)
    
    Returns:
        Dictionary with scenario simulation results and KPIs
    """
    from utils.getData import read_data
    import json
    from pathlib import Path
    
    # Load city coordinates directly
    backend_dir = Path(__file__).parent.parent
    city_coords_path = backend_dir / 'data' / 'city_coordinates.json'
    
    if city_coords_path.exists():
        with open(city_coords_path, 'r') as f:
            city_coords = json.load(f)
    else:
        # Fallback: empty dict
        city_coords = {}
    
    # Load data
    df = read_data()
    
    # Get base coordinates
    if base_coordinates is None:
        all_bases = get_base_locations()
        base_coords = [b for b in all_bases if b['name'] in base_locations]
    else:
        base_coords = base_coordinates
    
    # Calculate coverage
    coverage = calculate_base_coverage(base_coords, service_radius_miles, city_coords)
    all_covered_cities = set()
    for cities in coverage.values():
        all_covered_cities.update(cities)
    
    coverage_rate = len(all_covered_cities) / len(city_coords) if len(city_coords) > 0 else 0.0
    
    # Calculate historical mission count (annual)
    df['tdate'] = pd.to_datetime(df['tdate'], errors='coerce')
    df['year'] = df['tdate'].dt.year
    historical_missions = len(df)  # Total missions in dataset
    
    # Estimate capacity
    capacity = estimate_mission_capacity(fleet_size, crews_per_vehicle)
    
    # Calculate SLA attainment
    sla_metrics = calculate_sla_attainment(list(all_covered_cities), df, sla_target_minutes)
    
    # Estimate unmet demand
    unmet_metrics = estimate_unmet_demand(historical_missions, capacity, coverage_rate)
    
    # Estimate cost
    cost_metrics = estimate_cost(fleet_size, crews_per_vehicle, len(base_locations))
    
    return {
        'scenario_params': {
            'fleet_size': fleet_size,
            'crews_per_vehicle': crews_per_vehicle,
            'base_locations': base_locations,
            'service_radius_miles': service_radius_miles,
            'sla_target_minutes': sla_target_minutes
        },
        'kpis': {
            'missions': {
                'historical_annual': historical_missions,
                'estimated_capacity': capacity,
                'covered_demand': unmet_metrics['covered_demand']
            },
            'sla_attainment': {
                'rate_percent': sla_metrics['attainment_rate'],
                'within_sla': sla_metrics['within_sla'],
                'total_evaluated': sla_metrics['total_missions'],
                'avg_response_time_minutes': sla_metrics['avg_response_time_minutes']
            },
            'unmet_demand': {
                'missions': unmet_metrics['unmet_missions'],
                'rate_percent': unmet_metrics['unmet_rate']
            },
            'cost': cost_metrics,
            'coverage': {
                'cities_covered': len(all_covered_cities),
                'total_cities': len(city_coords),
                'coverage_rate': coverage_rate * 100
            }
        },
        'coverage_details': {
            base_name: len(cities) for base_name, cities in coverage.items()
        }
    }


def compare_scenarios(
    scenarios: List[Dict[str, Any]]
) -> Dict[str, Any]:
    """
    Compare multiple scenarios.
    
    Args:
        scenarios: List of scenario result dictionaries
    
    Returns:
        Dictionary with comparison results
    """
    if len(scenarios) == 0:
        return {'comparison': []}
    
    comparison = []
    
    for idx, scenario in enumerate(scenarios):
        params = scenario['scenario_params']
        kpis = scenario['kpis']
        
        comparison.append({
            'scenario_id': f"Scenario {idx + 1}",
            'fleet_size': params['fleet_size'],
            'bases': len(params['base_locations']),
            'sla_attainment': kpis['sla_attainment']['rate_percent'],
            'unmet_demand': kpis['unmet_demand']['missions'],
            'total_cost': kpis['cost']['total_cost'],
            'coverage_rate': kpis['coverage']['coverage_rate']
        })
    
    return {
        'comparison': comparison,
        'best_sla': max(comparison, key=lambda x: x['sla_attainment']) if comparison else None,
        'lowest_cost': min(comparison, key=lambda x: x['total_cost']) if comparison else None,
        'best_coverage': max(comparison, key=lambda x: x['coverage_rate']) if comparison else None
    }

