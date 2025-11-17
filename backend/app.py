from flask import Flask, jsonify, request
from flask_cors import CORS
import os
import pandas as pd
import numpy as np
from pathlib import Path
from config import config
from utils.heatmap import generate_city_demand_heatmap, map_to_html
from utils.getData import read_data
from utils.responseTime import calculate_response_time
from utils.veh_count import calculate_veh_count
from utils.predicting.predict_demand import (
    predict_demand as forecast_demand,
    prophet_predict,
    prepare_prophet_data,
    extract_forecast_data,
    cross_validate_prophet
)
from utils.seasonality_1_2 import get_seasonality_heatmap
from utils.demographics_1_3 import get_demographics_elasticity
from utils.event_impact_1_4 import get_event_impact_analysis, get_all_events
from utils.weather_risk_2_4 import get_weather_risk_analysis
from utils.scenario_whatif_2_1 import simulate_scenario, get_base_locations, compare_scenarios
from utils.pareto_sensitivity_2_3 import get_pareto_sensitivity_analysis
from utils.base_siting_2_2 import get_base_siting_analysis

app = Flask(__name__)

# Load configuration
env = os.environ.get('FLASK_ENV', 'development')
app.config.from_object(config[env])

# Enable CORS for cross-origin requests from frontend
CORS(app)

@app.route('/api/veh_count', methods=['GET'])
def get_veh_count():
    """Get veh count data"""
    df = read_data()
    veh_count = calculate_veh_count(df,2023)
    
    # Map vehicle codes to names
    veh_name_map = {
        'LF1': 'Helicopter based out of Bangor',
        'LF2': 'Helicopter based out of Lewiston',
        'LF3': 'Airplane based out of Bangor',
        'LF4': 'Helicopter based out of Sanford'
    }
    
    # Transform data to include vehicle names
    for item in veh_count:
        veh_code = item['id']
        if veh_code in veh_name_map:
            item['id'] = f"{veh_name_map[veh_code]} ({veh_code})"
    
    return jsonify({
        'status': 'success',
        'message': 'Veh count data fetched successfully',
        'data': veh_count
    })

@app.route('/api/heatmap',methods=['GET'])
def get_heatmap():
    """Get heatmap visualization"""
    df = read_data()
    map_obj = generate_city_demand_heatmap(df)
    html_map = map_to_html(map_obj)

    return html_map

@app.route('/api/indicators', methods=['GET'])
def get_indicators():
    """Get indicator data"""
    df = read_data()
    # 1 total missions
    total_missions = df['yearwithrc'].nunique()
    total_missions_formatted = f"{total_missions:,}" 
    # 2 Total Cities Covered
    total_cities_covered = df['PU City'].nunique()
    # 3 Monthly Average Response Time
    mart_str = calculate_response_time(df,2023,12)
    # 4 Yearly Average Response Time
    yart_str = calculate_response_time(df,2023)
    
    # Convert timedelta string to "X min Y sec" format
    def extract_minutes_seconds(timedelta_str):
        if timedelta_str == "N/A":
            return "N/A"
        try:
            # Parse timedelta string like "0 days 00:22:09.824561403"
            td = pd.Timedelta(timedelta_str)
            total_seconds = int(td.total_seconds())
            minutes = total_seconds // 60
            seconds = total_seconds % 60
            return f"{minutes} min {seconds} sec"
        except:
            return "N/A"
    
    mart = extract_minutes_seconds(mart_str)
    yart = extract_minutes_seconds(yart_str)
    
    return jsonify({
        'status': 'success',
        'message': 'Indicator data fetched successfully',
        'data': {
            'total_missions': total_missions_formatted,
            'total_cities_covered': total_cities_covered,
            'mart': mart,
            'yart': yart
        }
    })

