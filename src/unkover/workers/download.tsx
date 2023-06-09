// workers/auth.js - will be run in worker thread
import { expose } from "threads/worker";
import { AwsClient } from "aws4fetch";
import {
  getCodec,
  addCodec,
  openGroup,
  TypedArray,
  TypedArrayConstructor,
  ZarrArray,
} from "zarr";
import { DtypeString, ZarrArrayMetadata } from "zarr/types/types";
import { joinUrlParts, S3Store } from "../zarro/store";
import { ArraySelection, ChunkProjection } from "zarr/types/core/types";
import {
  BasicIndexer,
  isContiguousSelection,
  isTotalSlice,
} from "../zarro/indexing";
import c from "colormap";
import { Zlib, GZip, Blosc } from "numcodecs";
import { NestedArray } from "../zarro/nested";

addCodec(Blosc.codecId, () => Blosc);

function ensureByteArray(chunkData: ArrayBuffer): Uint8Array {
  if (typeof chunkData === "string") {
    return new Uint8Array(chunkData);
  }
  return new Uint8Array(chunkData);
}
export function byteSwapInplace(src: TypedArray): void {
  const b = src.BYTES_PER_ELEMENT;
  if (b === 1) return; // no swapping needed
  // In browser, need to flip manually
  // Adapted from https://github.com/zbjornson/node-bswap/blob/master/bswap.js
  const flipper = new Uint8Array(src.buffer, src.byteOffset, src.length * b);
  const numFlips = b / 2;
  const endByteIndex = b - 1;
  let t: number;
  for (let i = 0; i < flipper.length; i += b) {
    for (let j = 0; j < numFlips; j++) {
      t = flipper[i + j];
      flipper[i + j] = flipper[i + endByteIndex - j];
      flipper[i + endByteIndex - j] = t;
    }
  }
}

type ExtendedDTypeSring = DtypeString | "<i8";

const DTYPE_TYPEDARRAY_MAPPING: {
  [A in ExtendedDTypeSring]: TypedArrayConstructor<TypedArray>;
} = {
  "|b": Int8Array,
  "|B": Uint8Array,
  "|u1": Uint8Array,
  "|i1": Int8Array,
  "<i8": BigInt64Array,
  "<b": Int8Array,
  "<B": Uint8Array,
  "<u1": Uint8Array,
  "<i1": Int8Array,
  "<u2": Uint16Array,
  "<i2": Int16Array,
  "<u4": Uint32Array,
  "<i4": Int32Array,
  "<f4": Float32Array,
  "<f8": Float64Array,
  ">b": Int8Array,
  ">B": Uint8Array,
  ">u1": Uint8Array,
  ">i1": Int8Array,
  ">u2": Uint16Array,
  ">i2": Int16Array,
  ">u4": Uint32Array,
  ">i4": Int32Array,
  ">f4": Float32Array,
  ">f8": Float64Array,
};

export function getTypedArrayCtr(dtype: DtypeString) {
  const ctr = DTYPE_TYPEDARRAY_MAPPING[dtype];
  if (!ctr) {
    throw Error(
      `Dtype not recognized or not supported in zarr.js, got ${dtype}.`
    );
  }
  return ctr;
}

const downloadChunk = async (
  client: AwsClient,
  url: string,
  array: ZarrArray
) => {
  //console.log(x);
  console.time(`download ${url}`);
  let data = await client.fetch(url);
  console.timeEnd(`download ${url}`);
  let out = ensureByteArray(await data.arrayBuffer());
  let meta = array.meta;
  let dtype = array.dtype;

  console.time(`decode ${url}`);
  if (meta.compressor) {
    let x = await getCodec(meta.compressor);
    console.log(x);
    out = await x.decode(out);
  }
  console.timeEnd(`decode ${url}`);

  if (dtype.includes(">")) {
    // Need to flip bytes for Javascript TypedArrays
    // We flip bytes in-place to avoid creating an extra copy of the decoded buffer.
    byteSwapInplace(new (getTypedArrayCtr(dtype))(out.buffer));
  }
  //console.log(out);
  return new (getTypedArrayCtr(dtype))(out.buffer);
};

