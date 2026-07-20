import "./index.css";
import "@esri/calcite-components/components/calcite-shell";
import { useMemo, useState, useEffect } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

import { authenticate } from "./autho";

import Header from "./components/Header";
import MapDisplay from "./components/MapDisplay";
import SidePanel from "./components/SidePanel";
import ActionBar from "./components/ActionBar";

import { MyContext, type SelectedLocation } from "./contexts/MyContext";

// ----------------------------------------------------
// Created once outside the component so it's never recreated on re-renders
// ----------------------------------------------------
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false, // ArcGIS data doesn't change that frequently
      staleTime: 1000 * 60 * 5,    // cache stays fresh for 5 minutes
    },
  },
});

export default function App() {
  //------------------------
  //  Authenticate viewers
  //------------------------
  const [loggedInState, setLoggedInState] = useState<boolean>(false);

  useEffect(() => {
    authenticate(setLoggedInState, "V2b9ysdMrpUBEWv4");
  }, []);

  // Single source of truth for the current package/type/station selection,
  // shared app-wide via MyContext below.
  const [selectedLocation, setSelectedLocation] = useState<SelectedLocation>({
    packageName: null,
    type: null,
    station: null,
  });

  // Status code of the currently clicked pie slice (set from LotChart),
  // shared so MapDisplay can combine it with selectedLocation for map
  // filtering/zoom.
  const [selectedStatus, setSelectedStatus] = useState<number | null>(null);

  // Bundles state + updaters into one stable object so context consumers
  // don't re-render unless something in here actually changed.
  const contextValue = useMemo(
    () => ({
      selectedLocation,
      updateLocation: setSelectedLocation,
      selectedStatus,
      updateStatus: setSelectedStatus,
    }),
    [selectedLocation, selectedStatus]
  );

  return (
    loggedInState && (
      <calcite-shell>
        <MyContext.Provider value={contextValue}>
          <QueryClientProvider client={queryClient}>
            <Header />
            <MapDisplay />
            <ActionBar />
            <SidePanel />
          </QueryClientProvider>
        </MyContext.Provider>
      </calcite-shell>
    )
  );
}