@app.route('/api/hourly_departure', methods=['GET'])
def get_hourly_departure():
    """Get hourly departure density data"""
    
    df = read_data()
    df['tdate'] = pd.to_datetime(df['tdate'], errors='coerce')
    df['Year'] = df['tdate'].dt.year
    df = df[df['Year'] == 2023]

    df['enrtime_dt'] = pd.to_datetime(df['enrtime'], errors='coerce').dt.time
    df.dropna(subset=['enrtime_dt'], inplace=True)
    df['enr_hour'] = pd.to_datetime(df['enrtime_dt'].astype(str)).dt.hour
    
    def get_season(month):
        if month in [3, 4, 5]:
            return 'Spring'
        elif month in [6, 7, 8]:
            return 'Summer'
        elif month in [9, 10, 11]:
            return 'Autumn'
        else:
            return 'Winter'
    
    df['tdate'] = pd.to_datetime(df['tdate'], errors='coerce')
    df['season'] = df['tdate'].dt.month.apply(get_season)
    
    all_hours = list(range(24))
    
    overall_counts = df['enr_hour'].value_counts().sort_index()
    overall_density = overall_counts / overall_counts.sum()
    
    overall_data = []
    for hour in all_hours:
        count = int(overall_counts.get(hour, 0))
        density = float(overall_density.get(hour, 0))
        overall_data.append({
            'hour': hour,
            'count': count,
            'density': density
        })
    
    
    season_data = {}
    for season in ['Spring', 'Summer', 'Autumn', 'Winter']:
        season_df = df[df['season'] == season]
        season_counts = season_df['enr_hour'].value_counts().sort_index()
        season_density = season_counts / season_counts.sum()
        
        season_hourly = []
        for hour in all_hours:
            count = int(season_counts.get(hour, 0))
            density = float(season_density.get(hour, 0))
            season_hourly.append({
                'hour': hour,
                'count': count,
                'density': density
            })
        season_data[season] = season_hourly
    
    return jsonify({
        'status': 'success',
        'data': {
            'overall': overall_data,
            'by_season': season_data
        }
    })


# 1.1 Predict Demand
@app.route('/api/predict_demand', methods=['POST'])
def predict_demand():
    try:
        data = request.get_json()
        
        if data is None:
            model_name = request.args.get('model_name', 'prophet')
            years = int(request.args.get('years', 3))
        else:
            model_name = data.get('model_name', 'prophet')
            years = int(data.get('years', 3))
        
        if model_name not in ['prophet', 'arima']:
            return jsonify({
                'status': 'error',
                'message': f"Unsupported model type: {model_name}. Please use 'prophet' or 'arima'"
            }), 400
        
        if years < 1 or years > 10:
            return jsonify({
                'status': 'error',
                'message': 'Years must be between 1 and 10'
            }), 400
        
        result = forecast_demand(model_name, years)
        
        return jsonify({
            'status': 'success',
            'data': result
        })
        
    except ValueError as e:
        return jsonify({
            'status': 'error',
            'message': str(e)
        }), 400
    except FileNotFoundError as e:
        return jsonify({
            'status': 'error',
            'message': f'Model file not found: {str(e)}'
        }), 404
    except Exception as e:
        return jsonify({
            'status': 'error',
            'message': f'Prediction failed: {str(e)}'
        }), 500
    

@app.route('/api/predict_demand_v2', methods=['POST'])
def predict_demand_v2():
    """新的 Prophet 预测接口，支持自定义参数和额外变量"""
    from pathlib import Path
    
    # 获取请求参数
    data = request.get_json() or {}
    
    # 模型参数
    periods = int(data.get('periods', 12)) 
    extra_vars = data.get('extra_vars', [])
    growth = data.get('growth', 'linear')
    yearly_seasonality = data.get('yearly_seasonality', True)
    weekly_seasonality = data.get('weekly_seasonality', False)
    daily_seasonality = data.get('daily_seasonality', False)
    seasonality_mode = data.get('seasonality_mode', 'additive')
    changepoint_prior_scale = float(data.get('changepoint_prior_scale', 0.05))
    seasonality_prior_scale = float(data.get('seasonality_prior_scale', 10.0))
    interval_width = float(data.get('interval_width', 0.95))
    regressor_prior_scale = float(data.get('regressor_prior_scale', 0.05))
    regressor_mode = data.get('regressor_mode', 'additive')
    
    # 获取后端目录路径
    backend_dir = Path(__file__).parent
    
    # 直接读取数据文件
    data_path = backend_dir / 'data' / '1_demand_forecasting' / '1_1_history_data_v2.csv'
    prophet_data = pd.read_csv(data_path)
    prophet_data['date'] = pd.to_datetime(prophet_data['date'])
    
    # 训练模型并预测
    forecast, model, train_data = prophet_predict(
        data=prophet_data,
        freq='M',
        extra_vars=extra_vars,
        periods=periods,
        growth=growth,
        yearly_seasonality=yearly_seasonality,
        weekly_seasonality=weekly_seasonality,
        daily_seasonality=daily_seasonality,
        seasonality_mode=seasonality_mode,
        changepoint_prior_scale=changepoint_prior_scale,
        seasonality_prior_scale=seasonality_prior_scale,
        interval_width=interval_width,
        regressor_prior_scale=regressor_prior_scale,
        regressor_mode=regressor_mode,
        backend_dir=backend_dir
    )
    
    # 提取预测数据和组件
    extracted_data = extract_forecast_data(forecast, train_data)
    # 交叉验证
    cv_metrics = cross_validate_prophet(model, train_data)
    
    # 返回结果
    return jsonify({
        'status': 'success',
        'data': {
            'forecast_data': extracted_data['forecast_data'],
            'historical_actual': extracted_data['historical_actual'],
            'components': extracted_data['components'],
            'cv_metrics': cv_metrics
        }
    })


