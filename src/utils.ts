import * as zarr from "zarrita";
import { slice } from "zarrita";
import { Axis, Multiscale, Omero } from "./types/ome";
import { NgffImage } from "./image";


export const MAX_CHANNELS = 3;
export const COLORS = {
  cyan: "#00FFFF",
  yellow: "#FFFF00",
  magenta: "#FF00FF",
  red: "#FF0000",
  green: "#00FF00",
  blue: "#0000FF",
  white: "#FFFFFF",
};
export const MAGENTA_GREEN = [COLORS.magenta, COLORS.green];
export const RGB = [COLORS.red, COLORS.green, COLORS.blue];
export const CYMRGB = Object.values(COLORS);

// We use Infinity as a special key to represent fillValue for missing labels in label images,
// since label values are always integers and can't be Infinity. 
export const FILL_VALUE_KEY = Infinity;

// this duplicates Slice() from zarrita as I couldn't import it
export interface Slice {
  start: number | null;
  stop: number | null;
  step: number | null;
}

export function hexToRGB(hex: string): [number, number, number] {
  if (hex.startsWith("#")) hex = hex.slice(1);
  const r = parseInt(hex.slice(0, 2), 16);
  const g = parseInt(hex.slice(2, 4), 16);
  const b = parseInt(hex.slice(4, 6), 16);
  return [r, g, b];
}

export function getDefaultVisibilities(n: number): boolean[] {
  let visibilities: boolean[];
  if (n <= MAX_CHANNELS) {
    // Default to all on if visibilities not specified and less than 6 channels.
    visibilities = Array(n).fill(true);
  } else {
    // If more than MAX_CHANNELS, only make first set on by default.
    visibilities = [
      ...Array(MAX_CHANNELS).fill(true),
      ...Array(n - MAX_CHANNELS).fill(false),
    ];
  }
  return visibilities;
}

export function createOmero(
  {sizeC, sizeZ, sizeT}: {sizeC: number, sizeZ?: number, sizeT?: number},
  dtype: string
): Omero {
  let visibilities = getDefaultVisibilities(sizeC);
  let colors = getDefaultColors(sizeC, visibilities);
  let minMax = getPixelValueRange(dtype);
  let channels = visibilities.map((active, i) => ({
    active,
    color: colors[i],
    window: { min: minMax.min, max: minMax.max },
  }));
  let rdefs = {
    defaultT: sizeT !== undefined ? Math.floor(sizeT / 2) : 0,
    defaultZ: sizeZ !== undefined ? Math.floor(sizeZ / 2) : 0,
    model: "color",
  };
  return { channels, rdefs } as Omero;
}

export function getDefaultColors(
  n: number,
  visibilities: boolean[]
): string[] {
  let colors: string[] = [];
  if (n == 1) {
    colors = [COLORS.white];
  } else if (n == 2) {
    colors = MAGENTA_GREEN;
  } else if (n === 3) {
    colors = RGB;
  } else if (n <= MAX_CHANNELS) {
    colors = CYMRGB.slice(0, n);
  } else {
    // Default color for non-visible is white
    colors = Array(n).fill(COLORS.white);
    // Get visible indices
    const visibleIndices = visibilities.flatMap((bool, i) => (bool ? i : []));
    // Set visible indices to CYMRGB colors. visibleIndices.length === MAX_CHANNELS from above.
    for (const [i, visibleIndex] of visibleIndices.entries()) {
      colors[visibleIndex] = CYMRGB[i];
    }
  }
  colors = colors.map(color => {
    if (color.startsWith("#")) color = color.slice(1);
    return color;
  });
  return colors;
}

export function getDefaultRgbColors(
  n: number,
  visibilities: boolean[]
): [number, number, number][] {
  let colors = getDefaultColors(n, visibilities);
  return colors.map(hexToRGB);
}

