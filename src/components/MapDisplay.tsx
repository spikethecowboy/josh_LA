import "../index.css";

import "@arcgis/map-components/components/arcgis-compass";
import "@arcgis/map-components/components/arcgis-map";

import { useEffect, useRef } from "react";

import type { ArcgisMap } from "@arcgis/map-components/dist/components/arcgis-map";
import type MapView from "@arcgis/core/views/MapView";

import { lotLayer, alignmentLayer, stationLayer, structureLayer, ISFLayer } from "../layers";
import { useTimeSliderContext } from "../contexts/TimeSliderContext";
import TimeSlider from "./TimeSlider";

// Module-level (not a React ref) so LotChart/ISFChart can import it and
// call goTo() directly, without threading the view through context.
export const mapView: { current: MapView | null } = { current: null };

export default function MapDisplay() {
  const mapRef = useRef<ArcgisMap | null>(null);
  const viewRef = useRef<MapView | null>(null);

  const { showTimeSlider } = useTimeSliderContext();

  // ----------------------------------------------------
  // EFFECT 1: One-time map setup.
  // ----------------------------------------------------
  useEffect(() => {
    const initializeMap = async () => {
      if (!mapRef.current) return;

      await mapRef.current.viewOnReady();

      viewRef.current = mapRef.current.view;

      if (!viewRef.current) return;

      // Publish the view so LotChart/ISFChart can drive goTo() themselves.
      mapView.current = viewRef.current;

      viewRef.current.map?.add(lotLayer);
      viewRef.current.map?.add(alignmentLayer);
      viewRef.current.map?.add(stationLayer);
      viewRef.current.map?.add(structureLayer);
      viewRef.current.map?.add(ISFLayer);
    };

    initializeMap();
  }, []);

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
      {showTimeSlider && <TimeSlider />}
    </arcgis-map>
  );
}