@app.route('/api/get_corr_matrix', methods=['GET'])
def get_corr_matrix():
    """Get correlation matrix data for visualization"""
    backend_dir = Path(__file__).parent
    corr_matrix_path = backend_dir / 'data' / '1_demand_forecasting' / '1_1_corr_matrix.csv'
    
    try:
        corr_matrix = pd.read_csv(corr_matrix_path, index_col=0)
        
        # 转换为适合前端使用的格式
        # 返回矩阵数据和变量列表
        variables = corr_matrix.index.tolist()
        
        # 转换为嵌套数组格式（用于热力图）
        matrix_data = []
        for var in variables:
            row = []
            for col_var in variables:
                row.append(float(corr_matrix.loc[var, col_var]))
            matrix_data.append(row)
        
        # 获取与 count 的相关性（用于排序和参考）
        count_correlations = {}
        if 'count' in corr_matrix.index:
            for var in variables:
                if var != 'count':
                    count_correlations[var] = float(corr_matrix.loc[var, 'count'])
        
        return jsonify({
            'status': 'success',
            'data': {
                'variables': variables,
                'matrix': matrix_data,
                'count_correlations': count_correlations  # 与 count 的相关性，用于参考
            }
        })
    except Exception as e:
        return jsonify({
            'status': 'error',
            'message': f'Failed to load correlation matrix: {str(e)}'
        }), 500

    
