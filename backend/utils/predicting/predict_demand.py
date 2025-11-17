# backend/utils/predicting/predict_demand.py
import joblib
import os
import pandas as pd
import numpy as np
from pathlib import Path
from typing import Dict, List, Any
from prophet import Prophet

def predict_demand(model_name: str, years: int) -> Dict[str, Any]:
    """Predict future demand (including historical data)"""

    # Get model file path (using absolute path, more reliable)
    current_file = Path(__file__).resolve()  
    backend_dir = current_file.parent.parent.parent
    model_dir = backend_dir / 'model'
    
    # Validate paths
    if not backend_dir.exists():
        raise FileNotFoundError(f"Backend directory not found: {backend_dir}")
    if not model_dir.exists():
        raise FileNotFoundError(f"Model directory not found: {model_dir}")
    
    # Validate parameters
    if model_name.lower() not in ['prophet', 'arima']:
        raise ValueError(f"Unsupported model type: {model_name}. Please use 'prophet' or 'arima'")
    
    if years < 1 or years > 10:
        raise ValueError(f"Prediction years must be between 1 and 10, current value: {years}")
    
    forecast_months = years * 12
    
    # Get historical data (2012-2023)
    historical_data = _get_historical_data(backend_dir)
    
    try:
        if model_name.lower() == 'prophet':
            forecast_result = _predict_prophet(model_dir, forecast_months)
        else:  # arima
            forecast_result = _predict_arima(model_dir, forecast_months)
        
        # Merge results
        result = {
            'model_type': forecast_result['model_type'],
            'historical_data': historical_data,
            'forecast_data': forecast_result['forecast_data'],
            'total_months': len(historical_data) + len(forecast_result['forecast_data'])
        }
        
        return result
        
    except FileNotFoundError as e:
        raise FileNotFoundError(f"Model file not found: {e}")
    except Exception as e:
        raise RuntimeError(f"Prediction failed: {str(e)}")


def _get_historical_data(backend_dir: Path) -> List[Dict[str, Any]]:
    """
    获取历史月度数据（2012年7月 - 2023年12月）
    
    返回:
    - list: 历史数据列表
    """
    # Read original data
    data_path = backend_dir / 'data' / '1_demand_forecasting' / 'data.csv'
    
    if not data_path.exists():
        raise FileNotFoundError(f"Data file not found: {data_path}")
    
    df = pd.read_csv(data_path, encoding='latin1')
    
    # Convert date format
    df['tdate'] = pd.to_datetime(df['tdate'], errors='coerce')
    df = df[df['tdate'].notna()]
    
    # Aggregate by month
    monthly_data = df.groupby(df['tdate'].dt.to_period('M')).size().reset_index(name='count')
    monthly_data['date'] = monthly_data['tdate'].astype(str) + '-01'
    monthly_data['date'] = pd.to_datetime(monthly_data['date'])
    
    # Ensure only data up to 2023-12-01
    monthly_data = monthly_data[monthly_data['date'] <= pd.Timestamp('2023-12-01')]
    
    # Sort by date
    monthly_data = monthly_data.sort_values('date')
    
    # Convert to dictionary format
    historical_data = []
    for _, row in monthly_data.iterrows():
        historical_data.append({
            'date': row['date'].strftime('%Y-%m-%d'),
            'count': int(row['count'])
        })
    
    return historical_data


def _predict_prophet(model_dir: Path, forecast_months: int) -> Dict[str, Any]:
    """Predict demand using Prophet model"""
    model_path = model_dir / 'model_prophet.pkl'
    
    if not model_path.exists():
        raise FileNotFoundError(f"Prophet model file not found: {model_path}")
    
    # Load model
    model = joblib.load(model_path)
    
    # Create future dataframe and predict (from 2024-01-01)
    # Prophet will automatically predict from the last date of historical data
    future = model.make_future_dataframe(periods=forecast_months, freq='M')
    forecast = model.predict(future)
    
    # Extract future prediction (only return future part, from 2024-01-01)
    # Filter out data from 2024-01-01 and onwards
    forecast['ds'] = pd.to_datetime(forecast['ds'])
    future_forecast = forecast[forecast['ds'] >= pd.Timestamp('2024-01-01')]
    future_forecast = future_forecast[['ds', 'yhat', 'yhat_lower', 'yhat_upper']].head(forecast_months)

    result = {
        'model_type': 'prophet',
        'forecast_months': forecast_months,
        'forecast_data': []
    }
    
    for _, row in future_forecast.iterrows():
        result['forecast_data'].append({
            'date': row['ds'].strftime('%Y-%m-%d'),
            'predicted_count': int(round(row['yhat'])),
            'lower_bound': int(round(row['yhat_lower'])),
            'upper_bound': int(round(row['yhat_upper']))
        })
    
    return result


