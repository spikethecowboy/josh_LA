// ----------------------------------------------------
// Calcite tab component registration
// ----------------------------------------------------
import "@esri/calcite-components/dist/components/calcite-tabs";
import "@esri/calcite-components/dist/components/calcite-tab";
import "@esri/calcite-components/dist/components/calcite-tab-nav";
import "@esri/calcite-components/dist/components/calcite-tab-title";

// import { useState } from 'react';
import LotChart from "./LotChart";
import ExpropriationList from "./Expro";
//import ExpropriationList from './ExpropriationList';

export default function SidePanel() {
  // const [chartTabName, setChartTabName] = useState('Land');
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
            Land / ExproList — currently only "Land" has content.
        ---------------------------------------------------- */}
        <calcite-tab-nav
          slot="title-group"
          id="thetabs"
          // onCalciteTabChange={(event: any) =>
          //   setChartTabName(event.srcElement.selectedTitle.className)
          // }
        >
          <calcite-tab-title>Land</calcite-tab-title>
          <calcite-tab-title>ExproList</calcite-tab-title>
        </calcite-tab-nav>

        {/* ----------------------------------------------------
            TAB CONTENT
        ---------------------------------------------------- */}
        <calcite-tab>
          <LotChart />
        </calcite-tab>
        <calcite-tab>
          <ExpropriationList />
        </calcite-tab>
      </calcite-tabs>
    </>
  );
}
