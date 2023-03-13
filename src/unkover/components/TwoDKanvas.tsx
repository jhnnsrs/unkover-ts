import React, { useEffect, useRef, useState } from "react";
import { SafeParentSize } from "../layout/ParentSize";
import { AvailableColormap, useUnkover } from "../UnkoverContext";

export interface TwoDKanvasProps {
  path: string;
  shape: [number, number, number, number, number];
  colormap?: AvailableColormap;
  follow?: "width" | "height";
  className?: string;
  overlayClassName?: (loading: boolean, error?: string) => string;
}

export type CanvasProps = {
  width: number;
  height: number;
  path: string;
  z: number;
  colormap: AvailableColormap;
  overlayClassName?: (loading: boolean, error?: string) => string;
};

export const Canvas = ({
  width,
  height,
  z,
  colormap,
  path,
  overlayClassName,
}: CanvasProps) => {
  const layerRef = useRef<HTMLCanvasElement>(null);
  const [imageData, setImageData] = useState<ImageBitmap | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | undefined>(undefined);
  const [currentZ, setCurrentZ] = useState(z);

  const { getSelectionAsImageData } = useUnkover();

  const renderImage = async (z: number, path: string) => {
    setLoading(true);
    try {
      let image = await getSelectionAsImageData(
        path,
        [0, 0, z, ":", ":"],
        colormap
      );

      console.log(image);

      let bitmap = await createImageBitmap(image);
      setImageData((image) => bitmap);
      setLoading(false);
    } catch (e) {
      setError((e as Error).toString());
    }
  };

  useEffect(() => {
    if (path && currentZ != undefined) {
      renderImage(currentZ, path);
    }
  }, [currentZ, path]);

  useEffect(() => {
    if (layerRef.current && imageData) {
      let ctx = layerRef?.current?.getContext("2d");
      if (!ctx) {
        return;
      }
      ctx.drawImage(
        imageData,
        0,
        0,
        imageData.width,
        imageData.height,
        0,
        0,
        width,
        height
      );
      setLoading(false);
      setError(undefined);
    }
  }, [layerRef.current, imageData, height, width]);

  return (
    <>
      <div
        className={overlayClassName ? overlayClassName(loading, error) : ""}
        style={{ width: width, height: height, position: "absolute" }}
      >
        {error ? <>error</> : <>Loading</>}
      </div>
      <canvas
        id="c"
        width={width}
        height={height}
        ref={layerRef}
        style={{ position: "absolute" }}
      ></canvas>
    </>
  );
};

export const TwoDKanvas = ({
  path,
  shape,
  className,
  colormap = "jet",
  follow = "width",
  overlayClassName,
}: TwoDKanvasProps) => {
  const [z, setZ] = useState(shape ? Math.floor(shape[2] / 2) : 0);

  const aspectRatio = shape[3] / shape[4];
  return (
    <SafeParentSize debounceTime={800}>
      {({ width, height }) => {
        let bwidth = follow == "width" ? width : height * aspectRatio;
        let bheight = follow == "width" ? width / aspectRatio : height;

        return (
          <div
            style={{ height: bheight, width: bwidth, position: "absolute" }}
            className={className}
          >
            <Canvas
              z={z}
              width={bwidth}
              height={bheight}
              colormap={colormap}
              path={path}
              overlayClassName={overlayClassName}
            />
          </div>
        );
      }}
    </SafeParentSize>
  );
};