def _predict_arima(model_dir: Path, forecast_months: int) -> Dict[str, Any]:
    """Predict demand using ARIMA model"""
    model_path = model_dir / 'model_arima.pkl'
    
    if not model_path.exists():
        raise FileNotFoundError(f"ARIMA model file not found: {model_path}")
    
    # Load model
    model = joblib.load(model_path)
    
    # ARIMA model uses get_forecast method to get prediction and confidence interval
    forecast_result = model.get_forecast(steps=forecast_months)
    forecast_values = forecast_result.predicted_mean
    forecast_ci = forecast_result.conf_int()
    
    # Convert to numpy array for indexing
    if hasattr(forecast_values, 'values'):
        pred_array = forecast_values.values
    elif isinstance(forecast_values, pd.Series):
        pred_array = forecast_values.values
    else:
        pred_array = np.array(forecast_values)
    
    # Generate future dates (from 2024-01-01)
    start_date = pd.Timestamp('2024-01-01')
    future_dates = pd.date_range(start=start_date, periods=forecast_months, freq='M')
    
    # Convert to dictionary format
    result = {
        'model_type': 'arima',
        'forecast_months': forecast_months,
        'forecast_data': []
    }
    
    for i, date in enumerate(future_dates):
        # Get prediction and confidence interval
        pred_value = float(pred_array[i])
        
        # Handle confidence interval (DataFrame format)
        if isinstance(forecast_ci, pd.DataFrame):
            lower = float(forecast_ci.iloc[i, 0])
            upper = float(forecast_ci.iloc[i, 1])
        else:
            # If numpy array
            lower = float(forecast_ci[i, 0])
            upper = float(forecast_ci[i, 1])
        
        result['forecast_data'].append({
            'date': date.strftime('%Y-%m-%d'),
            'predicted_count': int(round(pred_value)),
            'lower_bound': int(round(lower)),
            'upper_bound': int(round(upper))
        })
    
    return result




