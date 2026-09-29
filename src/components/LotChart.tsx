import { useEffect, useRef, useState } from "react";
import { useQuery, keepPreviousData } from "@tanstack/react-query";
import { useMyContext, type SelectedLocation } from "../contexts/MyContext";
import { useActiveDateFields } from "../contexts/TimeSliderContext";
import { fieldStatistic, pieChartStatusData } from "../Query";
import * as am5 from "@amcharts/amcharts5";
import * as am5percent from "@amcharts/amcharts5/percent";
import am5themes_Animated from "@amcharts/amcharts5/themes/Animated";
import am5themes_Responsive from "@amcharts/amcharts5/themes/Responsive";
import {
  lotLayer,
  lotStatuses,
  lotstatisticField,
  handedOverLotsLayer,
  toBeHandedOverLotsLayer,
  subterraneanLotsLayer,
} from "../layers";
import QueryExpressionLayers from "../CreateQueryJosh";
import { filterAndGetTargetExtent } from "../MapQuery";
import { mapView } from "../components/MapDisplay";

const CHART_ID = "lotPieChart";

type ChartDatum = { category: string; value: number; color: string; code: number | string };

// ----------------------------------------------------
// LOCAL HOOK: data fetching
// statusField/handedOverField/notYetField come from TimeSliderContext —
// a date's NVS/JV/NY fields while the slider is on, or the defaults
// while it's off. keepPreviousData means `data` stays populated across
// filter changes instead of resetting to undefined mid-fetch.
// ----------------------------------------------------
function useLotData(
  { packageName, type, station }: SelectedLocation,
  statusField: string,
  handedOverField: string,
  notYetField: string,
) {
  return useQuery({
    queryKey: [
      "totalLots",
      packageName,
      type,
      station,
      statusField,
      handedOverField,
      notYetField,
    ],
    queryFn: async () => {
      const baseFilter = {
        qFields: ["Package", "Type", "Station1"] as [any?, any?, any?],
        qValues: [packageName, type, station] as [any?, any?, any?],
      };

      const totalWhere = new QueryExpressionLayers({ ...baseFilter }).queryExpression();
      const publicWhere = new QueryExpressionLayers({
        ...baseFilter,
        qExpression: `${statusField} IS NULL`,
      }).queryExpression();
      const handedOverWhere = new QueryExpressionLayers({
        ...baseFilter,
        qExpression: `${handedOverField} = 1`,
      }).queryExpression();
      const toBeHandedOverWhere = new QueryExpressionLayers({
        ...baseFilter,
        qExpression: `${notYetField} = 1`,
      }).queryExpression();
      const statusWhere = new QueryExpressionLayers({
        ...baseFilter,
        qExpression: `${statusField} IS NOT NULL`,
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
            statusField: statusField,
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
    placeholderData: keepPreviousData,
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
// Builds the amCharts pie chart once on mount, disposes on unmount,
// and pumps new chartData in without rebuilding.
// ----------------------------------------------------
function usePieChart(
  chartData: ChartDatum[],
  selectedCode: number | string | null,
  onSliceClick: (code: number | string | null) => void,
  textColor: string,
) {
  const pieSeriesRef = useRef<any>({});
  const legendRef = useRef<any>({});

  // Lets the click handler below read the latest selectedCode without
  // needing to be in its own dependency array
  const selectedCodeRef = useRef<number | string | null>(selectedCode);
  useEffect(() => {
    selectedCodeRef.current = selectedCode;
  }, [selectedCode]);

  // Lets the chart-creation effect below read the current textColor at
  // mount time without adding it to that effect's dependency array
  // (chart creation should only run once)
  const textColorRef = useRef(textColor);
  useEffect(() => {
    textColorRef.current = textColor;
  }, [textColor]);

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
        scale: 2,
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
      const prev = selectedCodeRef.current;
      onSliceClick(prev === code ? null : code);
    });

    pieSeries.labels.template.setAll({ visible: false, scale: 0 });
    pieSeries.ticks.template.setAll({ visible: false, scale: 0 });

    const legend = chart.children.push(
      am5.Legend.new(root, { centerX: am5.percent(50), x: am5.percent(50), scale: 0.9, height: 170 }),
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
      fill: am5.color(textColorRef.current),
      width: 250,
      maxWidth: 270,
    });
    legend.valueLabels.template.setAll({ textAlign: "right", fill: am5.color(textColorRef.current) });
    legend.itemContainers.template.setAll({ paddingTop: 3, paddingBottom: 1 });

    return () => {
      root.dispose();
    };
  }, []);

  // Pushes new data into the existing chart/legend on every chartData
  // change, instead of rebuilding the whole chart
  useEffect(() => {
    pieSeriesRef.current?.data?.setAll(chartData);
    legendRef.current?.data?.setAll(pieSeriesRef.current?.dataItems);
    //pieSeriesRef.current?.appear(0, 1);
  }, [chartData]);

  // Recolors the legend's labels whenever the background toggle
  // changes — amCharts renders its own canvas text, so it doesn't pick
  // up the surrounding CSS color and has to be updated through its API.
  // Updating the template alone isn't enough to repaint labels that
  // were already rendered, so each existing label instance is also
  // updated directly.
  useEffect(() => {
    const legend = legendRef.current;
    if (!legend?.labels) return;

    const color = am5.color(textColor);

    legend.labels.template.setAll({ fill: color });
    legend.valueLabels.template.setAll({ fill: color });

    legend.dataItems?.forEach((dataItem: any) => {
      dataItem.get("label")?.set("fill", color);
      dataItem.get("valueLabel")?.set("fill", color);
    });
  }, [textColor]);
}

// ----------------------------------------------------
// COMPONENT
// ----------------------------------------------------
export default function LotChart() {
  const { selectedLocation, selectedStatus, updateStatus } = useMyContext();
  const { activeStatusField, activeHandedOverField, activeNotYetField } =
    useActiveDateFields();

  // Background toggle: default (transparent — original look) or white.
  // Text flips to a dark shade only when white is active, so it stays
  // readable; it stays white in the default state.
  const [background, setBackground] = useState<"default" | "white">("default");
  const isDefault = background === "default";
  const bgColor = isDefault ? "transparent" : "#ffffff";
  const textColor = isDefault ? "#ffffff" : "#1a1a1a";
  const toggleBackground = () => setBackground((prev) => (prev === "default" ? "white" : "default"));

  // Only treat the selection as "ours" if it's tagged source: "lot"
  const lotSelectedCode =
    selectedStatus?.source === "lot" ? (selectedStatus.code as number) : null;

  const handleSliceClick = (code: number | string | null) => {
    updateStatus(code === null ? null : { source: "lot", code });
  };

  const { data, isError } = useLotData(
    selectedLocation,
    activeStatusField,
    activeHandedOverField,
    activeNotYetField,
  );
  const chartData = data?.chartData ?? [];

  // With keepPreviousData, data only stays undefined until the very
  // first fetch resolves — after that it's always populated, so this
  // flips false -> true once and never again.
  const hasData = !!data;

  usePieChart(chartData, lotSelectedCode, handleSliceClick, textColor);

  // Filters lotLayer and zooms the map to match — only zooms if no
  // status is selected yet, or the selection belongs to this chart.
  //
  // Also keeps the three derived lot layers (handedOver, toBeHandedOver,
  // subterranean) filtered to the current package/type/station, while
  // preserving each layer's own base condition (HandedOVer = 1,
  // not_yet = 1, Tunnel_Depth > 18). These never drive the map zoom —
  // only lotLayer does that, via filterAndGetTargetExtent below.
  useEffect(() => {
    const { packageName, type, station } = selectedLocation;
    const shouldZoom = selectedStatus === null || selectedStatus.source === "lot";

    const locationFilter = {
      qFields: ["Package", "Type", "Station1"] as [any?, any?, any?],
      qValues: [packageName, type, station] as [any?, any?, any?],
    };

    handedOverLotsLayer.definitionExpression = new QueryExpressionLayers({
      ...locationFilter,
      qExpression: `${activeHandedOverField} = 1`,
    }).queryExpression();

    toBeHandedOverLotsLayer.definitionExpression = new QueryExpressionLayers({
      ...locationFilter,
      qExpression: `${activeNotYetField} = 1`,
    }).queryExpression();

    subterraneanLotsLayer.definitionExpression = new QueryExpressionLayers({
      ...locationFilter,
      qExpression: "Tunnel_Depth > 18",
    }).queryExpression();

    filterAndGetTargetExtent(
      lotLayer,
      packageName,
      type,
      station,
      lotSelectedCode,
      activeStatusField,
    ).then((extent) => {
      if (extent && mapView.current && shouldZoom) {
        mapView.current.goTo(extent);
      }
    });
  }, [
    selectedLocation,
    selectedStatus,
    lotSelectedCode,
    activeStatusField,
    activeHandedOverField,
    activeNotYetField,
  ]);

  const totalNumber = data?.totalNumber ?? 0;
  const publicNumber = data?.publicNumber ?? 0;
  const privateNumber = data?.privateNumber ?? 0;
  const handedOverNumber = data?.handedOverNumber ?? 0;
  const toBeHandedOverNumber = data?.toBeHandedOverNumber ?? 0;

  // Percentage of total lots, guarded against divide-by-zero when
  // totalNumber is 0 (e.g. no lots match the current filter yet).
  const handedOverPercentage =
    totalNumber > 0 ? Number(((handedOverNumber / totalNumber) * 100).toFixed(1)) : 0;
  const toBeHandedOverPercentage =
    totalNumber > 0 ? Number(((toBeHandedOverNumber / totalNumber) * 100).toFixed(1)) : 0;

  if (isError) {
    return (
      <div style={{ color: "#ff6b6b", padding: "16px" }}>
        Failed to load lot data. Please check your connection.
      </div>
    );
  }

  return (
    <div
      style={{
        minHeight: "98%",
        display: "flex",
        flexDirection: "column",
        paddingTop: "12px",
        backgroundColor: bgColor,
        transition: "background-color 0.2s",
      }}
    >
      <div style={{ flexShrink: 0, display: "flex", gap: "24px", justifyContent: "center", width: "100%", color: textColor }}>
        <div style={{ minWidth: "110px" }}>
          <div style={{ fontSize: "12px", opacity: 0.7, textAlign: "center" }}>TOTAL LOTS</div>
          <div style={{ height: "12px", fontSize: "28px", fontWeight: 600, textAlign: "center", fontVariantNumeric: "tabular-nums" }}>
            {hasData ? totalNumber.toLocaleString() : ""}
          </div>
        </div>
        <div style={{ minWidth: "110px" }}>
          <div style={{ fontSize: "12px", opacity: 0.7, textAlign: "center" }}>PUBLIC LOTS</div>
          <div style={{ height: "12px", fontSize: "28px", fontWeight: 600, textAlign: "center", fontVariantNumeric: "tabular-nums" }}>
            {hasData ? publicNumber.toLocaleString() : ""}
          </div>
        </div>
        <div style={{ minWidth: "110px" }}>
          <div style={{ fontSize: "12px", opacity: 0.7, textAlign: "center" }}>PRIVATE LOTS</div>
          <div style={{ height: "12px", fontSize: "28px", fontWeight: 600, textAlign: "center", fontVariantNumeric: "tabular-nums" }}>
            {hasData ? privateNumber.toLocaleString() : ""}
          </div>
        </div>
      </div>

      <div
        id={CHART_ID}
        style={{
          position: "relative", 
          flex: "1 1 auto",
          minHeight: "200px",
          overflow: "hidden",
          backgroundColor: "rgba(0,0,0,0)",
          color: textColor,
          marginBottom: "15px",
        }}
      ></div>

      <div style={{ position: "relative", flexShrink: 0, display: "flex", gap: "24px", justifyContent: "center", width: "100%", color: textColor, paddingTop: "5px" }}>
        <div style={{ minWidth: "170px" }}>
          <div style={{ fontSize: "12px", opacity: 0.7, textAlign: "center" }}>HANDED OVER LOTS</div>
          <div style={{ height: "34px", fontSize: "28px", fontWeight: 600, textAlign: "center", fontVariantNumeric: "tabular-nums" }}>
            {hasData ? `${handedOverPercentage}% (${handedOverNumber.toLocaleString()})` : ""}
          </div>
        </div>
        <div style={{ minWidth: "170px" }}>
          <div style={{ fontSize: "12px", opacity: 0.7, textAlign: "center" }}>TO BE HANDED OVER LOTS</div>
          <div style={{ height: "34px", fontSize: "28px", fontWeight: 600, textAlign: "center", fontVariantNumeric: "tabular-nums" }}>
            {hasData ? `${toBeHandedOverPercentage}% (${toBeHandedOverNumber.toLocaleString()})` : ""}
          </div>
        </div>
      </div>

      {/* Background toggle switch — its own container, fixed to the
          viewport's lower right, default (transparent) <-> white */}
      <div
        style={{
          position: "relative",
        }}
      >
        <label
          style={{
            display: "flex",
            alignItems: "center",
            gap: "8px",
            padding: "8px 12px",
            borderRadius: "8px",
            backgroundColor: "transparent",
            cursor: "pointer",
            userSelect: "none",
          }}
        >
          <span style={{ fontSize: "12px", color: textColor }}>
            {isDefault ? "Default" : "White"}
          </span>
          <span
            role="switch"
            aria-checked={!isDefault}
            onClick={toggleBackground}
            style={{
              position: "relative",
              width: "40px",
              height: "22px",
              borderRadius: "11px",
              backgroundColor: isDefault ? "#666666" : "#2e7d32",
              transition: "background-color 0.2s",
              display: "inline-block",
              flexShrink: 0,
            }}
          >
            <span
              style={{
                position: "absolute",
                top: "2px",
                left: isDefault ? "2px" : "20px",
                width: "18px",
                height: "18px",
                borderRadius: "50%",
                backgroundColor: "#ffffff",
                boxShadow: "0 1px 3px rgba(0,0,0,0.4)",
                transition: "left 0.2s",
              }}
            />
          </span>
        </label>
      </div>
    </div>
  );
}