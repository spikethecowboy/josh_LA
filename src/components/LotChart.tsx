import { useContext, useEffect, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { MyContext } from "../contexts/MyContext";
import { pieChartStatusData } from "../Query";
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

// Static — doesn't depend on props/state, so defined once at module scope
// instead of being recreated on every render.
const CHART_ID = "lotPieChart";

// Disposes any existing amCharts root attached to divId, so re-renders
// (e.g. hot reload, or this component mounting twice) don't leak roots.
function maybeDisposeRoot(divId: string) {
  am5.array.each(am5.registry.rootElements, function (root) {
    if (root.dom.id === divId) {
      root.dispose();
    }
  });
}

export default function LotChart() {
  const { selectedLocation, selectedStatus, updateStatus } = useContext(MyContext);
  const { packageName, type, station } = selectedLocation;

  // Refs to hold chart objects so the second useEffect
  // can update data without rebuilding the whole chart
  const pieSeriesRef = useRef<any>({});
  const legendRef = useRef<any>({});

  // Mirrors selectedStatus into a ref so the click handler (created once,
  // inside the chart-build effect below) always reads the latest value
  // instead of the one captured when the chart was first built.
  const selectedStatusRef = useRef<number | null>(selectedStatus);
  useEffect(() => {
    selectedStatusRef.current = selectedStatus;
  }, [selectedStatus]);

  // ----------------------------------------------------
  // FETCH DATA
  // Builds the where-clause from the current selection (package/type/
  // station) ONLY — totals/public/private/chart breakdown are not
  // affected by the clicked status.
  // ----------------------------------------------------

  const queryc = new QueryExpressionLayers({
    qFields: ["Package", "Type", "Station1"],
  });

  queryc.qValues = [packageName, type, station];
  const locationExpression = queryc.queryExpression(); // e.g. "Package = 'CP101'"

  const { data, isLoading, isError } = useQuery({
    queryKey: ["totalLots", packageName, type, station],
    queryFn: () => {
      return pieChartStatusData({
        qChart: locationExpression,
        layer: lotLayer,
        statusList: lotStatuses,
        statusField: lotStatusField,
        statisticField: lotstatisticField,
        statisticType: "count",
      });
    },
  });

  const totalNumber = data?.[0] ?? 0;
  const publicNumber = data?.[1] ?? 0;
  const privateNumber = data?.[2] ?? 0;
  const chartData = data?.[3] ?? [];
  const handedOverNumber = data?.[4] ?? 0;
  const toBeHandedOverNumber = data?.[5] ?? 0;

  // ----------------------------------------------------
  // BUILD CHART STRUCTURE
  // Runs once on mount — builds the chart skeleton (series, legend,
  // styling), stores series/legend in refs for the second effect to
  // update without a full rebuild. Disposes the root on unmount so
  // amCharts releases its DOM/canvas resources instead of leaking them.
  // ----------------------------------------------------

  useEffect(() => {
    maybeDisposeRoot(CHART_ID);

    const root = am5.Root.new(CHART_ID);
    root.container.children.clear();
    root._logo?.dispose();

    root.setThemes([
      am5themes_Animated.new(root),
      am5themes_Responsive.new(root),
    ]);

    const chart = root.container.children.push(
      am5percent.PieChart.new(root, {
        layout: root.verticalLayout,
      }),
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

    // Color each slice from its own data point (chartData[i].color) instead
    // of relying on ColorSet array-order matching statusList order.
    pieSeries.slices.template.adapters.add("fill", (fill, target) => {
      const color = (target.dataItem?.dataContext as any)?.color;
      return color ? am5.color(color) : fill;
    });

    pieSeries.slices.template.adapters.add("stroke", () => am5.color("#ffffff"));

    // Sets selectedStatus in shared context; MapDisplay reacts to that and
    // handles the actual map filtering + zooming. Clicking the same slice
    // again clears the selection.
    pieSeries.slices.template.events.on("click", (ev) => {
      const code = (ev.target.dataItem?.dataContext as any)?.code ?? null;
      const prev = selectedStatusRef.current;
      updateStatus(prev === code ? null : code);
    });

    pieSeries.labels.template.setAll({
      visible: false,
      scale: 0,
    });

    pieSeries.ticks.template.setAll({
      visible: false,
      scale: 0,
    });
    
    const legend = chart.children.push(
      am5.Legend.new(root, {
        centerX: am5.percent(50),
        x: am5.percent(50),
        scale: 0.9,
      }),
    );
    legendRef.current = legend;

    legend.data.setAll(pieSeries.dataItems);

    legend.markers.template.setAll({
      width: 18,
      height: 18,
    });

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

    legend.valueLabels.template.setAll({
      textAlign: "right",
      fill: am5.color("#ffffff"),
    });

    legend.itemContainers.template.setAll({
      paddingTop: 3,
      paddingBottom: 1,
    });

    // Dispose the root when this component unmounts, so amCharts releases
    // its DOM/canvas resources instead of leaking them.
    return () => {
      root.dispose();
    };
  }, []);

  // ----------------------------------------------------
  // UPDATE DATA ONLY
  // Runs whenever chartData changes — just pumps new data into
  // the existing chart without rebuilding the skeleton
  // ----------------------------------------------------

  useEffect(() => {
    pieSeriesRef.current?.data?.setAll(chartData);
    legendRef.current?.data?.setAll(pieSeriesRef.current?.dataItems);

    pieSeriesRef.current?.appear(0, 200);    
  }, [chartData]);

  // ----------------------------------------------------
  // UI
  // Summary counts (total/public/private) + the pie chart div that
  // amCharts mounts into via CHART_ID.
  // ----------------------------------------------------

  if (isError) {
    return (
      <div style={{ color: "#ff6b6b", padding: "16px" }}>
        Failed to load lot data. Please check your connection.
      </div>
    );
  }

  return (
    <>
      {/* Summary counts */}
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

      {/* Pie chart */}
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

      {/* Handover summary counts */}
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