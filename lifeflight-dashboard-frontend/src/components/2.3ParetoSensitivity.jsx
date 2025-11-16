// 2.3 Service Area Sensitivity (Coverage vs. Response Time Pareto)
// Chart 2.3: Service Area Sensitivity - Pareto frontier chart for comparing strategic options
//
// Analysis:
// This chart plots the Pareto frontier across radius/SLA thresholds to compare multiple strategic options
// under resource and geography changes. It highlights the chosen scenario and dominated options,
// and allows weight sliders (population/SLA/cost) to auto-select an efficient point.

import { useState, useEffect } from 'react';
import { 
  Box, 
  Paper, 
  Typography, 
  Slider,
  Select, 
  MenuItem, 
  FormControl, 
  InputLabel,
  CircularProgress,
  Alert,
  Grid,
  Chip,
  Button
} from '@mui/material';
import { useTheme } from '@mui/material';
import { tokens } from '../theme';
import { ResponsiveLine } from '@nivo/line';

const ParetoSensitivity = () => {
  const theme = useTheme();
  const colors = tokens(theme.palette.mode);
  
  // Scenario parameters
  const [baseLocations, setBaseLocations] = useState(['BANGOR', 'PORTLAND']);
  const [radiusMin, setRadiusMin] = useState(20);
  const [radiusMax, setRadiusMax] = useState(100);
  const [radiusStep, setRadiusStep] = useState(10);
  const [slaMin, setSlaMin] = useState(10);
  const [slaMax, setSlaMax] = useState(30);
  const [slaStep, setSlaStep] = useState(5);
  const [fleetSize, setFleetSize] = useState(3);
  const [crewsPerVehicle, setCrewsPerVehicle] = useState(2);
  
  // Weight sliders
  const [populationWeight, setPopulationWeight] = useState(0.33);
  const [slaWeight, setSlaWeight] = useState(0.33);
  const [costWeight, setCostWeight] = useState(0.34);
  
  // Available bases
  const [availableBases, setAvailableBases] = useState([]);
  
  // Data
  const [paretoData, setParetoData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  
  useEffect(() => {
    fetchBaseLocations();
  }, []);
  
  useEffect(() => {
    if (availableBases.length > 0) {
      fetchParetoData();
    }
  }, [baseLocations, radiusMin, radiusMax, radiusStep, slaMin, slaMax, slaStep, fleetSize, crewsPerVehicle, populationWeight, slaWeight, costWeight]);
  
  const fetchBaseLocations = async () => {
    try {
      const response = await fetch('http://localhost:5001/api/base_locations');
      const result = await response.json();
      
      if (result.status === 'success') {
        setAvailableBases(result.data);
      }
    } catch (err) {
      console.error('Failed to fetch base locations:', err);
    }
  };
  
  const fetchParetoData = async () => {
    setLoading(true);
    setError(null);
    
    try {
      // Normalize weights
      const totalWeight = populationWeight + slaWeight + costWeight;
      const normalizedWeights = {
        population: populationWeight / totalWeight,
        sla: slaWeight / totalWeight,
        cost: costWeight / totalWeight
      };
      
      const response = await fetch('http://localhost:5001/api/pareto_sensitivity', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          base_locations: baseLocations,
          radius_min: radiusMin,
          radius_max: radiusMax,
          radius_step: radiusStep,
          sla_min: slaMin,
          sla_max: slaMax,
          sla_step: slaStep,
          fleet_size: fleetSize,
          crews_per_vehicle: crewsPerVehicle,
          weights: normalizedWeights
        })
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
      }
      
      const result = await response.json();
      
      if (result.status === 'success') {
        setParetoData(result.data);
      } else {
        throw new Error(result.message || 'Failed to fetch Pareto sensitivity data');
      }
    } catch (err) {
      setError(err.message);
      console.error('Pareto sensitivity request failed:', err);
    } finally {
      setLoading(false);
    }
  };
  
  const handleBaseToggle = (baseName) => {
    if (baseLocations.includes(baseName)) {
      setBaseLocations(baseLocations.filter(b => b !== baseName));
    } else {
      setBaseLocations([...baseLocations, baseName]);
    }
  };
  
  // Prepare line chart data for Pareto frontier
  const prepareLineData = () => {
    if (!paretoData) return [];
    
    const data = [];
    
    // Add Pareto frontier as line
    if (paretoData.pareto_frontier && paretoData.pareto_frontier.length > 0) {
      const sortedFrontier = [...paretoData.pareto_frontier].sort((a, b) => a.coverage_rate - b.coverage_rate);
      data.push({
        id: 'Pareto Frontier',
        color: colors.blueAccent[400],
        data: sortedFrontier.map(point => ({
          x: point.coverage_rate,
          y: point.avg_response_time
        }))
      });
    }
    
    // Add dominated points as separate line (for visualization)
    if (paretoData.dominated_points && paretoData.dominated_points.length > 0) {
      const sortedDominated = [...paretoData.dominated_points].sort((a, b) => a.coverage_rate - b.coverage_rate);
      data.push({
        id: 'Dominated Points',
        color: colors.grey[400],
        data: sortedDominated.map(point => ({
          x: point.coverage_rate,
          y: point.avg_response_time
        }))
      });
    }
    
    // Add optimal point as separate line
    if (paretoData.optimal_scenario) {
      const opt = paretoData.optimal_scenario;
      data.push({
        id: 'Optimal',
        color: colors.redAccent[400],
        data: [{
          x: opt.coverage_rate,
          y: opt.avg_response_time
        }]
      });
    }
    
    return data;
  };
  
  const lineData = prepareLineData();
  
  return (
    <Box m="20px" sx={{ mt: "0px" }}>
      <Typography variant="h3" sx={{ mb: "10px", color: colors.grey[100] }}>
        2.3 Service Area Sensitivity
      </Typography>
      <Typography variant="h6" sx={{ mb: "10px", color: colors.grey[300] }}>
        Service Area Sensitivity - Pareto frontier chart for comparing strategic options
      </Typography>
      <Typography variant="body2" sx={{ mb: "20px", color: colors.grey[400], fontStyle: 'italic' }}>
        Plot the Pareto frontier across radius/SLA thresholds to compare multiple strategic options
        under resource and geography changes. Use weight sliders to auto-select an efficient point.
      </Typography>
      
      {/* Controls */}
      <Paper sx={{ p: 3, mb: 3, backgroundColor: colors.primary[400] }}>
        <Grid container spacing={3}>
          {/* Base Locations */}
          <Grid item xs={12} md={6}>
            <Typography variant="body1" sx={{ mb: 1, color: colors.grey[100] }}>
              Base Locations
            </Typography>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
              {availableBases.map((base) => (
                <Chip
                  key={base.name}
                  label={base.name}
                  onClick={() => handleBaseToggle(base.name)}
                  color={baseLocations.includes(base.name) ? 'primary' : 'default'}
                  sx={{
                    color: baseLocations.includes(base.name) ? colors.grey[100] : '#000000',
                    backgroundColor: baseLocations.includes(base.name) 
                      ? colors.blueAccent[700] 
                      : '#ffffff',
                    border: baseLocations.includes(base.name) ? 'none' : `1px solid ${colors.grey[300]}`,
                    '&:hover': {
                      backgroundColor: baseLocations.includes(base.name)
                        ? colors.blueAccent[600]
                        : colors.grey[100]
                    }
                  }}
                />
              ))}
            </Box>
          </Grid>
          
          {/* Weight Sliders */}
          <Grid item xs={12} md={6}>
            <Typography variant="body1" sx={{ mb: 2, color: colors.grey[100] }}>
              Weight Sliders (Total: {(populationWeight + slaWeight + costWeight).toFixed(2)})
            </Typography>
            
            <Typography variant="body2" sx={{ mb: 1, color: colors.grey[300] }}>
              Population Coverage: {populationWeight.toFixed(2)}
            </Typography>
            <Slider
              value={populationWeight}
              onChange={(e, newValue) => setPopulationWeight(newValue)}
              min={0}
              max={1}
              step={0.01}
              sx={{
                color: colors.blueAccent[400],
                mb: 2
              }}
            />
            
            <Typography variant="body2" sx={{ mb: 1, color: colors.grey[300] }}>
              SLA Attainment: {slaWeight.toFixed(2)}
            </Typography>
            <Slider
              value={slaWeight}
              onChange={(e, newValue) => setSlaWeight(newValue)}
              min={0}
              max={1}
              step={0.01}
              sx={{
                color: colors.greenAccent[400],
                mb: 2
              }}
            />
            
            <Typography variant="body2" sx={{ mb: 1, color: colors.grey[300] }}>
              Cost Efficiency: {costWeight.toFixed(2)}
            </Typography>
            <Slider
              value={costWeight}
              onChange={(e, newValue) => setCostWeight(newValue)}
              min={0}
              max={1}
              step={0.01}
              sx={{
                color: colors.redAccent[400]
              }}
            />
          </Grid>
          
          {/* Range Controls */}
          <Grid item xs={12} md={3}>
            <Typography variant="body2" sx={{ mb: 1, color: colors.grey[100] }}>
              Radius Range: {radiusMin}-{radiusMax} mi (step: {radiusStep})
            </Typography>
            <Button
              size="small"
              onClick={() => {
                setRadiusMin(20);
                setRadiusMax(100);
                setRadiusStep(10);
              }}
              sx={{ color: colors.blueAccent[400] }}
            >
              Reset
            </Button>
          </Grid>
          
          <Grid item xs={12} md={3}>
            <Typography variant="body2" sx={{ mb: 1, color: colors.grey[100] }}>
              SLA Range: {slaMin}-{slaMax} min (step: {slaStep})
            </Typography>
            <Button
              size="small"
              onClick={() => {
                setSlaMin(10);
                setSlaMax(30);
                setSlaStep(5);
              }}
              sx={{ color: colors.blueAccent[400] }}
            >
              Reset
            </Button>
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
      
      {/* Pareto Chart */}
      {!loading && paretoData && lineData.length > 0 && (
        <Box>
          <Paper sx={{ p: 3, backgroundColor: colors.primary[400], height: "700px" }}>
            <Typography variant="h5" sx={{ mb: 2, color: colors.grey[100] }}>
              Coverage vs. Response Time Pareto Frontier
            </Typography>
            <Typography variant="body2" sx={{ mb: 2, color: colors.grey[300] }}>
              Pareto frontier showing optimal trade-offs between coverage rate and average response time.
              Optimal scenario is highlighted based on selected weights.
            </Typography>
            <Box height="600px">
              <ResponsiveLine
                data={lineData}
                margin={{ top: 50, right: 140, bottom: 70, left: 90 }}
                xScale={{ type: 'linear', min: 'auto', max: 'auto' }}
                yScale={{ type: 'linear', min: 'auto', max: 'auto', reverse: false }}
                curve="natural"
                axisTop={null}
                axisRight={null}
                axisBottom={{
                  orient: 'bottom',
                  tickSize: 5,
                  tickPadding: 5,
                  tickRotation: 0,
                  legend: 'Coverage Rate (%)',
                  legendOffset: 46,
                  legendPosition: 'middle'
                }}
                axisLeft={{
                  orient: 'left',
                  tickSize: 5,
                  tickPadding: 5,
                  tickRotation: 0,
                  legend: 'Average Response Time (minutes)',
                  legendOffset: -60,
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
                    itemsSpacing: 2,
                    itemDirection: 'left-to-right',
                    itemWidth: 100,
                    itemHeight: 20,
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
          
          {/* Optimal Scenario Details */}
          {paretoData.optimal_scenario && (
            <Paper sx={{ p: 3, mt: 3, backgroundColor: colors.primary[400] }}>
              <Typography variant="h6" sx={{ mb: 2, color: colors.grey[100] }}>
                Optimal Scenario (Based on Selected Weights)
              </Typography>
              <Grid container spacing={2}>
                <Grid item xs={12} md={3}>
                  <Typography variant="body2" sx={{ color: colors.grey[300] }}>
                    Radius / SLA
                  </Typography>
                  <Typography variant="h6" sx={{ color: colors.grey[100], fontWeight: 'bold' }}>
                    {paretoData.optimal_scenario.radius} mi / {paretoData.optimal_scenario.sla_target} min
                  </Typography>
                </Grid>
                <Grid item xs={12} md={3}>
                  <Typography variant="body2" sx={{ color: colors.grey[300] }}>
                    Coverage Rate
                  </Typography>
                  <Typography variant="h6" sx={{ color: colors.blueAccent[400], fontWeight: 'bold' }}>
                    {paretoData.optimal_scenario.coverage_rate.toFixed(1)}%
                  </Typography>
                </Grid>
                <Grid item xs={12} md={3}>
                  <Typography variant="body2" sx={{ color: colors.grey[300] }}>
                    Avg Response Time
                  </Typography>
                  <Typography variant="h6" sx={{ color: colors.greenAccent[400], fontWeight: 'bold' }}>
                    {paretoData.optimal_scenario.avg_response_time.toFixed(1)} min
                  </Typography>
                </Grid>
                <Grid item xs={12} md={3}>
                  <Typography variant="body2" sx={{ color: colors.grey[300] }}>
                    SLA Attainment
                  </Typography>
                  <Typography variant="h6" sx={{ color: colors.greenAccent[400], fontWeight: 'bold' }}>
                    {paretoData.optimal_scenario.sla_attainment.toFixed(1)}%
                  </Typography>
                </Grid>
              </Grid>
            </Paper>
          )}
          
          {/* Metadata */}
          {paretoData.metadata && (
            <Paper sx={{ p: 2, mt: 2, backgroundColor: colors.primary[500] }}>
              <Typography variant="body2" sx={{ color: colors.grey[300] }}>
                Analyzed {paretoData.metadata.n_scenarios} scenarios | 
                {paretoData.metadata.n_pareto} Pareto optimal | 
                {paretoData.metadata.n_dominated} dominated
              </Typography>
            </Paper>
          )}
        </Box>
      )}
    </Box>
  );
};

export default ParetoSensitivity;

