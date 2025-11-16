// 2.2 Base Siting Coverage Map (Isochrones/Voronoi + Response Time)
// Chart 2.2: Base Siting Coverage Map - Base location optimization with coverage visualization
//
// Analysis:
// This chart visualizes base coverage with isochrones, Voronoi diagrams, and response time heatmaps.
// It shows coverage before/after adding a candidate base, with on-click updates showing SLA lift and incremental cost.

import { useState, useEffect, useCallback, useRef } from 'react';
import { 
  Box, 
  Paper, 
  Typography, 
  Select, 
  MenuItem, 
  FormControl, 
  InputLabel,
  TextField,
  Button,
  CircularProgress,
  Alert,
  Grid,
  Chip,
  Tabs,
  Tab,
  Card,
  CardContent
} from '@mui/material';
import { useTheme } from '@mui/material';
import { tokens } from '../theme';

const BaseSitingMap = () => {
  const theme = useTheme();
  const colors = tokens(theme.palette.mode);
  
  // Scenario parameters
  const [existingBases, setExistingBases] = useState(['BANGOR']);
  const [candidateBase, setCandidateBase] = useState(null);
  const [serviceRadius, setServiceRadius] = useState(50);
  const [slaTarget, setSlaTarget] = useState(20);
  const [coverageThreshold, setCoverageThreshold] = useState(20);
  const [mapView, setMapView] = useState('before'); // 'before' or 'after'
  
  // Available bases
  const [availableBases, setAvailableBases] = useState([]);
  
  // Data
  const [mapData, setMapData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  
  // Debounce timer ref
  const debounceTimerRef = useRef(null);
  
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
  
  const fetchMapData = useCallback(async () => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch('http://localhost:5001/api/base_siting', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          existing_bases: existingBases,
          candidate_base: candidateBase,
          service_radius_miles: serviceRadius,
          sla_target_minutes: slaTarget,
          coverage_threshold_minutes: coverageThreshold
        })
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
      }
      
      const result = await response.json();
      
      if (result.status === 'success') {
        setMapData(result.data);
      } else {
        throw new Error(result.message || 'Failed to fetch base siting data');
      }
    } catch (err) {
      setError(err.message);
      console.error('Base siting request failed:', err);
    } finally {
      setLoading(false);
    }
  }, [existingBases, candidateBase, serviceRadius, slaTarget, coverageThreshold]);
  
  useEffect(() => {
    fetchBaseLocations();
  }, []);
  
  useEffect(() => {
    // Clear previous timer
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }
    
    // Only fetch if we have the necessary data
    if (availableBases.length > 0 && existingBases.length > 0) {
      // Debounce: wait 800ms before making the request (increased from 500ms)
      debounceTimerRef.current = setTimeout(() => {
        fetchMapData();
      }, 800);
    }
    
    // Cleanup function
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, [existingBases, candidateBase, serviceRadius, slaTarget, coverageThreshold, availableBases.length, fetchMapData]);
  
  const handleBaseToggle = (baseName) => {
    if (existingBases.includes(baseName)) {
      setExistingBases(existingBases.filter(b => b !== baseName));
    } else {
      setExistingBases([...existingBases, baseName]);
    }
  };
  
  const handleCandidateBaseSelect = (baseName) => {
    const base = availableBases.find(b => b.name === baseName);
    if (base) {
      setCandidateBase(base);
    }
  };
  
  return (
    <Box m="20px" sx={{ mt: "0px" }}>
      <Typography variant="h3" sx={{ mb: "10px", color: colors.grey[100] }}>
        2.2 Base Siting Coverage Map
      </Typography>
      <Typography variant="h6" sx={{ mb: "10px", color: colors.grey[300] }}>
        Base Siting Coverage Map - Base location optimization with coverage visualization
      </Typography>
      <Typography variant="body2" sx={{ mb: "20px", color: colors.grey[400], fontStyle: 'italic' }}>
        Visualize base coverage with isochrones, Voronoi diagrams, and response time heatmaps.
        Compare coverage before/after adding a candidate base, with SLA lift and incremental cost calculations.
      </Typography>
      
      {/* Controls */}
      <Paper sx={{ p: 3, mb: 3, backgroundColor: colors.primary[400] }}>
        <Grid container spacing={3}>
          {/* Existing Bases */}
          <Grid item xs={12} md={6}>
            <Typography variant="body1" sx={{ mb: 1, color: colors.grey[100] }}>
              Existing Base Locations
            </Typography>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
              {availableBases.map((base) => (
                <Chip
                  key={base.name}
                  label={base.name}
                  onClick={() => handleBaseToggle(base.name)}
                  color={existingBases.includes(base.name) ? 'primary' : 'default'}
                  sx={{
                    color: existingBases.includes(base.name) ? colors.grey[100] : '#000000',
                    backgroundColor: existingBases.includes(base.name) 
                      ? colors.blueAccent[700] 
                      : '#ffffff',
                    border: existingBases.includes(base.name) ? 'none' : `1px solid ${colors.grey[300]}`,
                    '&:hover': {
                      backgroundColor: existingBases.includes(base.name)
                        ? colors.blueAccent[600]
                        : colors.grey[100]
                    }
                  }}
                />
              ))}
            </Box>
            {existingBases.length === 0 && (
              <Alert severity="warning" sx={{ mt: 1 }}>
                At least one existing base is required
              </Alert>
            )}
          </Grid>
          
          {/* Candidate Base */}
          <Grid item xs={12} md={6}>
            <FormControl fullWidth>
              <InputLabel sx={{ color: colors.grey[100] }}>Candidate Base (Optional)</InputLabel>
              <Select
                value={candidateBase?.name || ''}
                label="Candidate Base (Optional)"
                onChange={(e) => handleCandidateBaseSelect(e.target.value)}
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
                <MenuItem value="">None</MenuItem>
                {availableBases
                  .filter(b => !existingBases.includes(b.name))
                  .map((base) => (
                    <MenuItem key={base.name} value={base.name}>
                      {base.name}
                    </MenuItem>
                  ))}
              </Select>
            </FormControl>
          </Grid>
          
          {/* Service Radius and SLA */}
          <Grid item xs={12} md={3}>
            <TextField
              fullWidth
              type="number"
              label="Service Radius (miles)"
              value={serviceRadius}
              onChange={(e) => setServiceRadius(parseFloat(e.target.value) || 10)}
              inputProps={{ min: 10, max: 200, step: 5 }}
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
          
          <Grid item xs={12} md={3}>
            <TextField
              fullWidth
              type="number"
              label="SLA Target (minutes)"
              value={slaTarget}
              onChange={(e) => setSlaTarget(parseInt(e.target.value) || 5)}
              inputProps={{ min: 5, max: 60 }}
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
          
          <Grid item xs={12} md={3}>
            <TextField
              fullWidth
              type="number"
              label="Coverage Threshold (minutes)"
              value={coverageThreshold}
              onChange={(e) => setCoverageThreshold(parseInt(e.target.value) || 5)}
              inputProps={{ min: 5, max: 60 }}
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
      
      {/* Maps and Results */}
      {!loading && mapData && (
        <Box>
          {/* Map View Tabs */}
          {candidateBase && (
            <Paper sx={{ mb: 3, backgroundColor: colors.primary[400] }}>
              <Tabs
                value={mapView}
                onChange={(e, newValue) => setMapView(newValue)}
                sx={{
                  '& .MuiTab-root': {
                    color: colors.grey[300],
                    '&.Mui-selected': {
                      color: colors.blueAccent[400]
                    }
                  }
                }}
              >
                <Tab label="Before" value="before" />
                <Tab label="After" value="after" />
              </Tabs>
            </Paper>
          )}
          
          {/* Map Display */}
          <Paper sx={{ p: 2, mb: 3, backgroundColor: colors.primary[400], height: "700px" }}>
            <Typography variant="h6" sx={{ mb: 2, color: colors.grey[100] }}>
              Coverage Map {candidateBase ? `(${mapView === 'before' ? 'Before' : 'After'} Adding ${candidateBase.name})` : ''}
            </Typography>
            <Box
              sx={{
                height: "650px",
                border: `1px solid ${colors.grey[300]}`,
                borderRadius: '4px',
                overflow: 'hidden'
              }}
            >
              {mapView === 'before' && mapData.before_map_html && (
                <iframe
                  srcDoc={mapData.before_map_html}
                  style={{
                    width: '100%',
                    height: '100%',
                    border: 'none'
                  }}
                  title="Before Coverage Map"
                />
              )}
              {mapView === 'after' && mapData.after_map_html && (
                <iframe
                  srcDoc={mapData.after_map_html}
                  style={{
                    width: '100%',
                    height: '100%',
                    border: 'none'
                  }}
                  title="After Coverage Map"
                />
              )}
              {!mapData.before_map_html && !mapData.after_map_html && (
                <Box
                  display="flex"
                  justifyContent="center"
                  alignItems="center"
                  height="100%"
                  sx={{ color: colors.grey[300] }}
                >
                  Map not available
                </Box>
              )}
            </Box>
          </Paper>
          
          {/* Scenario Comparison */}
          <Grid container spacing={2}>
            {/* Before Scenario */}
            <Grid item xs={12} md={candidateBase ? 6 : 12}>
              <Paper sx={{ p: 3, backgroundColor: colors.primary[400] }}>
                <Typography variant="h6" sx={{ mb: 2, color: colors.grey[100] }}>
                  Current Scenario
                </Typography>
                {mapData.before_scenario && (
                  <Grid container spacing={2}>
                    <Grid item xs={6}>
                      <Typography variant="body2" sx={{ color: colors.grey[300] }}>
                        Coverage Rate
                      </Typography>
                      <Typography variant="h6" sx={{ color: colors.blueAccent[400], fontWeight: 'bold' }}>
                        {mapData.before_scenario.kpis.coverage.coverage_rate.toFixed(1)}%
                      </Typography>
                    </Grid>
                    <Grid item xs={6}>
                      <Typography variant="body2" sx={{ color: colors.grey[300] }}>
                        SLA Attainment
                      </Typography>
                      <Typography variant="h6" sx={{ color: colors.greenAccent[400], fontWeight: 'bold' }}>
                        {mapData.before_scenario.kpis.sla_attainment.rate_percent.toFixed(1)}%
                      </Typography>
                    </Grid>
                    <Grid item xs={6}>
                      <Typography variant="body2" sx={{ color: colors.grey[300] }}>
                        Cities Covered
                      </Typography>
                      <Typography variant="h6" sx={{ color: colors.grey[100], fontWeight: 'bold' }}>
                        {mapData.before_scenario.kpis.coverage.cities_covered}
                      </Typography>
                    </Grid>
                    <Grid item xs={6}>
                      <Typography variant="body2" sx={{ color: colors.grey[300] }}>
                        Annual Cost
                      </Typography>
                      <Typography variant="h6" sx={{ color: colors.yellowAccent?.[400] || colors.blueAccent[400], fontWeight: 'bold' }}>
                        ${(mapData.before_scenario.kpis.cost.total_cost / 1000000).toFixed(2)}M
                      </Typography>
                    </Grid>
                  </Grid>
                )}
              </Paper>
            </Grid>
            
            {/* After Scenario (if candidate base) */}
            {candidateBase && mapData.after_scenario && (
              <Grid item xs={12} md={6}>
                <Paper sx={{ p: 3, backgroundColor: colors.primary[400] }}>
                  <Typography variant="h6" sx={{ mb: 2, color: colors.grey[100] }}>
                    With {candidateBase.name} Base
                  </Typography>
                  <Grid container spacing={2}>
                    <Grid item xs={6}>
                      <Typography variant="body2" sx={{ color: colors.grey[300] }}>
                        Coverage Rate
                      </Typography>
                      <Typography variant="h6" sx={{ color: colors.blueAccent[400], fontWeight: 'bold' }}>
                        {mapData.after_scenario.kpis.coverage.coverage_rate.toFixed(1)}%
                      </Typography>
                    </Grid>
                    <Grid item xs={6}>
                      <Typography variant="body2" sx={{ color: colors.grey[300] }}>
                        SLA Attainment
                      </Typography>
                      <Typography variant="h6" sx={{ color: colors.greenAccent[400], fontWeight: 'bold' }}>
                        {mapData.after_scenario.kpis.sla_attainment.rate_percent.toFixed(1)}%
                      </Typography>
                    </Grid>
                    <Grid item xs={6}>
                      <Typography variant="body2" sx={{ color: colors.grey[300] }}>
                        Cities Covered
                      </Typography>
                      <Typography variant="h6" sx={{ color: colors.grey[100], fontWeight: 'bold' }}>
                        {mapData.after_scenario.kpis.coverage.cities_covered}
                      </Typography>
                    </Grid>
                    <Grid item xs={6}>
                      <Typography variant="body2" sx={{ color: colors.grey[300] }}>
                        Annual Cost
                      </Typography>
                      <Typography variant="h6" sx={{ color: colors.yellowAccent?.[400] || colors.blueAccent[400], fontWeight: 'bold' }}>
                        ${(mapData.after_scenario.kpis.cost.total_cost / 1000000).toFixed(2)}M
                      </Typography>
                    </Grid>
                  </Grid>
                </Paper>
              </Grid>
            )}
            
            {/* SLA Lift Metrics */}
            {candidateBase && mapData.sla_lift && (
              <Grid item xs={12}>
                <Paper sx={{ p: 3, backgroundColor: colors.primary[500] }}>
                  <Typography variant="h6" sx={{ mb: 2, color: colors.grey[100] }}>
                    Impact of Adding {candidateBase.name} Base
                  </Typography>
                  <Grid container spacing={2}>
                    <Grid item xs={12} md={3}>
                      <Card sx={{ backgroundColor: colors.greenAccent[700] }}>
                        <CardContent>
                          <Typography variant="body2" sx={{ color: colors.grey[100] }}>
                            SLA Lift (Absolute)
                          </Typography>
                          <Typography variant="h5" sx={{ color: colors.grey[100], fontWeight: 'bold' }}>
                            +{mapData.sla_lift.sla_lift_absolute.toFixed(1)}%
                          </Typography>
                        </CardContent>
                      </Card>
                    </Grid>
                    <Grid item xs={12} md={3}>
                      <Card sx={{ backgroundColor: colors.blueAccent[700] }}>
                        <CardContent>
                          <Typography variant="body2" sx={{ color: colors.grey[100] }}>
                            Coverage Lift
                          </Typography>
                          <Typography variant="h5" sx={{ color: colors.grey[100], fontWeight: 'bold' }}>
                            +{mapData.sla_lift.coverage_lift.toFixed(1)}%
                          </Typography>
                        </CardContent>
                      </Card>
                    </Grid>
                    <Grid item xs={12} md={3}>
                      <Card sx={{ backgroundColor: colors.redAccent[700] }}>
                        <CardContent>
                          <Typography variant="body2" sx={{ color: colors.grey[100] }}>
                            Incremental Cost
                          </Typography>
                          <Typography variant="h5" sx={{ color: colors.grey[100], fontWeight: 'bold' }}>
                            ${(mapData.sla_lift.incremental_cost / 1000000).toFixed(2)}M
                          </Typography>
                        </CardContent>
                      </Card>
                    </Grid>
                    <Grid item xs={12} md={3}>
                      <Card sx={{ backgroundColor: colors.primary[400] }}>
                        <CardContent>
                          <Typography variant="body2" sx={{ color: colors.grey[100] }}>
                            Cost per SLA Point
                          </Typography>
                          <Typography variant="h5" sx={{ color: colors.grey[100], fontWeight: 'bold' }}>
                            ${mapData.sla_lift.cost_per_sla_point < 1000000 ? mapData.sla_lift.cost_per_sla_point.toFixed(0) : (mapData.sla_lift.cost_per_sla_point / 1000000).toFixed(2) + 'M'}
                          </Typography>
                        </CardContent>
                      </Card>
                    </Grid>
                  </Grid>
                </Paper>
              </Grid>
            )}
          </Grid>
        </Box>
      )}
    </Box>
  );
};

export default BaseSitingMap;