@app.route('/api/seasonality_heatmap', methods=['GET'])
def get_seasonality_heatmap_api():
    """
    Get seasonality heatmap data (Chart 1.2).
    
    Query parameters:
    - year: Year to analyze (required)
    - location_level: 'system', 'state', 'county', or 'city' (default: 'system')
    - location_value: Specific location value (optional)
    - month: Month to filter (1-12, optional)
    """
    try:
        year = int(request.args.get('year', 2023))
        location_level = request.args.get('location_level', 'system')
        location_value = request.args.get('location_value', None)
        month = request.args.get('month', None)
        
        if month:
            month = int(month)
            if month < 1 or month > 12:
                return jsonify({
                    'status': 'error',
                    'message': 'Month must be between 1 and 12'
                }), 400
        
        if year < 2012 or year > 2023:
            return jsonify({
                'status': 'error',
                'message': 'Year must be between 2012 and 2023'
            }), 400
        
        if location_level not in ['system', 'state', 'county', 'city']:
            return jsonify({
                'status': 'error',
                'message': 'location_level must be one of: system, state, county, city'
            }), 400
        
        result = get_seasonality_heatmap(year, location_level, location_value, month)
        
        # Transform data for frontend (group by month if month not specified)
        heatmap_data = result['heatmap_data']
        metadata = result['metadata']
        
        # If month not specified, group by month
        if month is None:
            months_data = {}
            for item in heatmap_data:
                m = item['month']
                if m not in months_data:
                    months_data[m] = []
                months_data[m].append(item)
            
            # Create structure for frontend
            month_names = ['January', 'February', 'March', 'April', 'May', 'June',
                          'July', 'August', 'September', 'October', 'November', 'December']
            
            formatted_data = []
            for m in sorted(months_data.keys()):
                month_items = months_data[m]
                # Group by weekday and hour
                weekday_data = {}
                for item in month_items:
                    wd = item['weekday']
                    if wd not in weekday_data:
                        weekday_data[wd] = []
                    weekday_data[wd].append({
                        'hour': item['hour'],
                        'missions_per_1000': item['missions_per_1000'],
                        'count': item['count']
                    })
                
                # Format for heatmap
                heatmap_rows = []
                for wd in range(7):  # 0-6 weekdays
                    hour_values = weekday_data.get(wd, [])
                    hour_dict = {item['hour']: item for item in hour_values}
                    # Ensure all 24 hours are present
                    values = []
                    for h in range(24):
                        if h in hour_dict:
                            values.append({
                                'hour': h,
                                'missions_per_1000': hour_dict[h]['missions_per_1000'],
                                'count': hour_dict[h]['count']
                            })
                        else:
                            values.append({
                                'hour': h,
                                'missions_per_1000': 0,
                                'count': 0
                            })
                    heatmap_rows.append({
                        'weekday': wd,
                        'values': sorted(values, key=lambda x: x['hour'])
                    })
                
                formatted_data.append({
                    'month': m,
                    'month_name': month_names[m - 1],
                    'heatmap': heatmap_rows
                })
        else:
            # Single month - format similarly
            month_names = ['January', 'February', 'March', 'April', 'May', 'June',
                          'July', 'August', 'September', 'October', 'November', 'December']
            weekday_data = {}
            for item in heatmap_data:
                wd = item['weekday']
                if wd not in weekday_data:
                    weekday_data[wd] = []
                weekday_data[wd].append({
                    'hour': item['hour'],
                    'missions_per_1000': item['missions_per_1000'],
                    'count': item['count']
                })
            
            heatmap_rows = []
            for wd in range(7):
                hour_values = weekday_data.get(wd, [])
                hour_dict = {item['hour']: item for item in hour_values}
                values = []
                for h in range(24):
                    if h in hour_dict:
                        values.append({
                            'hour': h,
                            'missions_per_1000': hour_dict[h]['missions_per_1000'],
                            'count': hour_dict[h]['count']
                        })
                    else:
                        values.append({
                            'hour': h,
                            'missions_per_1000': 0,
                            'count': 0
                        })
                heatmap_rows.append({
                    'weekday': wd,
                    'values': sorted(values, key=lambda x: x['hour'])
                })
            
            formatted_data = [{
                'month': month,
                'month_name': month_names[month - 1],
                'heatmap': heatmap_rows
            }]
        
        # Calculate stats
        all_values = [item['missions_per_1000'] for item in heatmap_data]
        peak_item = max(heatmap_data, key=lambda x: x['missions_per_1000']) if heatmap_data else None
        
        stats = {
            'total_missions': metadata['total_missions'],
            'avg_missions_per_1000': float(np.mean(all_values)) if all_values else 0,
            'max_missions_per_1000': float(np.max(all_values)) if all_values else 0,
            'min_missions_per_1000': float(np.min(all_values)) if all_values else 0,
            'peak_time': {
                'month': peak_item['month'] if peak_item else None,
                'weekday': peak_item['weekday'] if peak_item else None,
                'hour': peak_item['hour'] if peak_item else None
            } if peak_item else None
        }
        
        return jsonify({
            'status': 'success',
            'data': {
                'heatmap_data': formatted_data,
                'metadata': metadata,
                'stats': stats
            }
        })
        
    except ValueError as e:
        return jsonify({
            'status': 'error',
            'message': f'Invalid parameter: {str(e)}'
        }), 400
    except Exception as e:
        return jsonify({
            'status': 'error',
            'message': f'Failed to get seasonality heatmap: {str(e)}'
        }), 500

