// import { lotLayer, lotStatuses } from "./layers";
import StatisticDefinition from "@arcgis/core/rest/support/StatisticDefinition";
import Query from "@arcgis/core/rest/support/Query";

// ----------------------------------------------------
// HELPERS
// ----------------------------------------------------

function createQuery(where?: string) {
  const query = new Query();
  query.where = where ?? "1=1";
  query.outFields = []; // only the fields you actually use
  query.returnGeometry = false; // set to true only if this specific list needs geometry (e.g. for map interaction)
  return query;
}

// Combines base filter with an additional clause
function combineWhere(base: string | undefined, extra: string) {
  if (!base || base === "1=1") return extra;
  return `(${base}) AND (${extra})`;
}

type PieChartStatusDataArgs = {
  qChart?: string | undefined;
  layer?: any;
  statusList?: any;
  statusField?: any;
  statisticField?: string;
  statisticType?:
    | "count"
    | "sum"
    | "min"
    | "max"
    | "avg"
    | "stddev"
    | "var"
    | "exceedslimit"
    | "percentile-continuous"
    | "percentile-discrete"
    | "envelope-aggregate"
    | "convex-hull-aggregate";
};

// ----------------------------------------------------
// MAIN: returns [totalLots, publicLots, privateLots, chartData,
// handedOverLots, toBeHandedOverLots] for the lot-status pie chart.
//
// All 5 underlying queries are independent of each other's RESULTS (only
// privateLots is derived client-side, from totalLots - publicLots), so
// they're fired together via Promise.all instead of sequentially. This
// turns 5 back-to-back network round-trips into effectively one — total
// time becomes roughly the slowest single request, not the sum of all 5.
// ----------------------------------------------------
export async function pieChartStatusData({
  qChart, // queryc.queryExpression()
  layer, // lotLayer
  statusList, // lotStatuses
  statusField, // lotStatusField
  statisticField, // lotStatusField
  statisticType, // "count" | "sum" | "min" | "max" | "avg" | "stddev" | "var" | "exceedslimit" | "percentile-continuous" | "percentile-discrete" | "envelope-aggregate" | "centroid-aggregate" | "convex-hull-aggregate",
}: PieChartStatusDataArgs) {
  // ----------------------------------------------------
  // Build all 5 query objects up front — this is cheap, synchronous,
  // no network calls happen until queryFeatures() is actually called below.
  // ----------------------------------------------------

  // Total lots (all features, public + private)
  const totalQuery = createQuery(qChart);
  totalQuery.outStatistics = [
    new StatisticDefinition({
      onStatisticField: statisticField,
      outStatisticFieldName: "total_all",
      statisticType: statisticType,
    }),
  ];

  // Public lots (StatusNVS3 IS NULL)
  const publicQuery = createQuery(combineWhere(qChart, "StatusNVS3 IS NULL"));
  publicQuery.outStatistics = [
    new StatisticDefinition({
      onStatisticField: statisticField,
      outStatisticFieldName: "total_public",
      statisticType: statisticType,
    }),
  ];

  // Handed over lots (HandedOVer = 1)
  const handedOverQuery = createQuery(combineWhere(qChart, "HandedOVer = 1"));
  handedOverQuery.outStatistics = [
    new StatisticDefinition({
      onStatisticField: statisticField,
      outStatisticFieldName: "total_handed_over",
      statisticType: statisticType,
    }),
  ];

  // To be handed over lots (not_yet = 1)
  const toBeHandedOverQuery = createQuery(combineWhere(qChart, "not_yet = 1"));
  toBeHandedOverQuery.outStatistics = [
    new StatisticDefinition({
      onStatisticField: statisticField,
      outStatisticFieldName: "total_to_be_handed_over",
      statisticType: statisticType,
    }),
  ];

  // Lots by StatusNVS3 (private only, for pie chart)
  const statusQuery = createQuery(combineWhere(qChart, "StatusNVS3 IS NOT NULL"));
  statusQuery.outFields = [statusField];
  statusQuery.outStatistics = [
    new StatisticDefinition({
      onStatisticField: statisticField,
      outStatisticFieldName: "total_lot_status",
      statisticType: statisticType,
    }),
  ];
  statusQuery.groupByFieldsForStatistics = [statusField];
  statusQuery.orderByFields = [statusField];

  // ----------------------------------------------------
  // Fire all 5 independent queries in parallel.
  // ----------------------------------------------------
  const [
    totalResponse,
    publicResponse,
    handedOverResponse,
    toBeHandedOverResponse,
    statusResponse,
  ] = await Promise.all([
    layer.queryFeatures(totalQuery),
    layer.queryFeatures(publicQuery),
    layer.queryFeatures(handedOverQuery),
    layer.queryFeatures(toBeHandedOverQuery),
    layer.queryFeatures(statusQuery),
  ]);

  const totalLots = totalResponse.features[0].attributes.total_all;
  const publicLots = publicResponse.features[0].attributes.total_public;

  // Private lots (StatusNVS3 IS NOT NULL) — derived client-side, no query needed
  const privateLots = totalLots - publicLots;

  const handedOverLots =
    handedOverResponse.features[0].attributes.total_handed_over;
  const toBeHandedOverLots =
    toBeHandedOverResponse.features[0].attributes.total_to_be_handed_over;

  // Each data point carries its own color (from statusList) so LotChart.tsx
  // can bind slice fill directly to the data instead of relying on
  // ColorSet array-order matching, which breaks if data is ever
  // reordered/filtered independently of statusList. `code` is included so
  // the click handler in LotChart.tsx can identify which status was
  // clicked and pass it through to the map filter.
  const chartData = statusList.map(
    ({
      code,
      label,
      color,
    }: {
      code: number;
      label: string;
      color: string;
    }): { category: string; value: number; color: string; code: number } => {
      const feature = statusResponse.features.find( // find the feature in the response that matches this status code
        (f: any) => f.attributes[statusField] === code,
      );

      return {
        category: label,
        value: feature?.attributes.total_lot_status ?? 0, // e.g. [{category: "Paid", value: 1, color: "#00734d", code: 1}, ...]
        color: color,
        code: code,
      };
    },
  );

  return [
    totalLots,
    publicLots,
    privateLots,
    chartData,
    handedOverLots,
    toBeHandedOverLots,
  ];
}