import { useEffect, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { useMyContext, type SelectedLocation } from "../contexts/MyContext";
import { fieldStatistic, pieChartStatusData } from "../Query";
import * as am5 from "@amcharts/amcharts5";
import * as am5percent from "@amcharts/amcharts5/percent";
import am5themes_Animated from "@amcharts/amcharts5/themes/Animated";
import am5themes_Responsive from "@amcharts/amcharts5/themes/Responsive";
import {
  existingStructureLayer,
  structureStatuses,
  structurestatisticField,
  structureStatusField,
} from "../layers";
import QueryExpressionLayers from "../CreateQueryJosh";
import { filterAndGetTargetExtent } from "../MapQuery";
import { mapView } from "../components/MapDisplay";

const CHART_ID = "structurePieChart";

type ChartDatum = { category: string; value: number; color: string; code: number | string };

// ----------------------------------------------------
// LOCAL HOOK: data fetching
// Same shape as LotChart's/ISFChart's — filters by the shared
// selectedLocation (Package/Type/Station).
// ----------------------------------------------------
function useStructureData({ packageName, type, station }: SelectedLocation) {
  return useQuery({
    queryKey: ["totalStructures", packageName, type, station],
    queryFn: async () => {
      const baseFilter = {
        qFields: ["Package", "Type", "Station1"] as [any?, any?, any?],
        qValues: [packageName, type, station] as [any?, any?, any?],
      };

      const where = new QueryExpressionLayers({ ...baseFilter, qExpression: `${structureStatusField} < 7`, q2Expression: `${structureStatusField} > 0` }).queryExpression();

      const [totalNumber, chartData] = await Promise.all([
        fieldStatistic({
          where,
          layer: existingStructureLayer,
          statisticField: structurestatisticField,
          statisticType: "count",
        }),
        pieChartStatusData({
          where,
          layer: existingStructureLayer,
          statusList: structureStatuses,
          statusField: structureStatusField,
          statisticField: structurestatisticField,
          statisticType: "count",
        }),
      ]);

      return { totalNumber, chartData: chartData as ChartDatum[] };
    },
  });
}

// Disposes any previous chart root under this id, so re-mounting
// doesn't leave a duplicate amCharts instance behind
function maybeDisposeRoot(divId: string) {
  am5.array.each(am5.registry.rootElements, function (root) {
    if (root.dom.id === divId) {
      root.dispose();
    }
  });
}

// ----------------------------------------------------
// LOCAL HOOK: chart lifecycle
// Same amCharts setup as LotChart's/ISFChart's usePieChart, plus a
// hatch pattern per status so slices stay distinguishable in grayscale
// prints. Deals in plain `number | null` codes — the "structure"
// tagging happens one level up, in the component.
// ----------------------------------------------------
function usePieChart(
  chartData: ChartDatum[],
  selectedCode: number | null,
  onSliceClick: (code: number | null) => void,
) {
  const pieSeriesRef = useRef<any>({});
  const legendRef = useRef<any>({});
  const patternByCodeRef = useRef<Map<number | string, any>>(new Map());

  // Lets the click handler read the latest selectedCode without needing
  // to be in its own dependency array
  const selectedCodeRef = useRef<number | null>(selectedCode);
  useEffect(() => {
    selectedCodeRef.current = selectedCode;
  }, [selectedCode]);

  useEffect(() => {
    maybeDisposeRoot(CHART_ID);

    const root = am5.Root.new(CHART_ID);
    root.container.children.clear();
    root._logo?.dispose();

    root.setThemes([am5themes_Animated.new(root), am5themes_Responsive.new(root)]);

    const chart = root.container.children.push(
      am5percent.PieChart.new(root, { layout: root.verticalLayout }),
    );

    // amCharts paints its own background by default — make it
    // transparent so the app's dark background shows through, including
    // inside the hatch pattern's gaps
    chart.set(
      "background",
      am5.Rectangle.new(root, { fillOpacity: 0, strokeOpacity: 0 }),
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

    // One LinePattern per status color, built once (colors are static)
    // and attached via templateField below — more reliable than an
    // adapter, which amCharts doesn't consistently honor for patterns.
    // Tile size is 10x10 (amCharts' default 50x50 tiles rotated lines
    // poorly, causing visible seams) — tune if stripes look off.
    const patternByCode = new Map<number | string, any>();
    structureStatuses.forEach(({ code, color }) => {
      patternByCode.set(
        code,
        am5.LinePattern.new(root, {
          color: am5.color(color),
          colorOpacity: 1,
          rotation: -45,
          strokeWidth: 1,
          gap: 6,
          fillOpacity: 0,
          width: 10,
          height: 10,
        }),
      );
    });
    patternByCodeRef.current = patternByCode;

    // White outline on every slice; fillOpacity: 0 keeps the hatch gaps
    // transparent instead of solid color showing through
    pieSeries.data.setAll(
      chartData.map((d) => ({
        ...d,
        sliceSettings: patternByCode.has(d.code)
          ? { fillPattern: patternByCode.get(d.code), fillOpacity: 0, stroke: am5.color("#ffffff") }
          : { stroke: am5.color("#ffffff") },
      })),
    );

    pieSeries.slices.template.setAll({
      toggleKey: "none",
      fillOpacity: 1,
      strokeOpacity: 1,
      strokeWidth: 1,
      tooltipText: '{category}: {valuePercentTotal.formatNumber("#.")}%',
      templateField: "sliceSettings",
    });

    pieSeries.slices.template.events.on("click", (ev) => {
      const code = (ev.target.dataItem?.dataContext as any)?.code ?? null;
      const prev = selectedCodeRef.current;
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
      fillOpacity: 1,
      strokeOpacity: 1,
      strokeWidth: 2,
      templateField: "sliceSettings",
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

  // Re-applies hatch patterns and pushes new data in on every chartData
  // change, instead of rebuilding the whole chart
  useEffect(() => {
    const mapped = chartData.map((d) => ({
      ...d,
      sliceSettings: patternByCodeRef.current.has(d.code)
        ? {
            fillPattern: patternByCodeRef.current.get(d.code),
            fillOpacity: 0,
            stroke: am5.color("#ffffff"),
          }
        : { stroke: am5.color("#ffffff") },
    }));
    pieSeriesRef.current?.data?.setAll(mapped);
    legendRef.current?.data?.setAll(pieSeriesRef.current?.dataItems);
    pieSeriesRef.current?.appear(0, 200);
  }, [chartData]);
}

// ----------------------------------------------------
// COMPONENT
// Wires the two hooks together, drives structureLayer's filter + map
// zoom, and renders.
// ----------------------------------------------------
export default function StructureChart() {
  const { selectedLocation, selectedStatus, updateStatus } = useMyContext();

  // Only treat the selection as "ours" if it's tagged source: "structure"
  const structureSelectedCode =
    selectedStatus?.source === "structure" ? (selectedStatus.code as number) : null;

  const handleSliceClick = (code: number | null) => {
    updateStatus(code === null ? null : { source: "structure", code });
  };

  const { data, isLoading, isError } = useStructureData(selectedLocation);
  const chartData = data?.chartData ?? [];

  usePieChart(chartData, structureSelectedCode, handleSliceClick);

  // Filters structureLayer and zooms the map — only zooms when the
  // active selection belongs to this chart
  useEffect(() => {
    const { packageName, type, station } = selectedLocation;
    const shouldZoom = selectedStatus?.source === "structure";

    filterAndGetTargetExtent(
      existingStructureLayer,
      packageName,
      type,
      station,
      structureSelectedCode,
      structureStatusField,
    ).then((extent) => {
      if (extent && mapView.current && shouldZoom) {
        mapView.current.goTo(extent);
      }
    });
  }, [selectedLocation, selectedStatus, structureSelectedCode]);

  const totalNumber = data?.totalNumber ?? 0;

  if (isError) {
    return (
      <div style={{ color: "#ff6b6b", padding: "16px" }}>
        Failed to load structure data. Please check your connection.
      </div>
    );
  }

  return (
    <>
      <div style={{ display: "flex", gap: "24px", justifyContent: "center", width: "100%", color: "white" }}>
        <div>
          <div style={{ fontSize: "12px", opacity: 0.7, textAlign: "center" }}>TOTAL STRUCTURES</div>
          <div style={{ fontSize: "28px", fontWeight: 600, textAlign: "center" }}>
            {isLoading ? "" : totalNumber.toLocaleString()}
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
    </>
  );
}