@app.route('/api/demographics_elasticity', methods=['GET'])
def get_demographics_elasticity_api():
    """
    Get demographics elasticity analysis data (Chart 1.3).
    
    Query parameters:
    - year: Year to analyze (required, default: 2023)
    - start_year_for_growth: Start year for growth rate calculation (optional)
    - end_year_for_growth: End year for growth rate calculation (optional)
    - independent_vars: Comma-separated list of independent variables (default: 'pct_65plus,growth_rate')
    """
    try:
        year = int(request.args.get('year', 2023))
        start_year = request.args.get('start_year_for_growth', None)
        end_year = request.args.get('end_year_for_growth', None)
        independent_vars_str = request.args.get('independent_vars', 'pct_65plus,growth_rate')
        
        if start_year:
            start_year = int(start_year)
        if end_year:
            end_year = int(end_year)
        
        independent_vars = [v.strip() for v in independent_vars_str.split(',')]
        
        if year < 2012 or year > 2023:
            return jsonify({
                'status': 'error',
                'message': 'Year must be between 2012 and 2023'
            }), 400
        
        result = get_demographics_elasticity(
            year=year,
            start_year_for_growth=start_year,
            end_year_for_growth=end_year,
            independent_vars=independent_vars
        )
        
        return jsonify({
            'status': 'success',
            'data': result
        })
        
    except ValueError as e:
        return jsonify({
            'status': 'error',
            'message': f'Invalid parameter: {str(e)}'
        }), 400
    except Exception as e:
        return jsonify({
            'status': 'error',
            'message': f'Failed to get demographics elasticity data: {str(e)}'
        }), 500

@app.route('/api/event_impact', methods=['GET'])
def get_event_impact_api():
    """
    Get event impact analysis data (Chart 1.4).
    
    Query parameters:
    - event_id: Event identifier (required)
    - location_level: 'county', 'city', or 'system' (default: 'county')
    - location_value: Specific location value (optional)
    - window_months: Number of months before and after event (default: 12)
    """
    try:
        event_id = request.args.get('event_id', None)
        
        if not event_id:
            return jsonify({
                'status': 'error',
                'message': 'event_id is required'
            }), 400
        
        location_level = request.args.get('location_level', 'county')
        location_value = request.args.get('location_value', None)
        window_months = int(request.args.get('window_months', 12))
        
        if location_level not in ['county', 'city', 'system']:
            return jsonify({
                'status': 'error',
                'message': 'location_level must be county, city, or system'
            }), 400
        
        if window_months < 1 or window_months > 24:
            return jsonify({
                'status': 'error',
                'message': 'window_months must be between 1 and 24'
            }), 400
        
        result = get_event_impact_analysis(
            event_id=event_id,
            location_level=location_level,
            location_value=location_value,
            window_months=window_months
        )
        
        return jsonify({
            'status': 'success',
            'data': result
        })
        
    except ValueError as e:
        return jsonify({
            'status': 'error',
            'message': f'Invalid parameter: {str(e)}'
        }), 400
    except Exception as e:
        return jsonify({
            'status': 'error',
            'message': f'Failed to get event impact data: {str(e)}'
        }), 500


@app.route('/api/events', methods=['GET'])
def get_events_api():
    """
    Get list of all available events for the event picker.
    """
    try:
        events = get_all_events()
        return jsonify({
            'status': 'success',
            'data': events
        })
    except Exception as e:
        return jsonify({
            'status': 'error',
            'message': f'Failed to get events: {str(e)}'
        }), 500

@app.route('/api/scenario_simulate', methods=['POST'])
def simulate_scenario_api():
    """
    Simulate a what-if scenario (Chart 2.1).
    
    Request body:
    {
        "fleet_size": int,
        "crews_per_vehicle": int,
        "base_locations": ["BANGOR", "PORTLAND", ...],
        "service_radius_miles": float,
        "sla_target_minutes": int
    }
    """
    try:
        data = request.get_json()
        
        if not data:
            return jsonify({
                'status': 'error',
                'message': 'Request body is required'
            }), 400
        
        fleet_size = int(data.get('fleet_size', 3))
        crews_per_vehicle = int(data.get('crews_per_vehicle', 2))
        base_locations = data.get('base_locations', ['BANGOR'])
        service_radius_miles = float(data.get('service_radius_miles', 50.0))
        sla_target_minutes = int(data.get('sla_target_minutes', 20))
        
        if fleet_size < 1 or fleet_size > 20:
            return jsonify({
                'status': 'error',
                'message': 'fleet_size must be between 1 and 20'
            }), 400
        
        if crews_per_vehicle < 1 or crews_per_vehicle > 5:
            return jsonify({
                'status': 'error',
                'message': 'crews_per_vehicle must be between 1 and 5'
            }), 400
        
        if service_radius_miles < 10 or service_radius_miles > 200:
            return jsonify({
                'status': 'error',
                'message': 'service_radius_miles must be between 10 and 200'
            }), 400
        
        if sla_target_minutes < 5 or sla_target_minutes > 60:
            return jsonify({
                'status': 'error',
                'message': 'sla_target_minutes must be between 5 and 60'
            }), 400
        
        result = simulate_scenario(
            fleet_size=fleet_size,
            crews_per_vehicle=crews_per_vehicle,
            base_locations=base_locations,
            service_radius_miles=service_radius_miles,
            sla_target_minutes=sla_target_minutes
        )
        
        return jsonify({
            'status': 'success',
            'data': result
        })
        
    except ValueError as e:
        return jsonify({
            'status': 'error',
            'message': f'Invalid parameter: {str(e)}'
        }), 400
    except Exception as e:
        return jsonify({
            'status': 'error',
            'message': f'Failed to simulate scenario: {str(e)}'
        }), 500


