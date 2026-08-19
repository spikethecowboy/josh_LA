import "@esri/calcite-components/components/calcite-shell-panel";
import "@esri/calcite-components/components/calcite-action-bar";
import "@esri/calcite-components/components/calcite-action";
import "@esri/calcite-components/components/calcite-panel";
import "@arcgis/map-components/components/arcgis-basemap-gallery";
import "@arcgis/map-components/components/arcgis-layer-list";
import { useEffect, useRef, useState } from "react";
import { useTimeSliderToggle } from "../contexts/TimeSliderContext";

// ----------------------------------------------------
// TYPES
// Which side panel is open, or null if none. Time slider is separate —
// it overlays the map instead of opening a panel.
// ----------------------------------------------------

type ActivePanel = "basemap" | "layers" | "description" | null;

export default function ActionBar() {
  // ----------------------------------------------------
  // STATE
  // ----------------------------------------------------

  // Action bar starts collapsed (icon-only)
  const [barExpanded, setBarExpanded] = useState(false);

  // Which panel is open. null = all closed.
  const [activePanel, setActivePanel] = useState<ActivePanel>(null);

  // Every panel opened at least once — panels below only mount after
  // their first visit (see PANELS section)
  const [visitedPanels, setVisitedPanels] = useState<Set<string>>(new Set());

  // Slider overlay lives on the map itself (see MapDisplay) — this just
  // flips the shared toggle
  const { showTimeSlider, toggleTimeSlider } = useTimeSliderToggle();

  // ----------------------------------------------------
  // LAYER LIST SETUP
  // listItemCreatedFunction is a JS callback, so it has to be set as a
  // DOM property via ref rather than a plain JSX attribute.
  // ----------------------------------------------------

  const layerListRef = useRef<HTMLArcgisLayerListElement>(null);

  useEffect(() => {
    if (!layerListRef.current) return;

    layerListRef.current.listItemCreatedFunction = (event) => {
      const item = event.item;
      // GroupLayer items already show their children (each with its own
      // legend panel below) via the expand chevron — giving the group
      // ITSELF a legend panel too just duplicates every child's legend a
      // second time, stacked under the group. Start it expanded so the
      // children are visible right away, no click needed.
      if (item.layer?.type === "group") {
        // item.open = true;
        return;
      }

      item.panel = {
        content: "legend",
        open: true,
      };
    };
    // Re-runs once the layers panel first mounts, since layerListRef is
    // null before that
  }, [visitedPanels]);

  // ----------------------------------------------------
  // PANEL TOGGLE
  // Opening a panel also marks it visited, so PANELS below knows to
  // mount it (once) and keep it mounted from then on.
  // ----------------------------------------------------

  const togglePanel = (panel: ActivePanel) => {
    setActivePanel((prev) => (prev === panel ? null : panel));
    setVisitedPanels((prev) => new Set(prev).add(panel as string));
  };

  // ----------------------------------------------------
  // UI
  // Action bar with 4 actions, one panel per action below it.
  // ----------------------------------------------------

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
          icon="layers"
          text="Layers"
          active={activePanel === "layers"}
          onClick={() => togglePanel("layers")}
        ></calcite-action>

        <calcite-action
          icon="basemap"
          text="Basemap"
          active={activePanel === "basemap"}
          onClick={() => togglePanel("basemap")}
        ></calcite-action>

        <calcite-action
          icon="clock"
          text="Time Slider"
          active={showTimeSlider}
          onClick={toggleTimeSlider}
        ></calcite-action>

        <calcite-action
          icon="information"
          text="Description"
          active={activePanel === "description"}
          onClick={() => togglePanel("description")}
        ></calcite-action>
      </calcite-action-bar>

      {/* ----------------------------------------------------
          PANELS
          Each panel mounts once (first visit), then stays mounted —
          visibility toggles with display: none/block instead of
          unmounting, so switching back to a panel keeps its state
          (e.g. gallery scroll position). Close button calls
          setActivePanel(null) directly rather than relying on
          calcite-panel's own closable state, which doesn't reset when
          the panel is reopened from the action bar.
      ---------------------------------------------------- */}

      {/* Layers — arcgis-layer-list bundles checkbox, title, and
          per-layer legend into one widget */}
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

      {/* Basemap */}
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

      {/* Description — static text, no ArcGIS widget involved, but kept
          on the same visitedPanels pattern for consistency */}
      {visitedPanels.has("description") && (
        <calcite-panel
          heading="Description"
          style={{ display: activePanel === "description" ? "block" : "none" }}
        >
          <calcite-action
            slot="header-actions-end"
            icon="x"
            text="Close"
            onClick={() => setActivePanel(null)}
          ></calcite-action>
          <div
            style={{
              overflowY: "auto",
              overflowX: "hidden",
              maxHeight: "calc(100vh - 120px)",
              padding: "12px 16px",
              color: "white",
              lineHeight: 1.6,
            }}
          >
            <p>This smart map shows the progress on the following:</p>
            <ul>
              <li>Land Acquisition</li>
              <li>Structures</li>
              <li>ISF (Informal Settlers Families)</li>
              <li>Lots under Expropriation</li>
            </ul>
            <p>
              The source of data: Master List tables provided by the Social
              &amp; Environmental Team.
            </p>
          </div>
        </calcite-panel>
      )}
    </calcite-shell-panel>
  );
}