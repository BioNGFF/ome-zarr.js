import * as zarr from "zarrita";

import { Axis, Omero, Channel } from "./types/ome";
import {
  getDefaultVisibilities,
  hexToRGB,
  getDefaultRgbColors,
  getMinMaxValues,
  getSlices,
  getHistogram,
  boostContrast,
  renderTo8bitArray,
  MAX_CHANNELS,
} from "./utils";
import { getLutRgb } from "./luts";

export type Color = [number, number, number] | [number, number, number, number];
export type Blending = "additive" | "translucent";

export function renderChannel(
  chunk: zarr.Chunk<zarr.NumberDataType | zarr.BigintDataType>,
  func: (value: number) => Color,
  options?: { target?: Uint8ClampedArray; blending?: Blending }
): Uint8ClampedArray {
  // Core rendering function. Takes a chunk, and a function that maps intensity values to colors,
  // and renders to an RGBA array, according to the blending mode.
  // If target is provided, it is used as the initial RGBA array, and blended with the new colors.
  const { target, blending = "additive" } = options ?? {};

  const [height, width] = chunk.shape;
  const data = target ?? new Uint8ClampedArray(4 * height * width).fill(0);
  const n = height * width * 4;
  let dIndex = 0;
  for (let i = 0; i < n; i += 4) {
    // ! in this line suppresses TypeScript error about possible undefined
    const value = Number(chunk.data[dIndex]!);
    dIndex += 1;
    const [r, g, b, alpha = 255] = func(value);
    const alphaSrc = data[i + 3] / 255;
    const alphaDst = (alpha ?? 255) / 255;
    if (blending === "additive") {
      // Additive blending: ADD to existing color (modified by existing alpha)
      data[i] = Math.min(data[i] * alphaSrc + r, 255);
      data[i + 1] = Math.min(data[i + 1] * alphaSrc + g, 255);
      data[i + 2] = Math.min(data[i + 2] * alphaSrc + b, 255);
      data[i + 3] = Math.min(alphaSrc + alphaDst, 1.0) * 255;
    } else if (blending === "translucent") {
      // A over B (Porter & Duff, 1984)
      // https://en.wikipedia.org/wiki/Alpha_compositing
      data[i] = r * alphaDst + data[i] * alphaSrc * (1 - alphaDst);
      data[i + 1] =
        g * alphaDst + data[i + 1] * alphaSrc * (1 - alphaDst);
      data[i + 2] =
        b * alphaDst + data[i + 2] * alphaSrc * (1 - alphaDst);
      data[i + 3] = (alphaDst + alphaSrc * (1 - alphaDst)) * 255;
    } else {
      throw new Error("Invalid blending mode");
    }
  }
  return data;
}

export function renderChannelWithLUT(
  chunk: zarr.Chunk<zarr.NumberDataType | zarr.BigintDataType>,
  lut: Color[],
  options?: {
    target?: Uint8ClampedArray;
    blending?: Blending;
    range?: [number, number];
  }
): Uint8ClampedArray {
  // LUT is an array of [r,g,b] or [r,g,b,a] colors, from "darkest" to "brightest"
  // The intensity value from the chunk is mapped to a color in the LUT, scaling
  // over the min/max range if provided.
  // In no range is provided, chunk values are used directly as indices into the LUT.
  // Values outside the range are clamped to the first/last value in the LUT.
  const bins = lut.length;
  const { target, blending = "additive", range = [0, bins - 1] } = options ?? {};

  function func(value: number): Color {
    const [min, max] = range;
    if (value < min) value = min;
    if (value > max) value = max;
    value = Math.round(((bins - 1) * (value - min)) / (max - min));
    return lut[value];
  }

  return renderChannel(chunk, func, { target, blending });
}

export function renderChannelWithColormap(
  chunk: zarr.Chunk<zarr.NumberDataType | zarr.BigintDataType>,
  colormap: Map<number, Color>,
  options?: {
    target?: Uint8ClampedArray;
    blending?: Blending;
    fillValue?: Color;
  }
): Uint8ClampedArray {
  // The intensity value from the chunk is used to lookup a color in the colormap,
  // which is a Map of value -> [r,g,b] or [r,g,b,a].
  // If not found, the fillValue is used (default [0,0,0,0])
  const {
    target,
    blending = "additive",
    fillValue = [0, 0, 0, 0],
  } = options ?? {};

  function func(value: number): Color {
    return colormap.get(value) ?? fillValue;
  }

  return renderChannel(chunk, func, { target, blending });
}