# 使用prophet模型来预测
def prophet_predict(data: pd.DataFrame, freq: str = 'M',
                    extra_vars: list[str] = [],
                    periods: int = 12, # 预测多少个月
                    growth: str = 'linear',
                    yearly_seasonality: bool = True,
                    weekly_seasonality: bool = False,
                    daily_seasonality: bool = False,
                    seasonality_mode: str = 'additive', # 季节性模式（加法或乘法）
                    changepoint_prior_scale: float = 0.05, # 趋势变化敏感度（越大越敏感，可能过拟合）
                    seasonality_prior_scale: float = 10.0, # 季节性敏感度（越大越敏感，可能过拟合）
                    interval_width: float = 0.95, # 置信区间宽度（越大越宽）
                    regressor_prior_scale: float = 0.05, # 回归变量敏感度（越大越敏感，可能过拟合）
                    regressor_mode: str = 'additive', # 回归变量模式（加法或乘法）
                    backend_dir: Path = None, # 后端目录路径，用于读取 future 数据
                    ):
    # 分离训练数据和未来数据（有count的用于训练，没有count的用于future）
    train_data = data[data['count'].notna()].copy()  # 只使用有count的数据进行训练
    future_data = data[data['count'].isna()].copy()  # 2024年的数据（没有count）
    prophet_data = train_data[['date', 'count']].copy()
    prophet_data.columns = ['ds', 'y']
    
    # 如果需要预测超过一年（periods > 12），读取 future 数据文件
    if periods > 12 and backend_dir is not None:
        # 计算需要预测到哪一年
        # 假设从2024年开始预测，periods=24表示预测24个月（到2025年12月）
        # 需要的年份：2025, 2026, ..., 2024 + ceil(periods/12) - 1
        import math
        last_train_date = prophet_data['ds'].max()
        start_year = 2024  # 预测起始年份
        years_needed = math.ceil(periods / 12)  # 需要预测的年数
        end_year = start_year + years_needed - 1  # 预测结束年份
        
        
        # 计算需要的年份范围（从2025年开始）
        required_years = list(range(2025, end_year + 1))
        
        future_pop_path = backend_dir / 'data' / '1_demand_forecasting' / '1_1_future_pop.csv'
        if future_pop_path.exists():
            future_pop_df = pd.read_csv(future_pop_path)
            # 只筛选需要的年份数据
            future_pop_df = future_pop_df[
                future_pop_df['year'].isin(required_years)
            ].copy()
            
            if len(future_pop_df) == 0:
                raise ValueError(
                    f"在 future 数据文件中未找到 {required_years} 年的数据。"
                )
            
            # 创建日期列（每月1号）
            future_pop_df['date'] = pd.to_datetime(
                future_pop_df[['year', 'month']].assign(day=1)
            )
            
            # 合并到 future_data
            if len(future_data) > 0:
                # 如果已有 future_data，合并（只保留 future_data 中 2024 年的数据）
                future_data_2024 = future_data[
                    pd.to_datetime(future_data['date']).dt.year == 2024
                ].copy()
                future_data = pd.concat([
                    future_data_2024,
                    future_pop_df[['date'] + [col for col in future_pop_df.columns if col not in ['date', 'year', 'month', 'NAME', 'state']]]
                ], ignore_index=True)
            else:
                # 如果没有 future_data，直接使用 future_pop_df
                future_data = future_pop_df[['date'] + [col for col in future_pop_df.columns if col not in ['date', 'year', 'month', 'NAME', 'state']]].copy()
            
            # 确保 future_data 中没有 count 列（用于标识未来数据）
            if 'count' not in future_data.columns:
                future_data['count'] = pd.NA
        else:
            raise FileNotFoundError(
                f"Future 数据文件不存在: {future_pop_path}"
            )
    
    # 如果是 logistic growth，需要添加 cap（容量上限）列
    if growth == 'logistic':
        # 如果没有提供 cap，自动设置为历史数据最大值的 1.5 倍
        max_value = prophet_data['y'].max()
        cap_value = max_value * 1.5
        prophet_data['cap'] = cap_value
    
    # 额外变量
    if extra_vars:
        for var in extra_vars:
            if var in train_data.columns:
                prophet_data[var] = pd.to_numeric(train_data[var], errors='coerce')
            else:
                print(f"警告: 变量 '{var}' 不在数据中，已跳过")
    model = Prophet(
        growth=growth,
        yearly_seasonality=yearly_seasonality,
        weekly_seasonality=weekly_seasonality,
        daily_seasonality=daily_seasonality,
        seasonality_mode=seasonality_mode,
        changepoint_prior_scale=changepoint_prior_scale,
        seasonality_prior_scale=seasonality_prior_scale,
        interval_width=interval_width,
    )
    # 添加回归变量
    if extra_vars:
        for var in extra_vars:
            if var in prophet_data.columns:
                model.add_regressor(
                    var,
                    prior_scale=regressor_prior_scale,
                    mode=regressor_mode
                )
    model.fit(prophet_data)

    # 创建未来数据框 - 关键：使用 make_future_dataframe 确保包含历史数据
    # 计算需要预测的总月数
    if len(future_data) > 0:
        # 计算从训练数据最后日期到未来数据最后日期需要多少个月
        last_train_date = prophet_data['ds'].max()
        last_future_date = future_data['date'].max()
        months_needed = (last_future_date.year - last_train_date.year) * 12 + \
                       (last_future_date.month - last_train_date.month)
        # 如果 periods > 12，使用 future_data 的最大范围；否则只预测指定月数
        if periods > 12:
            periods = max(periods, months_needed)
        else:
            # 只预测一年，不需要 future_data 中 2025 年及以后的数据
            periods = min(periods, 12)
    
    # 使用 make_future_dataframe 创建包含历史数据的 future
    future = model.make_future_dataframe(periods=periods, freq=freq)
    
    # 将日期调整为每月1号（月初）
    future['ds'] = future['ds'].dt.to_period('M').dt.start_time
    
    # 如果是 logistic growth，为 future 也添加 cap
    if growth == 'logistic':
        if 'cap' in prophet_data.columns:
            cap_value = prophet_data['cap'].iloc[0]  # 使用训练数据中的 cap 值
            future['cap'] = cap_value
    
    # 为 future 添加回归变量
    if extra_vars:
        for var in extra_vars:
            if var in prophet_data.columns:
                # 创建映射：历史数据使用训练数据，未来数据使用 future_data 或最后值
                var_values = {}
                
                # 历史数据部分：使用训练数据中的值
                for _, row in prophet_data.iterrows():
                    var_values[row['ds']] = row[var]
                
                # 未来数据部分（如果有）
                if len(future_data) > 0:
                    for _, row in future_data.iterrows():
                        var_values[pd.Timestamp(row['date'])] = pd.to_numeric(row[var], errors='coerce')
                
                # 填充 future：历史部分用训练数据，未来部分用 future_data 或最后值
                last_val = prophet_data[var].iloc[-1]
                future[var] = future['ds'].apply(
                    lambda x: var_values.get(x, last_val) if x in var_values else last_val
                )

    forecast = model.predict(future)
    return forecast, model, prophet_data


