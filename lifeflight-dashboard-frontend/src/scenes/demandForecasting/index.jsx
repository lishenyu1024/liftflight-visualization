import Header from "../../components/Header";
import { Box } from "@mui/material";
import HistogramChart from "../../components/HistogramChart";
import PredTest from "../../components/PredTest";
import LineChart from "../../components/LineChart";
import SeasonalityHeatmap from "../../components/1.2SeasonalityHeatmap";
import DemographicsElasticity from "../../components/1.3DemographicsElasticity";
import EventImpactReplay from "../../components/1.4EventImpactReplay";



export default function DemandForecasting() { 
  return (
    <Box m="20px">
      <Header title="Demand Forecasting" subtitle="Demand Forecasting" />

      <Box height="75vh">
        <HistogramChart />
      </Box>
      
      <Box height="75vh">
        <LineChart />
      </Box>

      <Box sx={{ minHeight: '25vh', mb: 3 }}>
        <PredTest />
      </Box>

      

      {/* Chart 1.2: Seasonality & Day-of-Week/Hour Heatmap */}
      <Box mt="500px">
        <SeasonalityHeatmap />
      </Box>

      {/* Chart 1.3: Demographics vs. Demand Elasticity */}
      <Box mt="100px">
        <DemographicsElasticity />
      </Box>

      {/* Chart 1.4: External Event Impact Replay */}
      <Box mt="100px">
        <EventImpactReplay />
      </Box>
    </Box>
  );
}