import { createContext, type Dispatch, type SetStateAction } from "react";

export type SelectedLocation = {
  packageName: string | null;
  type: string | null;
  station: string | null;
};

type MyContextValue = {
  selectedLocation: SelectedLocation;
  updateLocation: Dispatch<SetStateAction<SelectedLocation>>;
  // Status code of the currently clicked pie slice (null = none selected).
  // Lives here (not local to LotChart) so MapDisplay can combine it with
  // selectedLocation as the single source of truth for map filtering/zoom.
  selectedStatus: number | null;
  updateStatus: Dispatch<SetStateAction<number | null>>;
};

export const MyContext = createContext<MyContextValue>({
  selectedLocation: { packageName: null, type: null, station: null },
  updateLocation: () => {},
  selectedStatus: null,
  updateStatus: () => {},
});