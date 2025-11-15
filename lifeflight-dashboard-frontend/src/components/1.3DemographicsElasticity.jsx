// 1.3 Demographics vs. Demand Elasticity (Scatter + Fit / Marginal Effects)
// Chart 1.3: Demographics vs. Demand Elasticity - County-level regression analysis
// 
// Analysis:
// This chart analyzes the relationship between demographic factors (65+ share, population growth rate)
// and emergency medical demand elasticity at the county level. It shows:
// - Scatter plot: missions per 1,000 population vs. demographic factors
// - Regression fit line: Linear regression with confidence intervals
// - Elasticity coefficients: Impact of each demographic factor on demand
// - Marginal effects: Impact by cohort (geriatrics, pediatrics, trauma)

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
  Tabs,
  Tab
} from '@mui/material';
import { useTheme } from '@mui/material';
import { tokens } from '../theme';
import { ResponsiveLine } from '@nivo/line';
import { ResponsiveBar } from '@nivo/bar';

const DemographicsElasticity = () => {
  const theme = useTheme();
  const colors = tokens(theme.palette.mode);
  
  const [year, setYear] = useState(2023);
  const [tabValue, setTabValue] = useState(0); // 0: scatter, 1: marginal effects
  const [xVariable, setXVariable] = useState('pct_65plus'); // 'pct_65plus' or 'growth_rate'
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [data, setData] = useState(null);
  
  const availableYears = [2012, 2013, 2014, 2015, 2016, 2017, 2018, 2019, 2020, 2021, 2022, 2023];
  
  useEffect(() => {
    fetchData();
  }, [year, xVariable]);
  
  const fetchData = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const params = new URLSearchParams({
        year: year.toString(),
        independent_vars: `pct_65plus,growth_rate`
      });
      
      const response = await fetch(`http://localhost:5001/api/demographics_elasticity?${params}`);
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
      }
      
      const result = await response.json();
      
      if (result.status === 'success') {
        setData(result.data);
      } else {
        throw new Error(result.message || 'Failed to fetch demographics elasticity data');
      }
    } catch (err) {
      setError(err.message);
      console.error('Demographics elasticity request failed:', err);
    } finally {
      setLoading(false);
    }
  };
  
  // Prepare scatter plot data (using Line chart with points)
  const prepareScatterData = () => {
    if (!data || !data.scatter_data) return [];
    
    // Convert scatter points to line chart format (each point as a series)
    const scatterPoints = data.scatter_data.map(item => ({
      x: item[xVariable].toFixed(2),
      y: item.missions_per_1000,
      county: item.county,
      missions_per_1000: item.missions_per_1000,
      total_missions: item.total_missions,
      total_population: item.total_population
    }));
    
    // Sort by x value for proper line rendering
    scatterPoints.sort((a, b) => parseFloat(a.x) - parseFloat(b.x));
    
    // Prepare fitted line data
    const fittedLine = data.fitted_values ? data.fitted_values
      .map(item => ({
        x: item.x.toFixed(2),
        y: item.y
      }))
      .sort((a, b) => parseFloat(a.x) - parseFloat(b.x)) : [];
    
    const result = [];
    
    // Add scatter points (each as a separate series for better visualization)
    if (scatterPoints.length > 0) {
      result.push({
        id: 'Counties',
        data: scatterPoints,
        color: colors.blueAccent[500]
      });
    }
    
    // Add regression fit line
    if (fittedLine.length > 0) {
      result.push({
        id: 'Regression Fit',
        data: fittedLine,
        color: colors.redAccent[500]
      });
    }
    
    return result;
  };
  
  // Prepare marginal effects bar chart data
  const prepareMarginalEffectsData = () => {
    if (!data || !data.marginal_effects) return [];
    
    return [
      {
        cohort: 'Geriatrics',
        marginalEffect: data.marginal_effects.geriatrics?.marginal_effect || 0,
        correlation: data.marginal_effects.geriatrics?.correlation || 0,
        mean: data.marginal_effects.geriatrics?.mean || 0
      },
      {
        cohort: 'Pediatrics',
        marginalEffect: data.marginal_effects.pediatrics?.marginal_effect || 0,
        correlation: data.marginal_effects.pediatrics?.correlation || 0,
        mean: data.marginal_effects.pediatrics?.mean || 0
      },
      {
        cohort: 'Trauma',
        marginalEffect: data.marginal_effects.trauma?.marginal_effect || 0,
        correlation: data.marginal_effects.trauma?.correlation || 0,
        mean: data.marginal_effects.trauma?.mean || 0
      }
    ];
  };
  
  const scatterData = prepareScatterData();
  const marginalEffectsData = prepareMarginalEffectsData();
  
  const getXAxisLabel = () => {
    return xVariable === 'pct_65plus' ? '65+ Population Share (%)' : 'Population Growth Rate (%)';
  };
  
  return (
    <Box m="20px" sx={{ mt: "0px" }}>
      <Typography variant="h3" sx={{ mb: "10px", color: colors.grey[100] }}>
        1.3 Demographics vs. Demand Elasticity
      </Typography>
      <Typography variant="h6" sx={{ mb: "10px", color: colors.grey[300] }}>
        Demographics vs. Demand Elasticity - County-level regression analysis
      </Typography>
      <Typography variant="body2" sx={{ mb: "20px", color: colors.grey[400], fontStyle: 'italic' }}>
        This chart analyzes the relationship between demographic factors (65+ share, population growth rate)
        and emergency medical demand elasticity at the county level. It shows scatter plots with regression fit lines,
        elasticity coefficients with confidence intervals, and marginal effects by cohort (geriatrics, pediatrics, trauma).
      </Typography>
      
      {/* Controls */}
      <Paper sx={{ p: 3, mb: 3, backgroundColor: colors.primary[400] }}>
        <Grid container spacing={3} alignItems="center">
          <Grid item xs={12} md={3}>
            <FormControl fullWidth>
              <InputLabel sx={{ color: colors.grey[100] }}>Year</InputLabel>
              <Select
                value={year}
                label="Year"
                onChange={(e) => setYear(e.target.value)}
                sx={{
                  color: colors.grey[100],
                  '& .MuiOutlinedInput-notchedOutline': {
                    borderColor: colors.grey[100],
                  },
                  '&:hover .MuiOutlinedInput-notchedOutline': {
                    borderColor: colors.grey[100],
                  },
                  '& .MuiSvgIcon-root': {
                    color: colors.grey[100],
                  },
                }}
              >
                {availableYears.map(y => (
                  <MenuItem key={y} value={y}>{y}</MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
          
          <Grid item xs={12} md={3}>
            <FormControl fullWidth>
              <InputLabel sx={{ color: colors.grey[100] }}>X-Axis Variable</InputLabel>
              <Select
                value={xVariable}
                label="X-Axis Variable"
                onChange={(e) => setXVariable(e.target.value)}
                sx={{
                  color: colors.grey[100],
                  '& .MuiOutlinedInput-notchedOutline': {
                    borderColor: colors.grey[100],
                  },
                  '&:hover .MuiOutlinedInput-notchedOutline': {
                    borderColor: colors.grey[100],
                  },
                  '& .MuiSvgIcon-root': {
                    color: colors.grey[100],
                  },
                }}
              >
                <MenuItem value="pct_65plus">65+ Population Share (%)</MenuItem>
                <MenuItem value="growth_rate">Population Growth Rate (%)</MenuItem>
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
          {/* Regression Results Summary */}
          {data.regression_results && (
            <Grid container spacing={2} sx={{ mb: 3 }}>
              <Grid item xs={12} md={3}>
                <Paper sx={{ p: 2, backgroundColor: colors.primary[400], textAlign: 'center' }}>
                  <Typography variant="h6" sx={{ color: colors.grey[100], mb: 1 }}>
                    R-squared
                  </Typography>
                  <Typography variant="h4" sx={{ color: colors.greenAccent[400], fontWeight: 'bold' }}>
                    {data.regression_results.r_squared.toFixed(4)}
                  </Typography>
                </Paper>
              </Grid>
              <Grid item xs={12} md={3}>
                <Paper sx={{ p: 2, backgroundColor: colors.primary[400], textAlign: 'center' }}>
                  <Typography variant="h6" sx={{ color: colors.grey[100], mb: 1 }}>
                    Counties Analyzed
                  </Typography>
                  <Typography variant="h4" sx={{ color: colors.blueAccent[400], fontWeight: 'bold' }}>
                    {data.metadata?.n_counties || 0}
                  </Typography>
                </Paper>
              </Grid>
              {data.regression_results.coefficients && (
                <>
                  {data.regression_results.coefficients.pct_65plus !== undefined && (
                    <Grid item xs={12} md={3}>
                      <Paper sx={{ p: 2, backgroundColor: colors.primary[400], textAlign: 'center' }}>
                        <Typography variant="h6" sx={{ color: colors.grey[100], mb: 1 }}>
                          65+ Elasticity
                        </Typography>
                        <Typography variant="h4" sx={{ color: colors.redAccent[400], fontWeight: 'bold' }}>
                          {data.regression_results.coefficients.pct_65plus.toFixed(4)}
                        </Typography>
                      </Paper>
                    </Grid>
                  )}
                  {data.regression_results.coefficients.growth_rate !== undefined && (
                    <Grid item xs={12} md={3}>
                      <Paper sx={{ p: 2, backgroundColor: colors.primary[400], textAlign: 'center' }}>
                        <Typography variant="h6" sx={{ color: colors.grey[100], mb: 1 }}>
                          Growth Rate Elasticity
                        </Typography>
                        <Typography variant="h4" sx={{ color: colors.yellowAccent?.[400] || colors.blueAccent[400], fontWeight: 'bold' }}>
                          {data.regression_results.coefficients.growth_rate.toFixed(4)}
                        </Typography>
                      </Paper>
                    </Grid>
                  )}
                </>
              )}
            </Grid>
          )}
          
          {/* Tabs for different views */}
          <Paper sx={{ p: 3, backgroundColor: colors.primary[400], mb: 3 }}>
            <Tabs
              value={tabValue}
              onChange={(e, newValue) => setTabValue(newValue)}
              sx={{
                '& .MuiTab-root': {
                  color: colors.grey[300],
                  '&.Mui-selected': {
                    color: colors.blueAccent[500],
                  },
                },
                '& .MuiTabs-indicator': {
                  backgroundColor: colors.blueAccent[500],
                },
              }}
            >
              <Tab label="Scatter Plot & Regression" />
              <Tab label="Marginal Effects by Cohort" />
            </Tabs>
          </Paper>
          
          {/* Scatter Plot Tab */}
          {tabValue === 0 && scatterData && scatterData.length > 0 && (
            <Paper sx={{ p: 3, backgroundColor: colors.primary[400], height: "600px" }}>
              <Typography variant="h5" sx={{ mb: 2, color: colors.grey[100] }}>
                Missions per 1,000 Population vs. {getXAxisLabel()}
              </Typography>
              <Typography variant="body2" sx={{ mb: 2, color: colors.grey[300] }}>
                Each point represents a county. The line shows the regression fit.
              </Typography>
              <Box height="500px">
                <ResponsiveLine
                  data={scatterData}
                  margin={{ top: 50, right: 140, bottom: 70, left: 90 }}
                  xScale={{ type: 'linear', min: 'auto', max: 'auto' }}
                  yScale={{ type: 'linear', min: 0, max: 'auto' }}
                  curve="natural"
                  axisTop={null}
                  axisRight={null}
                  axisBottom={{
                    orient: 'bottom',
                    tickSize: 5,
                    tickPadding: 5,
                    tickRotation: 0,
                    legend: getXAxisLabel(),
                    legendOffset: 46,
                    legendPosition: 'middle'
                  }}
                  axisLeft={{
                    orient: 'left',
                    tickSize: 5,
                    tickPadding: 5,
                    tickRotation: 0,
                    legend: 'Missions per 1,000 Population',
                    legendOffset: -70,
                    legendPosition: 'middle'
                  }}
                  pointSize={8}
                  pointColor={{ theme: 'background' }}
                  pointBorderWidth={2}
                  pointBorderColor={{ from: 'serieColor' }}
                  pointLabelYOffset={-12}
                  useMesh={true}
                  legends={[
                    {
                      anchor: 'bottom-right',
                      direction: 'column',
                      justify: false,
                      translateX: 130,
                      translateY: 0,
                      itemsSpacing: 0,
                      itemDirection: 'left-to-right',
                      itemWidth: 100,
                      itemHeight: 18,
                      itemOpacity: 0.75,
                      symbolSize: 12,
                      symbolShape: 'circle'
                    }
                  ]}
                  theme={{
                    axis: {
                      domain: {
                        line: {
                          stroke: colors.grey[100],
                          strokeWidth: 1
                        }
                      },
                      legend: {
                        text: {
                          fill: colors.grey[100]
                        }
                      },
                      ticks: {
                        line: {
                          stroke: colors.grey[100],
                          strokeWidth: 1
                        },
                        text: {
                          fill: colors.grey[100]
                        }
                      }
                    },
                    tooltip: {
                      container: {
                        background: colors.primary[500],
                        color: colors.grey[100]
                      }
                    }
                  }}
                />
              </Box>
            </Paper>
          )}
          
          {/* Marginal Effects Tab */}
          {tabValue === 1 && marginalEffectsData && marginalEffectsData.length > 0 && (
            <Paper sx={{ p: 3, backgroundColor: colors.primary[400], height: "500px" }}>
              <Typography variant="h5" sx={{ mb: 2, color: colors.grey[100] }}>
                Marginal Effects by Cohort
              </Typography>
              <Typography variant="body2" sx={{ mb: 2, color: colors.grey[300] }}>
                Impact of demographic factors on demand by patient cohort
              </Typography>
              <Box height="400px">
                <ResponsiveBar
                  data={marginalEffectsData}
                  keys={['marginalEffect']}
                  indexBy="cohort"
                  margin={{ top: 50, right: 130, bottom: 50, left: 80 }}
                  padding={0.3}
                  valueScale={{ type: 'linear' }}
                  indexScale={{ type: 'band', round: true }}
                  colors={{ scheme: 'nivo' }}
                  axisTop={null}
                  axisRight={null}
                  axisBottom={{
                    tickSize: 5,
                    tickPadding: 5,
                    tickRotation: 0,
                    legend: 'Cohort',
                    legendPosition: 'middle',
                    legendOffset: 46
                  }}
                  axisLeft={{
                    tickSize: 5,
                    tickPadding: 5,
                    tickRotation: 0,
                    legend: 'Marginal Effect',
                    legendPosition: 'middle',
                    legendOffset: -60
                  }}
                  labelSkipWidth={12}
                  labelSkipHeight={12}
                  labelTextColor={{ from: 'color', modifiers: [['darker', 1.6]] }}
                  theme={{
                    axis: {
                      domain: {
                        line: {
                          stroke: colors.grey[100],
                          strokeWidth: 1
                        }
                      },
                      legend: {
                        text: {
                          fill: colors.grey[100]
                        }
                      },
                      ticks: {
                        line: {
                          stroke: colors.grey[100],
                          strokeWidth: 1
                        },
                        text: {
                          fill: colors.grey[100]
                        }
                      }
                    },
                    tooltip: {
                      container: {
                        background: colors.primary[500],
                        color: colors.grey[100]
                      }
                    }
                  }}
                />
              </Box>
              
              {/* Correlation table */}
              <Box mt={3}>
                <Typography variant="h6" sx={{ mb: 2, color: colors.grey[100] }}>
                  Correlation Coefficients
                </Typography>
                <Grid container spacing={2}>
                  {marginalEffectsData.map((item) => (
                    <Grid item xs={12} md={4} key={item.cohort}>
                      <Paper sx={{ p: 2, backgroundColor: colors.primary[500] }}>
                        <Typography variant="body1" sx={{ color: colors.grey[100], fontWeight: 'bold' }}>
                          {item.cohort}
                        </Typography>
                        <Typography variant="body2" sx={{ color: colors.grey[300] }}>
                          Correlation: {item.correlation.toFixed(4)}
                        </Typography>
                        <Typography variant="body2" sx={{ color: colors.grey[300] }}>
                          Mean Burden: {item.mean.toFixed(2)}%
                        </Typography>
                      </Paper>
                    </Grid>
                  ))}
                </Grid>
              </Box>
            </Paper>
          )}
        </Box>
      )}
    </Box>
  );
};

export default DemographicsElasticity;

