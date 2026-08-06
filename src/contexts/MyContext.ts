import { createContext, type Dispatch, type SetStateAction } from "react";

export type SelectedLocation = {
  packageName: string | null;
  type: string | null;
  station: string | null;
};

// Which chart a selected pie slice belongs to, plus its code
export type StatusSelection = {
  source: "lot" | "isf" | "structure";
  code: number | string;
} | null;

type MyContextValue = {
  selectedLocation: SelectedLocation;
  updateLocation: Dispatch<SetStateAction<SelectedLocation>>;
  selectedStatus: StatusSelection;
  updateStatus: Dispatch<SetStateAction<StatusSelection>>;
};

export const MyContext = createContext<MyContextValue>({
  selectedLocation: { packageName: null, type: null, station: null },
  updateLocation: () => {},
  selectedStatus: null,
  updateStatus: () => {},
});