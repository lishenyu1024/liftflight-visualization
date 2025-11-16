# backend/utils/pareto_sensitivity_2_3.py
"""
Service Area Sensitivity - Pareto Frontier utility functions.

This module provides functions to calculate and visualize the Pareto frontier
for coverage vs. response time trade-offs.

Chart 2.3: Service Area Sensitivity (Coverage vs. Response Time Pareto)
- Plot Pareto frontier across radius/SLA thresholds
- Highlight chosen scenario and dominated options
- Allow weight sliders (population/SLA/cost) to auto-select an efficient point
"""

import pandas as pd
import numpy as np
from typing import Dict, List, Optional, Any, Tuple
from pathlib import Path
from utils.scenario_whatif_2_1 import simulate_scenario, get_base_locations


def generate_scenario_grid(
    base_locations: List[str],
    radius_range: List[float],
    sla_range: List[int],
    fleet_size: int = 3,
    crews_per_vehicle: int = 2
) -> List[Dict[str, Any]]:
    """
    Generate a grid of scenarios by varying radius and SLA targets.
    
    Args:
        base_locations: List of base location names
        radius_range: List of service radius values (miles)
        sla_range: List of SLA target values (minutes)
        fleet_size: Fleet size (fixed)
        crews_per_vehicle: Crews per vehicle (fixed)
    
    Returns:
        List of scenario results with radius, sla, and KPIs
    """
    scenarios = []
    
    for radius in radius_range:
        for sla in sla_range:
            try:
                result = simulate_scenario(
                    fleet_size=fleet_size,
                    crews_per_vehicle=crews_per_vehicle,
                    base_locations=base_locations,
                    service_radius_miles=radius,
                    sla_target_minutes=sla
                )
                
                scenarios.append({
                    'radius': radius,
                    'sla_target': sla,
                    'coverage_rate': result['kpis']['coverage']['coverage_rate'],
                    'sla_attainment': result['kpis']['sla_attainment']['rate_percent'],
                    'avg_response_time': result['kpis']['sla_attainment']['avg_response_time_minutes'],
                    'unmet_demand': result['kpis']['unmet_demand']['missions'],
                    'total_cost': result['kpis']['cost']['total_cost'],
                    'cities_covered': result['kpis']['coverage']['cities_covered'],
                    'full_result': result
                })
            except Exception as e:
                # Skip scenarios that fail
                print(f"Warning: Scenario (radius={radius}, sla={sla}) failed: {e}")
                continue
    
    return scenarios


def calculate_pareto_frontier(
    scenarios: List[Dict[str, Any]],
    x_metric: str = 'coverage_rate',
    y_metric: str = 'avg_response_time',
    minimize_y: bool = True
) -> Tuple[List[Dict[str, Any]], List[Dict[str, Any]]]:
    """
    Calculate Pareto frontier for given scenarios.
    
    Args:
        scenarios: List of scenario dictionaries
        x_metric: Metric for X-axis (e.g., 'coverage_rate')
        y_metric: Metric for Y-axis (e.g., 'avg_response_time')
        minimize_y: If True, minimize Y (e.g., response time). If False, maximize Y.
    
    Returns:
        Tuple of (pareto_frontier, dominated_points)
    """
    if len(scenarios) == 0:
        return [], []
    
    # Extract values
    points = []
    for scenario in scenarios:
        x_val = scenario.get(x_metric, 0)
        y_val = scenario.get(y_metric, 0)
        
        # Skip invalid points
        if pd.isna(x_val) or pd.isna(y_val) or x_val < 0 or y_val < 0:
            continue
        
        points.append({
            'scenario': scenario,
            'x': float(x_val),
            'y': float(y_val)
        })
    
    if len(points) == 0:
        return [], scenarios
    
    # Sort by X value
    points.sort(key=lambda p: p['x'])
    
    # Find Pareto optimal points
    pareto_points = []
    dominated_points = []
    
    for i, point in enumerate(points):
        is_dominated = False
        
        # Check if this point is dominated by any other point
        for j, other in enumerate(points):
            if i == j:
                continue
            
            # A point is dominated if another point has:
            # - Better or equal X (higher coverage)
            # - Better or equal Y (lower response time if minimizing)
            if minimize_y:
                # Dominated if other has >= x (better coverage) and <= y (better response time)
                if other['x'] >= point['x'] and other['y'] < point['y']:
                    is_dominated = True
                    break
                # Also dominated if other has > x and == y
                if other['x'] > point['x'] and other['y'] <= point['y']:
                    is_dominated = True
                    break
            else:
                # Dominated if other has >= x and >= y
                if other['x'] >= point['x'] and other['y'] > point['y']:
                    is_dominated = True
                    break
                if other['x'] > point['x'] and other['y'] >= point['y']:
                    is_dominated = True
                    break
        
        if not is_dominated:
            pareto_points.append(point)
        else:
            dominated_points.append(point)
    
    # Sort Pareto points by X for plotting
    pareto_points.sort(key=lambda p: p['x'])
    
    return [p['scenario'] for p in pareto_points], [p['scenario'] for p in dominated_points]


