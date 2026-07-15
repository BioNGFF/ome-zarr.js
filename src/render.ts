import * as zarr from "zarrita";

import { Axis, Channel, Color } from "./types/ome";
import {
  getDefaultVisibilities,
  hexToRGB,
  getDefaultRgbColors,
  getMinMaxValues,
  getSlices,
  getHistogram,
  boostContrast,
  MAX_CHANNELS,
  FILL_VALUE_KEY,
} from "./utils";

export type Blending = "additive" | "translucent";

export type Projection = "max" | "mean" | "sum";

/**
 * Collapse one axis of a chunk, returning a new chunk with that axis removed.
 *
 * The result is a plain object with `data` / `shape` / `stride`, which is all
 * that renderChunk() and getMinMaxValues() need
 * The rendering (LUTs, colormaps, inverted, blending, autoBoost) is unchanged.
 *
 */
export function projectChunk(
  chunk: zarr.Chunk<zarr.NumberDataType | zarr.BigintDataType>,
  axis: number,
  how: Projection = "max"
): zarr.Chunk<any> {
  const shape = chunk.shape;
  const src = chunk.data as any;

  if (axis < 0 || axis >= shape.length) {
    throw new Error(
      `projectChunk: axis ${axis} out of range for shape [${shape}]`
    );
  }

  const n = shape[axis];

  // C-order strides for the source
  const strides: number[] = new Array(shape.length);
  let s = 1;
  for (let d = shape.length - 1; d >= 0; d--) {
    strides[d] = s;
    s *= shape[d];
  }
  const axisStride = strides[axis];

  const outShape = shape.filter((_, d) => d !== axis);
  const outAxes = shape.map((_, d) => d).filter((d) => d !== axis);
  const outLen = outShape.reduce((a, b) => a * b, 1);

  const outStrides: number[] = new Array(outShape.length);
  let os = 1;
  for (let d = outShape.length - 1; d >= 0; d--) {
    outStrides[d] = os;
    os *= outShape[d];
  }

  const isBig = typeof src[0] === "bigint";


  // "max" and "mean" stay within the source range, so keep the source dtype.
  // "sum" can exceed it. Widen to Float32 so accumulated value survives
  const OutCtor = how === "sum" ? Float32Array : (src.constructor as any);
  const out = new OutCtor(outLen);
  // -----------------------------------------------

  for (let o = 0; o < outLen; o++) {
    // decompose the flat output index into coords, map back to the source
    // offset with the projected axis at 0
    let rem = o;
    let base = 0;
    for (let d = 0; d < outShape.length; d++) {
      const c = (rem / outStrides[d]) | 0;
      rem -= c * outStrides[d];
      base += c * strides[outAxes[d]];
    }

    if (how === "max") {
      let m = src[base];
      for (let k = 1; k < n; k++) {
        const v = src[base + k * axisStride];
        if (v > m) m = v;
      }
      out[o] = m;
    } else {
      let sum = 0;
      for (let k = 0; k < n; k++) {
        sum += Number(src[base + k * axisStride]);
      }
      // only mean rounds back into an integer dtype
      if (how === "mean") {
        const val = sum / n;
        out[o] = isBig ? BigInt(Math.round(val)) : val;
      } else {
        // "sum" -> Float32 output, write the raw accumulated value
        out[o] = sum;
      }
      // ---------------------------------------------------------------
    }
  }

  return { data: out, shape: outShape, stride: outStrides } as any;
}
export function renderChunk(
  chunk: zarr.Chunk<zarr.NumberDataType | zarr.BigintDataType>,
  transferFunc: (value: number) => Color,
  options?: { dst?: Uint8ClampedArray; blending?: Blending }
): Uint8ClampedArray {
  // Core rendering function. Takes a chunk, and a function that maps intensity values to colors,
  // and renders to an RGBA array, according to the blending mode.
  // If target is provided, it is used as the initial RGBA array, and blended with the new colors.
  const { dst, blending = "additive" } = options ?? {};

  const [height, width] = chunk.shape;
  const data = dst ?? new Uint8ClampedArray(4 * height * width).fill(0);
  const n = height * width * 4;
  let dIndex = 0;
  for (let i = 0; i < n; i += 4) {
    // ! in this line suppresses TypeScript error about possible undefined
    const value = Number(chunk.data[dIndex]!);
    dIndex += 1;
    const [r, g, b, alpha = 255] = transferFunc(value);
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

export function renderChunkWithLUT(
  chunk: zarr.Chunk<zarr.NumberDataType | zarr.BigintDataType>,
  lut: Color[],
  options?: {
    dst?: Uint8ClampedArray;
    blending?: Blending;
    range?: [number, number];
  }
): Uint8ClampedArray {
  // LUT is an array of [r,g,b] or [r,g,b,a] colors, from "darkest" to "brightest"
  // The intensity value from the chunk is mapped to a color in the LUT, scaling
  // over the min/max range if provided.
  // If no range is provided, chunk values are used directly as indices into the LUT.
  // Values less than 0 are clamped to the first value in the LUT.
  // Values greater than the length of the LUT are "modulo" the LUT length,
  // so the LUT will repeat, excluding the FIRST value which is reserved for 0 values.
  // e.g. if LUT has 256 values, and chunk value is 257, it will use LUT[1].
  const bins = lut.length;
  const { dst, blending = "additive" } = options ?? {};

  let transferFunc: (value: number) => Color;
  if (options?.range) {
    const range = options.range;
    transferFunc = function(value: number): Color {
      const [min, max] = range;
      if (value < min) value = min;
      if (value > max) value = max;
      value = Math.round(((bins - 1) * (value - min)) / (max - min));
      return lut[value];
    }
  } else {
    transferFunc = function(value: number): Color {
      if (value <= 0) return lut[0];
      const index = ((value - 1) % (bins - 1)) + 1;
      return lut[index];
    }
  }

  return renderChunk(chunk, transferFunc, { dst, blending });
}

export function renderChunkWithColormap(
  chunk: zarr.Chunk<zarr.NumberDataType | zarr.BigintDataType>,
  colormap: Map<number, Color>,
  options?: {
    dst?: Uint8ClampedArray;
    blending?: Blending;
    fillValue?: Color;
  }
): Uint8ClampedArray {
  // The intensity value from the chunk is used to lookup a color in the colormap,
  // which is a Map of value -> [r,g,b] or [r,g,b,a].
  // If not found, the fillValue is used (default [0,0,0,0])
  const {
    dst,
    blending = "additive",
    fillValue = [0, 0, 0, 0],
  } = options ?? {};

  function transferFunc(value: number): Color {
    return colormap.get(value) ?? fillValue;
  }

  return renderChunk(chunk, transferFunc, { dst, blending });
}

export async function renderArray(
  arr: zarr.Array<any, zarr.Readable>,
  axes: Axis[],
  channels: Channel[] | null | undefined,
  sliceIndices: { [k: string]: number | [number, number] | undefined },
  autoBoost: boolean,
  options?: {
    signal?: AbortSignal;
    calcMinMaxForRange?: boolean;
    projection?: Projection;
    projectionAxis?: string;
  }
): Promise<{
  data: Uint8ClampedArray;
  width: number;
  height: number;
}> {
  const {
    signal,
    calcMinMaxForRange,
    projection,
    projectionAxis = "z",
  } = options ?? {};
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
  let lutsOrColorMaps: (Color[] | Map<number, Color> | undefined)[] = [];
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
    lutsOrColorMaps = channels.map((ch) =>
      ("lut" in ch && ch.lut) ? (ch.lut as Color[]) : "colorMap" in ch ? (ch.colorMap as Map<number, Color>) : undefined
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
  if (lutsOrColorMaps !== undefined) {
    lutsOrColorMaps = lutsOrColorMaps.filter((_, index) => activeChannelIndices.includes(index));
  }

  // For a projection, the projected axis must be fetched as a FULL RANGE, not as
  // a single index. Override whatever the caller (or omero rdefs) asked for.
  let effectiveSlices = sliceIndices;
  if (projection) {
    if (!axesNames.includes(projectionAxis)) {
      throw new Error(
        `Cannot project along '${projectionAxis}': image has axes [${axesNames}]`
      );
    }
    effectiveSlices = { ...sliceIndices };
    // The projected axis must be a full range...
    const pDim = axesNames.indexOf(projectionAxis);
    effectiveSlices[projectionAxis] = [0, shape[pDim]];
    // ...and so must the two spatial axes we keep. getSlices() gives x/y a full
    // range by default, but defaults z to a MIDDLE INDEX - which would collapse
    // it to a scalar and leave us with a 2D chunk when projecting along y or x.
    for (const name of ["z", "y", "x"]) {
      if (name === projectionAxis) continue;
      const d = axesNames.indexOf(name);
      if (d === -1) continue;
      if (effectiveSlices[name] === undefined || !Array.isArray(effectiveSlices[name])) {
        effectiveSlices[name] = [0, shape[d]];
      }
    }
  }
  let chSlices = getSlices(
    activeChannelIndices,
    shape,
    axesNames,
    effectiveSlices
  );

  // Wait for all chunks to be fetched...
  let promises = chSlices.map((chSlice: any) =>
    zarr.get(arr, chSlice, { opts: { signal } })
  );
  let ndChunks = await Promise.all(promises);
  signal?.throwIfAborted();

  // Collapse the projection axis, turning each 3D chunk into a 2D one.
  if (projection) {
    const pDim = axesNames.indexOf(projectionAxis);

    // Which index is the projection axis WITHIN the fetched chunk?
    let pInChunk = 0;
    for (let d = 0; d < pDim; d++) {
      const name = axesNames[d];
      const sel = effectiveSlices[name];
      const isScalar = name === "c" || (sel !== undefined && !Array.isArray(sel));
      if (!isScalar) pInChunk++;
    }
    ndChunks = ndChunks.map((chunk: any) =>
      projectChunk(chunk, pInChunk, projection)
    );
  }

  // Use start/end values from 'omero' if available, otherwise calculate min/max.
  // NB: for a projection this is computed on the PROJECTED values, which is what
  // we want — the range should match what is actually displayed.
  let ranges = activeChannelIndices.map(
    (chIndex: number, i: number): [number, number] | undefined => {
      if (channels && channels[chIndex]) {
        let chOmero = channels[chIndex];
        if (
          chOmero?.window?.start !== undefined &&
          chOmero?.window?.end !== undefined
        ) {
          return [chOmero.window.start, chOmero.window.end];
        }
      }
      if (calcMinMaxForRange) {
        return getMinMaxValues(ndChunks[i]);
      }
      return undefined;
    }
  );

  let data = renderChunks(
    ndChunks,
    ranges,
    rgbColors,
    lutsOrColorMaps,
    inverteds,
    autoBoost
  );

  const height = ndChunks[0].shape[0];
  const width = ndChunks[0].shape[1];
  return { data, width, height };
}

export function renderChunks(
  ndChunks: any,
  ranges: Array<[number, number] | undefined>,
  colors: Array<[number, number, number]>,
  lutsOrColorMaps: Array<Color[] | Map<number, Color> | undefined> | undefined,
  inverteds: Array<boolean> | undefined,
  autoBoost: boolean = false
): Uint8ClampedArray {
  // Render the given chunks (one per channel) to an RGBA array, using the provided colors and ranges for each channel.
  // If lutsOrColorMaps are provided, they are used instead of the colors.
  // NB: If any ranges are undefined, the pixel values are used as indices into the LUT (or LUT created from the color).
  // A LUT is an array of [r,g,b] or [r,g,b,a] colors, from "darkest" to "brightest". Range is scaled over the min/max values
  // for the channel, and values outside the range are clamped to the first/last value in the LUT.
  // A colormap is a Map of value -> [r,g,b] or [r,g,b,a].
  // If inverteds is provided, the LUTs or colors will be reversed for channels where inverteds[i] is true.

  let masterLutsMaps = colors.map((color, i) => {
    let lutOrMap = lutsOrColorMaps?.length ? lutsOrColorMaps[i] : undefined;
    // If no LUT or colormap is provided, create a default LUT based on the channel color
    if (!lutOrMap) {
      lutOrMap = Array.from({ length: 256 }, (_, i) => [color[0] * i/255, color[1] * i/255, color[2] * i/255, 255]);
    }
    if (inverteds && inverteds[i] && Array.isArray(lutOrMap)) {
      lutOrMap = lutOrMap.reverse() as Color[];
    }
    return lutOrMap;
  });

  let start = performance.now();

  let rgba: Uint8ClampedArray;
  // init the rgba array with first channel, then blend in subsequent channels
  if (masterLutsMaps[0] instanceof Map) {
    let colorMap = masterLutsMaps[0] as Map<number, Color>;
    let fillValue: Color | undefined = colorMap.get(FILL_VALUE_KEY);
    rgba = renderChunkWithColormap(ndChunks[0], colorMap as Map<number, Color>, { fillValue });
  } else {
    rgba = renderChunkWithLUT(ndChunks[0], masterLutsMaps[0] as Color[], { range: ranges[0] });
  }
  for (let i = 1; i < ndChunks.length; i++) {
    if (masterLutsMaps[i] instanceof Map) {
      let colorMap = masterLutsMaps[i] as Map<number, Color>;
      let fillValue: Color | undefined = colorMap.get(Infinity);
      let channelRgba = renderChunkWithColormap(ndChunks[i], colorMap, { blending: "additive", dst: rgba, fillValue });
      rgba = channelRgba;
    } else {
      let channelRgba = renderChunkWithLUT(ndChunks[i], masterLutsMaps[i] as Color[], { blending: "additive", dst: rgba, range: ranges[i] });
      rgba = channelRgba;
    }
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
