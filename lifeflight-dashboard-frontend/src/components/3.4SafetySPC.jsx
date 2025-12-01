// 3.4 Safety & Quality SPC Control Charts
// Chart 3.4: Safety & Quality SPC Control Charts - Incident rates with mean/UCL/LCL
//
// Analysis:
// This chart displays incident rates using Statistical Process Control (SPC) methodology,
// showing mean, Upper Control Limit (UCL), and Lower Control Limit (LCL). It identifies
// assignable-cause points (points outside control limits) to help define success metrics
// including safety/quality.

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
  Chip
} from '@mui/material';
import { useTheme } from '@mui/material';
import { tokens } from '../theme';
import { ResponsiveLine } from '@nivo/line';

const SafetySPC = () => {
  const theme = useTheme();
  const colors = tokens(theme.palette.mode);
  
  const [startYear, setStartYear] = useState(2020);
  const [endYear, setEndYear] = useState(2023);
  const [aggregation, setAggregation] = useState('month');
  const [method, setMethod] = useState('3sigma');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [data, setData] = useState(null);
  
  const availableYears = [2018, 2019, 2020, 2021, 2022, 2023];
  
  useEffect(() => {
    fetchData();
  }, [startYear, endYear, aggregation, method]);
  
  const fetchData = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const params = new URLSearchParams({
        start_year: startYear.toString(),
        end_year: endYear.toString(),
        aggregation: aggregation,
        method: method
      });
      
      const response = await fetch(`http://localhost:5001/api/safety_spc?${params}`);
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
      }
      
      const result = await response.json();
      
      if (result.status === 'success') {
        setData(result.data);
      } else {
        throw new Error(result.message || 'Failed to fetch safety SPC data');
      }
    } catch (err) {
      setError(err.message);
      console.error('Safety SPC request failed:', err);
    } finally {
      setLoading(false);
    }
  };
  
  // Prepare line chart data
  const prepareLineData = () => {
    if (!data || !data.data || data.data.length === 0) return [];
    
    const series = [];
    
    // Incident rate line
    series.push({
      id: 'incident_rate',
      color: colors.blueAccent[500],
      data: data.data.map(d => ({
        x: d.period,
        y: d.incident_rate
      }))
    });
    
    // Mean line
    if (data.control_limits) {
      series.push({
        id: 'mean',
        color: colors.greenAccent[500],
        data: data.data.map(d => ({
          x: d.period,
          y: data.control_limits.mean
        }))
      });
      
      // UCL line
      series.push({
        id: 'ucl',
        color: colors.redAccent[500],
        data: data.data.map(d => ({
          x: d.period,
          y: data.control_limits.ucl
        }))
      });
      
      // LCL line
      series.push({
        id: 'lcl',
        color: colors.redAccent[500],
        data: data.data.map(d => ({
          x: d.period,
          y: data.control_limits.lcl
        }))
      });
    }
    
    return series;
  };
  
  const lineData = prepareLineData();
  
  return (
    <Box m="20px" sx={{ mt: "0px" }}>
      <Typography variant="h3" sx={{ mb: "10px", color: '#000000', fontWeight: 700 }}>
        3.4 Safety & Quality SPC Control Charts
      </Typography>
      <Typography variant="h6" sx={{ mb: "10px", color: '#666666', fontWeight: 500 }}>
        Safety & Quality SPC Control Charts - Incident rates with mean/UCL/LCL
      </Typography>
      <Typography variant="body2" sx={{ mb: "20px", color: '#999999', fontStyle: 'italic' }}>
        Display incident rates using Statistical Process Control (SPC) methodology, showing mean,
        Upper Control Limit (UCL), and Lower Control Limit (LCL). Identify assignable-cause points
        (points outside control limits) to help define success metrics including safety/quality.
      </Typography>
      
      {/* Controls */}
      <Paper sx={{ 
        p: 3, 
        mb: 3, 
        backgroundColor: '#ffffff',
        border: '1px solid #e0e0e0',
        boxShadow: '0 2px 4px rgba(0,0,0,0.05)'
      }}>
        <Grid container spacing={3} alignItems="center">
          <Grid item xs={12} md={3}>
            <FormControl fullWidth>
              <InputLabel sx={{ color: '#666666' }}>Start Year</InputLabel>
              <Select
                value={startYear}
                label="Start Year"
                onChange={(e) => setStartYear(e.target.value)}
                sx={{
                  color: '#000000',
                  '& .MuiOutlinedInput-notchedOutline': {
                    borderColor: '#e0e0e0',
                  },
                  '&:hover .MuiOutlinedInput-notchedOutline': {
                    borderColor: '#bdbdbd',
                  },
                  '& .MuiSvgIcon-root': {
                    color: '#666666',
                  },
                }}
              >
                {availableYears.map((y) => (
                  <MenuItem key={y} value={y}>{y}</MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
          
          <Grid item xs={12} md={3}>
            <FormControl fullWidth>
              <InputLabel sx={{ color: '#666666' }}>End Year</InputLabel>
              <Select
                value={endYear}
                label="End Year"
                onChange={(e) => setEndYear(e.target.value)}
                sx={{
                  color: '#000000',
                  '& .MuiOutlinedInput-notchedOutline': {
                    borderColor: '#e0e0e0',
                  },
                  '&:hover .MuiOutlinedInput-notchedOutline': {
                    borderColor: '#bdbdbd',
                  },
                  '& .MuiSvgIcon-root': {
                    color: '#666666',
                  },
                }}
              >
                {availableYears.filter(y => y >= startYear).map((y) => (
                  <MenuItem key={y} value={y}>{y}</MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
          
          <Grid item xs={12} md={3}>
            <FormControl fullWidth>
              <InputLabel sx={{ color: '#666666' }}>Aggregation</InputLabel>
              <Select
                value={aggregation}
                label="Aggregation"
                onChange={(e) => setAggregation(e.target.value)}
                sx={{
                  color: '#000000',
                  '& .MuiOutlinedInput-notchedOutline': {
                    borderColor: '#e0e0e0',
                  },
                  '&:hover .MuiOutlinedInput-notchedOutline': {
                    borderColor: '#bdbdbd',
                  },
                  '& .MuiSvgIcon-root': {
                    color: '#666666',
                  },
                }}
              >
                <MenuItem value="month">Monthly</MenuItem>
                <MenuItem value="week">Weekly</MenuItem>
                <MenuItem value="year">Yearly</MenuItem>
              </Select>
            </FormControl>
          </Grid>
          
          <Grid item xs={12} md={3}>
            <FormControl fullWidth>
              <InputLabel sx={{ color: '#666666' }}>Control Method</InputLabel>
              <Select
                value={method}
                label="Control Method"
                onChange={(e) => setMethod(e.target.value)}
                sx={{
                  color: '#000000',
                  '& .MuiOutlinedInput-notchedOutline': {
                    borderColor: '#e0e0e0',
                  },
                  '&:hover .MuiOutlinedInput-notchedOutline': {
                    borderColor: '#bdbdbd',
                  },
                  '& .MuiSvgIcon-root': {
                    color: '#666666',
                  },
                }}
              >
                <MenuItem value="3sigma">3-Sigma</MenuItem>
                <MenuItem value="individual">Individual Moving Range</MenuItem>
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
        <Box display="flex" justifyContent="center" alignItems="center" height="600px">
          <CircularProgress />
        </Box>
      )}
      
      {/* SPC Control Chart */}
      {!loading && data && lineData.length > 0 && (
        <Box>
          <Paper sx={{ 
            p: 3, 
            mb: 3, 
            backgroundColor: '#ffffff',
            border: '1px solid #e0e0e0',
            boxShadow: '0 2px 4px rgba(0,0,0,0.05)',
            height: "600px"
          }}>
            <Typography variant="h5" sx={{ mb: 2, color: '#000000', fontWeight: 600 }}>
              Safety & Quality Control Chart
            </Typography>
            <Typography variant="body2" sx={{ mb: 2, color: '#666666' }}>
              Incident rate control chart with mean (green), UCL/LCL (red), and assignable-cause points highlighted
            </Typography>
            
            <Box height="500px">
              <ResponsiveLine
                data={lineData}
                margin={{ top: 50, right: 140, bottom: 80, left: 80 }}
                xScale={{ type: 'point' }}
                yScale={{ type: 'linear', min: 0, max: 'auto' }}
                curve="stepAfter"
                axisTop={null}
                axisRight={null}
                axisBottom={{
                  tickSize: 5,
                  tickPadding: 5,
                  tickRotation: -45,
                  legend: 'Period',
                  legendOffset: 66,
                  legendPosition: 'middle',
                  tickValues: data.data.length > 20 ? 
                    data.data.filter((_, i) => i % 3 === 0 || i === data.data.length - 1).map(d => d.period) : 
                    undefined,
                  format: (value) => {
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
                  legend: 'Incident Rate (%)',
                  legendPosition: 'middle',
                  legendOffset: -60,
                  format: (value) => `${value.toFixed(1)}%`
                }}
                pointSize={8}
                pointColor={{ theme: 'background' }}
                pointBorderWidth={2}
                pointBorderColor={{ from: 'serieColor' }}
                pointLabelYOffset={-12}
                enableArea={false}
                enableGridX={false}
                enableGridY={true}
                useMesh={true}
                legends={[
                  {
                    anchor: 'bottom-right',
                    direction: 'column',
                    justify: false,
                    translateX: 130,
                    translateY: 0,
                    itemsSpacing: 2,
                    itemWidth: 100,
                    itemHeight: 20,
                    itemDirection: 'left-to-right',
                    itemOpacity: 0.85,
                    symbolSize: 12,
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
                        stroke: '#bdbdbd',
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
                        stroke: '#bdbdbd',
                        strokeWidth: 1
                      },
                      text: {
                        fill: '#000000'
                      }
                    }
                  },
                  grid: {
                    line: {
                      stroke: '#f0f0f0',
                      strokeWidth: 1
                    }
                  },
                  tooltip: {
                    container: {
                      background: '#ffffff',
                      color: '#000000',
                      border: '1px solid #e0e0e0'
                    }
                  }
                }}
              />
            </Box>
          </Paper>
          
          {/* Control Limits Summary */}
          {data.control_limits && (
            <Paper sx={{ 
              p: 3, 
              mb: 3, 
              backgroundColor: '#ffffff',
              border: '1px solid #e0e0e0',
              boxShadow: '0 2px 4px rgba(0,0,0,0.05)'
            }}>
              <Typography variant="h6" sx={{ mb: 2, color: '#000000', fontWeight: 600 }}>
                Control Limits
              </Typography>
              <Grid container spacing={2}>
                <Grid item xs={12} md={3}>
                  <Typography variant="body2" sx={{ color: '#666666' }}>
                    Mean (CL)
                  </Typography>
                  <Typography variant="h6" sx={{ color: colors.greenAccent[500], fontWeight: 600 }}>
                    {data.control_limits.mean.toFixed(2)}%
                  </Typography>
                </Grid>
                <Grid item xs={12} md={3}>
                  <Typography variant="body2" sx={{ color: '#666666' }}>
                    Upper Control Limit (UCL)
                  </Typography>
                  <Typography variant="h6" sx={{ color: colors.redAccent[500], fontWeight: 600 }}>
                    {data.control_limits.ucl.toFixed(2)}%
                  </Typography>
                </Grid>
                <Grid item xs={12} md={3}>
                  <Typography variant="body2" sx={{ color: '#666666' }}>
                    Lower Control Limit (LCL)
                  </Typography>
                  <Typography variant="h6" sx={{ color: colors.redAccent[500], fontWeight: 600 }}>
                    {data.control_limits.lcl.toFixed(2)}%
                  </Typography>
                </Grid>
                <Grid item xs={12} md={3}>
                  <Typography variant="body2" sx={{ color: '#666666' }}>
                    Sigma (σ)
                  </Typography>
                  <Typography variant="h6" sx={{ color: '#000000', fontWeight: 600 }}>
                    {data.control_limits.sigma.toFixed(2)}%
                  </Typography>
                </Grid>
              </Grid>
            </Paper>
          )}
          
          {/* Assignable-Cause Points */}
          {data.assignable_causes && data.assignable_causes.length > 0 && (
            <Paper sx={{ 
              p: 3, 
              mb: 3, 
              backgroundColor: '#ffffff',
              border: '1px solid #e0e0e0',
              boxShadow: '0 2px 4px rgba(0,0,0,0.05)'
            }}>
              <Typography variant="h6" sx={{ mb: 2, color: '#000000', fontWeight: 600 }}>
                Assignable-Cause Points (Out of Control)
              </Typography>
              <Grid container spacing={2}>
                {data.assignable_causes.map((point, idx) => (
                  <Grid item xs={12} md={6} key={idx}>
                    <Paper sx={{ 
                      p: 2, 
                      backgroundColor: '#fff3f3',
                      border: `1px solid ${colors.redAccent[200]}`,
                      borderLeft: `4px solid ${colors.redAccent[500]}`
                    }}>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1 }}>
                        <Typography variant="body1" sx={{ color: '#000000', fontWeight: 600 }}>
                          {point.period}
                        </Typography>
                        <Chip 
                          label={point.violation} 
                          size="small" 
                          sx={{ 
                            backgroundColor: colors.redAccent[100],
                            color: colors.redAccent[700],
                            fontWeight: 600
                          }}
                        />
                      </Box>
                      <Typography variant="body2" sx={{ color: '#666666', mb: 1 }}>
                        Incident Rate: <strong style={{ color: colors.redAccent[500] }}>
                          {point.incident_rate.toFixed(2)}%
                        </strong> ({point.incidents} of {point.total_missions} missions)
                      </Typography>
                      {point.details && (
                        <Box sx={{ mt: 1 }}>
                          <Typography variant="caption" sx={{ color: '#999999', display: 'block' }}>
                            Breakdown: Cancelled: {point.details.cancelled || 0} | 
                            Status Failed: {point.details.status_failed || 0} | 
                            RT Anomaly: {point.details.rt_anomaly || 0}
                          </Typography>
                        </Box>
                      )}
                    </Paper>
                  </Grid>
                ))}
              </Grid>
            </Paper>
          )}
          
          {/* Summary Statistics */}
          {data.metadata && (
            <Paper sx={{ 
              p: 3, 
              backgroundColor: '#ffffff',
              border: '1px solid #e0e0e0',
              boxShadow: '0 2px 4px rgba(0,0,0,0.05)'
            }}>
              <Typography variant="h6" sx={{ mb: 2, color: '#000000', fontWeight: 600 }}>
                Summary Statistics
              </Typography>
              <Grid container spacing={2}>
                <Grid item xs={12} md={3}>
                  <Typography variant="body2" sx={{ color: '#666666' }}>
                    Total Periods
                  </Typography>
                  <Typography variant="h6" sx={{ color: '#000000', fontWeight: 600 }}>
                    {data.metadata.total_periods}
                  </Typography>
                </Grid>
                <Grid item xs={12} md={3}>
                  <Typography variant="body2" sx={{ color: '#666666' }}>
                    Total Missions
                  </Typography>
                  <Typography variant="h6" sx={{ color: '#000000', fontWeight: 600 }}>
                    {data.metadata.total_missions.toLocaleString()}
                  </Typography>
                </Grid>
                <Grid item xs={12} md={3}>
                  <Typography variant="body2" sx={{ color: '#666666' }}>
                    Total Incidents
                  </Typography>
                  <Typography variant="h6" sx={{ color: colors.redAccent[500], fontWeight: 600 }}>
                    {data.metadata.total_incidents.toLocaleString()}
                  </Typography>
                </Grid>
                <Grid item xs={12} md={3}>
                  <Typography variant="body2" sx={{ color: '#666666' }}>
                    Overall Rate
                  </Typography>
                  <Typography variant="h6" sx={{ color: colors.redAccent[500], fontWeight: 600 }}>
                    {data.metadata.overall_rate.toFixed(2)}%
                  </Typography>
                </Grid>
              </Grid>
            </Paper>
          )}
        </Box>
      )}
    </Box>
  );
};

export default SafetySPC;

