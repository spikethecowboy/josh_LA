interface QueryExpressionOptions {
  qValues?: [any?, any?, any?];
  qFields?: [any?, any?, any?];
  chartCategory?: any;
  chartCategoryField?: any;
  chartCategoryType?: "number" | "string";
  status?: number | null;
  statusField?: any;
  qExpression?: any;
  q2Expression?: any;
}

// ----------------------------------------------------
// Builds a SQL where-clause string from a mix of optional filters
// (cascading package/type/station values, status, chart category, and
// raw extra expressions). Used to feed both layer.definitionExpression
// and Query.where.
// ----------------------------------------------------
class QueryExpressionLayers {
  qValues?: [any?, any?, any?];
  qFields?: [any?, any?, any?];
  chartCategory?: any;
  chartCategoryField?: any;
  chartCategoryType?: "number" | "string";
  status?: number | null;
  statusField?: any;
  qExpression?: any;
  q2Expression?: any;

  constructor(options: QueryExpressionOptions) {
    this.qValues = options.qValues;
    this.qFields = options.qFields;
    this.chartCategory = options.chartCategory;
    this.chartCategoryField = options.chartCategoryField;
    this.chartCategoryType = options.chartCategoryType;
    this.status = options.status;
    this.statusField = options.statusField;
    this.qExpression = options.qExpression;
    this.q2Expression = options.q2Expression;
  }

  // ----------------------------------------------------
  // HELPERS
  // ----------------------------------------------------

  // Formats a single field = value clause, quoting strings
  private buildClause(field: any, value: any): string {
    return typeof value === "number"
      ? `${field} = ${value}`            // e.g. `StatusNVS3 = 1`
      : `${field} = '${value}'`;         // e.g. `Package = 'CP101'`
  }

  // Joins non-empty clauses with AND
  private joinClauses(clauses: (string | undefined | null | false)[]): string {
    const valid = clauses.filter(Boolean) as string[];         // Filter out falsy values (undefined, null, false, empty string)
    return valid.length ? valid.join(" AND ") : "1=1";         // e.g. ["Package = 'CP101'", "Type = 'subterranean'"] => "Package = 'CP101' AND Type = 'subterranean'"
  }

  // ----------------------------------------------------
  // MAIN: builds and returns the combined where-clause string
  // ----------------------------------------------------
  queryExpression = (): string => {
    const clauses: (string | undefined | null | false)[] = [];

    // 1. qValues — include only the values that are set (cascade: stop at first missing)
    if (this.qValues?.[0]) {
      clauses.push(this.buildClause(this.qFields![0], this.qValues[0]));

      if (this.qValues[1]) {
        clauses.push(this.buildClause(this.qFields![1], this.qValues[1]));

        if (this.qValues[2]) {
          clauses.push(this.buildClause(this.qFields![2], this.qValues[2]));
        }
      }
    }

    // 2. Status field
    if (this.statusField && this.status != null) {
      clauses.push(`${this.statusField} = ${this.status}`);
    }

    // 3. Chart category field
    if (this.chartCategoryField && this.chartCategory != null) {
      clauses.push(this.buildClause(this.chartCategoryField, this.chartCategory));
    }

    // 4. Extra expressions
    if (this.qExpression) {
      clauses.push(this.qExpression);
    }

    if (this.q2Expression) {
      clauses.push(this.q2Expression);
    }

    return this.joinClauses(clauses);
  };
}

export default QueryExpressionLayers;