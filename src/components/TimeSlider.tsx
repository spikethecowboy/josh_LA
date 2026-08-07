import "@arcgis/map-components/components/arcgis-time-slider";

import { useEffect, useRef } from "react";

import type { ArcgisTimeSlider } from "@arcgis/map-components/dist/components/arcgis-time-slider";
import type FeatureLayer from "@arcgis/core/layers/FeatureLayer";
import type TimeExtent from "@arcgis/core/time/TimeExtent";
import type UniqueValueRenderer from "@arcgis/core/renderers/UniqueValueRenderer";

import { lotLayer, lotStatusField } from "../layers";
import {
  useTimeSliderContext,
  DEFAULT_HANDED_OVER_FIELD,
  DEFAULT_NOT_YET_FIELD,
} from "../contexts/TimeSliderContext";

type DateFieldEntry = {
  NVS_fieldName: string;
  JV_fieldName: string;
  NY_fieldName: string;
  date: Date;
};

function getDateFieldsBySuffix(layer: FeatureLayer): {
  fields: DateFieldEntry[];
  dates: Date[];
  startDate: Date | null;
  endDate: Date | null;
} {
  const pattern = /^x(\d{4})(\d{2})(\d{2})_(NVS|JV|NY)$/;

  const grouped = new Map<string, DateFieldEntry>();

  for (const field of layer.fields ?? []) {
    const match = field.name.match(pattern);
    if (!match) continue;

    const [, year, month, day, suffix] = match;
    const date = new Date(Number(year), Number(month) - 1, Number(day));

    if (isNaN(date.getTime())) continue;

    const key = `${year}-${month}-${day}`;

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

  const fields = Array.from(grouped.values());
  fields.sort((a, b) => a.date.getTime() - b.date.getTime());

  const dates = fields.map((f) => f.date);

  const startDate = dates.length > 0 ? dates[0] : null;
  const endDate = dates.length > 0 ? dates[dates.length - 1] : null;

  return { fields, dates, startDate, endDate };
}

function dateKey(date: Date): string {
  return `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
}

export default function TimeSlider() {
  const timeSliderRef = useRef<ArcgisTimeSlider | null>(null);
  const dateFieldsRef = useRef<Map<string, DateFieldEntry>>(new Map());

  const { setActiveDateFields, resetActiveDateFields } = useTimeSliderContext();

  useEffect(() => {
    const setupTimeSlider = async () => {
      if (!timeSliderRef.current) return;

      await timeSliderRef.current.componentOnReady();
      await lotLayer.load();

      const { fields, dates, startDate, endDate } = getDateFieldsBySuffix(lotLayer);

      dateFieldsRef.current = new Map(
        fields.map((entry) => [dateKey(entry.date), entry]),
      );

      if (startDate && endDate) {
        timeSliderRef.current.fullTimeExtent = {
          start: startDate,
          end: endDate,
        } as TimeExtent;
      }

      if (dates.length > 0) {
        timeSliderRef.current.stops = { dates };
      }
    };

    setupTimeSlider();

    // Cleanup: runs when TimeSlider unmounts (slider toggled off).
    // Restores map symbology and all shared query fields to defaults.
    return () => {
      const renderer = lotLayer.renderer as UniqueValueRenderer;
      if (renderer && "field" in renderer) {
        renderer.field = lotStatusField;
      }
      resetActiveDateFields();
    };
  }, []);

  const handlePropertyChange = (event: CustomEvent<{ name: string }>) => {
    if (event.detail?.name !== "timeExtent") return;

    const timeExtent = timeSliderRef.current?.timeExtent;
    const activeDate = timeExtent?.start ?? timeExtent?.end;
    if (!activeDate) return;

    const entry = dateFieldsRef.current.get(dateKey(activeDate));
    if (!entry || !entry.NVS_fieldName) return;

    const renderer = lotLayer.renderer as UniqueValueRenderer;
    if (renderer && "field" in renderer) {
      renderer.field = entry.NVS_fieldName;
    }

    // JV/NY fall back to their defaults if this particular date doesn't
    // have a matching field.
    setActiveDateFields({
      statusField: entry.NVS_fieldName,
      handedOverField: entry.JV_fieldName || DEFAULT_HANDED_OVER_FIELD,
      notYetField: entry.NY_fieldName || DEFAULT_NOT_YET_FIELD,
    });
  };

  return (
    <arcgis-time-slider
      ref={timeSliderRef}
      slot="bottom-start"
      loop
      onarcgisPropertyChange={handlePropertyChange}
    ></arcgis-time-slider>
  );
}