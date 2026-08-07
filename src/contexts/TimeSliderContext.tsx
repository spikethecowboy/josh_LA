import { createContext, useContext, useState, type ReactNode } from "react";
import { lotStatusField } from "../layers";

// Defaults used whenever the time slider is off, or a given date has no
// corresponding JV/NY field.
export const DEFAULT_HANDED_OVER_FIELD = "HandedOVer";
export const DEFAULT_NOT_YET_FIELD = "not_yet";

type TimeSliderContextValue = {
  showTimeSlider: boolean;
  toggleTimeSlider: () => void;
  // Which fields drive lot calculations right now — swap to the active
  // date's NVS/JV/NY fields while the time slider is on, fall back to
  // the defaults (StatusNVS3 / HandedOVer / not_yet) when it's off.
  activeStatusField: string;
  activeHandedOverField: string;
  activeNotYetField: string;
  setActiveDateFields: (fields: {
    statusField: string;
    handedOverField: string;
    notYetField: string;
  }) => void;
  resetActiveDateFields: () => void;
};

const TimeSliderContext = createContext<TimeSliderContextValue | undefined>(
  undefined,
);

export function TimeSliderProvider({ children }: { children: ReactNode }) {
  const [showTimeSlider, setShowTimeSlider] = useState(false);
  const [activeStatusField, setActiveStatusField] = useState(lotStatusField);
  const [activeHandedOverField, setActiveHandedOverField] = useState(
    DEFAULT_HANDED_OVER_FIELD,
  );
  const [activeNotYetField, setActiveNotYetField] = useState(
    DEFAULT_NOT_YET_FIELD,
  );

  const toggleTimeSlider = () => setShowTimeSlider((prev) => !prev);

  const setActiveDateFields = (fields: {
    statusField: string;
    handedOverField: string;
    notYetField: string;
  }) => {
    setActiveStatusField(fields.statusField);
    setActiveHandedOverField(fields.handedOverField);
    setActiveNotYetField(fields.notYetField);
  };

  const resetActiveDateFields = () => {
    setActiveStatusField(lotStatusField);
    setActiveHandedOverField(DEFAULT_HANDED_OVER_FIELD);
    setActiveNotYetField(DEFAULT_NOT_YET_FIELD);
  };

  return (
    <TimeSliderContext.Provider
      value={{
        showTimeSlider,
        toggleTimeSlider,
        activeStatusField,
        activeHandedOverField,
        activeNotYetField,
        setActiveDateFields,
        resetActiveDateFields,
      }}
    >
      {children}
    </TimeSliderContext.Provider>
  );
}

export function useTimeSliderContext() {
  const context = useContext(TimeSliderContext);
  if (!context) {
    throw new Error(
      "useTimeSliderContext must be used within a TimeSliderProvider",
    );
  }
  return context;
}