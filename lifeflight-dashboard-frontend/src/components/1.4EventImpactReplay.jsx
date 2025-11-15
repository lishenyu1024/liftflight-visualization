// 1.4 External Event Impact Replay (Event Study Line + Structural Breaks)
// Chart 1.4: External Event Impact Replay - Causal impact analysis of hospital closures
//
// Analysis:
// This chart analyzes the causal impact of external events (e.g., hospital closures) on emergency
// medical demand using event study methodology. It shows:
// - Event study line chart: Pre/post event comparison with baseline and confidence intervals
// - Cumulative impact: Cumulative effect over time after the event
// - Statistical comparison: Mean difference, percentage change, confidence intervals

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

const EventImpactReplay = () => {
  const theme = useTheme();
  const colors = tokens(theme.palette.mode);
  
  const [events, setEvents] = useState([]);
  const [selectedEventId, setSelectedEventId] = useState(null);
  const [locationLevel, setLocationLevel] = useState('county');
  const [windowMonths, setWindowMonths] = useState(12);
  const [tabValue, setTabValue] = useState(0); // 0: timeline, 1: cumulative impact
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [data, setData] = useState(null);
  
  useEffect(() => {
    fetchEvents();
  }, []);
  
  useEffect(() => {
    if (selectedEventId) {
      fetchEventImpact();
    }
  }, [selectedEventId, locationLevel, windowMonths]);
  
  const fetchEvents = async () => {
    try {
      const response = await fetch('http://localhost:5001/api/events');
      const result = await response.json();
      
      if (result.status === 'success') {
        setEvents(result.data);
        if (result.data.length > 0) {
          setSelectedEventId(result.data[0].event_id);
        }
      }
    } catch (err) {
      console.error('Failed to fetch events:', err);
    }
  };
  
  const fetchEventImpact = async () => {
    if (!selectedEventId) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const params = new URLSearchParams({
        event_id: selectedEventId,
        location_level: locationLevel,
        window_months: windowMonths.toString()
      });
      
      const response = await fetch(`http://localhost:5001/api/event_impact?${params}`);
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
      }
      
      const result = await response.json();
      
      if (result.status === 'success') {
        setData(result.data);
      } else {
        throw new Error(result.message || 'Failed to fetch event impact data');
      }
    } catch (err) {
      setError(err.message);
      console.error('Event impact request failed:', err);
    } finally {
      setLoading(false);
    }
  };
  
  // Prepare timeline chart data
  const prepareTimelineData = () => {
    if (!data || !data.timeline_data || !Array.isArray(data.timeline_data) || data.timeline_data.length === 0) {
      return [];
    }
    
    try {
      // Separate pre and post periods
      const preData = data.timeline_data
        .filter(item => item && item.period === 'pre' && item.date && item.mission_count !== undefined)
        .map(item => {
          const date = new Date(item.date);
          if (isNaN(date.getTime())) return null;
          return {
            x: date.toISOString().split('T')[0],
            y: item.mission_count
          };
        })
        .filter(item => item !== null);
      
      const postData = data.timeline_data
        .filter(item => item && item.period === 'post' && item.date && item.mission_count !== undefined)
        .map(item => {
          const date = new Date(item.date);
          if (isNaN(date.getTime())) return null;
          return {
            x: date.toISOString().split('T')[0],
            y: item.mission_count
          };
        })
        .filter(item => item !== null);
      
      // Baseline line
      if (!data.pre_post_comparison || !data.pre_post_comparison.pre_period_mean) {
        return [];
      }
      
      const baseline = data.pre_post_comparison.pre_period_mean;
      const allDates = [...new Set(data.timeline_data.map(item => item.date).filter(d => d))].sort();
      
      if (allDates.length === 0) {
        return [];
      }
      
      const baselineData = allDates
        .map(date => {
          const dateObj = new Date(date);
          if (isNaN(dateObj.getTime())) return null;
          return {
            x: dateObj.toISOString().split('T')[0],
            y: baseline
          };
        })
        .filter(item => item !== null);
      
      const result = [];
      
      if (preData.length > 0) {
        result.push({
          id: 'Pre-Event',
          data: preData,
          color: colors.blueAccent[500]
        });
      }
      
      if (postData.length > 0) {
        result.push({
          id: 'Post-Event',
          data: postData,
          color: colors.redAccent[500]
        });
      }
      
      if (baselineData.length > 0) {
        result.push({
          id: 'Baseline (Pre-Event Mean)',
          data: baselineData,
          color: colors.grey[400]
        });
      }
      
      return result;
    } catch (error) {
      console.error('Error preparing timeline data:', error);
      return [];
    }
  };
  
  // Prepare cumulative impact chart data
  const prepareCumulativeData = () => {
    if (!data || !data.cumulative_impact || !Array.isArray(data.cumulative_impact) || data.cumulative_impact.length === 0) {
      return [];
    }
    
    try {
      return data.cumulative_impact
        .filter(item => item && item.date && item.cumulative_excess !== undefined)
        .map(item => {
          const date = new Date(item.date);
          if (isNaN(date.getTime())) return null;
          return {
            date: date.toISOString().split('T')[0],
            cumulative_excess: item.cumulative_excess || 0,
            excess: item.excess || 0
          };
        })
        .filter(item => item !== null);
    } catch (error) {
      console.error('Error preparing cumulative data:', error);
      return [];
    }
  };
  
  const timelineData = prepareTimelineData();
  const cumulativeData = prepareCumulativeData();
  const eventDate = data && data.pre_post_comparison && data.pre_post_comparison.event_date 
    ? new Date(data.pre_post_comparison.event_date) 
    : null;
  
  return (
    <Box m="20px" sx={{ mt: "0px" }}>
      <Typography variant="h3" sx={{ mb: "10px", color: colors.grey[100] }}>
        1.4 External Event Impact Replay
      </Typography>
      <Typography variant="h6" sx={{ mb: "10px", color: colors.grey[300] }}>
        External Event Impact Replay - Causal impact analysis of hospital closures
      </Typography>
      <Typography variant="body2" sx={{ mb: "20px", color: colors.grey[400], fontStyle: 'italic' }}>
        This chart analyzes the causal impact of external events (e.g., hospital closures) on emergency
        medical demand using event study methodology. It shows pre/post event comparison with baseline,
        confidence intervals, and cumulative impact over time.
      </Typography>
      
      {/* Controls */}
      <Paper sx={{ p: 3, mb: 3, backgroundColor: colors.primary[400] }}>
        <Grid container spacing={3} alignItems="center">
          <Grid item xs={12} md={4}>
            <FormControl fullWidth>
              <InputLabel sx={{ color: colors.grey[100] }}>Event</InputLabel>
              <Select
                value={selectedEventId || ''}
                label="Event"
                onChange={(e) => setSelectedEventId(e.target.value)}
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
                {events.map(event => (
                  <MenuItem key={event.event_id} value={event.event_id}>
                    {event.display_name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
          
          <Grid item xs={12} md={3}>
            <FormControl fullWidth>
              <InputLabel sx={{ color: colors.grey[100] }}>Location Level</InputLabel>
              <Select
                value={locationLevel}
                label="Location Level"
                onChange={(e) => setLocationLevel(e.target.value)}
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
                <MenuItem value="system">System (State-wide)</MenuItem>
                <MenuItem value="county">County</MenuItem>
                <MenuItem value="city">City</MenuItem>
              </Select>
            </FormControl>
          </Grid>
          
          <Grid item xs={12} md={2}>
            <FormControl fullWidth>
              <InputLabel sx={{ color: colors.grey[100] }}>Window (months)</InputLabel>
              <Select
                value={windowMonths}
                label="Window (months)"
                onChange={(e) => setWindowMonths(e.target.value)}
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
                <MenuItem value={12}>12 months</MenuItem>
                <MenuItem value={18}>18 months</MenuItem>
                <MenuItem value={24}>24 months</MenuItem>
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
          {/* Event Info */}
          {data.event_info && (
            <Paper sx={{ p: 2, mb: 3, backgroundColor: colors.primary[400] }}>
              <Typography variant="h6" sx={{ color: colors.grey[100], mb: 1 }}>
                Event Information
              </Typography>
              <Grid container spacing={2}>
                <Grid item xs={12} md={3}>
                  <Typography variant="body2" sx={{ color: colors.grey[300] }}>
                    <strong>Hospital:</strong> {data.event_info.hospital_name}
                  </Typography>
                </Grid>
                <Grid item xs={12} md={2}>
                  <Typography variant="body2" sx={{ color: colors.grey[300] }}>
                    <strong>County:</strong> {data.event_info.county}
                  </Typography>
                </Grid>
                <Grid item xs={12} md={2}>
                  <Typography variant="body2" sx={{ color: colors.grey[300] }}>
                    <strong>Type:</strong> {data.event_info.facility_type}
                  </Typography>
                </Grid>
                <Grid item xs={12} md={2}>
                  <Typography variant="body2" sx={{ color: colors.grey[300] }}>
                    <strong>Date:</strong> {data.event_info.closure_year}-{data.event_info.closure_month.toString().padStart(2, '0')}
                  </Typography>
                </Grid>
                <Grid item xs={12} md={3}>
                  <Typography variant="body2" sx={{ color: colors.grey[300] }}>
                    <strong>Reason:</strong> {data.event_info.reason || 'N/A'}
                  </Typography>
                </Grid>
              </Grid>
            </Paper>
          )}
          
          {/* Pre/Post Comparison Summary */}
          {data.pre_post_comparison && (
            <Grid container spacing={2} sx={{ mb: 3 }}>
              <Grid item xs={12} md={3}>
                <Paper sx={{ p: 2, backgroundColor: colors.primary[400], textAlign: 'center' }}>
                  <Typography variant="h6" sx={{ color: colors.grey[100], mb: 1 }}>
                    Pre-Event Mean
                  </Typography>
                  <Typography variant="h4" sx={{ color: colors.blueAccent[400], fontWeight: 'bold' }}>
                    {data.pre_post_comparison.pre_period_mean.toFixed(1)}
                  </Typography>
                  <Typography variant="body2" sx={{ color: colors.grey[300], mt: 0.5 }}>
                    ({data.pre_post_comparison.pre_period_n} months)
                  </Typography>
                </Paper>
              </Grid>
              <Grid item xs={12} md={3}>
                <Paper sx={{ p: 2, backgroundColor: colors.primary[400], textAlign: 'center' }}>
                  <Typography variant="h6" sx={{ color: colors.grey[100], mb: 1 }}>
                    Post-Event Mean
                  </Typography>
                  <Typography variant="h4" sx={{ color: colors.redAccent[400], fontWeight: 'bold' }}>
                    {data.pre_post_comparison.post_period_mean.toFixed(1)}
                  </Typography>
                  <Typography variant="body2" sx={{ color: colors.grey[300], mt: 0.5 }}>
                    ({data.pre_post_comparison.post_period_n} months)
                  </Typography>
                </Paper>
              </Grid>
              <Grid item xs={12} md={3}>
                <Paper sx={{ p: 2, backgroundColor: colors.primary[400], textAlign: 'center' }}>
                  <Typography variant="h6" sx={{ color: colors.grey[100], mb: 1 }}>
                    Difference
                  </Typography>
                  <Typography variant="h4" sx={{ 
                    color: data.pre_post_comparison.difference >= 0 ? colors.redAccent[400] : colors.greenAccent[400], 
                    fontWeight: 'bold' 
                  }}>
                    {data.pre_post_comparison.difference >= 0 ? '+' : ''}{data.pre_post_comparison.difference.toFixed(1)}
                  </Typography>
                  <Typography variant="body2" sx={{ color: colors.grey[300], mt: 0.5 }}>
                    ({data.pre_post_comparison.percentage_change >= 0 ? '+' : ''}{data.pre_post_comparison.percentage_change.toFixed(1)}%)
                  </Typography>
                </Paper>
              </Grid>
              <Grid item xs={12} md={3}>
                <Paper sx={{ p: 2, backgroundColor: colors.primary[400], textAlign: 'center' }}>
                  <Typography variant="h6" sx={{ color: colors.grey[100], mb: 1 }}>
                    P-value
                  </Typography>
                  <Typography variant="h4" sx={{ 
                    color: data.pre_post_comparison.p_value < 0.05 ? colors.greenAccent[400] : colors.grey[400], 
                    fontWeight: 'bold' 
                  }}>
                    {data.pre_post_comparison.p_value.toFixed(4)}
                  </Typography>
                  <Typography variant="body2" sx={{ color: colors.grey[300], mt: 0.5 }}>
                    {data.pre_post_comparison.p_value < 0.05 ? 'Significant' : 'Not significant'}
                  </Typography>
                </Paper>
              </Grid>
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
              <Tab label="Event Study Timeline" />
              <Tab label="Cumulative Impact" />
            </Tabs>
          </Paper>
          
          {/* Timeline Tab */}
          {tabValue === 0 && timelineData && timelineData.length > 0 && (
            <Paper sx={{ p: 3, backgroundColor: colors.primary[400], height: "600px" }}>
              <Typography variant="h5" sx={{ mb: 2, color: colors.grey[100] }}>
                Monthly Mission Count: Pre vs. Post Event
              </Typography>
              <Typography variant="body2" sx={{ mb: 2, color: colors.grey[300] }}>
                Vertical line indicates event date. Baseline shows pre-event mean.
              </Typography>
              <Box height="500px">
                <ResponsiveLine
                  data={timelineData}
                  margin={{ top: 50, right: 140, bottom: 70, left: 90 }}
                  xScale={{ type: 'time', format: '%Y-%m-%d', useUTC: false }}
                  xFormat="time:%Y-%m-%d"
                  yScale={{ type: 'linear', min: 0, max: 'auto' }}
                  axisTop={null}
                  axisRight={null}
                  axisBottom={{
                    format: '%Y-%m',
                    tickValues: 'every 3 months',
                    tickSize: 5,
                    tickPadding: 5,
                    tickRotation: -45,
                    legend: 'Date',
                    legendOffset: 60,
                    legendPosition: 'middle'
                  }}
                  axisLeft={{
                    tickSize: 5,
                    tickPadding: 5,
                    tickRotation: 0,
                    legend: 'Monthly Mission Count',
                    legendPosition: 'middle',
                    legendOffset: -70
                  }}
                  pointSize={8}
                  pointColor={{ theme: 'background' }}
                  pointBorderWidth={2}
                  pointBorderColor={{ from: 'serieColor' }}
                  pointLabelYOffset={-12}
                  useMesh={true}
                  enableArea={false}
                  enablePoints={true}
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
                  markers={eventDate ? [
                    {
                      axis: 'x',
                      value: eventDate,
                      lineStyle: { stroke: colors.yellowAccent?.[400] || colors.grey[400], strokeWidth: 2, strokeDasharray: '5 5' },
                      legend: 'Event Date',
                      legendPosition: 'top',
                      legendOrientation: 'vertical'
                    }
                  ] : []}
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
          
          {/* Cumulative Impact Tab */}
          {tabValue === 1 && cumulativeData && cumulativeData.length > 0 ? (
            <Paper sx={{ p: 3, backgroundColor: colors.primary[400], height: "500px" }}>
              <Typography variant="h5" sx={{ mb: 2, color: colors.grey[100] }}>
                Cumulative Impact Over Time
              </Typography>
              <Typography variant="body2" sx={{ mb: 2, color: colors.grey[300] }}>
                Cumulative excess missions relative to pre-event baseline
              </Typography>
              <Box height="400px">
                <ResponsiveLine
                  data={[{
                    id: 'Cumulative Excess',
                    data: cumulativeData.map(item => ({
                      x: item.date,
                      y: item.cumulative_excess
                    }))
                  }]}
                  margin={{ top: 50, right: 140, bottom: 70, left: 90 }}
                  xScale={{ type: 'time', format: '%Y-%m-%d', useUTC: false }}
                  xFormat="time:%Y-%m-%d"
                  yScale={{ type: 'linear', min: 'auto', max: 'auto' }}
                  axisTop={null}
                  axisRight={null}
                  axisBottom={{
                    format: '%Y-%m',
                    tickValues: 'every 3 months',
                    tickSize: 5,
                    tickPadding: 5,
                    tickRotation: -45,
                    legend: 'Date',
                    legendOffset: 60,
                    legendPosition: 'middle'
                  }}
                  axisLeft={{
                    tickSize: 5,
                    tickPadding: 5,
                    tickRotation: 0,
                    legend: 'Cumulative Excess Missions',
                    legendPosition: 'middle',
                    legendOffset: -80
                  }}
                  pointSize={8}
                  pointColor={colors.blueAccent[500]}
                  pointBorderWidth={2}
                  pointBorderColor={{ from: 'serieColor' }}
                  enableArea={true}
                  areaOpacity={0.3}
                  areaBaselineValue={0}
                  useMesh={true}
                  colors={[colors.blueAccent[500]]}
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
          ) : tabValue === 1 ? (
            <Paper sx={{ p: 3, backgroundColor: colors.primary[400], height: "500px" }}>
              <Typography variant="h5" sx={{ mb: 2, color: colors.grey[100] }}>
                Cumulative Impact Over Time
              </Typography>
              <Alert severity="info" sx={{ mb: 2 }}>
                No cumulative impact data available for the selected time window. Please try a larger time window.
              </Alert>
            </Paper>
          ) : null}
          
          {/* Show message if no timeline data */}
          {tabValue === 0 && (!timelineData || timelineData.length === 0) && (
            <Paper sx={{ p: 3, backgroundColor: colors.primary[400], height: "600px" }}>
              <Typography variant="h5" sx={{ mb: 2, color: colors.grey[100] }}>
                Monthly Mission Count: Pre vs. Post Event
              </Typography>
              <Alert severity="info" sx={{ mb: 2 }}>
                No timeline data available for the selected time window. Please try a larger time window or different event.
              </Alert>
            </Paper>
          )}
        </Box>
      )}
    </Box>
  );
};

export default EventImpactReplay;

