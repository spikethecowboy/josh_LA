import "../index.css";

import "@arcgis/map-components/components/arcgis-compass";
import "@arcgis/map-components/components/arcgis-map";

import { useContext, useEffect, useRef } from "react";

import type { ArcgisMap } from "@arcgis/map-components/dist/components/arcgis-map";
import type MapView from "@arcgis/core/views/MapView";

import { lotLayer, alignmentLayer, stationLayer, lotStatusField } from "../layers";
import { MyContext } from "../contexts/MyContext";
import { filterAndGetTargetExtent } from "../MapQuery";

export default function MapDisplay() {
  const mapRef = useRef<ArcgisMap | null>(null);
  const viewRef = useRef<MapView | null>(null);

  const { selectedLocation, selectedStatus } = useContext(MyContext);

  // ----------------------------------------------------
  // EFFECT 1: One-time map setup.
  // ----------------------------------------------------
  useEffect(() => {
    const initializeMap = async () => {
      if (!mapRef.current) return;

      await mapRef.current.viewOnReady();

      viewRef.current = mapRef.current.view;

      if (!viewRef.current) return;

      viewRef.current.map?.add(lotLayer);
      viewRef.current.map?.add(alignmentLayer);
      viewRef.current.map?.add(stationLayer);
    };

    initializeMap();
  }, []);

  // ----------------------------------------------------
  // EFFECT 2: Re-filter whenever selectedLocation OR selectedStatus
  // changes, then zoom to the returned extent (if any). This is the ONLY
  // place lotLayer's definitionExpression and view.goTo are called —
  // Dropdown.tsx and LotChart.tsx just update context; this effect reacts
  // to that regardless of which one triggered the change.
  // ----------------------------------------------------
  useEffect(() => {
    const { packageName, type, station } = selectedLocation;

    filterAndGetTargetExtent(
      lotLayer,
      packageName,
      type,
      station,
      selectedStatus,
      lotStatusField,
    ).then((extent) => {
      if (extent && viewRef.current) {
        viewRef.current.goTo(extent);
      }
    });
  }, [selectedLocation, selectedStatus]);

  return (
    <arcgis-map
      id="mmsp-map"
      ref={mapRef}
      basemap="topo-vector"
      ground="world-elevation"
      center="121.04128024704018, 14.607106959078035"
      zoom={12}
    >
      <arcgis-compass slot="top-right" />
    </arcgis-map>
  );
}