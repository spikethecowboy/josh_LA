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
import IssueList from "./Issue";

// calcite-tab adds its own top/bottom padding around whatever's
// slotted into it (via --calcite-tab-content-block-padding, driven by
// the tabs' scale="l"). That padding sits outside each chart's own
// background div, so it shows the tab's own background instead —
// visible as a gray strip above the content whenever a chart sets a
// custom background (e.g. LotChart's white toggle). Zeroing it here
// lets each chart's own div fully own its background with no gap.
const tabContentStyle = {
  "--calcite-tab-content-block-padding": "0px",
} as React.CSSProperties;

export default function SidePanel() {
  // Every tab opened at least once. calcite-tabs mounts all tab content
  // immediately and just hides inactive ones via CSS — building an
  // amCharts chart while its container is display:none gives it zero
  // size, permanently. Rendering a tab's content only after its first
  // visit avoids that. "land" starts visited since it's the default tab.
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
          borderTopWidth: 5,
          borderColor: "#555555",
          width: "40%",
        }}
      >
        {/* ----------------------------------------------------
            TAB TITLES
            One title per <calcite-tab> below, same order. className is
            a stable id for handleTabChange, matched against visitedTabs.
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
          <calcite-tab-title className="issue">Issue</calcite-tab-title>
        </calcite-tab-nav>

        {/* ----------------------------------------------------
            TAB CONTENT
        ---------------------------------------------------- */}
        <calcite-tab style={tabContentStyle}>
          <LotChart />
        </calcite-tab>
        <calcite-tab style={tabContentStyle}>
          {visitedTabs.has("structure") && <StructureChart />}
        </calcite-tab>
        <calcite-tab style={tabContentStyle}>
          {visitedTabs.has("isf") && <ISFChart />}
        </calcite-tab>
        <calcite-tab style={tabContentStyle}>
          {visitedTabs.has("exprolist") && <ExpropriationList />}
        </calcite-tab>
        <calcite-tab style={tabContentStyle}>
          {visitedTabs.has("issue") && <IssueList />}
        </calcite-tab>
      </calcite-tabs>
    </>
  );
}