import type FeatureLayer from "@arcgis/core/layers/FeatureLayer";
import type Extent from "@arcgis/core/geometry/Extent";

// ----------------------------------------------------
// Builds a single where-clause combining location (package/type/station)
// and status into one SQL expression. Returns "1=1" if nothing meaningful
// is selected (i.e. show everything, no filter).
// ----------------------------------------------------
export function buildWhereClause(
  packageName: string | null,
  type: string | null,
  station: string | null,
  status: number | null,
  statusField: string,
): string {
  const clauses: string[] = [];

  if (packageName) clauses.push(`Package = '${packageName}'`);
  if (type) clauses.push(`Type = '${type}'`);
  if (station) clauses.push(`Station1 = '${station}'`);
  if (status !== null) clauses.push(`${statusField} = ${status}`);

  return clauses.length > 0 ? clauses.join(" AND ") : "1=1";
}

// ----------------------------------------------------
// Filters lotLayer based on the current selection, and returns the extent
// to zoom to (or null if nothing is selected / nothing to zoom to).
//
// No longer touches the MapView at all — purely data/query concerns.
// The caller (MapDisplay.tsx) decides what to do with the returned extent.
// ----------------------------------------------------
export async function filterAndGetTargetExtent(
  layer: FeatureLayer,
  packageName: string | null,
  type: string | null,
  station: string | null,
  status: number | null,
  statusField: string,
): Promise<Extent | null> {
  const whereExpression = buildWhereClause(packageName, type, station, status, statusField);

  layer.definitionExpression = whereExpression;

  // Nothing meaningful selected — show everything, but don't zoom anywhere.
  // if (whereExpression === "1=1") return null;

  const result = await layer.queryExtent({ where: whereExpression });

  return result.extent ?? null;
}