@app.route('/api/base_locations', methods=['GET'])
def get_base_locations_api():
    """
    Get list of available base locations.
    """
    try:
        bases = get_base_locations()
        return jsonify({
            'status': 'success',
            'data': bases
        })
    except Exception as e:
        return jsonify({
            'status': 'error',
            'message': f'Failed to get base locations: {str(e)}'
        }), 500


@app.route('/api/scenario_compare', methods=['POST'])
def compare_scenarios_api():
    """
    Compare multiple scenarios (Chart 2.1).
    
    Request body:
    {
        "scenarios": [
            {
                "fleet_size": int,
                "crews_per_vehicle": int,
                "base_locations": [...],
                "service_radius_miles": float,
                "sla_target_minutes": int
            },
            ...
        ]
    }
    """
    try:
        data = request.get_json()
        
        if not data or 'scenarios' not in data:
            return jsonify({
                'status': 'error',
                'message': 'scenarios array is required'
            }), 400
        
        scenarios_list = data['scenarios']
        
        if len(scenarios_list) < 1:
            return jsonify({
                'status': 'error',
                'message': 'At least one scenario is required'
            }), 400
        
        # Simulate all scenarios
        simulated_scenarios = []
        for scenario_params in scenarios_list:
            result = simulate_scenario(
                fleet_size=int(scenario_params.get('fleet_size', 3)),
                crews_per_vehicle=int(scenario_params.get('crews_per_vehicle', 2)),
                base_locations=scenario_params.get('base_locations', ['BANGOR']),
                service_radius_miles=float(scenario_params.get('service_radius_miles', 50.0)),
                sla_target_minutes=int(scenario_params.get('sla_target_minutes', 20))
            )
            simulated_scenarios.append(result)
        
        # Compare scenarios
        comparison = compare_scenarios(simulated_scenarios)
        
        return jsonify({
            'status': 'success',
            'data': {
                'comparison': comparison,
                'scenarios': simulated_scenarios
            }
        })
        
    except Exception as e:
        return jsonify({
            'status': 'error',
            'message': f'Failed to compare scenarios: {str(e)}'
        }), 500

@app.route('/api/pareto_sensitivity', methods=['GET', 'POST'])
def get_pareto_sensitivity_api():
    """
    Get Pareto sensitivity analysis data (Chart 2.3).
    
    Query parameters (GET) or JSON body (POST):
    - base_locations: List of base location names (optional)
    - radius_min: Minimum service radius (default: 20)
    - radius_max: Maximum service radius (default: 100)
    - radius_step: Step size for radius (default: 10)
    - sla_min: Minimum SLA target (default: 10)
    - sla_max: Maximum SLA target (default: 30)
    - sla_step: Step size for SLA (default: 5)
    - fleet_size: Fleet size (default: 3)
    - crews_per_vehicle: Crews per vehicle (default: 2)
    - weights: Optional weights dict {'population': float, 'sla': float, 'cost': float}
    """
    try:
        if request.method == 'POST':
            data = request.get_json() or {}
        else:
            data = request.args.to_dict()
        
        base_locations = data.get('base_locations')
        if isinstance(base_locations, str):
            # Parse comma-separated string
            base_locations = [b.strip() for b in base_locations.split(',')]
        
        radius_min = float(data.get('radius_min', 20))
        radius_max = float(data.get('radius_max', 100))
        radius_step = float(data.get('radius_step', 10))
        sla_min = int(data.get('sla_min', 10))
        sla_max = int(data.get('sla_max', 30))
        sla_step = int(data.get('sla_step', 5))
        fleet_size = int(data.get('fleet_size', 3))
        crews_per_vehicle = int(data.get('crews_per_vehicle', 2))
        
        weights = data.get('weights')
        if isinstance(weights, dict):
            # Ensure weights sum to 1.0
            total = sum(weights.values())
            if total > 0:
                weights = {k: v / total for k, v in weights.items()}
        
        result = get_pareto_sensitivity_analysis(
            base_locations=base_locations,
            radius_min=radius_min,
            radius_max=radius_max,
            radius_step=radius_step,
            sla_min=sla_min,
            sla_max=sla_max,
            sla_step=sla_step,
            fleet_size=fleet_size,
            crews_per_vehicle=crews_per_vehicle,
            weights=weights
        )
        
        return jsonify({
            'status': 'success',
            'data': result
        })
        
    except Exception as e:
        return jsonify({
            'status': 'error',
            'message': f'Failed to get Pareto sensitivity analysis: {str(e)}'
        }), 500

