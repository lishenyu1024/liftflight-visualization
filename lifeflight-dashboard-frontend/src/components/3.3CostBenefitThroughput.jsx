// 3.3 Cost–Benefit–Throughput Dual-Axis
// Chart 3.3: Cost–Benefit–Throughput Dual-Axis - Unit service cost vs. social benefit / revenue
//
// Analysis:
// This chart displays unit service cost vs. social benefit/revenue on dual-axis,
// with annotations for key inflection points and scenario labels for strategic planning & fundraising.

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
import { ResponsiveLine } from '@nivo/line';

const CostBenefitThroughput = () => {
  const theme = useTheme();
  const colors = tokens(theme.palette.mode);
  
  const [startYear, setStartYear] = useState(2020);
  const [endYear, setEndYear] = useState(2023);
  const [aggregation, setAggregation] = useState('month');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [data, setData] = useState(null);
  
  const availableYears = [2018, 2019, 2020, 2021, 2022, 2023];
  
  useEffect(() => {
    fetchData();
  }, [startYear, endYear, aggregation]);
  
  const fetchData = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const params = new URLSearchParams({
        start_year: startYear.toString(),
        end_year: endYear.toString(),
        aggregation: aggregation
      });
      
      const response = await fetch(`http://localhost:5001/api/cost_benefit_throughput?${params}`);
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
      }
      
      const result = await response.json();
      
      if (result.status === 'success') {
        setData(result.data);
      } else {
        throw new Error(result.message || 'Failed to fetch cost-benefit-throughput data');
      }
    } catch (err) {
      setError(err.message);
      console.error('Cost-benefit-throughput request failed:', err);
    } finally {
      setLoading(false);
    }
  };
  
  // Prepare dual-axis line chart data
  const prepareLineData = () => {
    if (!data || !data.data || data.data.length === 0) return [];
    
    // Left axis: Unit Cost
    const costSeries = {
      id: 'unit_cost',
      color: colors.redAccent[400],
      data: data.data.map(d => ({
        x: d.date,
        y: d.unit_cost
      }))
    };
    
    // Right axis: Social Benefit
    const benefitSeries = {
      id: 'social_benefit',
      color: colors.greenAccent[400],
      data: data.data.map(d => ({
        x: d.date,
        y: d.social_benefit / 1000  // Scale down for display (show in thousands)
      }))
    };
    
    // Right axis: Missions (Throughput)
    const missionsSeries = {
      id: 'missions',
      color: colors.blueAccent[400],
      data: data.data.map(d => ({
        x: d.date,
        y: d.missions
      }))
    };
    
    return [costSeries, benefitSeries, missionsSeries];
  };
  
  const lineData = prepareLineData();
  
  // Calculate axis scales
  const getAxisScales = () => {
    if (!data || !data.data || data.data.length === 0) return null;
    
    const costs = data.data.map(d => d.unit_cost).filter(v => v > 0);
    const benefits = data.data.map(d => d.social_benefit / 1000).filter(v => v > 0);
    const missions = data.data.map(d => d.missions).filter(v => v > 0);
    
    return {
      costMin: costs.length > 0 ? Math.min(...costs) * 0.9 : 0,
      costMax: costs.length > 0 ? Math.max(...costs) * 1.1 : 1000,
      benefitMin: benefits.length > 0 ? Math.min(...benefits) * 0.9 : 0,
      benefitMax: benefits.length > 0 ? Math.max(...benefits) * 1.1 : 1000,
      missionsMin: missions.length > 0 ? Math.min(...missions) * 0.9 : 0,
      missionsMax: missions.length > 0 ? Math.max(...missions) * 1.1 : 100
    };
  };
  
  const scales = getAxisScales();
  
  return (
    <Box m="20px" sx={{ mt: "0px" }}>
      <Typography variant="h3" sx={{ mb: "10px", color: colors.grey[100] }}>
        3.3 Cost–Benefit–Throughput Dual-Axis
      </Typography>
      <Typography variant="h6" sx={{ mb: "10px", color: colors.grey[300] }}>
        Cost–Benefit–Throughput Dual-Axis - Unit service cost vs. social benefit / revenue
      </Typography>
      <Typography variant="body2" sx={{ mb: "20px", color: colors.grey[400], fontStyle: 'italic' }}>
        Display unit service cost vs. social benefit/revenue on dual-axis with annotations
        for key inflection points and scenario labels for strategic planning & fundraising.
      </Typography>
      
      {/* Controls */}
      <Paper sx={{ p: 3, mb: 3, backgroundColor: '#ffffff', border: `1px solid ${colors.grey[300]}` }}>
        <Grid container spacing={3} alignItems="center">
          <Grid item xs={12} md={4}>
            <FormControl fullWidth>
              <InputLabel sx={{ color: '#000000' }}>Start Year</InputLabel>
              <Select
                value={startYear}
                label="Start Year"
                onChange={(e) => setStartYear(e.target.value)}
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
              <InputLabel sx={{ color: '#000000' }}>End Year</InputLabel>
              <Select
                value={endYear}
                label="End Year"
                onChange={(e) => setEndYear(e.target.value)}
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
                {availableYears.filter(y => y >= startYear).map((y) => (
                  <MenuItem key={y} value={y}>{y}</MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
          
          <Grid item xs={12} md={4}>
            <FormControl fullWidth>
              <InputLabel sx={{ color: '#000000' }}>Aggregation</InputLabel>
              <Select
                value={aggregation}
                label="Aggregation"
                onChange={(e) => setAggregation(e.target.value)}
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
                <MenuItem value="month">Monthly</MenuItem>
                <MenuItem value="year">Yearly</MenuItem>
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
      
      {/* Dual-Axis Chart */}
      {!loading && data && lineData.length > 0 && scales && (
        <Box>
          <Paper sx={{ p: 3, mb: 3, backgroundColor: '#ffffff', border: `1px solid ${colors.grey[300]}`, height: "600px" }}>
            <Typography variant="h5" sx={{ mb: 2, color: '#000000' }}>
              Unit Cost vs. Social Benefit & Throughput
            </Typography>
            <Typography variant="body2" sx={{ mb: 2, color: colors.grey[700] }}>
              Combined chart showing unit service cost (red, $), social benefit (green, $K), and missions/throughput (blue, count)
            </Typography>
            <Box sx={{ mb: 2, display: 'flex', gap: 2, flexWrap: 'wrap' }}>
              <Typography variant="caption" sx={{ color: colors.redAccent[400] }}>
                ● Unit Cost (left axis, $)
              </Typography>
              <Typography variant="caption" sx={{ color: colors.greenAccent[400] }}>
                ● Social Benefit (scaled, $K)
              </Typography>
              <Typography variant="caption" sx={{ color: colors.blueAccent[400] }}>
                ● Missions/Throughput (count)
              </Typography>
            </Box>
            
            <Box height="500px">
              <ResponsiveLine
                data={lineData}
                margin={{ top: 50, right: 140, bottom: 80, left: 80 }}
                xScale={{ type: 'point' }}
                yScale={{ 
                  type: 'linear', 
                  min: 0, 
                  max: 'auto',
                  stacked: false
                }}
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
                    if (value && value.length >= 7) {
                      return value.substring(0, 7);
                    }
                    return value;
                  }
                }}
                axisLeft={{
                  orient: 'left',
                  tickSize: 5,
                  tickPadding: 5,
                  tickRotation: 0,
                  legend: 'Value (Unit Cost $, Social Benefit $K, Missions)',
                  legendPosition: 'middle',
                  legendOffset: -70,
                  format: (value) => {
                    // Format based on scale - this is simplified
                    if (value > 1000) return `${(value/1000).toFixed(0)}K`;
                    if (value > 100) return `$${value.toFixed(0)}`;
                    return value.toFixed(0);
                  }
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
          </Paper>
          
          {/* Inflection Points */}
          {data.inflection_points && data.inflection_points.length > 0 && (
            <Paper sx={{ p: 3, mb: 3, backgroundColor: '#ffffff', border: `1px solid ${colors.grey[300]}` }}>
              <Typography variant="h6" sx={{ mb: 2, color: '#000000' }}>
                Key Inflection Points
              </Typography>
              <Grid container spacing={2}>
                {data.inflection_points.map((point, idx) => (
                  <Grid item xs={12} md={6} key={idx}>
                    <Paper sx={{ p: 2, backgroundColor: '#ffffff', border: `1px solid ${colors.grey[300]}` }}>
                      <Typography variant="body1" sx={{ color: '#000000', fontWeight: 'bold', mb: 0.5 }}>
                        {point.label}
                      </Typography>
                      <Typography variant="body2" sx={{ color: colors.grey[700] }}>
                        Date: {point.date}
                      </Typography>
                      {point.cost_change_pct !== undefined && (
                        <Typography variant="body2" sx={{ color: colors.grey[700] }}>
                          Cost change: {point.cost_change_pct.toFixed(1)}% | 
                          Throughput change: {point.throughput_change_pct?.toFixed(1)}%
                        </Typography>
                      )}
                    </Paper>
                  </Grid>
                ))}
              </Grid>
            </Paper>
          )}
          
          {/* Summary Statistics */}
          {data.metadata && (
            <Paper sx={{ p: 3, backgroundColor: '#ffffff', border: `1px solid ${colors.grey[300]}` }}>
              <Typography variant="h6" sx={{ mb: 2, color: '#000000' }}>
                Summary Statistics
              </Typography>
              <Grid container spacing={2}>
                <Grid item xs={12} md={4}>
                  <Typography variant="body2" sx={{ color: colors.grey[700] }}>
                    Average Unit Cost
                  </Typography>
                  <Typography variant="h6" sx={{ color: colors.redAccent[400], fontWeight: 'bold' }}>
                    ${data.metadata.avg_unit_cost.toFixed(2)}
                  </Typography>
                </Grid>
                <Grid item xs={12} md={4}>
                  <Typography variant="body2" sx={{ color: colors.grey[700] }}>
                    Average Missions
                  </Typography>
                  <Typography variant="h6" sx={{ color: colors.blueAccent[400], fontWeight: 'bold' }}>
                    {data.metadata.avg_missions.toFixed(0)}
                  </Typography>
                </Grid>
                <Grid item xs={12} md={4}>
                  <Typography variant="body2" sx={{ color: colors.grey[700] }}>
                    Data Points
                  </Typography>
                  <Typography variant="h6" sx={{ color: '#000000', fontWeight: 'bold' }}>
                    {data.metadata.data_points}
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

export default CostBenefitThroughput;

