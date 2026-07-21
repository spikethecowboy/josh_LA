import StatisticDefinition from "@arcgis/core/rest/support/StatisticDefinition";
import Query from "@arcgis/core/rest/support/Query";

// where-clause is built by the caller (QueryExpressionLayers) — this file just runs the query
function createQuery(where?: string) {
  const query = new Query();
  query.where = where ?? "1=1";
  query.outFields = [];
  query.returnGeometry = false;
  return query;
}

type StatisticType =
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

// Generic single-number stat (total, public, handed-over, etc). Fire multiple via Promise.all.
type FieldStatisticArgs = {
  where?: string;
  layer: any;
  statisticField: string;
  statisticType: StatisticType;
};

export async function fieldStatistic({
  where,
  layer,
  statisticField,
  statisticType,
}: FieldStatisticArgs): Promise<number> {
  const query = createQuery(where);
  const OUT_FIELD = "result";

  query.outStatistics = [
    new StatisticDefinition({
      onStatisticField: statisticField,
      outStatisticFieldName: OUT_FIELD,
      statisticType,
    }),
  ];

  const response = await layer.queryFeatures(query);
  return response.features[0]?.attributes[OUT_FIELD] ?? 0;
}

// Per-status breakdown for the pie chart. `where` must already include the
// "private lots only" condition (StatusNVS3 IS NOT NULL) via the caller.
type PieChartStatusDataArgs = {
  where?: string;
  layer: any;
  statusList: { code: number; label: string; color: string }[];
  statusField: string;
  statisticField: string;
  statisticType: StatisticType;
};

export async function pieChartStatusData({
  where,
  layer,
  statusList,
  statusField,
  statisticField,
  statisticType,
}: PieChartStatusDataArgs) {
  const statusQuery = createQuery(where);
  statusQuery.outFields = [statusField];
  statusQuery.outStatistics = [
    new StatisticDefinition({
      onStatisticField: statisticField,
      outStatisticFieldName: "total_lot_status",
      statisticType,
    }),
  ];
  statusQuery.groupByFieldsForStatistics = [statusField];
  statusQuery.orderByFields = [statusField];

  const statusResponse = await layer.queryFeatures(statusQuery);

  // attach each status's color/code from statusList so LotChart can bind slice fill + click handling directly
  return statusList.map(
    ({
      code,
      label,
      color,
    }): { category: string; value: number; color: string; code: number } => {
      const feature = statusResponse.features.find(
        (f: any) => f.attributes[statusField] === code,
      );

      return {
        category: label,
        value: feature?.attributes.total_lot_status ?? 0,
        color,
        code,
      };
    },
  );
}