def calculate_weighted_score(
    scenario: Dict[str, Any],
    weights: Dict[str, float],
    normalize: bool = True
) -> float:
    """
    Calculate weighted score for a scenario.
    
    Args:
        scenario: Scenario dictionary with KPIs
        weights: Dictionary of weights for each metric (should sum to 1.0)
        normalize: If True, normalize metrics to [0, 1] range
    
    Returns:
        Weighted score (higher is better)
    """
    metrics = {
        'coverage': scenario.get('coverage_rate', 0),
        'sla_attainment': scenario.get('sla_attainment', 0),
        'cost': scenario.get('total_cost', 0)
    }
    
    # Normalize if requested
    if normalize:
        # For coverage and SLA, already in percentage (0-100)
        metrics['coverage'] = metrics['coverage'] / 100.0
        metrics['sla_attainment'] = metrics['sla_attainment'] / 100.0
        
        # For cost, normalize to [0, 1] assuming max cost is reasonable
        # We'll normalize based on inverse (lower cost is better)
        if metrics['cost'] > 0:
            # Assume max reasonable cost is 10M for normalization
            metrics['cost'] = 1.0 - min(1.0, metrics['cost'] / 10000000.0)
        else:
            metrics['cost'] = 1.0
    
    # Calculate weighted sum
    score = (
        weights.get('population', 0) * metrics['coverage'] +
        weights.get('sla', 0) * metrics['sla_attainment'] +
        weights.get('cost', 0) * metrics['cost']
    )
    
    return float(score)


def find_optimal_scenario(
    scenarios: List[Dict[str, Any]],
    weights: Dict[str, float]
) -> Optional[Dict[str, Any]]:
    """
    Find optimal scenario based on weighted criteria.
    
    Args:
        scenarios: List of scenario dictionaries
        weights: Dictionary of weights for each metric
    
    Returns:
        Optimal scenario dictionary or None
    """
    if len(scenarios) == 0:
        return None
    
    # Calculate scores for all scenarios
    scored_scenarios = []
    for scenario in scenarios:
        score = calculate_weighted_score(scenario, weights)
        scored_scenarios.append({
            'scenario': scenario,
            'score': score
        })
    
    # Find scenario with highest score
    best = max(scored_scenarios, key=lambda x: x['score'])
    
    return best['scenario']


