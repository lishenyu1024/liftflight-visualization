// 3.1 Core KPI Bullet Charts (Board Summary)
// Chart 3.1: Core KPI Bullet Charts - Executive-ready visualizations for board presentations
//
// Analysis:
// This chart displays core KPIs using bullet chart style visualization:
// - Missions (total / per 1,000 pop)
// - SLA attainment (median/95th response time)
// - Unmet demand
// - Transfer success rate
// - Flight hours
// - Unit cost
// Each bullet chart shows current value, target value, and qualitative ranges vs historical trends.

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

const KPIBullets = () => {
  const theme = useTheme();
  const colors = tokens(theme.palette.mode);
  
  const [year, setYear] = useState(2023);
  const [slaTarget, setSlaTarget] = useState(20);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [data, setData] = useState(null);
  
  const availableYears = [2012, 2013, 2014, 2015, 2016, 2017, 2018, 2019, 2020, 2021, 2022, 2023];
  
  useEffect(() => {
    fetchData();
  }, [year, slaTarget]);
  
  const fetchData = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const params = new URLSearchParams({
        year: year.toString(),
        sla_target_minutes: slaTarget.toString(),
        include_historical: 'true'
      });
      
      const response = await fetch(`http://localhost:5001/api/kpi_bullets?${params}`);
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
      }
      
      const result = await response.json();
      
      if (result.status === 'success') {
        setData(result.data);
      } else {
        throw new Error(result.message || 'Failed to fetch KPI bullets data');
      }
    } catch (err) {
      setError(err.message);
      console.error('KPI bullets request failed:', err);
    } finally {
      setLoading(false);
    }
  };
  
  // Prepare bullet chart data
  const prepareBulletData = () => {
    if (!data || !data.bullets) return [];
    
    return data.bullets.map((bullet) => {
      // Calculate max value for scaling
      const maxValue = Math.max(
        bullet.current_value,
        bullet.target_value,
        ...bullet.qualitative_ranges.map(r => r.to).filter(v => isFinite(v))
      );
      
      // Prepare ranges for background
      const ranges = bullet.qualitative_ranges.map((range, i) => ({
        id: `range_${i}`,
        value: range.to === Infinity ? maxValue * 1.2 : range.to,
        color: range.color
      }));
      
      return {
        id: bullet.id,
        title: bullet.title,
        subtitle: bullet.subtitle,
        unit: bullet.unit,
        current_value: bullet.current_value,
        target_value: bullet.target_value,
        max_value: maxValue,
        ranges: ranges
      };
    });
  };
  
  const bulletData = prepareBulletData();
  
  // Render individual bullet chart
  const renderBulletChart = (bullet) => {
    const maxValue = bullet.max_value;
    const currentPct = (bullet.current_value / maxValue) * 100;
    const targetPct = (bullet.target_value / maxValue) * 100;
    
    return (
      <Paper 
        key={bullet.id} 
        sx={{ 
          p: 3, 
          mb: 3, 
          backgroundColor: '#ffffff',
          border: '1px solid #e0e0e0',
          boxShadow: '0 2px 4px rgba(0,0,0,0.05)'
        }}
      >
        <Typography variant="h6" sx={{ mb: 1, color: '#000000', fontWeight: 600 }}>
          {bullet.title}
        </Typography>
        {bullet.subtitle && (
          <Typography variant="body2" sx={{ mb: 3, color: '#666666' }}>
            {bullet.subtitle}
          </Typography>
        )}
        
        <Box height="120px" position="relative" sx={{ mb: 2 }}>
          {/* Qualitative ranges background (colored bands) */}
          {bullet.ranges.map((range, i) => {
            const prevRange = i > 0 ? bullet.ranges[i - 1] : { value: 0 };
            const prevValue = prevRange.value === 0 ? 0 : (prevRange.value / maxValue) * 100;
            const rangeStart = prevValue;
            const rangeEnd = ((range.value >= maxValue * 1.5 ? maxValue * 1.2 : range.value) / maxValue) * 100;
            const rangeWidth = Math.max(0, rangeEnd - rangeStart);
            
            // Light colors for ranges
            let rangeColor;
            if (range.color === 'red') rangeColor = '#ffebee';  // Very light red
            else if (range.color === 'yellow') rangeColor = '#fff9e6';  // Very light yellow
            else rangeColor = '#e8f5e9';  // Very light green
            
            return (
              <Box
                key={i}
                sx={{
                  position: 'absolute',
                  left: `${rangeStart}%`,
                  bottom: 20,
                  width: `${rangeWidth}%`,
                  height: '60px',
                  backgroundColor: rangeColor,
                  borderLeft: i === 0 ? 'none' : '1px solid #f0f0f0',
                  borderRight: i === bullet.ranges.length - 1 ? 'none' : '1px solid #f0f0f0',
                  zIndex: 0,
                  pointerEvents: 'none'
                }}
              />
            );
          })}
          
          {/* Current value bar */}
          <Box
            sx={{
              position: 'absolute',
              left: 0,
              bottom: 40,
              width: `${Math.min(currentPct, 100)}%`,
              height: '20px',
              backgroundColor: '#4a90e2',  // Light blue
              borderRadius: '4px 0 0 4px',
              zIndex: 2,
              boxShadow: '0 1px 2px rgba(0,0,0,0.1)'
            }}
          />
          
          {/* Target marker (vertical line) */}
          {targetPct <= 100 && (
            <>
              <Box
                sx={{
                  position: 'absolute',
                  left: `${targetPct}%`,
                  bottom: 20,
                  top: 0,
                  width: '2px',
                  backgroundColor: '#f44336',  // Red
                  zIndex: 3,
                  pointerEvents: 'none'
                }}
              />
              
              {/* Target label */}
              <Box
                sx={{
                  position: 'absolute',
                  left: `${targetPct}%`,
                  bottom: 5,
                  transform: 'translateX(-50%)',
                  zIndex: 3
                }}
              >
                <Typography
                  variant="caption"
                  sx={{
                    color: '#f44336',
                    fontWeight: 600,
                    fontSize: '10px',
                    whiteSpace: 'nowrap'
                  }}
                >
                  Target
                </Typography>
              </Box>
            </>
          )}
          
          {/* Current value label */}
          <Box
            sx={{
              position: 'absolute',
              left: `${Math.min(currentPct + 2, 95)}%`,
              bottom: 45,
              zIndex: 4
            }}
          >
            <Typography
              variant="body2"
              sx={{
                color: '#000000',
                fontWeight: 700,
                fontSize: '13px',
                backgroundColor: '#ffffff',
                px: 0.5,
                borderRadius: '3px',
                border: '1px solid #e0e0e0'
              }}
            >
              {bullet.unit === '$' 
                ? `$${bullet.current_value.toLocaleString(undefined, { maximumFractionDigits: 0 })}`
                : bullet.unit === '%'
                ? `${bullet.current_value.toFixed(1)}%`
                : bullet.current_value.toLocaleString(undefined, { maximumFractionDigits: 1 })}
            </Typography>
          </Box>
          
          {/* Scale markers */}
          <Box
            sx={{
              position: 'absolute',
              left: 0,
              right: 0,
              bottom: 18,
              height: '2px',
              backgroundColor: '#e0e0e0',
              zIndex: 1
            }}
          />
          
          {/* Scale ticks */}
          {[0, 25, 50, 75, 100].map((tick) => (
            <Box
              key={tick}
              sx={{
                position: 'absolute',
                left: `${tick}%`,
                bottom: 17,
                width: '1px',
                height: '4px',
                backgroundColor: '#bdbdbd',
                zIndex: 1
              }}
            />
          ))}
        </Box>
        
        {/* Scale labels */}
        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2, px: 0.5 }}>
          {[0, 25, 50, 75, 100].map((tick) => (
            <Typography key={tick} variant="caption" sx={{ color: '#999999', fontSize: '10px' }}>
              {tick === 0 ? '0' : tick === 100 ? maxValue.toFixed(0) : ''}
            </Typography>
          ))}
        </Box>
        
        {/* Target vs Current comparison */}
        <Box sx={{ mt: 2, display: 'flex', justifyContent: 'space-between', pt: 2, borderTop: '1px solid #f0f0f0' }}>
          <Box>
            <Typography variant="caption" sx={{ color: '#999999', display: 'block', mb: 0.5 }}>
              Current Value
            </Typography>
            <Typography variant="body1" sx={{ color: '#000000', fontWeight: 600 }}>
              {bullet.unit === '$' 
                ? `$${bullet.current_value.toLocaleString(undefined, { maximumFractionDigits: 0 })}`
                : bullet.unit === '%'
                ? `${bullet.current_value.toFixed(1)}%`
                : bullet.current_value.toLocaleString(undefined, { maximumFractionDigits: 1 })} {bullet.unit !== '$' && bullet.unit !== '%' ? bullet.unit : ''}
            </Typography>
          </Box>
          <Box sx={{ textAlign: 'right' }}>
            <Typography variant="caption" sx={{ color: '#999999', display: 'block', mb: 0.5 }}>
              Target Value
            </Typography>
            <Typography variant="body1" sx={{ color: '#f44336', fontWeight: 600 }}>
              {bullet.unit === '$' 
                ? `$${bullet.target_value.toLocaleString(undefined, { maximumFractionDigits: 0 })}`
                : bullet.unit === '%'
                ? `${bullet.target_value.toFixed(1)}%`
                : bullet.target_value.toLocaleString(undefined, { maximumFractionDigits: 1 })} {bullet.unit !== '$' && bullet.unit !== '%' ? bullet.unit : ''}
            </Typography>
          </Box>
        </Box>
      </Paper>
    );
  };
  
  return (
    <Box m="20px" sx={{ mt: "0px" }}>
      <Typography variant="h3" sx={{ mb: "10px", color: '#000000', fontWeight: 700 }}>
        3.1 Core KPI Bullet Charts
      </Typography>
      <Typography variant="h6" sx={{ mb: "10px", color: '#666666', fontWeight: 500 }}>
        Core KPI Bullet Charts - Executive-ready visualizations for board presentations
      </Typography>
      <Typography variant="body2" sx={{ mb: "20px", color: '#999999', fontStyle: 'italic' }}>
        Display core KPIs using bullet chart style visualization showing current value, target value,
        and qualitative ranges. Metrics include missions, SLA attainment, unmet demand, transfer success rate,
        flight hours, and unit cost.
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
          <Grid item xs={12} md={4}>
            <FormControl fullWidth>
              <InputLabel sx={{ color: '#666666' }}>Year</InputLabel>
              <Select
                value={year}
                label="Year"
                onChange={(e) => setYear(e.target.value)}
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
          
          <Grid item xs={12} md={4}>
            <FormControl fullWidth>
              <InputLabel sx={{ color: '#666666' }}>SLA Target (minutes)</InputLabel>
              <Select
                value={slaTarget}
                label="SLA Target (minutes)"
                onChange={(e) => setSlaTarget(e.target.value)}
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
                <MenuItem value={10}>10 minutes</MenuItem>
                <MenuItem value={15}>15 minutes</MenuItem>
                <MenuItem value={20}>20 minutes</MenuItem>
                <MenuItem value={25}>25 minutes</MenuItem>
                <MenuItem value={30}>30 minutes</MenuItem>
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
      
      {/* Bullet Charts */}
      {!loading && data && bulletData && bulletData.length > 0 && (
        <Box>
          <Grid container spacing={3}>
            {bulletData.map((bullet) => (
              <Grid item xs={12} md={6} key={bullet.id}>
                {renderBulletChart(bullet)}
              </Grid>
            ))}
          </Grid>
          
          {/* Historical Trends (if available) */}
          {data.historical_trends && Object.keys(data.historical_trends).length > 0 && (
            <Paper sx={{ 
              p: 3, 
              mt: 3, 
              backgroundColor: '#ffffff',
              border: '1px solid #e0e0e0',
              boxShadow: '0 2px 4px rgba(0,0,0,0.05)'
            }}>
              <Typography variant="h6" sx={{ mb: 2, color: '#000000', fontWeight: 600 }}>
                Historical Trends (Last 5 Years)
              </Typography>
              <Grid container spacing={2}>
                {Object.entries(data.historical_trends).slice(0, 6).map(([metric, trend]) => (
                  <Grid item xs={12} md={6} key={metric}>
                    <Paper sx={{ 
                      p: 2, 
                      backgroundColor: '#fafafa',
                      border: '1px solid #f0f0f0'
                    }}>
                      <Typography variant="body1" sx={{ mb: 1, color: '#000000', fontWeight: 600 }}>
                        {metric.replace('_', ' ').toUpperCase()}
                      </Typography>
                      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                        {trend.data.map((point) => (
                          <Typography key={point.year} variant="caption" sx={{ color: '#666666' }}>
                            {point.year}: {point.value.toFixed(1)}{metric.includes('cost') ? '$' : metric.includes('attainment') || metric.includes('success') || metric.includes('demand') ? '%' : ''}
                          </Typography>
                        ))}
                      </Box>
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

export default KPIBullets;
