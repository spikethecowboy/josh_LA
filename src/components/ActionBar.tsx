import "@esri/calcite-components/components/calcite-shell-panel";
import "@esri/calcite-components/components/calcite-action-bar";
import "@esri/calcite-components/components/calcite-action";
import "@esri/calcite-components/components/calcite-panel";
import "@arcgis/map-components/components/arcgis-basemap-gallery";
import "@arcgis/map-components/components/arcgis-layer-list";
import { useEffect, useRef, useState } from "react";

// Which panel is currently open, or null if none
type ActivePanel = "basemap" | "layers" | null;

export default function ActionBar() {
  // Action bar starts collapsed (icon-only).
  const [barExpanded, setBarExpanded] = useState(false);

  // Tracks which panel is open. null = all closed.
  const [activePanel, setActivePanel] = useState<ActivePanel>(null);

  // Ref to the LayerList so we can configure its per-item legend panel
  // imperatively. `listItemCreatedFunction` is a JS callback (not a plain
  // attribute value), so it has to be set as a DOM property via ref.
  const layerListRef = useRef<HTMLArcgisLayerListElement>(null);

  useEffect(() => {
    if (!layerListRef.current) return;

    layerListRef.current.listItemCreatedFunction = (event) => {
      const item = event.item;
      item.panel = {
        content: "legend",
        open: true,
      };
    };
  }, []);

  const togglePanel = (panel: ActivePanel) => {
    setActivePanel((prev) => (prev === panel ? null : panel));
  };

  return (
    <calcite-shell-panel
      slot="panel-start"
      collapsed={activePanel === null}
    >
      <calcite-action-bar
        slot="action-bar"
        expanded={barExpanded}
        oncalciteActionBarToggle={(e: CustomEvent) => {
          setBarExpanded((e.target as HTMLCalciteActionBarElement).expanded);
        }}
      >
        <calcite-action
          icon="basemap"
          text="Basemap"
          active={activePanel === "basemap"}
          onClick={() => togglePanel("basemap")}
        ></calcite-action>

        <calcite-action
          icon="layers"
          text="Layers"
          active={activePanel === "layers"}
          onClick={() => togglePanel("layers")}
        ></calcite-action>
      </calcite-action-bar>

      {/* Basemap panel — always mounted for instant load */}
      <calcite-panel
        heading="Basemap"
        closable
        oncalcitePanelClose={() => setActivePanel(null)}
        style={{ display: activePanel === "basemap" ? "block" : "none" }}
      >
        <div style={{ overflowY: "auto", overflowX: "hidden", maxHeight: "calc(100vh - 120px)" }}>
          <arcgis-basemap-gallery referenceElement="mmsp-map"></arcgis-basemap-gallery>
        </div>
      </calcite-panel>

      {/* Layers panel — arcgis-layer-list gives us the checkbox, title,
          and per-layer expandable legend panel in one built-in widget */}
      <calcite-panel
        heading="Layers"
        closable
        oncalcitePanelClose={() => setActivePanel(null)}
        style={{ display: activePanel === "layers" ? "block" : "none" }}
      >
        <div style={{ overflowY: "auto", overflowX: "hidden", maxHeight: "calc(100vh - 120px)" }}>
          <arcgis-layer-list
            ref={layerListRef}
            referenceElement="mmsp-map"
          ></arcgis-layer-list>
        </div>
      </calcite-panel>
    </calcite-shell-panel>
  );
}