def get_pareto_sensitivity_analysis(
    base_locations: Optional[List[str]] = None,
    radius_min: float = 20,
    radius_max: float = 100,
    radius_step: float = 10,
    sla_min: int = 10,
    sla_max: int = 30,
    sla_step: int = 5,
    fleet_size: int = 3,
    crews_per_vehicle: int = 2,
    weights: Optional[Dict[str, float]] = None
) -> Dict[str, Any]:
    """
    Main function to get Pareto sensitivity analysis results.
    
    Args:
        base_locations: List of base location names (if None, uses default)
        radius_min: Minimum service radius
        radius_max: Maximum service radius
        radius_step: Step size for radius
        sla_min: Minimum SLA target
        sla_max: Maximum SLA target
        sla_step: Step size for SLA
        fleet_size: Fleet size
        crews_per_vehicle: Crews per vehicle
        weights: Optional weights for optimal scenario selection
    
    Returns:
        Dictionary with Pareto analysis results
    """
    # Default base locations
    if base_locations is None:
        default_bases = get_base_locations()
        base_locations = [b['name'] for b in default_bases[:3]]  # Use first 3 bases
    
    # Generate radius and SLA ranges
    radius_range = np.arange(radius_min, radius_max + radius_step, radius_step).tolist()
    sla_range = list(range(sla_min, sla_max + sla_step, sla_step))
    
    # Generate scenario grid
    all_scenarios = generate_scenario_grid(
        base_locations=base_locations,
        radius_range=radius_range,
        sla_range=sla_range,
        fleet_size=fleet_size,
        crews_per_vehicle=crews_per_vehicle
    )
    
    if len(all_scenarios) == 0:
        return {
            'pareto_frontier': [],
            'dominated_points': [],
            'optimal_scenario': None,
            'all_scenarios': [],
            'metadata': {
                'n_scenarios': 0,
                'base_locations': base_locations
            }
        }
    
    # Calculate Pareto frontier
    pareto_frontier, dominated_points = calculate_pareto_frontier(
        all_scenarios,
        x_metric='coverage_rate',
        y_metric='avg_response_time',
        minimize_y=True
    )
    
    # Find optimal scenario if weights provided
    optimal_scenario = None
    if weights:
        optimal_scenario = find_optimal_scenario(all_scenarios, weights)
    
    # Prepare data for visualization
    pareto_data = [
        {
            'id': f"Radius {s['radius']:.0f}mi, SLA {s['sla_target']}min",
            'radius': s['radius'],
            'sla_target': s['sla_target'],
            'x': s['coverage_rate'],
            'y': s['avg_response_time'],
            'coverage_rate': s['coverage_rate'],
            'sla_attainment': s['sla_attainment'],
            'avg_response_time': s['avg_response_time'],
            'total_cost': s['total_cost'],
            'unmet_demand': s['unmet_demand']
        }
        for s in pareto_frontier
    ]
    
    dominated_data = [
        {
            'id': f"Radius {s['radius']:.0f}mi, SLA {s['sla_target']}min",
            'radius': s['radius'],
            'sla_target': s['sla_target'],
            'x': s['coverage_rate'],
            'y': s['avg_response_time'],
            'coverage_rate': s['coverage_rate'],
            'sla_attainment': s['sla_attainment'],
            'avg_response_time': s['avg_response_time'],
            'total_cost': s['total_cost'],
            'unmet_demand': s['unmet_demand']
        }
        for s in dominated_points
    ]
    
    optimal_data = None
    if optimal_scenario:
        optimal_data = {
            'id': f"Optimal: Radius {optimal_scenario['radius']:.0f}mi, SLA {optimal_scenario['sla_target']}min",
            'radius': optimal_scenario['radius'],
            'sla_target': optimal_scenario['sla_target'],
            'x': optimal_scenario['coverage_rate'],
            'y': optimal_scenario['avg_response_time'],
            'coverage_rate': optimal_scenario['coverage_rate'],
            'sla_attainment': optimal_scenario['sla_attainment'],
            'avg_response_time': optimal_scenario['avg_response_time'],
            'total_cost': optimal_scenario['total_cost'],
            'unmet_demand': optimal_scenario['unmet_demand']
        }
    
    return {
        'pareto_frontier': pareto_data,
        'dominated_points': dominated_data,
        'optimal_scenario': optimal_data,
        'all_scenarios': all_scenarios[:50],  # Limit to first 50 for performance
        'metadata': {
            'n_scenarios': len(all_scenarios),
            'n_pareto': len(pareto_frontier),
            'n_dominated': len(dominated_points),
            'base_locations': base_locations,
            'radius_range': [min(radius_range), max(radius_range)],
            'sla_range': [min(sla_range), max(sla_range)]
        }
    }

