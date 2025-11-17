import { useState } from 'react';
import { 
  Box, 
  Button, 
  Typography, 
  FormControl, 
  InputLabel,
  Select,
  MenuItem,
  Checkbox,
  FormControlLabel,
  TextField,
  CircularProgress,
  Alert,
  Paper,
  Grid,
  Tabs,
  Tab,
  Autocomplete,
  Chip
} from '@mui/material';
import { useTheme } from '@mui/material';
import { tokens } from '../theme';
import { ResponsiveLine } from "@nivo/line";
import { ResponsiveBar } from "@nivo/bar";
import { useMemo, useEffect } from 'react';

// 可用的额外变量
const AVAILABLE_EXTRA_VARS = [
  'age_under_5_ratio',
  'age_5_9_ratio',
  'age_10_19_ratio',
  'age_20_29_ratio',
  'age_30_39_ratio',
  'age_40_49_ratio',
  'age_50_59_ratio',
  'age_60_69_ratio',
  'age_70_79_ratio',
  'age_80_84_ratio',
  'age_85_plus_ratio',
  'total_population'
];

export default function PredictDemand() {
  const theme = useTheme();
  const colors = tokens(theme.palette.mode);
  
  // State management
  const [selectedExtraVars, setSelectedExtraVars] = useState([]);
  const [growth, setGrowth] = useState('linear');
  const [yearlySeasonality, setYearlySeasonality] = useState(true);
  const [seasonalityMode, setSeasonalityMode] = useState('additive');
  const [changepointPriorScale, setChangepointPriorScale] = useState(0.05);
  const [seasonalityPriorScale, setSeasonalityPriorScale] = useState(10.0);
  const [regressorPriorScale, setRegressorPriorScale] = useState(0.05);
  const [intervalWidth, setIntervalWidth] = useState(0.95);
  const [periods, setPeriods] = useState(1); 
  const [regressorMode, setRegressorMode] = useState('additive');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [result, setResult] = useState(null);
  const [tabValue, setTabValue] = useState(0);
  const [corrMatrix, setCorrMatrix] = useState(null);
  const [showCorrMatrix, setShowCorrMatrix] = useState(false);
  const [loadingCorr, setLoadingCorr] = useState(false);

  // Fetch correlation matrix
  useEffect(() => {
    const fetchCorrMatrix = async () => {
      setLoadingCorr(true);
      try {
        const response = await fetch('http://localhost:5001/api/get_corr_matrix');
        const data = await response.json();
        if (data.status === 'success') {
          console.log('Correlation matrix data:', data.data);
          setCorrMatrix(data.data);
        } else {
          console.error('Failed to load correlation matrix:', data.message);
        }
      } catch (err) {
        console.error('Failed to fetch correlation matrix:', err);
      } finally {
        setLoadingCorr(false);
      }
    };
    fetchCorrMatrix();
  }, []);

  // Helper function to simplify variable names
  const simplifyVarName = (varName) => {
    const nameMap = {
      'age_under_5_ratio': '<5',
      'age_5_9_ratio': '5-9',
      'age_10_19_ratio': '10-19',
      'age_20_29_ratio': '20-29',
      'age_30_39_ratio': '30-39',
      'age_40_49_ratio': '40-49',
      'age_50_59_ratio': '50-59',
      'age_60_69_ratio': '60-69',
      'age_70_79_ratio': '70-79',
      'age_80_84_ratio': '80-84',
      'age_85_plus_ratio': '85+',
      'total_population': 'total'
    };
    return nameMap[varName] || varName;
  };

  // Helper function to validate and clamp numeric values
  const validateNumericInput = (value, min, max, defaultValue) => {
    const numValue = typeof value === 'string' ? parseFloat(value) : value;
    if (isNaN(numValue)) {
      return defaultValue;
    }
    if (numValue < min) {
      return min;
    }
    if (numValue > max) {
      return max;
    }
    return numValue;
  };

  // Reset all parameters to default values
  const resetParameters = () => {
    setSelectedExtraVars([]);
    setGrowth('linear');
    setYearlySeasonality(true);
    setSeasonalityMode('additive');
    setChangepointPriorScale(0.05);
    setSeasonalityPriorScale(10.0);
    setRegressorPriorScale(0.05);
    setIntervalWidth(0.95);
    setPeriods(1);
    setRegressorMode('additive');
    setResult(null);
    setError(null);
    setTabValue(0);
  };

  // Fetch prediction data
  const fetchPrediction = async () => {
    setLoading(true);
    setError(null);
    setResult(null);
    
    try {
      const response = await fetch('http://localhost:5001/api/predict_demand_v2', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          extra_vars: selectedExtraVars,
          growth: growth,
          yearly_seasonality: yearlySeasonality,
          weekly_seasonality: false,
          daily_seasonality: false,
          seasonality_mode: seasonalityMode,
          changepoint_prior_scale: changepointPriorScale,
          seasonality_prior_scale: seasonalityPriorScale,
          interval_width: intervalWidth,
          regressor_prior_scale: regressorPriorScale,
          regressor_mode: regressorMode,
          periods: periods*12
        })
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      
      if (data.status === 'success') {
        setResult(data.data);
      } else {
        throw new Error(data.message || 'Prediction failed');
      }
    } catch (err) {
      setError(err.message);
      console.error('Prediction request failed:', err);
    } finally {
      setLoading(false);
    }
  };

  // Get unique years from data for x-axis ticks
  const getYearTicks = (data) => {
    if (!data || data.length === 0) return [];
    const allDates = data.flatMap(series => series.data.map(d => d.x));
    const uniqueYears = [...new Set(allDates.map(date => date.split('-')[0]))];
    // Get first month of each year
    const yearTicks = uniqueYears.map(year => {
      const firstMonth = allDates.find(date => date.startsWith(year));
      return firstMonth || `${year}-01-01`;
    });
    return yearTicks.sort();
  };

  // Get year ticks for component charts
  const getComponentYearTicks = (componentName) => {
    if (!result || !result.components || !result.components[componentName]) return [];
    const componentData = result.components[componentName];
    const allDates = componentData.map(item => item.date);
    const uniqueYears = [...new Set(allDates.map(date => date.split('-')[0]))];
    const yearTicks = uniqueYears.map(year => {
      const firstMonth = allDates.find(date => date.startsWith(year));
      return firstMonth || `${year}-01-01`;
    });
    return yearTicks.sort();
  };

  // Prepare main forecast chart data
  const prepareForecastChartData = () => {
    if (!result) return [];
    
    const { forecast_data, historical_actual } = result;
    
    // Historical actual values
    const actualData = historical_actual.map(item => ({
      x: item.date,
      y: item.actual
    }));
    
    // Predicted values (including historical fit and future forecast)
    const predictedData = forecast_data.map(item => ({
      x: item.date,
      y: item.predicted
    }));
    
    return [
      {
        id: 'Actual',
        data: actualData,
        color: colors.blueAccent[500]
      },
      {
        id: 'Predicted',
        data: predictedData,
        color: colors.greenAccent[500]
      }
    ];
  };

  // Prepare component chart data
  const prepareComponentChartData = (componentName) => {
    if (!result || !result.components || !result.components[componentName]) return [];
    
    const componentData = result.components[componentName];
    return [{
      id: componentName,
      data: componentData.map(item => ({
        x: item.date,
        y: item.value
      })),
      color: colors.blueAccent[500]
    }];
  };


  // Prepare confidence interval area layer
  const ciData = useMemo(() => {
    if (!result) return null;
    
    const { forecast_data } = result;
    
    // Create data points for confidence interval area
    const upperData = forecast_data.map(item => ({
      x: item.date,
      y: item.upper
    }));
    
    const lowerData = forecast_data.map(item => ({
      x: item.date,
      y: item.lower
    }));
    
    return {
      upper: upperData,
      lower: lowerData
    };
  }, [result]);

  // Custom Vertical Divider Line - separates actual from predicted data
  const VerticalDividerLine = useMemo(() => {
    return ({ xScale, yScale, innerHeight, margin }) => {
      // Get the last date of actual data
      let lastActualDate = null;
      if (result && result.historical_actual && result.historical_actual.length > 0) {
        const lastActual = result.historical_actual[result.historical_actual.length - 1];
        lastActualDate = lastActual ? lastActual.date : null;
      }
      
      if (!lastActualDate || !xScale || !yScale) return null;

      const x = xScale(lastActualDate);
      if (x === undefined || isNaN(x)) return null;

      return (
        <g>
          <line
            x1={x}
            y1={0}
            x2={x}
            y2={innerHeight + margin.top-50}
            stroke={colors.grey[200]}
            strokeWidth={2}
            strokeDasharray="5,5"
            opacity={0.8}
          />
        </g>
      );
    };
  }, [result, colors]);

  // Custom Area Layer for confidence interval
  const ConfidenceIntervalArea = useMemo(() => {
    return ({ xScale, yScale, innerHeight, margin }) => {
      if (!ciData) return null;

      const { upper, lower } = ciData;
      
      // Create path for confidence interval area
      const createAreaPath = () => {
        if (upper.length === 0 || lower.length === 0) return '';
        
        let path = '';
        
        // Draw upper line
        upper.forEach((point, index) => {
          const x = xScale(point.x);
          const y = yScale(point.y);
          if (index === 0) {
            path += `M ${x} ${y}`;
          } else {
            path += ` L ${x} ${y}`;
          }
        });
        
        // Draw lower line (reversed)
        const reversedLower = [...lower].reverse();
        reversedLower.forEach((point) => {
          const x = xScale(point.x);
          const y = yScale(point.y);
          path += ` L ${x} ${y}`;
        });
        
        // Close path
        path += ' Z';
        
        return path;
      };

      const areaPath = createAreaPath();

      return (
        <g>
          <defs>
            <linearGradient id="confidenceGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={colors.redAccent[300]} stopOpacity={0.3} />
              <stop offset="100%" stopColor={colors.redAccent[300]} stopOpacity={0.1} />
            </linearGradient>
          </defs>
          <path
            d={areaPath}
            fill="url(#confidenceGradient)"
            stroke={colors.redAccent[300]}
            strokeWidth={0}
            opacity={0.3}
          />
        </g>
      );
    };
  }, [ciData, colors]);

  // Custom layers for ResponsiveLine
  const customLayers = useMemo(() => {
    return [
      'grid',
      'axes',
      ConfidenceIntervalArea,
      'areas',
      'lines',
      VerticalDividerLine, // Add vertical divider after lines
      'points',
      'mesh',
      'legends'
    ];
  }, [ConfidenceIntervalArea, VerticalDividerLine]);

  const chartTheme = {
    axis: {
      domain: {
        line: {
          stroke: colors.grey[100],
        },
      },
      legend: {
        text: {
          fill: colors.grey[100],
        },
      },
      ticks: {
        line: {
          stroke: colors.grey[100],
          strokeWidth: 1,
        },
        text: {
          fill: colors.grey[100],
        },
      },
    },
    legends: {
      text: {
        fill: colors.grey[100],
      },
    },
    tooltip: {
      container: {
        color: colors.primary[500],
      },
    },
  };

  return (
    <Box m="20px">
      <Typography variant="h3" sx={{ mb: "10px", color: colors.grey[100] }}>
        1.1 Prophet Model Prediction
      </Typography>
      <Typography variant="h6" sx={{ mb: "10px", color: colors.grey[300] }}>
        Advanced Prophet model with customizable parameters and extra regressors
      </Typography>
      <Typography variant="body2" sx={{ mb: "20px", color: colors.grey[400], fontStyle: 'italic' }}>
        This model allows you to add extra regressors (like population demographics) and customize model parameters.
        The forecast includes historical fit and confidence intervals.
      </Typography>
      
      {/* Parameter selection area */}
      <Paper sx={{ p: 3, mb: 3, backgroundColor: colors.primary[400] }}>
        <Typography variant="h5" sx={{ mb: 2, color: colors.grey[100] }}>
          Model Parameters
        </Typography>
        
        <Grid container spacing={3}>
          {/* Extra Variables */}
          <Grid item xs={12} md={6}>
            <Typography variant="h6" sx={{ mb: 1, color: colors.grey[200] }}>
              Extra Regressors
            </Typography>
            <Autocomplete
              multiple
              options={AVAILABLE_EXTRA_VARS}
              value={selectedExtraVars}
              onChange={(event, newValue) => {
                setSelectedExtraVars(newValue);
              }}
              renderTags={(value, getTagProps) =>
                value.map((option, index) => (
                  <Chip
                    {...getTagProps({ index })}
                    key={option}
                    label={option}
                    sx={{
                      backgroundColor: colors.blueAccent[700],
                      color: colors.grey[100],
                      '& .MuiChip-deleteIcon': {
                        color: colors.grey[100],
                      },
                    }}
                  />
                ))
              }
              renderInput={(params) => (
                <TextField
                  {...params}
                  label="Select Variables"
                  placeholder="Search and select variables"
                  sx={{
                    '& .MuiOutlinedInput-root': {
                      color: colors.grey[100],
                      '& fieldset': {
                        borderColor: colors.grey[100],
                      },
                      '&:hover fieldset': {
                        borderColor: colors.grey[100],
                      },
                      '&.Mui-focused fieldset': {
                        borderColor: colors.blueAccent[500],
                      },
                    },
                    '& .MuiInputLabel-root': {
                      color: colors.grey[100],
                    },
                    '& .MuiInputLabel-root.Mui-focused': {
                      color: colors.blueAccent[500],
                    },
                  }}
                />
              )}
              sx={{
                '& .MuiAutocomplete-popupIndicator': {
                  color: colors.grey[100],
                },
                '& .MuiAutocomplete-clearIndicator': {
                  color: colors.grey[100],
                },
              }}
            />
            <Typography variant="caption" sx={{ mt: 1, color: colors.grey[400], display: 'block' }}>
              {selectedExtraVars.length} variable(s) selected
            </Typography>
            
            {/* Correlation Matrix Toggle */}
            <Button
              variant="outlined"
              size="small"
              onClick={() => setShowCorrMatrix(!showCorrMatrix)}
              sx={{
                mt: 2,
                borderColor: colors.grey[300],
                color: colors.grey[100],
                '&:hover': {
                  borderColor: colors.blueAccent[500],
                  backgroundColor: colors.primary[500],
                },
              }}
            >
              {showCorrMatrix ? 'Hide' : 'Show'} Correlation Matrix
            </Button>
            
            {/* Correlation with count reference - only show selected variables */}
            {corrMatrix && corrMatrix.count_correlations && selectedExtraVars.length > 0 && (
              <Box sx={{ mt: 2 }}>
                <Typography variant="caption" sx={{ color: colors.grey[300], display: 'block', mb: 1 }}>
                  Correlation with Task Count (selected variables):
                </Typography>
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                  {selectedExtraVars
                    .filter(varName => corrMatrix.count_correlations[varName] !== undefined)
                    .map(varName => {
                      const corr = corrMatrix.count_correlations[varName];
                      return (
                        <Chip
                          key={varName}
                          label={`${simplifyVarName(varName)}: ${corr.toFixed(3)}`}
                          size="small"
                          sx={{
                            backgroundColor: corr > 0 ? colors.greenAccent[700] : colors.redAccent[700],
                            color: colors.grey[100],
                            fontSize: '0.7rem',
                          }}
                        />
                      );
                    })}
                </Box>
              </Box>
            )}
            
            {/* Correlation with Count Bar Chart */}
            {showCorrMatrix && corrMatrix && corrMatrix.count_correlations && (
              <Box sx={{ mt: 2 }}>
                <Typography variant="subtitle2" sx={{ mb: 1, color: colors.grey[200] }}>
                  Correlation with Task Count
                </Typography>
                {loadingCorr ? (
                  <CircularProgress size={24} />
                ) : (
                  <Box sx={{ height: '350px', width: '100%', borderRadius: 1, p: 1 }}>
                    {(() => {
                      try {
                        const correlations = corrMatrix.count_correlations;
                        const barData = Object.entries(correlations)
                          .sort((a, b) => Math.abs(b[1]) - Math.abs(a[1])) // Sort by absolute value
                          .map(([varName, value]) => ({
                            variable: simplifyVarName(varName),
                            originalVar: varName,
                            positive: value >= 0 ? value : 0,
                            negative: value < 0 ? value : 0,
                            correlation: value
                          }));
                        
                        if (barData.length === 0) {
                          return <Typography sx={{ color: colors.grey[300] }}>No correlation data available</Typography>;
                        }
                        
                        return (
                          <ResponsiveBar
                            data={barData}
                            keys={['positive', 'negative']}
                            indexBy="variable"
                            margin={{ top: 20, right: 30, bottom: 100, left: 60 }}
                            padding={0.2}
                            valueScale={{ type: 'linear', min: -1, max: 1 }}
                            indexScale={{ type: 'band', round: true }}
                            colors={(d) => {
                              return d.id === 'positive' 
                                ? colors.greenAccent[500] 
                                : colors.redAccent[500];
                            }}
                            axisTop={null}
                            axisRight={null}
                            axisBottom={{
                              tickSize: 5,
                              tickPadding: 5,
                              tickRotation: -90,
                              legend: 'Variables',
                              legendPosition: 'middle',
                              legendOffset: 60
                            }}
                            axisLeft={{
                              tickSize: 5,
                              tickPadding: 5,
                              tickRotation: 0,
                              legend: 'Correlation Coefficient',
                              legendPosition: 'middle',
                              legendOffset: -50,
                              format: (value) => value.toFixed(2)
                            }}
                            enableGridY={true}
                            enableGridX={false}
                            enableLabel={false}
                            animate={true}
                            motionConfig="gentle"
                            tooltip={({ id, data }) => {
                              const value = id === 'positive' ? data.positive : data.negative;
                              if (value === 0) return null;
                              return (
                                <div style={{
                                  padding: '8px',
                                  backgroundColor: colors.primary[600],
                                  color: colors.grey[900],
                                  borderRadius: '4px',
                                  fontSize: '12px'
                                }}>
                                  <strong>{data.variable}</strong>
                                  <br />
                                  Correlation: {data.correlation.toFixed(3)}
                                </div>
                              );
                            }}
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
                              grid: {
                                line: {
                                  stroke: colors.grey[700],
                                  strokeWidth: 1
                                }
                              }
                            }}
                          />
                        );
                      } catch (error) {
                        console.error('Error rendering bar chart:', error);
                        return (
                          <Typography sx={{ color: colors.redAccent[500] }}>
                            Error rendering chart: {error.message}
                          </Typography>
                        );
                      }
                    })()}
                  </Box>
                )}
              </Box>
            )}
          </Grid>
          
          {/* Model Parameters */}
          <Grid item xs={12} md={6}>
            <Grid container spacing={2}>
              <Grid item xs={12} md={6}>
                <FormControl fullWidth>
                  <InputLabel sx={{ color: colors.grey[100] }}>Growth</InputLabel>
                  <Select
                    value={growth}
                    label="Growth"
                    onChange={(e) => setGrowth(e.target.value)}
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
                    <MenuItem value="linear">Linear</MenuItem>
                    <MenuItem value="logistic">Logistic</MenuItem>
                  </Select>
                </FormControl>
              </Grid>

              <Grid item xs={12} md={4}>
                <TextField
                  fullWidth
                  type="number"
                  label="Interval Width"
                  value={intervalWidth}
                  onChange={(e) => {
                    const validated = validateNumericInput(e.target.value, 0.5, 0.99, 0.95);
                    setIntervalWidth(validated);
                  }}
                  onBlur={(e) => {
                    const validated = validateNumericInput(e.target.value, 0.5, 0.99, 0.95);
                    setIntervalWidth(validated);
                  }}
                  inputProps={{ min: 0.5, max: 0.99, step: 0.01 }}
                  sx={{
                    '& .MuiOutlinedInput-root': {
                      color: colors.grey[100],
                      '& fieldset': {
                        borderColor: colors.grey[100],
                      },
                      '&:hover fieldset': {
                        borderColor: colors.grey[100],
                      },
                    },
                    '& .MuiInputLabel-root': {
                      color: colors.grey[100],
                    },
                  }}
                />
              </Grid>
              
              <Grid item xs={12} md={6}>
                <FormControl fullWidth>
                  <InputLabel sx={{ color: colors.grey[100] }}>Seasonality Mode</InputLabel>
                  <Select
                    value={seasonalityMode}
                    label="Seasonality Mode"
                    onChange={(e) => setSeasonalityMode(e.target.value)}
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
                    <MenuItem value="additive">Additive</MenuItem>
                    <MenuItem value="multiplicative">Multiplicative</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              
              <Grid item xs={12} md={4}>
                <TextField
                  fullWidth
                  type="number"
                  label="Changepoint Prior Scale"
                  value={changepointPriorScale}
                  onChange={(e) => {
                    const validated = validateNumericInput(e.target.value, 0.01, 0.5, 0.05);
                    setChangepointPriorScale(validated);
                  }}
                  onBlur={(e) => {
                    const validated = validateNumericInput(e.target.value, 0.01, 0.5, 0.05);
                    setChangepointPriorScale(validated);
                  }}
                  inputProps={{ min: 0.01, max: 0.5, step: 0.01 }}
                  sx={{
                    '& .MuiOutlinedInput-root': {
                      color: colors.grey[100],
                      '& fieldset': {
                        borderColor: colors.grey[100],
                      },
                      '&:hover fieldset': {
                        borderColor: colors.grey[100],
                      },
                    },
                    '& .MuiInputLabel-root': {
                      color: colors.grey[100],
                    },
                  }}
                />
              </Grid>
              
              <Grid item xs={12} md={4}>
                <TextField
                  fullWidth
                  type="number"
                  label="Seasonality Prior Scale"
                  value={seasonalityPriorScale}
                  onChange={(e) => {
                    const validated = validateNumericInput(e.target.value, 0.1, 50, 10.0);
                    setSeasonalityPriorScale(validated);
                  }}
                  onBlur={(e) => {
                    const validated = validateNumericInput(e.target.value, 0.1, 50, 10.0);
                    setSeasonalityPriorScale(validated);
                  }}
                  inputProps={{ min: 0.1, max: 50, step: 0.1 }}
                  sx={{
                    '& .MuiOutlinedInput-root': {
                      color: colors.grey[100],
                      '& fieldset': {
                        borderColor: colors.grey[100],
                      },
                      '&:hover fieldset': {
                        borderColor: colors.grey[100],
                      },
                    },
                    '& .MuiInputLabel-root': {
                      color: colors.grey[100],
                    },
                  }}
                />
              </Grid>
              
              <Grid item xs={12} md={4}>
                <TextField
                  fullWidth
                  type="number"
                  label="Periods (Years)"
                  value={periods}
                  onChange={(e) => {
                    const validated = validateNumericInput(e.target.value, 1, 10, 1);
                    setPeriods(Math.round(validated)); // Ensure integer for years
                  }}
                  onBlur={(e) => {
                    const validated = validateNumericInput(e.target.value, 1, 10, 1);
                    setPeriods(Math.round(validated)); // Ensure integer for years
                  }}
                  inputProps={{ min: 1, max: 10, step: 1 }}
                  sx={{
                    '& .MuiOutlinedInput-root': {
                      color: colors.grey[100],
                      '& fieldset': {
                        borderColor: colors.grey[100],
                      },
                      '&:hover fieldset': {
                        borderColor: colors.grey[100],
                      },
                    },
                    '& .MuiInputLabel-root': {
                      color: colors.grey[100],
                    },
                  }}
                />
              </Grid>

              <Grid item xs={12} md={4}>
                <FormControl fullWidth>
                  <InputLabel sx={{ color: colors.grey[100] }}>Regressor Mode</InputLabel>
                  <Select
                    value={regressorMode}
                    label="Regressor Mode"
                    onChange={(e) => setRegressorMode(e.target.value)}
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
                    <MenuItem value="additive">Additive</MenuItem>
                    <MenuItem value="multiplicative">Multiplicative</MenuItem>
                  </Select>
                  </FormControl>
                </Grid>
              
              <Grid item xs={12} md={4}>
                <TextField
                  fullWidth
                  type="number"
                  label="Regressor Prior Scale"
                  value={regressorPriorScale}
                  onChange={(e) => {
                    const validated = validateNumericInput(e.target.value, 0.001, 0.5, 0.05);
                    setRegressorPriorScale(validated);
                  }}
                  onBlur={(e) => {
                    const validated = validateNumericInput(e.target.value, 0.001, 0.5, 0.05);
                    setRegressorPriorScale(validated);
                  }}
                  inputProps={{ min: 0.001, max: 0.5, step: 0.01 }}
                  sx={{
                    '& .MuiOutlinedInput-root': {
                      color: colors.grey[100],
                      '& fieldset': {
                        borderColor: colors.grey[100],
                      },
                      '&:hover fieldset': {
                        borderColor: colors.grey[100],
                      },
                    },
                    '& .MuiInputLabel-root': {
                      color: colors.grey[100],
                    },
                  }}
                />
              </Grid>
              
              <Grid item xs={12}>
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={yearlySeasonality}
                      onChange={(e) => setYearlySeasonality(e.target.checked)}
                      sx={{
                        color: colors.grey[100],
                        '&.Mui-checked': {
                          color: colors.greenAccent[500],
                        },
                      }}
                    />
                  }
                  label="Yearly Seasonality"
                  sx={{ color: colors.grey[100] }}
                />
              </Grid>
            </Grid>
          </Grid>
          
          <Grid item xs={12}>
            <Grid container spacing={2}>
              <Grid item xs={12} md={8}>
                <Button
                  fullWidth
                  variant="contained"
                  onClick={fetchPrediction}
                  disabled={loading}
                  sx={{
                    backgroundColor: colors.blueAccent[700],
                    color: colors.grey[100],
                    fontSize: "16px",
                    fontWeight: "bold",
                    padding: "12px 24px",
                    '&:hover': {
                      backgroundColor: colors.blueAccent[600],
                    },
                  }}
                >
                  {loading ? <CircularProgress size={24} /> : 'Start Prediction'}
                </Button>
              </Grid>
              <Grid item xs={12} md={4}>
                <Button
                  fullWidth
                  variant="outlined"
                  onClick={resetParameters}
                  disabled={loading}
                  sx={{
                    borderColor: colors.grey[300],
                    color: colors.grey[100],
                    fontSize: "16px",
                    fontWeight: "bold",
                    padding: "12px 24px",
                    '&:hover': {
                      borderColor: colors.grey[100],
                      backgroundColor: colors.primary[500],
                    },
                  }}
                >
                  Reset Parameters
                </Button>
              </Grid>
            </Grid>
          </Grid>
        </Grid>
      </Paper>
      
      {/* Error message */}
      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}
      
      {/* Results display */}
      {result && (
        <Box>
          {/* Cross-validation metrics */}
          <Paper sx={{ p: 3, mb: 3, backgroundColor: colors.primary[400] }}>
            <Typography variant="h5" sx={{ mb: 2, color: colors.grey[100] }}>
              Cross-Validation Metrics
            </Typography>
            <Grid container spacing={2}>
              <Grid item xs={12} md={3}>
                <Paper sx={{ p: 2, backgroundColor: colors.primary[500], textAlign: 'center' }}>
                  <Typography variant="h6" sx={{ color: colors.grey[900], mb: 1 }}>
                    MAPE
                  </Typography>
                  <Typography variant="h4" sx={{ color: colors.greenAccent[400], fontWeight: 'bold' }}>
                    {(result.cv_metrics.mape * 100).toFixed(2)}%
                  </Typography>
                </Paper>
              </Grid>
              <Grid item xs={12} md={3}>
                <Paper sx={{ p: 2, backgroundColor: colors.primary[500], textAlign: 'center' }}>
                  <Typography variant="h6" sx={{ color: colors.grey[900], mb: 1 }}>
                    MAE
                  </Typography>
                  <Typography variant="h4" sx={{ color: colors.blueAccent[400], fontWeight: 'bold' }}>
                    {result.cv_metrics.mae.toFixed(2)}
                  </Typography>
                </Paper>
              </Grid>
              <Grid item xs={12} md={3}>
                <Paper sx={{ p: 2, backgroundColor: colors.primary[500], textAlign: 'center' }}>
                  <Typography variant="h6" sx={{ color: colors.grey[900], mb: 1 }}>
                    RMSE
                  </Typography>
                  <Typography variant="h4" sx={{ color: colors.redAccent[400], fontWeight: 'bold' }}>
                    {result.cv_metrics.rmse.toFixed(2)}
                  </Typography>
                </Paper>
              </Grid>
              <Grid item xs={12} md={3}>
                <Paper sx={{ p: 2, backgroundColor: colors.primary[500], textAlign: 'center' }}>
                  <Typography variant="h6" sx={{ color: colors.grey[900], mb: 1 }}>
                    Coverage
                  </Typography>
                  <Typography variant="h4" sx={{ color: colors.greenAccent[400], fontWeight: 'bold' }}>
                    {result.cv_metrics.coverage ? (result.cv_metrics.coverage * 100).toFixed(1) + '%' : 'N/A'}
                  </Typography>
                </Paper>
              </Grid>
            </Grid>
          </Paper>
          
          {/* Tabs for different views */}
          <Paper sx={{ backgroundColor: colors.primary[400] }}>
            <Tabs
              value={tabValue}
              onChange={(e, newValue) => setTabValue(newValue)}
              sx={{
                borderBottom: 1,
                borderColor: 'divider',
                '& .MuiTab-root': {
                  color: colors.grey[300],
                },
                '& .Mui-selected': {
                  color: colors.blueAccent[500],
                },
              }}
            >
              <Tab label="Forecast" />
              <Tab label="Trend" />
              <Tab label="Yearly Seasonality" />
              {result.components.extra_regressors && <Tab label="Extra Regressors" />}
            </Tabs>
            
            {/* Forecast Tab */}
            {tabValue === 0 && (
              <Box sx={{ p: 3, height: "600px" }}>
                <Typography variant="h5" sx={{ mb: 2, color: colors.grey[100] }}>
                  Historical Fit and Forecast
                </Typography>
                <ResponsiveLine
                  data={prepareForecastChartData()}
                  theme={chartTheme}
                  // colors={(d) => d.id !== 'Actual' ? '#FF5733' : 'rgba(0,0,0,0)'}
                  colors={{ scheme: "nivo" }}
                  margin={{ top: 50, right: 110, bottom: 80, left: 60 }}
                  xScale={{ type: "point" }}
                  yScale={{
                    type: "linear",
                    min: "auto",
                    max: "auto",
                    stacked: false,
                    reverse: false,
                  }}
                  yFormat=" >-.0f"
                  curve="catmullRom"
                  axisTop={null}
                  axisRight={null}
                  axisBottom={{
                    orient: "bottom",
                    tickSize: 5,
                    tickPadding: 5,
                    tickRotation: -45,
                    legend: "Date",
                    legendOffset: 50,
                    legendPosition: "middle",
                    format: (value) => {
                      // Extract year from date string (YYYY-MM-DD)
                      return value.split('-')[0];
                    },
                    tickValues: result ? getYearTicks(prepareForecastChartData()) : [],
                  }}
                  axisLeft={{
                    orient: "left",
                    tickSize: 5,
                    tickPadding: 5,
                    tickRotation: 0,
                    legend: "Task Count",
                    legendOffset: -50,
                    legendPosition: "middle",
                  }}
                  enableGridX={false}
                  enableGridY={true}
                  pointSize={4}
                  pointColor={{ theme: "background" }}
                  pointBorderWidth={2}
                  pointBorderColor={{ from: "serieColor" }}
                  // pointBorderColor={(d) =>
                  //   d.serieId !== "Actual" ? "#FF5733" : "#2E86C1"
                  // }
                  lineWidth={(d) =>
                    d.serieId !== "Actual" ? 2 : 0
                  }
                  useMesh={true}
                  layers={customLayers}
                  legends={[
                    {
                      anchor: "bottom-right",
                      direction: "column",
                      justify: false,
                      translateX: 100,
                      translateY: -50,
                      itemsSpacing: 0,
                      itemDirection: "left-to-right",
                      itemWidth: 80,
                      itemHeight: 20,
                      itemOpacity: 0.75,
                      symbolSize: 12,
                      symbolShape: "circle",
                    },
                  ]}
                />
              </Box>
            )}
            
            {/* Trend Tab */}
            {tabValue === 1 && result.components.trend && (
              <Box sx={{ p: 3, height: "600px" }}>
                <Typography variant="h5" sx={{ mb: 2, color: colors.grey[100] }}>
                  Trend Component
                </Typography>
                <ResponsiveLine
                  data={prepareComponentChartData('trend')}
                  theme={chartTheme}
                  colors={{ scheme: "nivo" }}
                  margin={{ top: 50, right: 50, bottom: 80, left: 60 }}
                  xScale={{ type: "point" }}
                  yScale={{
                    type: "linear",
                    min: "auto",
                    max: "auto",
                  }}
                  yFormat=" >-.0f"
                  curve="catmullRom"
                  axisBottom={{
                    orient: "bottom",
                    tickSize: 5,
                    tickPadding: 5,
                    tickRotation: -45,
                    legend: "Date",
                    legendOffset: 50,
                    legendPosition: "middle",
                    format: (value) => {
                      // Extract year from date string (YYYY-MM-DD)
                      return value.split('-')[0];
                    },
                    tickValues: result ? getComponentYearTicks('trend') : [],
                  }}
                  axisLeft={{
                    orient: "left",
                    tickSize: 5,
                    tickPadding: 5,
                    tickRotation: 0,
                    legend: "Trend Value",
                    legendOffset: -50,
                    legendPosition: "middle",
                  }}
                  enableGridX={false}
                  enableGridY={true}
                  pointSize={0}
                  useMesh={true}
                />
              </Box>
            )}
            
            {/* Yearly Seasonality Tab */}
            {tabValue === 2 && result.components.yearly && (
              <Box sx={{ p: 3, height: "600px" }}>
                <Typography variant="h5" sx={{ mb: 2, color: colors.grey[100] }}>
                  Yearly Seasonality Component
                </Typography>
                <ResponsiveLine
                  data={prepareComponentChartData('yearly')}
                  theme={chartTheme}
                  colors={{ scheme: "nivo" }}
                  margin={{ top: 50, right: 50, bottom: 80, left: 60 }}
                  xScale={{ type: "point" }}
                  yScale={{
                    type: "linear",
                    min: "auto",
                    max: "auto",
                  }}
                  yFormat=" >-.2f"
                  curve="catmullRom"
                  axisBottom={{
                    orient: "bottom",
                    tickSize: 5,
                    tickPadding: 5,
                    tickRotation: -45,
                    legend: "Date",
                    legendOffset: 50,
                    legendPosition: "middle",
                    format: (value) => {
                      // Extract year from date string (YYYY-MM-DD)
                      return value.split('-')[0];
                    },
                    tickValues: result ? getComponentYearTicks('yearly') : [],
                  }}
                  axisLeft={{
                    orient: "left",
                    tickSize: 5,
                    tickPadding: 5,
                    tickRotation: 0,
                    legend: "Seasonality Value",
                    legendOffset: -50,
                    legendPosition: "middle",
                  }}
                  enableGridX={false}
                  enableGridY={true}
                  pointSize={0}
                  useMesh={true}
                />
              </Box>
            )}
            
            {/* Extra Regressors Tab */}
            {tabValue === 3 && result.components.extra_regressors && (
              <Box sx={{ p: 3 }}>
                <Typography variant="h5" sx={{ mb: 2, color: colors.grey[100] }}>
                  Extra Regressors Components
                </Typography>
                {Object.entries(result.components.extra_regressors).map(([varName, data]) => (
                  <Box key={varName} sx={{ mb: 4, height: "400px" }}>
                    <Typography variant="h6" sx={{ mb: 1, color: colors.grey[200] }}>
                      {varName}
                    </Typography>
                    <ResponsiveLine
                      data={[{
                        id: varName,
                        data: data.map(item => ({
                          x: item.date,
                          y: item.value
                        })),
                        color: colors.blueAccent[500]
                      }]}
                      theme={chartTheme}
                      colors={{ scheme: "nivo" }}
                      margin={{ top: 50, right: 50, bottom: 80, left: 60 }}
                      xScale={{ type: "point" }}
                      yScale={{
                        type: "linear",
                        min: "auto",
                        max: "auto",
                      }}
                      yFormat=" >-.2f"
                      curve="catmullRom"
                      axisBottom={{
                        orient: "bottom",
                        tickSize: 5,
                        tickPadding: 5,
                        tickRotation: -45,
                        legend: "Date",
                        legendOffset: 50,
                        legendPosition: "middle",
                        format: (value) => {
                          // Extract year from date string (YYYY-MM-DD)
                          return value.split('-')[0];
                        },
                        tickValues: (() => {
                          const allDates = data.map(item => item.date);
                          const uniqueYears = [...new Set(allDates.map(date => date.split('-')[0]))];
                          const yearTicks = uniqueYears.map(year => {
                            const firstMonth = allDates.find(date => date.startsWith(year));
                            return firstMonth || `${year}-01-01`;
                          });
                          return yearTicks.sort();
                        })(),
                      }}
                      axisLeft={{
                        orient: "left",
                        tickSize: 5,
                        tickPadding: 5,
                        tickRotation: 0,
                        legend: varName,
                        legendOffset: -50,
                        legendPosition: "middle",
                      }}
                      enableGridX={false}
                      enableGridY={true}
                      pointSize={0}
                      useMesh={true}
                    />
                  </Box>
                ))}
              </Box>
            )}
          </Paper>
        </Box>
      )}
    </Box>
  );
}
