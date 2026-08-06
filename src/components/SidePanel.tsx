// ----------------------------------------------------
// Calcite tab component registration
// ----------------------------------------------------
import "@esri/calcite-components/dist/components/calcite-tabs";
import "@esri/calcite-components/dist/components/calcite-tab";
import "@esri/calcite-components/dist/components/calcite-tab-nav";
import "@esri/calcite-components/dist/components/calcite-tab-title";

import { useState } from "react";
import LotChart from "./LotChart";
import StructureChart from "./StructureChart.tsx";
import ISFChart from "./ISFChart";
import ExpropriationList from "./Expro";

export default function SidePanel() {
  // Tracks every tab that's been opened at least once. calcite-tabs mounts
  // ALL tab content into the DOM immediately and just hides inactive ones
  // via CSS — it doesn't unmount them. That's a problem for amCharts:
  // a chart built while its container is display:none gets created with
  // zero width/height and never recovers, even once the tab becomes
  // visible later. Rendering a tab's content only once it's actually been
  // opened guarantees the container has real dimensions the first time
  // that chart is built. "land" starts visited since it's the default
  // active tab.
  const [visitedTabs, setVisitedTabs] = useState<Set<string>>(
    new Set(["land"]),
  );

  const handleTabChange = (e: CustomEvent) => {
    const newTab = (e.target as any).selectedTitle?.className;
    if (!newTab) return;
    setVisitedTabs((prev) => new Set(prev).add(newTab));
  };

  return (
    <>
      {/* ----------------------------------------------------
          TAB CONTAINER
          Side panel docked via slot="panel-end", 40% width.
      ---------------------------------------------------- */}
      <calcite-tabs
        slot="panel-end"
        layout="center"
        scale="l"
        style={{
          borderStyle: "solid",
          borderRightWidth: 5,
          borderLeftWidth: 5,
          borderBottomWidth: 5,
          // borderTopWidth: 5,
          borderColor: "#555555",
          width: "40%",
        }}
      >
        {/* ----------------------------------------------------
            TAB TITLES
            Land / ISF / ExproList — one title per <calcite-tab> below,
            in the same order. className on each is used purely as a
            stable identifier for handleTabChange above, matching them up
            with the visitedTabs set.
        ---------------------------------------------------- */}
        <calcite-tab-nav
          slot="title-group"
          id="thetabs"
          oncalciteTabChange={handleTabChange}
        >
          <calcite-tab-title className="land">Land</calcite-tab-title>
          <calcite-tab-title className="structure">Structure</calcite-tab-title>
          <calcite-tab-title className="isf">ISF</calcite-tab-title>
          <calcite-tab-title className="exprolist">ExproList</calcite-tab-title>
        </calcite-tab-nav>

        {/* ----------------------------------------------------
            TAB CONTENT
        ---------------------------------------------------- */}
        <calcite-tab>
          <LotChart />
        </calcite-tab>
        <calcite-tab>
          {visitedTabs.has("structure") && <StructureChart />}
        </calcite-tab>
        <calcite-tab>
          {visitedTabs.has("isf") && <ISFChart />}
        </calcite-tab>
        <calcite-tab>
          {visitedTabs.has("exprolist") && <ExpropriationList />}
        </calcite-tab>
      </calcite-tabs>
    </>
  );
}