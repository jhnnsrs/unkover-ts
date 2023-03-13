import { useDatalayer } from "@jhnnsrs/datalayer";
import React, { useEffect, useState } from "react";
import { ArraySelection } from "zarr/types/core/types";
import { AvailableColormap, UnkoverContext } from "./UnkoverContext";
import { renderSelection } from "./workers/download";

export type UnkoverProviderProps = {
  children: React.ReactNode;
  renderSelection?: typeof renderSelection;
};

export const UnkoverProvider = (props: UnkoverProviderProps) => {
  const { request } = useDatalayer();

  const getSelectionAsImageData = async (
    path: string,
    selection: ArraySelection,
    colormap: AvailableColormap
  ) => {
    let credentials = await request(["read"]);

    const multiplied = await (props.renderSelection || renderSelection)(
      path,
      selection,
      credentials.accessKey,
      credentials.secretKey,
      credentials.sessionToken,
      colormap
    );

    return multiplied as ImageData;
  };

  return (
    <UnkoverContext.Provider
      value={{
        getSelectionAsImageData,
      }}
    >
      {props.children}
    </UnkoverContext.Provider>
  );
};
