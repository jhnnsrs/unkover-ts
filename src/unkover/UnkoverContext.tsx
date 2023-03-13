import React, { useContext } from "react";
import { ArraySelection } from "zarr/types/core/types";

export const availableColorMaps = [
  "jet",
  "hot",
  "cool",
  "spring",
  "summer",
  "autumn",
  "winter",
  "bone",
  "copper",
  "greys",
  "YIGnBu",
  "greens",
  "YIOrRd",
  "bluered",
  "RdBu",
  "picnic",
  "rainbow",
  "portland",
  "blackbody",
  "earth",
  "electric",
  "viridis",
  "inferno",
  "magma",
  "plasma",
  "warm",
  "rainbow-soft",
  "bathymetry",
  "cdom",
  "chlorophyll",
  "density",
  "freesurface-blue",
  "freesurface-red",
  "oxygen",
  "par",
  "phase",
  "salinity",
  "temperature",
  "turbidity",
  "velocity-blue",
  "velocity-green",
  "cubehelix",
] as const;

export type AvailableColormap = typeof availableColorMaps[number];

export type UnkoverContextType = {
  getSelectionAsImageData: (
    path: string,
    selection: ArraySelection,
    colormap: AvailableColormap
  ) => Promise<ImageData>;
};

export const UnkoverContext = React.createContext<UnkoverContextType>({
  getSelectionAsImageData: async () => {
    return null as unknown as ImageData;
  },
});

export const useUnkover = () => useContext(UnkoverContext);