export function getMinMaxValues(chunk2d: any): [number, number] {
  const data = chunk2d.data;
  let maxV = 0;
  let minV = Infinity;
  let length = chunk2d.data.length;
  for (let y = 0; y < length; y++) {
    // In case of bigint, convert to number. See #9
    let rawValue = Number(data[y]);
    maxV = Math.max(maxV, rawValue);
    minV = Math.min(minV, rawValue);
  }
  return [minV, maxV];
}

export function getPixelValueRange(dtype: string): { min: number; max: number } {
  // Code migrated from Fileglancer
  // Default values
  let dtypeMin = 0;
  let dtypeMax = 65535;

  if (dtype) {
    // const dtype;
    // Parse numpy-style dtype strings (int8, int16, uint8, etc.)
    if (dtype.includes('int') || dtype.includes('uint')) {
      // Extract the numeric part for bit depth
      const bitMatch = dtype.match(/\d+/);
      if (bitMatch) {
        const bitCount = parseInt(bitMatch[0]);
        if (dtype.startsWith('u')) {
          // Unsigned integer (uint8, uint16, etc.)
          dtypeMin = 0;
          dtypeMax = 2 ** bitCount - 1;
        } else {
          // Signed integer (int8, int16, etc.)
          dtypeMin = -(2 ** (bitCount - 1));
          dtypeMax = 2 ** (bitCount - 1) - 1;
        }
      } else {
        // Try explicit endianness format: <byteorder><type><bytes>
        const oldFormatMatch = dtype.match(/^[<>|]([iuf])(\d+)$/);
        if (oldFormatMatch) {
          const typeCode = oldFormatMatch[1];
          const bytes = parseInt(oldFormatMatch[2], 10);
          const bitCount = bytes * 8;
          if (typeCode === 'i') {
            // Signed integer
            dtypeMin = -(2 ** (bitCount - 1));
            dtypeMax = 2 ** (bitCount - 1) - 1;
          } else if (typeCode === 'u') {
            // Unsigned integer
            dtypeMin = 0;
            dtypeMax = 2 ** bitCount - 1;
          }
        } else {
          console.warn('Could not determine min/max values for dtype: ', dtype);
        }
      }
    } else {
      console.warn('Unrecognized dtype format: ', dtype);
    }
  }
  return { min: dtypeMin, max: dtypeMax };
}

export function range(start: number, end: number): number[] {
  // range(5, 10) -> [5, 6, 7, 8, 9]
  return Array.from({ length: end - start }, (_, i) => i + start);
}

export function boostContrast(
  rgba: Uint8ClampedArray,
  factor: number
): Uint8ClampedArray {
  // Increase contrast by factor
  for (let pixel = 0; pixel < rgba.length / 4; pixel++) {
    for (let i = 0; i < 3; i++) {
      let v = rgba[pixel * 4 + i];
      v = Math.min(255, v * factor);
      rgba[pixel * 4 + i] = v;
    }
  }
  return rgba;
}

export function getHistogram(uint8array: Uint8ClampedArray, bins = 5): number[] {
  // Create histogram from uint8array.
  // Returns list of percentages in each bin
  let hist = new Array(bins).fill(0);
  const binSize = 256 / bins;
  let pixelCount = uint8array.length / 4;
  for (let i = 0; i < pixelCount; i++) {
    // get max of r,g,b
    let maxV = uint8array[i * 4];
    maxV = Math.max(uint8array[i * 4 + 1], maxV);
    maxV = Math.max(uint8array[i * 4 + 2], maxV);
    let bin = Math.floor(maxV / binSize);
    hist[bin] += 1;
  }
  // Normalize to percentage
  hist = hist.map((v) => (100 * v) / pixelCount);
  return hist;
}