@app.route('/api/base_siting', methods=['POST'])
def get_base_siting_api():
    """
    Get base siting coverage map analysis (Chart 2.2).
    
    Request body:
    {
        "existing_bases": ["BANGOR", "PORTLAND"],
        "candidate_base": {
            "name": "LEWISTON",
            "latitude": 44.1004,
            "longitude": -70.2148
        } (optional),
        "service_radius_miles": 50.0,
        "sla_target_minutes": 20,
        "fleet_size": 3,
        "crews_per_vehicle": 2,
        "coverage_threshold_minutes": 20
    }
    """
    try:
        data = request.get_json() or {}
        
        existing_bases = data.get('existing_bases', ['BANGOR'])
        candidate_base = data.get('candidate_base')
        service_radius_miles = float(data.get('service_radius_miles', 50.0))
        sla_target_minutes = int(data.get('sla_target_minutes', 20))
        fleet_size = int(data.get('fleet_size', 3))
        crews_per_vehicle = int(data.get('crews_per_vehicle', 2))
        coverage_threshold_minutes = int(data.get('coverage_threshold_minutes', 20))
        
        result = get_base_siting_analysis(
            existing_bases=existing_bases,
            candidate_base=candidate_base,
            service_radius_miles=service_radius_miles,
            sla_target_minutes=sla_target_minutes,
            fleet_size=fleet_size,
            crews_per_vehicle=crews_per_vehicle,
            coverage_threshold_minutes=coverage_threshold_minutes
        )
        
        return jsonify({
            'status': 'success',
            'data': result
        })
        
    except Exception as e:
        return jsonify({
            'status': 'error',
            'message': f'Failed to get base siting analysis: {str(e)}'
        }), 500

@app.route('/api/weather_risk', methods=['GET'])
def get_weather_risk_api():
    """
    Get weather-driven risk analysis data (Chart 2.4).
    
    Query parameters:
    - method: Method to define extreme weather ('precipitation', 'temperature', 'combined') (default: 'precipitation')
    - aggregation_level: Level to aggregate missions ('day', 'month', 'week') (default: 'day')
    """
    try:
        method = request.args.get('method', 'precipitation')
        aggregation_level = request.args.get('aggregation_level', 'day')
        
        if method not in ['precipitation', 'temperature', 'combined']:
            return jsonify({
                'status': 'error',
                'message': 'method must be precipitation, temperature, or combined'
            }), 400
        
        if aggregation_level not in ['day', 'month', 'week']:
            return jsonify({
                'status': 'error',
                'message': 'aggregation_level must be day, month, or week'
            }), 400
        
        result = get_weather_risk_analysis(
            method=method,
            aggregation_level=aggregation_level
        )
        
        return jsonify({
            'status': 'success',
            'data': result
        })
        
    except Exception as e:
        return jsonify({
            'status': 'error',
            'message': f'Failed to get weather risk data: {str(e)}'
        }), 500

@app.route('/api/test', methods=['GET'])
def test():
    """Test endpoint"""
    return jsonify({
        'message': 'Backend is working correctly',
        'data': {
            'timestamp': '2024-01-01T00:00:00Z',
            'test': True
        }
    })

if __name__ == '__main__':
    port = int(os.environ.get('PORT', 5001))
    app.run(host='0.0.0.0', port=port, debug=app.config['DEBUG'])