def prepare_prophet_data(backend_dir: Path) -> pd.DataFrame:
    """
    准备 Prophet 模型所需的数据（月度数据 + 额外变量）
    
    返回:
    - DataFrame with columns: date, count, and optional extra variables
    """
    # 读取原始数据
    data_path = backend_dir / 'data' / '1_demand_forecasting' / 'data.csv'
    df = pd.read_csv(data_path, encoding='latin1')
    
    # 转换日期并聚合为月度数据
    df['tdate'] = pd.to_datetime(df['tdate'], errors='coerce')
    df = df[df['tdate'].notna()]
    df = df[df['tdate'] >= '2013-01-01']
    
    monthly_data = df.groupby(df['tdate'].dt.to_period('M')).size().reset_index(name='count')
    monthly_data['date'] = monthly_data['tdate'].astype(str) + '-01'
    monthly_data['date'] = pd.to_datetime(monthly_data['date'])
    monthly_data = monthly_data[['date', 'count']].sort_values('date').reset_index(drop=True)
    
    # 读取人口数据（月度）- 如果有的话
    pop_monthly_path = backend_dir / 'data' / '1_demand_forecasting' / 'acs1_population_2013_2023_age_group.csv'
    if pop_monthly_path.exists():
        pop_monthly = pd.read_csv(pop_monthly_path)
        if 'date' in pop_monthly.columns:
            pop_monthly['date'] = pd.to_datetime(pop_monthly['date'])
            # 合并人口数据
            monthly_data = monthly_data.merge(
                pop_monthly,
                on='date',
                how='left'
            )
    
    return monthly_data


def extract_forecast_data(forecast: pd.DataFrame, train_data: pd.DataFrame) -> Dict[str, Any]:
    """
    从 Prophet forecast 中提取数据用于前端可视化
    
    返回:
    - forecast_data: 预测数据（包含历史拟合和未来预测）
    - components: 模型组件数据（trend, yearly等）
    """
    # 提取预测数据
    forecast_data = []
    for _, row in forecast.iterrows():
        forecast_data.append({
            'date': row['ds'].strftime('%Y-%m-%d'),
            'predicted': float(row['yhat']),
            'lower': float(row['yhat_lower']),
            'upper': float(row['yhat_upper'])
        })
    
    # 添加历史实际值（直接遍历 train_data，因为所有训练数据的日期都在 forecast 中）
    historical_actual = []
    for _, row in train_data.iterrows():
        historical_actual.append({
            'date': row['ds'].strftime('%Y-%m-%d'),
            'actual': float(row['y'])
        })
    
    
    # 提取组件数据
    components = {}
    
    # Trend
    if 'trend' in forecast.columns:
        components['trend'] = [
            {'date': row['ds'].strftime('%Y-%m-%d'), 'value': float(row['trend'])}
            for _, row in forecast.iterrows()
        ]
    
    # Yearly seasonality
    if 'yearly' in forecast.columns:
        components['yearly'] = [
            {'date': row['ds'].strftime('%Y-%m-%d'), 'value': float(row['yearly'])}
            for _, row in forecast.iterrows()
        ]
    
    # Weekly seasonality
    if 'weekly' in forecast.columns:
        components['weekly'] = [
            {'date': row['ds'].strftime('%Y-%m-%d'), 'value': float(row['weekly'])}
            for _, row in forecast.iterrows()
        ]
    
    # Daily seasonality
    if 'daily' in forecast.columns:
        components['daily'] = [
            {'date': row['ds'].strftime('%Y-%m-%d'), 'value': float(row['daily'])}
            for _, row in forecast.iterrows()
        ]
    
    # Extra regressors
    extra_regressors = {}
    excluded_cols = ['ds', 'yhat', 'yhat_lower', 'yhat_upper', 'trend', 'yearly', 'weekly', 'daily', 
                     'additive_terms', 'multiplicative_terms', 'y']
    for col in forecast.columns:
        if col not in excluded_cols and col in train_data.columns:
            var_name = col
            extra_regressors[var_name] = [
                {'date': row['ds'].strftime('%Y-%m-%d'), 'value': float(row[col])}
                for _, row in forecast.iterrows()
            ]
    
    if extra_regressors:
        components['extra_regressors'] = extra_regressors
    
    return {
        'forecast_data': forecast_data,
        'historical_actual': historical_actual,
        'components': components
    }


def cross_validate_prophet(model: Prophet, prophet_data: pd.DataFrame) -> Dict[str, Any]:
    """
    对 Prophet 模型进行交叉验证
    
    返回:
    - 交叉验证指标（MAPE, MAE, RMSE等）
    """
    from prophet.diagnostics import cross_validation, performance_metrics
    
    # 交叉验证
    df_cv = cross_validation(
        model,
        initial='730 days',  # 2 years
        period='365 days',   # 1 year
        horizon='365 days'   # 1 year
    )
    
    # 计算性能指标
    df_p = performance_metrics(df_cv)
    
    # 提取平均指标
    metrics = {
        'mape': float(df_p['mape'].mean()),
        'mae': float(df_p['mae'].mean()),
        'rmse': float(df_p['rmse'].mean()),
        'coverage': float(df_p['coverage'].mean()) if 'coverage' in df_p.columns else None
    }
    
    return metrics