export async function getRgba(
  arr: zarr.Array<any, zarr.Readable>,
  axes: Axis[],
  channels: Channel[] | null | undefined,
  sliceIndices: { [k: string]: number | [number, number] | undefined },
  originalShape: number[] | undefined,
  autoBoost: boolean,
  options?: { signal?: AbortSignal }
): Promise<{
  data: Uint8ClampedArray;
  width: number;
  height: number;
}> {
  const { signal } = options ?? {};
  signal?.throwIfAborted();

  let shape = arr.shape;

  // NB: v0.2 no axes. v0.3 is just list of 'x', 'y', 'z', 'c', 't'
  // v0.4 onwards is list of Axis objects
  let axesNames = axes?.map((a) => a.name || a.toString()) || [
    "t",
    "c",
    "z",
    "y",
    "x",
  ];
  let chDim = axesNames.indexOf("c");
  let channel_count = shape[chDim] || 1;
  let visibilities;
  // list of [r,g,b] colors
  let rgbColors: Array<[number, number, number]>;
  let luts: (string | undefined)[] = [];
  let inverteds: Array<boolean> | undefined = undefined;

  // If we have 'omero', use it for channel rgbColors and visibilities
  if (channels) {
    let active_count = 0;
    visibilities = channels.map((ch) => {
      if (ch.active == undefined) {
        ch.active = true;
      }
      active_count += ch.active ? 1 : 0;
      return ch.active && active_count <= MAX_CHANNELS;
    });
    rgbColors = channels.map((ch) => hexToRGB(ch.color));
    luts = channels.map((ch) =>
      "lut" in ch ? (ch.lut as string) : undefined
    );
  } else {
    visibilities = getDefaultVisibilities(channel_count);
    rgbColors = getDefaultRgbColors(channel_count, visibilities);
  }
  // filter for active channels
  let activeChannelIndices: number[] = visibilities.reduce(
    (prev: number[], active, index) => {
      if (active) prev.push(index);
      return prev;
    },
    []
  );
  rgbColors = activeChannelIndices.map((chIndex: number) => rgbColors[chIndex]);
  inverteds = activeChannelIndices.map((chIndex: number) =>
    Boolean(channels?.[chIndex]?.inverted)
  );
  if (luts !== undefined) {
    luts = luts.filter((_, index) => activeChannelIndices.includes(index));
  }

  // sliceIndices are from originalShape if provided
  let chSlices = getSlices(
    activeChannelIndices,
    shape,
    axesNames,
    sliceIndices,
    originalShape
  );

  // Wait for all chunks to be fetched...
  let promises = chSlices.map((chSlice: any) =>
    zarr.get(arr, chSlice, { opts: { signal } })
  );
  let ndChunks = await Promise.all(promises);
  signal?.throwIfAborted();

  // Use start/end values from 'omero' if available, otherwise calculate min/max
  let minMaxValues = activeChannelIndices.map(
    (chIndex: number, i: number): [number, number] => {
      if (channels && channels[chIndex]) {
        let chOmero = channels[chIndex];
        if (
          chOmero?.window?.start !== undefined &&
          chOmero?.window?.end !== undefined
        ) {
          return [chOmero.window.start, chOmero.window.end];
        }
      }
      return getMinMaxValues(ndChunks[i]);
    }
  );

  console.time("renderTo8bitArray2");
  let data = renderTo8bitArray2(
    ndChunks,
    minMaxValues,
    rgbColors,
    luts,
    inverteds,
    autoBoost
  );
  console.timeEnd("renderTo8bitArray2");
  console.log("ch", ndChunks.length, "shape", ndChunks[0].shape);

  const height = ndChunks[0].shape[0];
  const width = ndChunks[0].shape[1];
  return { data, width, height };
}

export function renderTo8bitArray2(
  ndChunks: any,
  minMaxValues: Array<[number, number]>,
  colors: Array<[number, number, number]>,
  luts: Array<string | undefined> | undefined,
  inverteds: Array<boolean> | undefined,
  autoBoost: boolean = false
): Uint8ClampedArray {
  // This is new version of renderTo8bitArray
  // For each channel in ndChunks...

  let masterLuts = colors.map((color, i) => {
    let lutName = luts?.length ? luts[i] : undefined;
    let lut: Color[];
    if (lutName) {
      lut = getLutRgb(lutName as string) as Color[];
    } else {
      lut = Array.from({ length: 256 }, (_, i) => [color[0] * i/255, color[1] * i/255, color[2] * i/255, 255]);
    }
    if (inverteds && inverteds[i]) {
      lut = lut.reverse() as Color[];
    }
    return lut;
  });

  let start = performance.now();

  // init the rgba array with first channel, then blend in subsequent channels
  let rgba = renderChannelWithLUT(ndChunks[0], masterLuts[0], { range: minMaxValues[0] })
  for (let i = 1; i < ndChunks.length; i++) {
    let channelRgba = renderChannelWithLUT(ndChunks[i], masterLuts[i], { blending: "additive", target: rgba, range: minMaxValues[i] });
    rgba = channelRgba;
  }

  if (performance.now() - start < 100 && autoBoost) {
    let bins = 5;
    let hist = getHistogram(rgba, bins);
    // If top bin, has less than 1% of pixesl, boost contrast
    if (hist[bins - 1] < 1) {
      let factor = 2;
      rgba = boostContrast(rgba, factor);
    }
  }
  return rgba;
}

export async function convertRgbDataToDataUrl(
  rbgData: Uint8ClampedArray,
  width: number
): Promise<string> {
  let h = rbgData.length / (width * 4);
  if (typeof document !== "undefined") {
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = h;
    const ctx = canvas.getContext("2d");
    if (!ctx) return "";
    ctx.putImageData(new ImageData(rbgData, width, h), 0, 0);
    return canvas.toDataURL("image/png");
  } else {
    const { PNG } = await import("pngjs");
    const { Buffer } = await import("buffer");
    const png = new PNG({ width, height: h });
    png.data = Buffer.from(
      rbgData.buffer,
      rbgData.byteOffset,
      rbgData.byteLength
    );
    const chunks: Buffer[] = [];
    const stream = png.pack();
    return new Promise((resolve, reject) => {
      stream.on("data", (c) => chunks.push(c));
      stream.on("end", () => {
        resolve(
          `data:image/png;base64,${Buffer.concat(chunks).toString("base64")}`
        );
      });
      stream.on("error", reject);
    });
  }
}
