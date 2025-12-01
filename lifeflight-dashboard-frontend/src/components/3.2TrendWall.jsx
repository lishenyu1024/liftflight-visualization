// 3.2 Trend Wall (Metric Cards + Lines)
// Chart 3.2: Trend Wall - KPI cards (YTD, YoY) with monthly lines and short forecast tails
//
// Analysis:
// This chart displays KPI metric cards showing Year-to-Date (YTD) and Year-over-Year (YoY)
// comparisons, along with monthly trend lines and short forecast tails for strategic decision-making.

import { useState, useEffect } from 'react';
import { 
  Box, 
  Paper, 
  Typography, 
  Select, 
  MenuItem, 
  FormControl, 
  InputLabel,
  CircularProgress,
  Alert,
  Grid,
  Card,
  CardContent
} from '@mui/material';
import { useTheme } from '@mui/material';
import { tokens } from '../theme';
import { ResponsiveLine } from '@nivo/line';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import TrendingDownIcon from '@mui/icons-material/TrendingDown';

const TrendWall = () => {
  const theme = useTheme();
  const colors = tokens(theme.palette.mode);
  
  const [currentYear, setCurrentYear] = useState(2023);
  const [currentMonth, setCurrentMonth] = useState(null);
  const [forecastMonths, setForecastMonths] = useState(6);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [data, setData] = useState(null);
  
  const availableYears = [2020, 2021, 2022, 2023];
  const availableMonths = [
    { value: null, label: 'All Months' },
    { value: 1, label: 'January' },
    { value: 2, label: 'February' },
    { value: 3, label: 'March' },
    { value: 4, label: 'April' },
    { value: 5, label: 'May' },
    { value: 6, label: 'June' },
    { value: 7, label: 'July' },
    { value: 8, label: 'August' },
    { value: 9, label: 'September' },
    { value: 10, label: 'October' },
    { value: 11, label: 'November' },
    { value: 12, label: 'December' }
  ];
  
  useEffect(() => {
    fetchData();
  }, [currentYear, currentMonth, forecastMonths]);
  
  const fetchData = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const params = new URLSearchParams({
        current_year: currentYear.toString(),
        forecast_months: forecastMonths.toString()
      });
      
      if (currentMonth !== null) {
        params.append('current_month', currentMonth.toString());
      }
      
      const response = await fetch(`http://localhost:5001/api/trend_wall?${params}`);
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
      }
      
      const result = await response.json();
      
      if (result.status === 'success') {
        setData(result.data);
      } else {
        throw new Error(result.message || 'Failed to fetch trend wall data');
      }
    } catch (err) {
      setError(err.message);
      console.error('Trend wall request failed:', err);
    } finally {
      setLoading(false);
    }
  };
  
  // Prepare line chart data
  const prepareLineData = (metricId) => {
    if (!data || !data.trend_lines || !data.trend_lines[metricId]) return [];
    
    const trendPoints = data.trend_lines[metricId];
    
    // Separate historical and forecast
    const historical = trendPoints.filter(p => !p.is_forecast);
    const forecast = trendPoints.filter(p => p.is_forecast);
    
    const series = [];
    
    if (historical.length > 0) {
      series.push({
        id: metricId,
        color: colors.blueAccent[400],
        data: historical.map(p => ({
          x: p.date,
          y: p.value
        }))
      });
    }
    
    if (forecast.length > 0) {
      series.push({
        id: `${metricId}_forecast`,
        color: colors.grey[400],
        data: forecast.map(p => ({
          x: p.date,
          y: p.value
        }))
      });
    }
    
    return series;
  };
  
  return (
    <Box m="20px" sx={{ mt: "0px" }}>
      <Typography variant="h3" sx={{ mb: "10px", color: colors.grey[100] }}>
        3.2 Trend Wall
      </Typography>
      <Typography variant="h6" sx={{ mb: "10px", color: colors.grey[300] }}>
        Trend Wall - KPI cards (YTD, YoY) with monthly lines and short forecast tails
      </Typography>
      <Typography variant="body2" sx={{ mb: "20px", color: colors.grey[400], fontStyle: 'italic' }}>
        Display KPI metric cards showing Year-to-Date (YTD) and Year-over-Year (YoY) comparisons,
        along with monthly trend lines and short forecast tails for strategic decision-making.
      </Typography>
      
      {/* Controls */}
      <Paper sx={{ p: 3, mb: 3, backgroundColor: '#ffffff', color: '#000000' }}>
        <Grid container spacing={3} alignItems="center">
          <Grid item xs={12} md={4}>
            <FormControl fullWidth>
              <InputLabel sx={{ color: '#000000' }}>Current Year</InputLabel>
              <Select
                value={currentYear}
                label="Current Year"
                onChange={(e) => setCurrentYear(e.target.value)}
                sx={{
                  color: '#000000',
                  '& .MuiOutlinedInput-notchedOutline': {
                    borderColor: colors.grey[400],
                  },
                  '&:hover .MuiOutlinedInput-notchedOutline': {
                    borderColor: colors.grey[600],
                  },
                  '& .MuiSvgIcon-root': {
                    color: '#000000',
                  },
                }}
              >
                {availableYears.map((y) => (
                  <MenuItem key={y} value={y}>{y}</MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
          
          <Grid item xs={12} md={4}>
            <FormControl fullWidth>
              <InputLabel sx={{ color: '#000000' }}>Current Month (YTD)</InputLabel>
              <Select
                value={currentMonth === null ? '' : currentMonth}
                label="Current Month (YTD)"
                onChange={(e) => setCurrentMonth(e.target.value === '' ? null : e.target.value)}
                sx={{
                  color: '#000000',
                  '& .MuiOutlinedInput-notchedOutline': {
                    borderColor: colors.grey[400],
                  },
                  '&:hover .MuiOutlinedInput-notchedOutline': {
                    borderColor: colors.grey[600],
                  },
                  '& .MuiSvgIcon-root': {
                    color: '#000000',
                  },
                }}
              >
                {availableMonths.map((m) => (
                  <MenuItem key={m.value || 'all'} value={m.value || ''}>{m.label}</MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
          
          <Grid item xs={12} md={4}>
            <FormControl fullWidth>
              <InputLabel sx={{ color: '#000000' }}>Forecast Months</InputLabel>
              <Select
                value={forecastMonths}
                label="Forecast Months"
                onChange={(e) => setForecastMonths(e.target.value)}
                sx={{
                  color: '#000000',
                  '& .MuiOutlinedInput-notchedOutline': {
                    borderColor: colors.grey[400],
                  },
                  '&:hover .MuiOutlinedInput-notchedOutline': {
                    borderColor: colors.grey[600],
                  },
                  '& .MuiSvgIcon-root': {
                    color: '#000000',
                  },
                }}
              >
                <MenuItem value={3}>3 months</MenuItem>
                <MenuItem value={6}>6 months</MenuItem>
                <MenuItem value={12}>12 months</MenuItem>
              </Select>
            </FormControl>
          </Grid>
        </Grid>
      </Paper>
      
      {/* Error message */}
      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}
      
      {/* Loading */}
      {loading && (
        <Box display="flex" justifyContent="center" alignItems="center" height="400px">
          <CircularProgress />
        </Box>
      )}
      
      {/* KPI Cards and Trend Lines */}
      {!loading && data && data.kpi_cards && (
        <Grid container spacing={3}>
          {data.kpi_cards.map((card) => {
            const lineData = prepareLineData(card.id);
            const isPositive = card.yoy_change.is_positive;
            const changeColor = isPositive ? colors.greenAccent[400] : colors.redAccent[400];
            
            return (
              <Grid item xs={12} md={6} key={card.id}>
                <Card sx={{ backgroundColor: '#ffffff', height: '100%', border: `1px solid ${colors.grey[300]}` }}>
                  <CardContent>
                    <Typography variant="h6" sx={{ mb: 2, color: '#000000' }}>
                      {card.title}
                    </Typography>
                    
                    {/* Current Value and YoY Change */}
                    <Box sx={{ mb: 2 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Typography variant="h4" sx={{ color: '#000000', fontWeight: 'bold' }}>
                          {card.unit === '$' 
                            ? `$${card.current_value.toLocaleString(undefined, { maximumFractionDigits: 0 })}`
                            : card.unit === '%'
                            ? `${card.current_value.toFixed(1)}%`
                            : card.current_value.toLocaleString(undefined, { maximumFractionDigits: 1 })}
                        </Typography>
                        {isPositive ? (
                          <TrendingUpIcon sx={{ color: changeColor }} />
                        ) : (
                          <TrendingDownIcon sx={{ color: changeColor }} />
                        )}
                        <Typography variant="body2" sx={{ color: changeColor }}>
                          {card.yoy_change.percentage_change > 0 ? '+' : ''}
                          {card.yoy_change.percentage_change.toFixed(1)}%
                        </Typography>
                      </Box>
                      
                      {card.subtitle && (
                        <Typography variant="body2" sx={{ color: colors.grey[600], mt: 0.5 }}>
                          {card.subtitle}
                        </Typography>
                      )}
                      
                      <Typography variant="caption" sx={{ color: colors.grey[700], display: 'block', mt: 1 }}>
                        YoY: {card.unit === '$' 
                          ? `$${card.previous_value.toLocaleString(undefined, { maximumFractionDigits: 0 })}`
                          : card.unit === '%'
                          ? `${card.previous_value.toFixed(1)}%`
                          : card.previous_value.toLocaleString(undefined, { maximumFractionDigits: 1 })} → {card.unit === '$' 
                          ? `$${card.current_value.toLocaleString(undefined, { maximumFractionDigits: 0 })}`
                          : card.unit === '%'
                          ? `${card.current_value.toFixed(1)}%`
                          : card.current_value.toLocaleString(undefined, { maximumFractionDigits: 1 })}
                      </Typography>
                    </Box>
                    
                    {/* Trend Line */}
                    {lineData.length > 0 && (
                      <Box height="200px">
                        <ResponsiveLine
                          data={lineData}
                          margin={{ top: 10, right: 20, bottom: 80, left: 50 }}
                          xScale={{ type: 'point' }}
                          yScale={{ type: 'linear', min: 'auto', max: 'auto' }}
                          curve="monotoneX"
                          axisTop={null}
                          axisRight={null}
                          axisBottom={{
                            tickSize: 5,
                            tickPadding: 5,
                            tickRotation: -45,
                            legend: 'Date',
                            legendOffset: 66,
                            legendPosition: 'middle',
                            tickValues: lineData.length > 0 && lineData[0].data ? 
                              lineData[0].data.filter((_, i) => i % 3 === 0 || i === lineData[0].data.length - 1).map(d => d.x) : 
                              undefined,
                            format: (value) => {
                              // Show only year-month
                              if (value && value.length >= 7) {
                                return value.substring(0, 7);
                              }
                              return value;
                            }
                          }}
                          axisLeft={{
                            tickSize: 5,
                            tickPadding: 5,
                            tickRotation: 0,
                            legend: card.unit,
                            legendOffset: -40,
                            legendPosition: 'middle',
                            format: (value) => {
                              if (card.unit === '$') return `$${value.toFixed(0)}`;
                              if (card.unit === '%') return `${value.toFixed(0)}%`;
                              return value.toFixed(0);
                            }
                          }}
                          pointSize={6}
                          pointColor={{ theme: 'background' }}
                          pointBorderWidth={2}
                          pointBorderColor={{ from: 'serieColor' }}
                          enableArea={false}
                          enableGridX={false}
                          enableGridY={true}
                          useMesh={true}
                          legends={[]}
                          theme={{
                            axis: {
                              domain: {
                                line: {
                                  stroke: colors.grey[700],
                                  strokeWidth: 1
                                }
                              },
                              legend: {
                                text: {
                                  fill: '#000000'
                                }
                              },
                              ticks: {
                                line: {
                                  stroke: colors.grey[700],
                                  strokeWidth: 1
                                },
                                text: {
                                  fill: '#000000'
                                }
                              }
                            },
                            grid: {
                              line: {
                                stroke: colors.grey[300],
                                strokeWidth: 1
                              }
                            },
                            tooltip: {
                              container: {
                                background: '#ffffff',
                                color: '#000000',
                                border: `1px solid ${colors.grey[300]}`
                              }
                            }
                          }}
                        />
                      </Box>
                    )}
                  </CardContent>
                </Card>
              </Grid>
            );
          })}
        </Grid>
      )}
      
      {/* Metadata */}
      {!loading && data && data.metadata && (
        <Paper sx={{ p: 2, mt: 3, backgroundColor: '#ffffff', border: `1px solid ${colors.grey[300]}` }}>
          <Typography variant="body2" sx={{ color: '#000000' }}>
            Historical months: {data.metadata.historical_months} | 
            Forecast months: {data.metadata.forecast_months}
          </Typography>
        </Paper>
      )}
    </Box>
  );
};

export default TrendWall;