// For backwards compatibility - keep this function
export async function getMultiscale(
  group: zarr.Group<zarr.Readable> | zarr.Readable | string,
  options?: { signal?: AbortSignal }
): Promise<{
  multiscale: Multiscale;
  omero: Omero | null | undefined;
  zarr_version: 2 | 3;
}> {
  const img = await NgffImage.load(group, options);
  return {
    multiscale: img.multiscales[0],
    omero: img.omero,
    zarr_version: img.zarr_version,
  };
}

export async function getMultiscaleWithArray(
  group: zarr.Group<zarr.Readable> | zarr.Readable | string,
  datasetIndex: number = 0,
  options?: { signal?: AbortSignal }
): Promise<{
  arr: zarr.Array<any>;
  shapes: number[][] | undefined;
  multiscale: Multiscale;
  omero: Omero | null | undefined;
  scales: number[][];
  zarr_version: 2 | 3;
}> {
  const img = await NgffImage.load(group, options);
  const multiscale = img.multiscales[0];
  const omero = img.omero;
  const zarr_version = img.zarr_version;
  const scales = img.scales;

  // Get the specified zarr array
  const arr = await img.openArray(datasetIndex, options);
  // This uses the cached array to calculate shapes from scales
  let shapes: number[][] | undefined = await img.calcShapes();
  if (shapes.length == 0) {
    shapes = undefined;
  }
  return { arr, shapes, multiscale, omero, scales, zarr_version };
}

export async function openArrayOrGroup(
  src: zarr.Group<zarr.Readable> | zarr.Readable | string,
  kind: "array",
  path?: string,
  zarr_version?: 2 | 3,
  options?: { signal?: AbortSignal }
): Promise<zarr.Array<zarr.DataType>>;
export async function openArrayOrGroup(
  src: zarr.Group<zarr.Readable> | zarr.Readable | string,
  kind: "group",
  path?: string,
  zarr_version?: 2 | 3,
  options?: { signal?: AbortSignal }
): Promise<zarr.Group<zarr.Readable>>;
export async function openArrayOrGroup(
  src: zarr.Group<zarr.Readable> | zarr.Readable | string,
  kind: "array" | "group",
  path?: string,
  zarr_version?: 2 | 3,
  options?: { signal?: AbortSignal }
): Promise<zarr.Array<zarr.DataType> | zarr.Group<zarr.Readable>> {
  const { signal } = options ?? {};
  signal?.throwIfAborted();
  const openFn =
    zarr_version === 3
      ? zarr.open.v3
      : zarr_version === 2
        ? zarr.open.v2
        : zarr.open;

  let location;
  if (src instanceof zarr.Group) {
    location = src;
  } else {
    const store = typeof src === "string" ? new zarr.FetchStore(src) : src;
    location = zarr.root(store);
  }
  if (path) {
    location = location.resolve(path);
  }
  const arrayOrGroup = await openFn(location, { kind });  // TODO https://github.com/manzt/zarrita.js/issues/317
  signal?.throwIfAborted();
  return arrayOrGroup;
}

// For backwards compatibility - keep this function
export async function getArray(
  src: zarr.Group<zarr.Readable> | zarr.Readable | string,
  path?: string,
  zarr_version?: 2 | 3,
  options?: { signal?: AbortSignal }
): Promise<zarr.Array<zarr.DataType>> {
  // deprecation warning
  console.warn(
    "getArray is deprecated and will be removed in future versions. Please use openArray() instead."
  );
  const { signal } = options ?? {};
  return openArray(src, path, zarr_version, { signal});
}

export async function openArray(
  src: zarr.Group<zarr.Readable> | zarr.Readable | string,
  path?: string,
  zarr_version?: 2 | 3,
  options?: { signal?: AbortSignal }
): Promise<zarr.Array<zarr.DataType>> {
  const { signal } = options ?? {};
  signal?.throwIfAborted();
  return openArrayOrGroup(src, "array", path, zarr_version, { signal });
}

