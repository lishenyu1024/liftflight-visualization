import { Box } from "@mui/material";
import Header from "../../components/Header";
import KPIBullets from "../../components/3.1KPIBullets";
import TrendWall from "../../components/3.2TrendWall";
import CostBenefitThroughput from "../../components/3.3CostBenefitThroughput";
import SafetySPC from "../../components/3.4SafetySPC";

export default function KPIDashboard() {
  return (
    <Box m="20px">
      <Header title="KPI & Executive Dashboard" subtitle="KPI & Executive Dashboard" />
      
      {/* Chart 3.1: Core KPI Bullet Charts */}
      <Box mt="20px">
        <KPIBullets />
      </Box>
      
      {/* Chart 3.2: Trend Wall */}
      <Box mt="40px">
        <TrendWall />
      </Box>
      
      {/* Chart 3.3: Cost–Benefit–Throughput Dual-Axis */}
      <Box mt="40px">
        <CostBenefitThroughput />
      </Box>
      
      {/* Chart 3.4: Safety & Quality SPC Control Charts */}
      <Box mt="40px">
        <SafetySPC />
      </Box>
    </Box>
  );
}