import "@arcgis/map-components/components/arcgis-time-slider";

import { useEffect, useRef } from "react";

import type { ArcgisTimeSlider } from "@arcgis/map-components/dist/components/arcgis-time-slider";
import type FeatureLayer from "@arcgis/core/layers/FeatureLayer";
import type TimeExtent from "@arcgis/core/time/TimeExtent";
import type UniqueValueRenderer from "@arcgis/core/renderers/UniqueValueRenderer";

import { lotLayer, lotStatusField } from "../layers";
import { useActiveDateFields } from "../contexts/TimeSliderContext";

// ----------------------------------------------------
// TYPES
// One date's NVS/JV/NY field names, grouped together since a single
// date can have up to three matching fields.
// ----------------------------------------------------

type DateFieldEntry = {
  NVS_fieldName: string;
  JV_fieldName: string;
  NY_fieldName: string;
  date: Date;
};

// ----------------------------------------------------
// FIELD DISCOVERY
// Scans lotLayer's fields for names like "x20250504_NVS" and groups
// them by date.
// ----------------------------------------------------

function getDateFieldsBySuffix(layer: FeatureLayer): {
  fields: DateFieldEntry[];
  dates: Date[];
  startDate: Date | null;
  endDate: Date | null;
} {
  const pattern = /^x(\d{4})(\d{2})(\d{2})_(NVS|JV|NY)$/; // matches "xYYYYMMDD_SUFFIX" where SUFFIX is one of NVS, JV, NY

  const grouped = new Map<string, DateFieldEntry>();

  for (const field of layer.fields ?? []) {
    const match = field.name.match(pattern);
    if (!match) continue;

    const [, year, month, day, suffix] = match;
    const date = new Date(Number(year), Number(month) - 1, Number(day));

    if (isNaN(date.getTime())) continue; // skip invalid dates

    const key = `${year}-${month}-${day}`;

    // example is "2025-05-04" -> { NVS_fieldName: "x20250504_NVS", JV_fieldName: "x20250504_JV", NY_fieldName: "x20250504_NY", date: Date(2025, 4, 4) }  
    let entry = grouped.get(key); 
    if (!entry) {
      entry = { NVS_fieldName: "", JV_fieldName: "", NY_fieldName: "", date };
      grouped.set(key, entry);
    }

    switch (suffix) {
      case "NVS":
        entry.NVS_fieldName = field.name;
        break;
      case "JV":
        entry.JV_fieldName = field.name;
        break;
      case "NY":
        entry.NY_fieldName = field.name;
        break;
    }
  }
  
  // Gets only the entries with all three field names and sorts them by date
  const fields = Array.from(grouped.values());
  fields.sort((a, b) => a.date.getTime() - b.date.getTime());

  // Gets only the dates for the slider stops
  const dates = fields.map((f) => f.date);

  // Gets the earliest and latest dates for the slider range
  const startDate = dates.length > 0 ? dates[0] : null;
  const endDate = dates.length > 0 ? dates[dates.length - 1] : null;

  return { fields, dates, startDate, endDate };
}

// Formats a Date as "YYYY-M-D" — used as the lookup key below
function dateKey(date: Date): string {
  return `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
}

export default function TimeSlider() {
  const timeSliderRef = useRef<ArcgisTimeSlider | null>(null);

  // date key -> that date's field entry, built once in setup below
  const dateFieldsRef = useRef<Map<string, DateFieldEntry>>(new Map());

  // CONTEXT 
  const { setActiveDateFields, resetActiveDateFields } = useActiveDateFields();

  // ----------------------------------------------------
  // SETUP
  // Builds the date lookup, sets the slider's range + fixed stops.
  // Runs once on mount; cleanup restores defaults on unmount (slider
  // toggled off).
  // ----------------------------------------------------

  useEffect(() => {
    // executed once on mount, after the time slider is ready and the lot layer is loaded
    const setupTimeSlider = async () => {
      if (!timeSliderRef.current) return;

      await timeSliderRef.current.componentOnReady();
      await lotLayer.load();

      // example: { fields: [{ NVS_fieldName: "x20250504_NVS", JV_fieldName: "x20250504_JV", NY_fieldName: "x20250504_NY", date: Date(2025, 4, 4) }], dates: [Date(2025, 4, 4)], startDate: Date(2025, 4, 4), endDate: Date(2025, 4, 4) }
      const { fields, dates, startDate, endDate } = getDateFieldsBySuffix(lotLayer); 

      dateFieldsRef.current = new Map(
        fields.map((entry) => [dateKey(entry.date), entry]), // example: ["2025-5-4", { NVS_fieldName: "x20250504_NVS", JV_fieldName: "x20250504_JV", NY_fieldName: "x20250504_NY", date: Date(2025, 4, 4) }]
      );

      // Range = earliest to latest date found
      if (startDate && endDate) {
        timeSliderRef.current.fullTimeExtent = {
          start: startDate,
          end: endDate,
        } as TimeExtent;
      }

      // Fixed marks = exactly the dates found, nothing in between
      if (dates.length > 0) {
        timeSliderRef.current.stops = { dates };
      }
    };

    setupTimeSlider();

    // executed once on unmount, restores the lot layer's renderer field to the default and clears the context fields
    return () => {
      const renderer = lotLayer.renderer as UniqueValueRenderer;
      if (renderer && "field" in renderer) {
        renderer.field = lotStatusField;
      }
      resetActiveDateFields();
    };
  }, []);

  // ----------------------------------------------------
  // DATE CHANGE
  // Fires on every slider property change — filtered down to just
  // timeExtent, since that's the only one that means "user picked a
  // new date." Swaps the map's renderer field and the shared context
  // fields to match that date.
  // ----------------------------------------------------

  const handlePropertyChange = (event: CustomEvent<{ name: string }>) => {
    if (event.detail?.name !== "timeExtent") return; // only care about timeExtent changes

    const timeExtent = timeSliderRef.current?.timeExtent;
    const activeDate = timeExtent?.start ?? timeExtent?.end;
    if (!activeDate) return;

    const entry = dateFieldsRef.current.get(dateKey(activeDate));
    if (!entry || !entry.NVS_fieldName) return;

    const renderer = lotLayer.renderer as UniqueValueRenderer;
    if (renderer && "field" in renderer) {
      renderer.field = entry.NVS_fieldName;
    }

    // Update the context with the active date's field names, so other components can react to the change
    setActiveDateFields({
      statusField: entry.NVS_fieldName,
      handedOverField: entry.JV_fieldName,
      notYetField: entry.NY_fieldName,
    });
  };

  return (
    <arcgis-time-slider
      ref={timeSliderRef}
      slot="bottom-start"
      loop
      onarcgisPropertyChange={handlePropertyChange}
      mode="instant"
    ></arcgis-time-slider>
  );
}