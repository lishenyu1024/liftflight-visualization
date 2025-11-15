// 2.4 Weather-Driven Risk Boxes (Extreme Weather Frequency vs. Demand)
// Chart 2.4: Weather-Driven Risk Boxes - Mission distribution stratified by extreme weather quantiles
//
// Analysis:
// This chart analyzes the relationship between extreme weather frequency and emergency medical demand.
// It stratifies mission data by quantiles of extreme weather days and displays mission distribution
// as boxplots for each weather quantile. This guides contingency staffing and aircraft redundancy policies.

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
  Grid
} from '@mui/material';
import { useTheme } from '@mui/material';
import { tokens } from '../theme';
import { ResponsiveBar } from '@nivo/bar';

const WeatherRiskBoxes = () => {
  const theme = useTheme();
  const colors = tokens(theme.palette.mode);
  
  const [method, setMethod] = useState('precipitation');
  const [aggregationLevel, setAggregationLevel] = useState('day');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [data, setData] = useState(null);
  
  useEffect(() => {
    fetchData();
  }, [method, aggregationLevel]);
  
  const fetchData = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const params = new URLSearchParams({
        method: method,
        aggregation_level: aggregationLevel
      });
      
      const response = await fetch(`http://localhost:5001/api/weather_risk?${params}`);
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
      }
      
      const result = await response.json();
      
      if (result.status === 'success') {
        setData(result.data);
      } else {
        throw new Error(result.message || 'Failed to fetch weather risk data');
      }
    } catch (err) {
      setError(err.message);
      console.error('Weather risk request failed:', err);
    } finally {
      setLoading(false);
    }
  };
  
  // Prepare bar chart data (simulating boxplot with mean, median, q1, q3)
  const prepareBoxplotData = () => {
    if (!data || !data.boxplot_data) return [];
    
    return data.boxplot_data.map(item => ({
      quantile: item.quantile,
      min: item.min,
      q1: item.q1,
      median: item.median,
      q3: item.q3,
      max: item.max,
      mean: item.mean,
      count: item.count || 0
    }));
  };
  
  // Prepare summary statistics
  const prepareSummaryData = () => {
    if (!data || !data.boxplot_data) return [];
    
    return data.boxplot_data.map(item => ({
      quantile: item.quantile,
      median: item.median,
      mean: item.mean,
      count: item.count || 0
    }));
  };
  
  const boxplotData = prepareBoxplotData();
  const summaryData = prepareSummaryData();
  
  return (
    <Box m="20px" sx={{ mt: "0px" }}>
      <Typography variant="h3" sx={{ mb: "10px", color: colors.grey[100] }}>
        2.4 Weather-Driven Risk Boxes
      </Typography>
      <Typography variant="h6" sx={{ mb: "10px", color: colors.grey[300] }}>
        Weather-Driven Risk Boxes: Mission distribution stratified by extreme weather quantiles
      </Typography>
      <Typography variant="body2" sx={{ mb: "20px", color: colors.grey[400], fontStyle: 'italic' }}>
        This chart analyzes the relationship between extreme weather frequency and emergency medical demand.
        It stratifies mission data by quantiles of extreme weather days and displays mission distribution statistics.
        This guides contingency staffing and aircraft redundancy policies.
      </Typography>
      
      {/* Controls */}
      <Paper sx={{ p: 3, mb: 3, backgroundColor: '#ffffff' }}>
        <Grid container spacing={3} alignItems="center">
          <Grid item xs={12} md={4}>
            <FormControl fullWidth>
              <InputLabel sx={{ color: colors.grey[700] }}>Extreme Weather Method</InputLabel>
              <Select
                value={method}
                label="Extreme Weather Method"
                onChange={(e) => setMethod(e.target.value)}
                sx={{
                  color: colors.grey[900],
                  '& .MuiOutlinedInput-notchedOutline': {
                    borderColor: colors.grey[400],
                  },
                  '&:hover .MuiOutlinedInput-notchedOutline': {
                    borderColor: colors.grey[600],
                  },
                  '& .MuiSvgIcon-root': {
                    color: colors.grey[700],
                  },
                }}
              >
                <MenuItem value="precipitation">Precipitation</MenuItem>
                <MenuItem value="temperature">Temperature</MenuItem>
                <MenuItem value="combined">Combined</MenuItem>
              </Select>
            </FormControl>
          </Grid>
          
          <Grid item xs={12} md={4}>
            <FormControl fullWidth>
              <InputLabel sx={{ color: colors.grey[700] }}>Aggregation Level</InputLabel>
              <Select
                value={aggregationLevel}
                label="Aggregation Level"
                onChange={(e) => setAggregationLevel(e.target.value)}
                sx={{
                  color: colors.grey[900],
                  '& .MuiOutlinedInput-notchedOutline': {
                    borderColor: colors.grey[400],
                  },
                  '&:hover .MuiOutlinedInput-notchedOutline': {
                    borderColor: colors.grey[600],
                  },
                  '& .MuiSvgIcon-root': {
                    color: colors.grey[700],
                  },
                }}
              >
                <MenuItem value="day">Day</MenuItem>
                <MenuItem value="week">Week</MenuItem>
                <MenuItem value="month">Month</MenuItem>
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
      
      {/* Charts */}
      {!loading && data && (
        <Box>
          {/* Summary Statistics */}
          {summaryData && summaryData.length > 0 && (
            <Grid container spacing={2} sx={{ mb: 3 }}>
              {summaryData.map((item, idx) => (
                <Grid item xs={12} md={3} key={idx}>
                  <Paper sx={{ p: 2, backgroundColor: '#ffffff', textAlign: 'center' }}>
                    <Typography variant="h6" sx={{ color: '#000000', mb: 1 }}>
                      {item.quantile}
                    </Typography>
                    <Typography variant="h4" sx={{ color: colors.blueAccent[400], fontWeight: 'bold' }}>
                      {item.median.toFixed(1)}
                    </Typography>
                    <Typography variant="body2" sx={{ color: '#000000', mt: 0.5 }}>
                      Mean: {item.mean.toFixed(1)} | Count: {item.count}
                    </Typography>
                  </Paper>
                </Grid>
              ))}
            </Grid>
          )}
          
          {/* Boxplot-style Bar Chart */}
          {boxplotData && boxplotData.length > 0 && (
            <Paper sx={{ p: 3, backgroundColor: '#ffffff', height: "600px" }}>
              <Typography variant="h5" sx={{ mb: 2, color: '#000000' }}>
                Mission Distribution by Weather Quantile
              </Typography>
              <Typography variant="body2" sx={{ mb: 2, color: '#000000' }}>
                Boxplot-style visualization showing median, quartiles, and range for each weather quantile
              </Typography>
              <Box height="500px">
                <ResponsiveBar
                  data={boxplotData}
                  keys={['median', 'q1', 'q3', 'mean']}
                  indexBy="quantile"
                  margin={{ top: 50, right: 130, bottom: 80, left: 80 }}
                  padding={0.3}
                  valueScale={{ type: 'linear' }}
                  indexScale={{ type: 'band', round: true }}
                  colors={{ scheme: 'nivo' }}
                  axisTop={null}
                  axisRight={null}
                  axisBottom={{
                    tickSize: 5,
                    tickPadding: 5,
                    tickRotation: -45,
                    legend: 'Weather Quantile',
                    legendPosition: 'middle',
                    legendOffset: 60
                  }}
                  axisLeft={{
                    tickSize: 5,
                    tickPadding: 5,
                    tickRotation: 0,
                    legend: 'Mission Count',
                    legendPosition: 'middle',
                    legendOffset: -60
                  }}
                  labelSkipWidth={12}
                  labelSkipHeight={12}
                  labelTextColor="#000000"
                  legends={[
                    {
                      dataFrom: 'keys',
                      anchor: 'bottom-right',
                      direction: 'column',
                      justify: false,
                      translateX: 120,
                      translateY: 0,
                      itemsSpacing: 2,
                      itemWidth: 100,
                      itemHeight: 20,
                      itemDirection: 'left-to-right',
                      itemOpacity: 0.85,
                      symbolSize: 12,
                      textColor: '#000000',
                      effects: [
                        {
                          on: 'hover',
                          style: {
                            itemOpacity: 1
                          }
                        }
                      ]
                    }
                  ]}
                  theme={{
                      axis: {
                      domain: {
                        line: {
                          stroke: '#000000',
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
                          stroke: '#000000',
                          strokeWidth: 1
                        },
                        text: {
                          fill: '#000000'
                        }
                      }
                    },
                    tooltip: {
                      container: {
                        background: colors.grey[900],
                        color: colors.grey[100]
                      }
                    }
                  }}
                />
              </Box>
            </Paper>
          )}
          
          {/* Additional Statistics Table */}
          {boxplotData && boxplotData.length > 0 && (
            <Paper sx={{ p: 3, mt: 3, backgroundColor: '#ffffff' }}>
              <Typography variant="h6" sx={{ mb: 2, color: '#000000' }}>
                Detailed Statistics by Weather Quantile
              </Typography>
              <Grid container spacing={2}>
                {boxplotData.map((item, idx) => (
                  <Grid item xs={12} md={6} lg={3} key={idx}>
                    <Paper sx={{ p: 2, backgroundColor: colors.blueAccent[800] }}>
                      <Typography variant="body1" sx={{ color: '#000000', fontWeight: 'bold', mb: 1 }}>
                        {item.quantile}
                      </Typography>
                      <Typography variant="body2" sx={{ color: '#000000' }}>
                        Min: {item.min.toFixed(1)}<br />
                        Q1: {item.q1.toFixed(1)}<br />
                        Median: {item.median.toFixed(1)}<br />
                        Q3: {item.q3.toFixed(1)}<br />
                        Max: {item.max.toFixed(1)}<br />
                        Mean: {item.mean.toFixed(1)}<br />
                        Count: {item.count}
                      </Typography>
                    </Paper>
                  </Grid>
                ))}
              </Grid>
            </Paper>
          )}
        </Box>
      )}
    </Box>
  );
};

export default WeatherRiskBoxes;

