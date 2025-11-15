import { Box } from "@mui/material";
import Header from "../../components/Header";
import WhatIfScenarioPanel from "../../components/2.1WhatIfScenarioPanel";
import WeatherRiskBoxes from "../../components/2.4WeatherRiskBoxes";

export default function ScenarioModeling() {
  return (
    <Box m="20px">
      <Header title="Scenario Modeling" subtitle="Scenario Modeling" />
      
      {/* Chart 2.1: What-If Scenario Panel */}
      <Box mt="20px">
        <WhatIfScenarioPanel />
      </Box>
      
      {/* Chart 2.4: Weather-Driven Risk Boxes */}
      <Box mt="100px">
        <WeatherRiskBoxes />
      </Box>
    </Box>
  );
}