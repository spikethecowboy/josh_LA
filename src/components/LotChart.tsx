import { useContext, useEffect, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { MyContext, type SelectedLocation } from "../contexts/MyContext";
import { fieldStatistic, pieChartStatusData } from "../Query";
import * as am5 from "@amcharts/amcharts5";
import * as am5percent from "@amcharts/amcharts5/percent";
import am5themes_Animated from "@amcharts/amcharts5/themes/Animated";
import am5themes_Responsive from "@amcharts/amcharts5/themes/Responsive";
import {
  lotLayer,
  lotStatuses,
  lotstatisticField,
  lotStatusField,
} from "../layers";
import QueryExpressionLayers from "../CreateQueryJosh";

const CHART_ID = "lotPieChart";

type ChartDatum = { category: string; value: number; color: string; code: number };

// ----------------------------------------------------
// LOCAL HOOK: data fetching
// Builds all 5 where-clauses via QueryExpressionLayers and runs the
// queries in parallel. Kept local to this file since it's only used here —
// promote to its own useLotData.ts if a second chart ever needs this shape.
// ----------------------------------------------------
function useLotData({ packageName, type, station }: SelectedLocation) {
  return useQuery({
    queryKey: ["totalLots", packageName, type, station],
    queryFn: async () => {
      const baseFilter = {
        qFields: ["Package", "Type", "Station1"] as [any?, any?, any?],
        qValues: [packageName, type, station] as [any?, any?, any?],
      };

      const totalWhere = new QueryExpressionLayers({ ...baseFilter }).queryExpression();
      const publicWhere = new QueryExpressionLayers({
        ...baseFilter,
        qExpression: "StatusNVS3 IS NULL",
      }).queryExpression();
      const handedOverWhere = new QueryExpressionLayers({
        ...baseFilter,
        qExpression: "HandedOVer = 1",
      }).queryExpression();
      const toBeHandedOverWhere = new QueryExpressionLayers({
        ...baseFilter,
        qExpression: "not_yet = 1",
      }).queryExpression();
      const statusWhere = new QueryExpressionLayers({
        ...baseFilter,
        qExpression: "StatusNVS3 IS NOT NULL",
      }).queryExpression();

      const commonArgs = {
        layer: lotLayer,
        statisticField: lotstatisticField,
        statisticType: "count" as const,
      };

      const [totalNumber, publicNumber, handedOverNumber, toBeHandedOverNumber, chartData] =
        await Promise.all([
          fieldStatistic({ where: totalWhere, ...commonArgs }),
          fieldStatistic({ where: publicWhere, ...commonArgs }),
          fieldStatistic({ where: handedOverWhere, ...commonArgs }),
          fieldStatistic({ where: toBeHandedOverWhere, ...commonArgs }),
          pieChartStatusData({
            where: statusWhere,
            layer: lotLayer,
            statusList: lotStatuses,
            statusField: lotStatusField,
            statisticField: lotstatisticField,
            statisticType: "count",
          }),
        ]);

      const privateNumber = totalNumber - publicNumber;

      return {
        totalNumber,
        publicNumber,
        privateNumber,
        handedOverNumber,
        toBeHandedOverNumber,
        chartData,
      };
    },
  });
}

function maybeDisposeRoot(divId: string) {
  am5.array.each(am5.registry.rootElements, function (root) {
    if (root.dom.id === divId) {
      root.dispose();
    }
  });
}

// ----------------------------------------------------
// LOCAL HOOK: chart lifecycle
// Builds the amCharts pie chart once on mount, disposes on unmount, and
// pumps new chartData in without rebuilding. Kept local for the same
// reason as useLotData above.
// ----------------------------------------------------
function usePieChart(
  chartData: ChartDatum[],
  selectedStatus: number | null,
  onSliceClick: (code: number | null) => void,
) {
  const pieSeriesRef = useRef<any>({});
  const legendRef = useRef<any>({});

  const selectedStatusRef = useRef<number | null>(selectedStatus);
  useEffect(() => {
    selectedStatusRef.current = selectedStatus;
  }, [selectedStatus]);

  useEffect(() => {
    maybeDisposeRoot(CHART_ID);

    const root = am5.Root.new(CHART_ID);
    root.container.children.clear();
    root._logo?.dispose();

    root.setThemes([am5themes_Animated.new(root), am5themes_Responsive.new(root)]);

    const chart = root.container.children.push(
      am5percent.PieChart.new(root, { layout: root.verticalLayout }),
    );

    const pieSeries = chart.series.push(
      am5percent.PieSeries.new(root, {
        name: "Series",
        categoryField: "category",
        valueField: "value",
        legendValueText: "{valuePercentTotal.formatNumber('#.')}% ({value})",
        radius: am5.percent(45),
        innerRadius: am5.percent(28),
        scale: 1.8,
      }),
    );
    pieSeriesRef.current = pieSeries;

    pieSeries.data.setAll(chartData);

    pieSeries.slices.template.setAll({
      toggleKey: "none",
      fillOpacity: 0.9,
      stroke: am5.color("#ffffff"),
      strokeWidth: 0.5,
      strokeOpacity: 1,
      tooltipText: '{category}: {valuePercentTotal.formatNumber("#.")}%',
    });

    pieSeries.slices.template.adapters.add("fill", (fill, target) => {
      const color = (target.dataItem?.dataContext as any)?.color;
      return color ? am5.color(color) : fill;
    });
    pieSeries.slices.template.adapters.add("stroke", () => am5.color("#ffffff"));

    pieSeries.slices.template.events.on("click", (ev) => {
      const code = (ev.target.dataItem?.dataContext as any)?.code ?? null;
      const prev = selectedStatusRef.current;
      onSliceClick(prev === code ? null : code);
    });

    pieSeries.labels.template.setAll({ visible: false, scale: 0 });
    pieSeries.ticks.template.setAll({ visible: false, scale: 0 });

    const legend = chart.children.push(
      am5.Legend.new(root, { centerX: am5.percent(50), x: am5.percent(50), scale: 0.9 }),
    );
    legendRef.current = legend;

    legend.data.setAll(pieSeries.dataItems);
    legend.markers.template.setAll({ width: 18, height: 18 });
    legend.markerRectangles.template.setAll({
      cornerRadiusTL: 10,
      cornerRadiusTR: 10,
      cornerRadiusBL: 10,
      cornerRadiusBR: 10,
    });
    legend.labels.template.setAll({
      oversizedBehavior: "truncate",
      fill: am5.color("#ffffff"),
      width: 250,
      maxWidth: 270,
    });
    legend.valueLabels.template.setAll({ textAlign: "right", fill: am5.color("#ffffff") });
    legend.itemContainers.template.setAll({ paddingTop: 3, paddingBottom: 1 });

    return () => {
      root.dispose();
    };
  }, []);

  useEffect(() => {
    pieSeriesRef.current?.data?.setAll(chartData);
    legendRef.current?.data?.setAll(pieSeriesRef.current?.dataItems);
    pieSeriesRef.current?.appear(0, 200);
  }, [chartData]);
}

// ----------------------------------------------------
// COMPONENT — just wires the two hooks above together and renders
// ----------------------------------------------------
export default function LotChart() {
  const { selectedLocation, selectedStatus, updateStatus } = useContext(MyContext);

  const { data, isLoading, isError } = useLotData(selectedLocation);
  const chartData = data?.chartData ?? [];

  usePieChart(chartData, selectedStatus, updateStatus);

  const totalNumber = data?.totalNumber ?? 0;
  const publicNumber = data?.publicNumber ?? 0;
  const privateNumber = data?.privateNumber ?? 0;
  const handedOverNumber = data?.handedOverNumber ?? 0;
  const toBeHandedOverNumber = data?.toBeHandedOverNumber ?? 0;

  if (isError) {
    return (
      <div style={{ color: "#ff6b6b", padding: "16px" }}>
        Failed to load lot data. Please check your connection.
      </div>
    );
  }

  return (
    <>
      <div style={{ display: "flex", gap: "24px", justifyContent: "center", width: "100%", color: "white" }}>
        <div>
          <div style={{ fontSize: "12px", opacity: 0.7, textAlign: "center" }}>TOTAL LOTS</div>
          <div style={{ fontSize: "28px", fontWeight: 600, textAlign: "center" }}>
            {isLoading ? "" : totalNumber.toLocaleString()}
          </div>
        </div>
        <div>
          <div style={{ fontSize: "12px", opacity: 0.7, textAlign: "center" }}>PUBLIC LOTS</div>
          <div style={{ fontSize: "28px", fontWeight: 600, textAlign: "center" }}>
            {isLoading ? "" : publicNumber.toLocaleString()}
          </div>
        </div>
        <div>
          <div style={{ fontSize: "12px", opacity: 0.7, textAlign: "center" }}>PRIVATE LOTS</div>
          <div style={{ fontSize: "28px", fontWeight: 600, textAlign: "center" }}>
            {isLoading ? "" : privateNumber.toLocaleString()}
          </div>
        </div>
      </div>

      <div
        id={CHART_ID}
        style={{
          height: "60vh",
          backgroundColor: "rgba(0,0,0,0)",
          color: "white",
          marginTop: "8%",
          marginBottom: "7px",
          opacity: isLoading ? 0 : 1,
          transition: "opacity 0.2s",
        }}
      ></div>

      <div style={{ display: "flex", gap: "24px", justifyContent: "center", width: "100%", color: "white" }}>
        <div>
          <div style={{ fontSize: "12px", opacity: 0.7, textAlign: "center" }}>HANDED OVER LOTS</div>
          <div style={{ fontSize: "28px", fontWeight: 600, textAlign: "center" }}>
            {isLoading ? "" : handedOverNumber.toLocaleString()}
          </div>
        </div>
        <div>
          <div style={{ fontSize: "12px", opacity: 0.7, textAlign: "center" }}>TO BE HANDED OVER LOTS</div>
          <div style={{ fontSize: "28px", fontWeight: 600, textAlign: "center" }}>
            {isLoading ? "" : toBeHandedOverNumber.toLocaleString()}
          </div>
        </div>
      </div>
    </>
  );
}