import { createContext, useContext, useState, type ReactNode } from "react";
import { lotStatusField } from "../layers";

// Defaults used when the slider is off, or a date has no JV/NY field
const DEFAULT_HANDED_OVER_FIELD = "HandedOVer";
const DEFAULT_NOT_YET_FIELD = "not_yet";

// ----------------------------------------------------
// TOGGLE CONTEXT
// Whether the slider overlay is shown. Consumed by MapDisplay/ActionBar.
// Kept separate from ACTIVE DATE FIELDS below, so toggling the slider
// doesn't re-render LotChart, and vice versa.
// ----------------------------------------------------

type TimeSliderToggleContextValue = {
  showTimeSlider: boolean;
  toggleTimeSlider: () => void;
};

const TimeSliderToggleContext = createContext<TimeSliderToggleContextValue | undefined>(undefined);

export function useTimeSliderToggle() {
  const context = useContext(TimeSliderToggleContext);
  if (!context) {
    throw new Error(
      "useTimeSliderToggle must be used within a TimeSliderProvider",
    );
  }
  return context;
}

// ----------------------------------------------------
// ACTIVE DATE FIELDS CONTEXT
// Which fields drive lot data right now — a date's NVS/JV/NY fields
// while the slider is on, or the defaults while it's off. Read by
// LotChart, written by TimeSlider.
// ----------------------------------------------------

type ActiveDateFieldsContextValue = {
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

const ActiveDateFieldsContext = createContext<ActiveDateFieldsContextValue | undefined>(undefined);

export function useActiveDateFields() {
  const context = useContext(ActiveDateFieldsContext);
  if (!context) {
    throw new Error(
      "useActiveDateFields must be used within a TimeSliderProvider",
    );
  }
  return context;
}

// ----------------------------------------------------
// COMBINED PROVIDER
// Holds both pieces of state, kept as two separate contexts so a
// change to one doesn't re-render the other's consumers. Wrapped into
// one provider here so App.tsx only needs to use one.
// ----------------------------------------------------

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
    <TimeSliderToggleContext.Provider value={{ showTimeSlider, toggleTimeSlider }}>
      <ActiveDateFieldsContext.Provider
        value={{
          activeStatusField,
          activeHandedOverField,
          activeNotYetField,
          setActiveDateFields,
          resetActiveDateFields,
        }}
      >
        {children}
      </ActiveDateFieldsContext.Provider>
    </TimeSliderToggleContext.Provider>
  );
}