const getChunk = async (
  aws: AwsClient,
  chunkCoords: number[],
  array: ZarrArray,
  path: string
) => {
  const url = joinUrlParts(
    path,
    array.keyPrefix + chunkCoords.join(array.meta.dimension_separator ?? ".")
  );

  return await downloadChunk(aws, url, array);
};

const getChunkItem = async (
  aws: AwsClient,
  proj: ChunkProjection,
  array: ZarrArray,
  path: string
) => {
  const rawChunk = await getChunk(aws, proj.chunkCoords, array, path);
  const decodedChunk = new NestedArray(
    rawChunk,
    array.meta.chunks,
    array.dtype
  );

  if (
    isContiguousSelection(proj.outSelection) &&
    isTotalSlice(proj.chunkCoords, array.chunks) &&
    !array.meta.filters
  ) {
    return { decodedChunk, proj };
  }

  return { decodedChunk: decodedChunk.get(proj.chunkSelection), proj };
};

export const renderSelection = async (
  path: string,
  selection: ArraySelection,
  accessKeyId: string,
  secretAccessKey: string,
  sessionToken: string,
  colormap: string
) => {
  let aws = new AwsClient({
    accessKeyId: accessKeyId,
    secretAccessKey: secretAccessKey,
    sessionToken: sessionToken,
    service: "s3",
  });
  let store = new S3Store(path, aws);

  let group = await openGroup(store, "", "r");
  let array = (await group.getItem("data")) as ZarrArray;

  let indexer = new BasicIndexer(selection, array);
  const outShape = indexer.shape;
  if (outShape.length !== 2) {
    throw Error(
      `Only 2D selections are supported, got ${outShape.length}D selection.`
    );
  }
  if (outShape[0] * outShape[1] > 4194304) {
    throw Error(
      `Selection is too large, got ${outShape[0]}x${outShape[1]} pixels.`
    );
  }

  const outDtype = array.dtype;
  const outSize = indexer.shape.reduce((x, y) => x * y, 1);

  const out = new NestedArray(null, outShape, outDtype);
  if (outSize === 0) {
    return out;
  }

  let promises = [];

  for (const proj of indexer.iter()) {
    promises.push(getChunkItem(aws, proj, array, path));
  }

  let chunkPairs = await Promise.all(promises);
  console.log(chunkPairs.length);

  for (const { decodedChunk, proj } of chunkPairs) {
    out.set(proj.outSelection, decodedChunk);
  }

  let data = out;

  let flattend = out.flatten();

  let min = 0;
  let max = 0;

  let imgwidth = data.shape[1];
  let imgheight = data.shape[0];
  console.log(imgheight, imgwidth);

  let converted = new Array(imgwidth * imgheight);

  for (var i = 0; i < imgwidth * imgheight; i++) {
    converted[i] = Number(flattend[i]);
    if (flattend[i] < min) {
      min = Number(flattend[i]);
    }
    if (flattend[i] > max) {
      max = Number(flattend[i]);
    }
  }

  let colors = c({
    nshades: 256,
    colormap: colormap,
    format: "rgba",
    alpha: 255,
  });

  let iData = new Array(imgwidth * imgheight * 4);

  let z = 0;
  for (let j = 0; j < imgheight; j++) {
    for (let i = 0; i < imgwidth; i++) {
      let val = Number(data.get([j, i]));
      let colorIndex = Math.floor(((val - min) / max) * 255);
      if (colorIndex > 255) {
        colorIndex = 255;
      }
      if (colorIndex < 0) {
        colorIndex = 0;
      }
      //console.log((val / max) * 255);

      let color = colors[colorIndex] || [255, 0, 255, 255];

      iData[z] = color[0];
      iData[z + 1] = color[1];
      iData[z + 2] = color[2];
      iData[z + 3] = 255;
      z += 4;
    }
  }

  return new ImageData(new Uint8ClampedArray(iData), imgwidth, imgheight);
};
