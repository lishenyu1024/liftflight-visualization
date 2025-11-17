import { Box } from "@mui/material";
import Header from "../../components/Header";
import KPIBullets from "../../components/4.1KPIBullets";
import TrendWall from "../../components/4.2TrendWall";
import CostBenefitThroughput from "../../components/4.3CostBenefitThroughput";
import SafetySPC from "../../components/4.4SafetySPC";

export default function KPIDashboard() {
  return (
    <Box m="20px">
      <Header title="KPI & Executive Dashboard" subtitle="KPI & Executive Dashboard" />
      
      {/* Chart 4.1: Core KPI Bullet Charts */}
      <Box mt="20px">
        <KPIBullets />
      </Box>
      
      {/* Chart 4.2: Trend Wall */}
      <Box mt="40px">
        <TrendWall />
      </Box>
      
      {/* Chart 4.3: Cost–Benefit–Throughput Dual-Axis */}
      <Box mt="40px">
        <CostBenefitThroughput />
      </Box>
      
      {/* Chart 4.4: Safety & Quality SPC Control Charts */}
      <Box mt="40px">
        <SafetySPC />
      </Box>
    </Box>
  );
}