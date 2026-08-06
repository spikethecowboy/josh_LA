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

  // Tracks every panel that's been opened at least once. Panels are only
  // rendered into the DOM after their first visit, so arcgis-basemap-gallery
  // and arcgis-layer-list don't do any setup work until the user actually
  // asks for them.
  const [visitedPanels, setVisitedPanels] = useState<Set<string>>(new Set());

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
    // Re-run once the layers panel actually mounts (first visit), since
    // layerListRef.current is null until then.
  }, [visitedPanels]);

  const togglePanel = (panel: ActivePanel) => {
    setActivePanel((prev) => (prev === panel ? null : panel));
    setVisitedPanels((prev) => new Set(prev).add(panel as string));
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

      {/* Basemap panel — only mounted after first visit. Visibility is
          driven entirely by `activePanel` + the display style below;
          the close button just calls setActivePanel(null) directly
          instead of using calcite-panel's own `closable`/internal closed
          state, which doesn't reset itself when the panel is reopened
          from the action bar. */}
      {visitedPanels.has("basemap") && (
        <calcite-panel
          heading="Basemap"
          style={{ display: activePanel === "basemap" ? "block" : "none" }}
        >
          <calcite-action
            slot="header-actions-end"
            icon="x"
            text="Close"
            onClick={() => setActivePanel(null)}
          ></calcite-action>
          <div style={{ overflowY: "auto", overflowX: "hidden", maxHeight: "calc(100vh - 120px)" }}>
            <arcgis-basemap-gallery referenceElement="mmsp-map"></arcgis-basemap-gallery>
          </div>
        </calcite-panel>
      )}

      {/* Layers panel — arcgis-layer-list gives us the checkbox, title,
          and per-layer expandable legend panel in one built-in widget.
          Only mounted after first visit. */}
      {visitedPanels.has("layers") && (
        <calcite-panel
          heading="Layers"
          style={{ display: activePanel === "layers" ? "block" : "none" }}
        >
          <calcite-action
            slot="header-actions-end"
            icon="x"
            text="Close"
            onClick={() => setActivePanel(null)}
          ></calcite-action>
          <div style={{ overflowY: "auto", overflowX: "hidden", maxHeight: "calc(100vh - 120px)" }}>
            <arcgis-layer-list
              ref={layerListRef}
              referenceElement="mmsp-map"
            ></arcgis-layer-list>
          </div>
        </calcite-panel>
      )}
    </calcite-shell-panel>
  );
}