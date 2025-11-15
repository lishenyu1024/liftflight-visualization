// 2.1 What-If Scenario Panel (Inputs → KPI Mini-Multiples)
// Chart 2.1: What-If Scenario Panel - Real-time scenario planning with parameter inputs and KPI outputs
//
// Analysis:
// This chart allows users to model 'what-if' scenarios for resource allocation, new bases, and service area changes.
// It provides a sidebar with parameter inputs (fleet, crews, base locations, service radius, SLA target)
// and a main panel showing KPIs (missions, SLA attainment, unmet demand, cost) as mini-cards.
// Users can save and compare multiple scenarios.

import { useState, useEffect } from 'react';
import { 
  Box, 
  Paper, 
  Typography, 
  TextField,
  Select, 
  MenuItem, 
  FormControl, 
  InputLabel,
  Button,
  CircularProgress,
  Alert,
  Grid,
  Chip,
  IconButton
} from '@mui/material';
import { useTheme } from '@mui/material';
import { tokens } from '../theme';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import SaveIcon from '@mui/icons-material/Save';
import CompareArrowsIcon from '@mui/icons-material/CompareArrows';

const WhatIfScenarioPanel = () => {
  const theme = useTheme();
  const colors = tokens(theme.palette.mode);
  
  // Scenario parameters
  const [fleetSize, setFleetSize] = useState(3);
  const [crewsPerVehicle, setCrewsPerVehicle] = useState(2);
  const [selectedBases, setSelectedBases] = useState(['BANGOR']);
  const [serviceRadius, setServiceRadius] = useState(50);
  const [slaTarget, setSlaTarget] = useState(20);
  
  // Data
  const [baseLocations, setBaseLocations] = useState([]);
  const [scenarioResult, setScenarioResult] = useState(null);
  const [savedScenarios, setSavedScenarios] = useState([]);
  const [comparisonMode, setComparisonMode] = useState(false);
  const [comparisonResults, setComparisonResults] = useState(null);
  
  // UI state
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  
  useEffect(() => {
    fetchBaseLocations();
  }, []);
  
  useEffect(() => {
    if (baseLocations.length > 0) {
      simulateScenario();
    }
  }, [fleetSize, crewsPerVehicle, selectedBases, serviceRadius, slaTarget]);
  
  const fetchBaseLocations = async () => {
    try {
      const response = await fetch('http://localhost:5001/api/base_locations');
      const result = await response.json();
      
      if (result.status === 'success') {
        setBaseLocations(result.data);
      }
    } catch (err) {
      console.error('Failed to fetch base locations:', err);
    }
  };
  
  const simulateScenario = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch('http://localhost:5001/api/scenario_simulate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          fleet_size: fleetSize,
          crews_per_vehicle: crewsPerVehicle,
          base_locations: selectedBases,
          service_radius_miles: serviceRadius,
          sla_target_minutes: slaTarget
        })
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
      }
      
      const result = await response.json();
      
      if (result.status === 'success') {
        setScenarioResult(result.data);
      } else {
        throw new Error(result.message || 'Failed to simulate scenario');
      }
    } catch (err) {
      setError(err.message);
      console.error('Scenario simulation failed:', err);
    } finally {
      setLoading(false);
    }
  };
  
  const handleBaseToggle = (baseName) => {
    if (selectedBases.includes(baseName)) {
      setSelectedBases(selectedBases.filter(b => b !== baseName));
    } else {
      setSelectedBases([...selectedBases, baseName]);
    }
  };
  
  const saveScenario = () => {
    if (!scenarioResult) return;
    
    const scenario = {
      id: Date.now(),
      name: `Scenario ${savedScenarios.length + 1}`,
      params: {
        fleet_size: fleetSize,
        crews_per_vehicle: crewsPerVehicle,
        base_locations: [...selectedBases],
        service_radius_miles: serviceRadius,
        sla_target_minutes: slaTarget
      },
      result: scenarioResult,
      timestamp: new Date().toISOString()
    };
    
    setSavedScenarios([...savedScenarios, scenario]);
  };
  
  const compareScenarios = async () => {
    if (savedScenarios.length < 1) {
      setError('Please save at least one scenario to compare');
      return;
    }
    
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch('http://localhost:5001/api/scenario_compare', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          scenarios: savedScenarios.map(s => s.params)
        })
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
      }
      
      const result = await response.json();
      
      if (result.status === 'success') {
        setComparisonResults(result.data);
        setComparisonMode(true);
      } else {
        throw new Error(result.message || 'Failed to compare scenarios');
      }
    } catch (err) {
      setError(err.message);
      console.error('Scenario comparison failed:', err);
    } finally {
      setLoading(false);
    }
  };
  
  return (
    <Box m="20px" sx={{ mt: "0px" }}>
      <Typography variant="h3" sx={{ mb: "10px", color: colors.grey[100] }}>
        2.1 What-If Scenario Panel
      </Typography>
      <Typography variant="h6" sx={{ mb: "10px", color: colors.grey[300] }}>
        What-If Scenario Panel: Real-time scenario planning with parameter inputs and KPI outputs
      </Typography>
      <Typography variant="body2" sx={{ mb: "20px", color: colors.grey[400], fontStyle: 'italic' }}>
        Model 'what-if' scenarios for resource allocation, new bases, and service area changes.
        Adjust parameters in the sidebar and see KPIs update in real-time. Save and compare multiple scenarios.
      </Typography>
      
      <Grid container spacing={3}>
        {/* Sidebar: Parameter Inputs */}
        <Grid item xs={12} md={4}>
          <Paper sx={{ p: 3, backgroundColor: '#ffffff', height: "100%" }}>
            <Typography variant="h5" sx={{ mb: 3, color: '#000000' }}>
              Scenario Parameters
            </Typography>
            
            <Grid container spacing={3}>
              {/* Fleet Size */}
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  type="number"
                  label="Fleet Size"
                  value={fleetSize}
                  onChange={(e) => setFleetSize(parseInt(e.target.value) || 1)}
                  inputProps={{ min: 1, max: 20 }}
                  sx={{
                    '& .MuiOutlinedInput-root': {
                      color: colors.grey[900],
                      '& fieldset': {
                        borderColor: colors.grey[400],
                      },
                      '&:hover fieldset': {
                        borderColor: colors.grey[600],
                      },
                    },
                    '& .MuiInputLabel-root': {
                      color: colors.grey[700],
                    },
                  }}
                />
              </Grid>
              
              {/* Crews per Vehicle */}
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  type="number"
                  label="Crews per Vehicle"
                  value={crewsPerVehicle}
                  onChange={(e) => setCrewsPerVehicle(parseInt(e.target.value) || 1)}
                  inputProps={{ min: 1, max: 5 }}
                  sx={{
                    '& .MuiOutlinedInput-root': {
                      color: colors.grey[900],
                      '& fieldset': {
                        borderColor: colors.grey[400],
                      },
                      '&:hover fieldset': {
                        borderColor: colors.grey[600],
                      },
                    },
                    '& .MuiInputLabel-root': {
                      color: colors.grey[700],
                    },
                  }}
                />
              </Grid>
              
              {/* Service Radius */}
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  type="number"
                  label="Service Radius (miles)"
                  value={serviceRadius}
                  onChange={(e) => setServiceRadius(parseFloat(e.target.value) || 10)}
                  inputProps={{ min: 10, max: 200, step: 5 }}
                  sx={{
                    '& .MuiOutlinedInput-root': {
                      color: colors.grey[900],
                      '& fieldset': {
                        borderColor: colors.grey[400],
                      },
                      '&:hover fieldset': {
                        borderColor: colors.grey[600],
                      },
                    },
                    '& .MuiInputLabel-root': {
                      color: colors.grey[700],
                    },
                  }}
                />
              </Grid>
              
              {/* SLA Target */}
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  type="number"
                  label="SLA Target (minutes)"
                  value={slaTarget}
                  onChange={(e) => setSlaTarget(parseInt(e.target.value) || 5)}
                  inputProps={{ min: 5, max: 60 }}
                  sx={{
                    '& .MuiOutlinedInput-root': {
                      color: colors.grey[900],
                      '& fieldset': {
                        borderColor: colors.grey[400],
                      },
                      '&:hover fieldset': {
                        borderColor: colors.grey[600],
                      },
                    },
                    '& .MuiInputLabel-root': {
                      color: colors.grey[700],
                    },
                  }}
                />
              </Grid>
              
              {/* Base Locations */}
              <Grid item xs={12}>
                <Typography variant="body1" sx={{ mb: 1, color: '#000000' }}>
                  Base Locations
                </Typography>
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                  {baseLocations.map((base) => (
                    <Chip
                      key={base.name}
                      label={base.name}
                      onClick={() => handleBaseToggle(base.name)}
                      color={selectedBases.includes(base.name) ? 'primary' : 'default'}
                      sx={{
                        color: selectedBases.includes(base.name) ? colors.grey[100] : '#000000',
                        backgroundColor: selectedBases.includes(base.name) 
                          ? colors.blueAccent[700] 
                          : '#ffffff',
                        border: selectedBases.includes(base.name) ? 'none' : `1px solid ${colors.grey[300]}`,
                        '&:hover': {
                          backgroundColor: selectedBases.includes(base.name)
                            ? colors.blueAccent[600]
                            : colors.grey[100]
                        }
                      }}
                    />
                  ))}
                </Box>
                {selectedBases.length === 0 && (
                  <Alert severity="warning" sx={{ mt: 1 }}>
                    At least one base location is required
                  </Alert>
                )}
              </Grid>
              
              {/* Action Buttons */}
              <Grid item xs={12}>
                <Button
                  fullWidth
                  variant="contained"
                  startIcon={<SaveIcon />}
                  onClick={saveScenario}
                  disabled={!scenarioResult || selectedBases.length === 0}
                  sx={{
                    mb: 2,
                    backgroundColor: colors.blueAccent[700],
                    color: colors.grey[100],
                    '&:hover': {
                      backgroundColor: colors.blueAccent[600]
                    }
                  }}
                >
                  Save Scenario
                </Button>
                <Button
                  fullWidth
                  variant="outlined"
                  startIcon={<CompareArrowsIcon />}
                  onClick={compareScenarios}
                  disabled={savedScenarios.length < 1}
                  sx={{
                    borderColor: colors.blueAccent[700],
                    color: colors.blueAccent[400],
                    '&:hover': {
                      borderColor: colors.blueAccent[600],
                      backgroundColor: colors.blueAccent[700]
                    }
                  }}
                >
                  Compare Scenarios ({savedScenarios.length})
                </Button>
              </Grid>
              
              {/* Saved Scenarios List */}
              {savedScenarios.length > 0 && (
                <Grid item xs={12}>
                  <Typography variant="body1" sx={{ mb: 1, color: colors.grey[900] }}>
                    Saved Scenarios ({savedScenarios.length})
                  </Typography>
                  <Box sx={{ maxHeight: 200, overflowY: 'auto' }}>
                    {savedScenarios.map((scenario) => (
                      <Paper
                        key={scenario.id}
                        sx={{
                          p: 1,
                          mb: 1,
                          backgroundColor: colors.grey[100],
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center'
                        }}
                      >
                        <Typography variant="body2" sx={{ color: colors.grey[900] }}>
                          {scenario.name}
                        </Typography>
                        <IconButton
                          size="small"
                          onClick={() => setSavedScenarios(savedScenarios.filter(s => s.id !== scenario.id))}
                          sx={{ color: colors.redAccent[400] }}
                        >
                          <DeleteIcon fontSize="small" />
                        </IconButton>
                      </Paper>
                    ))}
                  </Box>
                </Grid>
              )}
            </Grid>
          </Paper>
        </Grid>
        
        {/* Main Panel: KPI Mini-Cards */}
        <Grid item xs={12} md={8}>
          {error && (
            <Alert severity="error" sx={{ mb: 3 }}>
              {error}
            </Alert>
          )}
          
          {loading && (
            <Box display="flex" justifyContent="center" alignItems="center" height="400px">
              <CircularProgress />
            </Box>
          )}
          
          {!loading && !comparisonMode && scenarioResult && (
            <Box>
              {/* KPI Cards */}
              <Grid container spacing={2} sx={{ mb: 3 }}>
                {/* Missions */}
                <Grid item xs={12} md={6}>
                  <Paper sx={{ p: 3, backgroundColor: '#ffffff', textAlign: 'center' }}>
                    <Typography variant="h6" sx={{ color: '#000000', mb: 1 }}>
                      Missions
                    </Typography>
                    <Typography variant="h4" sx={{ color: colors.blueAccent[400], fontWeight: 'bold', mb: 1 }}>
                      {scenarioResult.kpis.missions.estimated_capacity.toFixed(0)}
                    </Typography>
                    <Typography variant="body2" sx={{ color: '#000000' }}>
                      Estimated Annual Capacity
                    </Typography>
                    <Typography variant="body2" sx={{ color: '#000000', mt: 1 }}>
                      Historical: {scenarioResult.kpis.missions.historical_annual.toLocaleString()}
                    </Typography>
                  </Paper>
                </Grid>
                
                {/* SLA Attainment */}
                <Grid item xs={12} md={6}>
                  <Paper sx={{ p: 3, backgroundColor: '#ffffff', textAlign: 'center' }}>
                    <Typography variant="h6" sx={{ color: '#000000', mb: 1 }}>
                      SLA Attainment
                    </Typography>
                    <Typography variant="h4" sx={{ color: colors.greenAccent[400], fontWeight: 'bold', mb: 1 }}>
                      {scenarioResult.kpis.sla_attainment.rate_percent.toFixed(1)}%
                    </Typography>
                    <Typography variant="body2" sx={{ color: '#000000' }}>
                      Within {slaTarget} min target
                    </Typography>
                    <Typography variant="body2" sx={{ color: '#000000', mt: 1 }}>
                      Avg: {scenarioResult.kpis.sla_attainment.avg_response_time_minutes.toFixed(1)} min
                    </Typography>
                  </Paper>
                </Grid>
                
                {/* Unmet Demand */}
                <Grid item xs={12} md={6}>
                  <Paper sx={{ p: 3, backgroundColor: '#ffffff', textAlign: 'center' }}>
                    <Typography variant="h6" sx={{ color: '#000000', mb: 1 }}>
                      Unmet Demand
                    </Typography>
                    <Typography variant="h4" sx={{ color: colors.redAccent[400], fontWeight: 'bold', mb: 1 }}>
                      {scenarioResult.kpis.unmet_demand.missions.toFixed(0)}
                    </Typography>
                    <Typography variant="body2" sx={{ color: '#000000' }}>
                      Estimated Annual
                    </Typography>
                    <Typography variant="body2" sx={{ color: '#000000', mt: 1 }}>
                      Rate: {scenarioResult.kpis.unmet_demand.rate_percent.toFixed(1)}%
                    </Typography>
                  </Paper>
                </Grid>
                
                {/* Cost */}
                <Grid item xs={12} md={6}>
                  <Paper sx={{ p: 3, backgroundColor: '#ffffff', textAlign: 'center' }}>
                    <Typography variant="h6" sx={{ color: '#000000', mb: 1 }}>
                      Estimated Annual Cost
                    </Typography>
                    <Typography variant="h4" sx={{ color: colors.yellowAccent?.[400] || colors.blueAccent[400], fontWeight: 'bold', mb: 1 }}>
                      ${(scenarioResult.kpis.cost.total_cost / 1000000).toFixed(2)}M
                    </Typography>
                    <Typography variant="body2" sx={{ color: '#000000' }}>
                      Total Operational Cost
                    </Typography>
                    <Typography variant="body2" sx={{ color: '#000000', mt: 1 }}>
                      ${scenarioResult.kpis.cost.cost_per_mission.toFixed(0)} per mission
                    </Typography>
                  </Paper>
                </Grid>
                
                {/* Coverage */}
                <Grid item xs={12}>
                  <Paper sx={{ p: 3, backgroundColor: '#ffffff', textAlign: 'center' }}>
                    <Typography variant="h6" sx={{ color: '#000000', mb: 1 }}>
                      Coverage
                    </Typography>
                    <Typography variant="h4" sx={{ color: colors.blueAccent[400], fontWeight: 'bold', mb: 1 }}>
                      {scenarioResult.kpis.coverage.coverage_rate.toFixed(1)}%
                    </Typography>
                    <Typography variant="body2" sx={{ color: '#000000' }}>
                      {scenarioResult.kpis.coverage.cities_covered} of {scenarioResult.kpis.coverage.total_cities} cities covered
                    </Typography>
                  </Paper>
                </Grid>
              </Grid>
              
              {/* Coverage Details by Base */}
              <Paper sx={{ p: 3, backgroundColor: '#ffffff' }}>
                <Typography variant="h6" sx={{ mb: 2, color: '#000000' }}>
                  Coverage by Base Location
                </Typography>
                <Grid container spacing={2}>
                  {Object.entries(scenarioResult.coverage_details).map(([base, count]) => (
                    <Grid item xs={12} md={4} key={base}>
                      <Paper sx={{ p: 2, backgroundColor: colors.blueAccent[800] }}>
                        <Typography variant="body1" sx={{ color: '#000000', fontWeight: 'bold' }}>
                          {base}
                        </Typography>
                        <Typography variant="body2" sx={{ color: '#000000', mt: 0.5 }}>
                          {count} cities covered
                        </Typography>
                      </Paper>
                    </Grid>
                  ))}
                </Grid>
              </Paper>
            </Box>
          )}
          
          {/* Comparison View */}
          {!loading && comparisonMode && comparisonResults && (
            <Box>
              <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
                <Typography variant="h5" sx={{ color: colors.grey[100] }}>
                  Scenario Comparison
                </Typography>
                <Button
                  variant="outlined"
                  onClick={() => setComparisonMode(false)}
                  sx={{
                    borderColor: colors.grey[100],
                    color: colors.grey[100],
                    '&:hover': {
                      borderColor: colors.grey[100],
                      backgroundColor: colors.grey[100]
                    }
                  }}
                >
                  Back to Current Scenario
                </Button>
              </Box>
              
              {/* Comparison Table */}
              <Paper sx={{ p: 3, backgroundColor: '#ffffff' }}>
                <Grid container spacing={2}>
                  {comparisonResults.comparison.map((scenario, idx) => (
                    <Grid item xs={12} key={idx}>
                      <Paper sx={{ p: 2, backgroundColor: colors.grey[100], mb: 2 }}>
                        <Typography variant="h6" sx={{ mb: 2, color: colors.grey[900] }}>
                          {scenario.scenario_id}
                        </Typography>
                        <Grid container spacing={2}>
                          <Grid item xs={6} md={3}>
                            <Typography variant="body2" sx={{ color: colors.grey[700] }}>
                              Fleet Size
                            </Typography>
                            <Typography variant="body1" sx={{ color: colors.grey[900], fontWeight: 'bold' }}>
                              {scenario.fleet_size}
                            </Typography>
                          </Grid>
                          <Grid item xs={6} md={3}>
                            <Typography variant="body2" sx={{ color: colors.grey[700] }}>
                              Bases
                            </Typography>
                            <Typography variant="body1" sx={{ color: colors.grey[900], fontWeight: 'bold' }}>
                              {scenario.bases}
                            </Typography>
                          </Grid>
                          <Grid item xs={6} md={3}>
                            <Typography variant="body2" sx={{ color: colors.grey[700] }}>
                              SLA Attainment
                            </Typography>
                            <Typography variant="body1" sx={{ color: colors.greenAccent[400], fontWeight: 'bold' }}>
                              {scenario.sla_attainment.toFixed(1)}%
                            </Typography>
                          </Grid>
                          <Grid item xs={6} md={3}>
                            <Typography variant="body2" sx={{ color: colors.grey[700] }}>
                              Cost
                            </Typography>
                            <Typography variant="body1" sx={{ color: colors.yellowAccent?.[400] || colors.blueAccent[400], fontWeight: 'bold' }}>
                              ${(scenario.total_cost / 1000000).toFixed(2)}M
                            </Typography>
                          </Grid>
                        </Grid>
                      </Paper>
                    </Grid>
                  ))}
                </Grid>
              </Paper>
            </Box>
          )}
        </Grid>
      </Grid>
    </Box>
  );
};

export default WhatIfScenarioPanel;

