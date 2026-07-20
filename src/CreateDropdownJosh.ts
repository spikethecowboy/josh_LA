import FeatureLayer from "@arcgis/core/layers/FeatureLayer";

type Row = Record<string, any>;

/**
 * Builds nested dropdown data (1-3 levels) from one or two ArcGIS FeatureLayers.
 *
 * Output shapes (matches the original implementation exactly):
 *  - 1 field:  [{ field1 }, ...]
 *  - 2 fields: [{ field1, field2: [{ name }, ...] }, ...]
 *  - 3 fields: [{ field1, field2: [{ name, field3: [{ name }, ...] }, ...] }, ...]
 */
class GenerateDropdownData {
  featureLayers: FeatureLayer[];
  fieldNames: string[];

  // Session-level cache: identical (layer, fields) requests are served
  // from memory instead of re-querying the server. Dropdown reference
  // data like Package/Type/Station rarely changes within a session, so
  // there's no need to pay for the network round-trip more than once.
  // Keyed by layer URL + field list so different dropdowns don't collide.
  private static cache = new Map<string, Promise<Row[]>>();

  constructor(
    featureLayers: [FeatureLayer, FeatureLayer?] | FeatureLayer[],
    fieldNames: [string, string?, string?] | string[],
  ) {
    this.featureLayers = (featureLayers as any[]).filter((l) => l !== undefined);
    this.fieldNames = (fieldNames as any[]).filter((f) => f !== undefined);
  }

  // Query one layer, grouped/ordered by the active fields, and normalize
  // each distinct combination into { field1, field2, field3 } (only the
  // keys that are actually in use are populated).
  private async queryDistinctRows(layer: FeatureLayer): Promise<Row[]> {
    const cacheKey = `${layer.url}::${this.fieldNames.join(",")}`;
    const cached = GenerateDropdownData.cache.get(cacheKey);
    if (cached) return cached;

    const promise = this.runQuery(layer);
    GenerateDropdownData.cache.set(cacheKey, promise);

    // Don't let a failed request "poison" the cache forever — remove it
    // so the next attempt actually retries instead of rethrowing.
    promise.catch(() => GenerateDropdownData.cache.delete(cacheKey));

    return promise;
  }

  private async runQuery(layer: FeatureLayer): Promise<Row[]> {
    const query = layer.createQuery();
    query.outFields = this.fieldNames;
    query.orderByFields = this.fieldNames;
    query.groupByFieldsForStatistics = this.fieldNames;
    query.returnGeometry = false; // attributes only — geometry is never used here
    query.cacheHint = true; // lets the server cache this exact grouped query

    const response = await layer.queryFeatures(query);

    return response.features.map((feature: any) => {
      const row: Row = {};
      this.fieldNames.forEach((fieldName, i) => {
        row[`field${i + 1}`] = feature.attributes[fieldName];
      });
      return row;
    });
  }

  // Remove duplicate combinations (needed once rows from multiple layers
  // are combined, since the same combination could appear in both).
  private dedupeRows(rows: Row[]): Row[] {
    const seen = new Set<string>();
    return rows.filter((row) => {
      const key = JSON.stringify(this.fieldNames.map((_, i) => row[`field${i + 1}`]));
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }

  // Recursively group rows into the nested shape, one level per field.
  // depth 0 -> { field1, field2: [...] }
  // depth 1 -> { name,   field3: [...] }
  // depth 2 -> { name }
  private buildTree(rows: Row[], depth = 0): any[] {
    const key = `field${depth + 1}`;
    const uniqueVals = [...new Set(rows.map((r) => r[key]))];

    return uniqueVals.map((val) => {
      const filteredRows = rows.filter((r) => r[key] === val);
      const node: any = depth === 0 ? { field1: val } : { name: val };

      if (depth + 1 < this.fieldNames.length) {
        const childKey = depth === 0 ? "field2" : "field3";
        node[childKey] = this.buildTree(filteredRows, depth + 1);
      }
      return node;
    });
  }

  dropDownQuery = async (): Promise<any[]> => {
    const rowsPerLayer = await Promise.all(
      this.featureLayers.map((layer) => this.queryDistinctRows(layer)),
    );

    const allRows = this.dedupeRows(rowsPerLayer.flat());

    return this.buildTree(allRows);
  };
}

export default GenerateDropdownData;