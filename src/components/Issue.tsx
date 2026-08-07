import { lotLayer } from "../layers";
import Query from "@arcgis/core/rest/support/Query";
import "@esri/calcite-components/components/calcite-shell";
import "@esri/calcite-components/components/calcite-list";
import "@esri/calcite-components/components/calcite-list-item";
import "@esri/calcite-components/components/calcite-shell-panel";
import "@esri/calcite-components/components/calcite-action";
import "@esri/calcite-components/components/calcite-chip";
import "@esri/calcite-components/components/calcite-chip-group";
import "@esri/calcite-components/components/calcite-avatar";
import "@esri/calcite-components/components/calcite-action-bar";
import type { ArcgisMap } from "@arcgis/map-components/dist/components/arcgis-map";
import "../index.css";
import { useQuery } from "@tanstack/react-query";
import { useContext, useMemo } from "react";
import type FeatureLayer from "@arcgis/core/layers/FeatureLayer";
import { MyContext } from "../contexts/MyContext";
import QueryExpressionLayers from "../CreateQueryJosh";

interface QueryFeaturesType {
  layer: FeatureLayer;
  queryc: string;
}

async function queryFeatures({ layer, queryc }: QueryFeaturesType) {
  const query = layer.createQuery();
  query.where = queryc;
  query.outFields = ["Id", "Issue", "Station1", "Package", "OBJECTID"];
  query.returnGeometry = false;

  return await layer?.queryFeatures(query);
}

//--- Highlight & zoom into clicked land
// Module-level so it persists across renders/clicks without needing state
// (mirrors the highlighted feature, not something the UI displays directly).
let highlightSelect: any;

async function resultClickHandler(event: any) {
  // Matches MapDisplay.tsx's <arcgis-map id="mmsp-map">, not a 3D scene.
  const arcgisMap = document.querySelector("#mmsp-map") as ArcgisMap;
  if (!arcgisMap?.view) return;

  const queryExtent = new Query({
    objectIds: [event.target.value],
  });
  const result = await lotLayer.queryExtent(queryExtent);

  if (result.extent) {
    arcgisMap.view.goTo({
      target: result.extent,
      zoom: 17,
    });
  }

  const layerView = await arcgisMap.view.whenLayerView(lotLayer);

  // Remove any previous highlight before applying a new one.
  highlightSelect?.remove();
  highlightSelect = layerView.highlight([event.target.value]);

  // Clicking elsewhere on the map clears the highlight/filter.
  arcgisMap.view.on("click", () => {
    layerView.filter = null;
    highlightSelect?.remove();
  });
}

const IssueList = () => {
  const { selectedLocation } = useContext(MyContext);
  const { packageName, type, station } = selectedLocation;

  // Unlike Expro (which filters by a specific status code), Issue just
  // checks whether the Issue field is populated at all.
  const querycIssue = new QueryExpressionLayers({
    qFields: ["Package", "Type", "Station1"],
    qValues: [packageName, type, station],
    qExpression: "Issue IS NOT NULL",
  }).queryExpression();

  const { data } = useQuery<any>({
    queryKey: [packageName, type, station, "issue"],
    queryFn: () =>
      queryFeatures({
        layer: lotLayer,
        queryc: querycIssue,
      }),
    select: (response) => {
      return response.features;
    },
  });

  const uniqueIssueItems = useMemo(() => {
    if (!data) return [];

    const seen = new Map<any, any>();
    for (const feature of data) {
      const attributes = feature.attributes;
      if (!seen.has(attributes.OBJECTID)) {
        seen.set(attributes.OBJECTID, {
          id: attributes.OBJECTID,
          lotid: attributes.Id,
          issue: attributes.Issue,
          package: attributes.Station1,
          cp: attributes.Package,
          objectid: attributes.OBJECTID,
        });
      }
    }
    return [...seen.values()];
  }, [data]);

  return (
    <>
      <calcite-list id="issue-result-list" label="issueListLabel" displayMode="nested">
        {uniqueIssueItems.map((result: any) => (
          <calcite-list-item
            key={result.id}
            expanded
            label={result.lotid}
            description={result.issue}
            value={result.objectid}
            selected={undefined}
            oncalciteListItemSelect={(event: any) => resultClickHandler(event)}
            style={{ "--calcite-list-label-text-color": "red" }}
          >
            <calcite-chip value={result.cp} label={""} slot="content-end" scale="s" id="issueListChip">
              <calcite-avatar full-name={result.package} scale="s" style={{ marginTop: "3px" }}></calcite-avatar>
              <span style={{ top: -7, bottom: 1, position: "relative", paddingLeft: "3px" }}>
                {result.cp}
              </span>
            </calcite-chip>
          </calcite-list-item>
        ))}
      </calcite-list>
    </>
  );
};

export default IssueList;