export async function openGroup(
  src: zarr.Group<zarr.Readable> | zarr.Readable | string,
  path?: string,
  zarr_version?: 2 | 3,
  options?: { signal?: AbortSignal }
): Promise<zarr.Group<zarr.Readable>> {
  const { signal } = options ?? {};
  signal?.throwIfAborted();
  return openArrayOrGroup(src, "group", path, zarr_version, { signal });
}

export function getSlices(
  activeChannelIndices: number[],
  shape: number[],
  axesNames: string[],
  indices: { [k: string]: number | [number, number] | undefined }
): (number | Slice | undefined)[][] {
  // For each active channel, get a multi-dimensional slice
  let chSlices = activeChannelIndices.map((chIndex: number) => {
    let chSlice = shape.map((dimSize, index) => {
      let name = axesNames[index];
      // channel
      if (name == "c") return chIndex;

      if (name in indices) {
        let idx = indices[name];
        if (Array.isArray(idx)) {
          return slice(idx[0], idx[1]);
        } else if (Number.isInteger(idx)) {
          return idx !== undefined ? idx : undefined;
        }
      }
      // no valid indices supplied, use defaults...
      // x and y - we want full range
      if (name == "x" || name == "y") {
        return slice(0, dimSize);
      }
      // Use omero for z/t if available, otherwise use middle slice
      if (name == "z" || name == "t") {
        return parseInt(dimSize / 2 + "");
      }
      return 0;
    });
    return chSlice;
  });
  return chSlices;
}

// Right-align an axes name list against an array of the given rank, for legacy
// (v0.1-v0.3) files where the constructor synthesizes more axis names than the
// array actually has dimensions (see image.ts's tczyx default). If axes are
// already the right length (or too short), returns the names unchanged.
export function resolveAxesNames(axes: Axis[] | undefined, ndim: number): string[] {
  const names = axes?.map((a) => a.name || a.toString()) ?? ["t", "c", "z", "y", "x"];
  if (names.length > ndim) {
    return names.slice(names.length - ndim);
  }
  return names;
}

// Resolve the indices of the y and x dimensions within an array of the given rank.
// Resolution order: match axis names "y" and "x"; else, if axes and shape ranks
// differ (e.g. synthesized tczyx axes for a lower-rank v0.1-v0.3 array), right-align
// axis names against the trailing dimensions and retry; else take the last two
// axes with type === "space"; else fall back to the last two positions with a warning.
export function resolveYXDimIndices(
  axes: Axis[] | undefined,
  ndim: number
): { yDim: number; xDim: number } {
  const positional = { yDim: ndim - 2, xDim: ndim - 1 };
  if (!axes?.length) {
    return positional;
  }

  const names = axes.map((a) => a.name || a.toString());
  if (names.length === ndim) {
    let yDim = names.indexOf("y");
    let xDim = names.indexOf("x");
    if (yDim !== -1 && xDim !== -1 && yDim !== xDim) {
      return { yDim, xDim };
    }
  } else if (names.length > ndim) {
    // right-align: assume the extra leading axes (e.g. t, c) were dropped, so the
    // trailing `ndim` names map 1:1 onto the actual shape's dimensions.
    const trailingNames = names.slice(names.length - ndim);
    let yDim = trailingNames.indexOf("y");
    let xDim = trailingNames.indexOf("x");
    if (yDim !== -1 && xDim !== -1 && yDim !== xDim) {
      return { yDim, xDim };
    }
  }

  const spaceDims = axes
    .map((a, i) => (a?.type === "space" ? i : -1))
    .filter((i) => i !== -1);
  if (spaceDims.length >= 2 && names.length === ndim) {
    const [yDim, xDim] = spaceDims.slice(-2);
    return { yDim, xDim };
  }

  console.warn(
    `Could not resolve y/x dimensions from axes metadata (axes: ${JSON.stringify(axes)}, ndim: ${ndim}); falling back to the last two dimensions.`
  );
  return positional;
}

export async function createRgbDataUrl(
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
