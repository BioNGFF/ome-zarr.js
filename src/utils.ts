import * as zarr from "zarrita";
import { ImageAttrs, Multiscale, Omero } from "./types/ome";
import { getLutRgb } from "./luts";

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
export const CYMRGB = Object.values(COLORS).slice(0, -2);

// For now, the only difference we care about between v0.4 and v0.5 is the nesting
// of the ImageAttrs object within an 'ome' key.
export interface ImageAttrsV5 {
  ome: ImageAttrs;
}
type OmeAttrs = ImageAttrs | ImageAttrsV5;

export function hexToRGB(hex: string): [number, number, number] {
  if (hex.startsWith("#")) hex = hex.slice(1);
  const r = parseInt(hex.slice(0, 2), 16);
  const g = parseInt(hex.slice(2, 4), 16);
  const b = parseInt(hex.slice(4, 6), 16);
  return [r, g, b];
}

export function getDefaultVisibilities(n: number) {
  let visibilities;
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

export function getDefaultColors(n: number, visibilities: boolean[]) {
  let colors = [];
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
  return colors.map(hexToRGB);
}

export function getMinMaxValues(chunk2d: any): [number, number] {
  const data = chunk2d.data;
  let maxV = 0;
  let minV = Infinity;
  let length = chunk2d.data.length;
  for (let y = 0; y < length; y++) {
    let rawValue = data[y];
    maxV = Math.max(maxV, rawValue);
    minV = Math.min(minV, rawValue);
  }
  return [minV, maxV];
}

export function range(start: number, end: number) {
  // range(5, 10) -> [5, 6, 7, 8, 9]
  return Array.from({ length: end - start }, (_, i) => i + start);
}

export function renderTo8bitArray(
  ndChunks: any,
  minMaxValues: Array<[number, number]>,
  colors: Array<[number, number, number]>,
  luts: Array<string | undefined> | undefined,
  autoBoost: boolean = false
) {
  // Render chunks (array) into 2D 8-bit data for new ImageData(arr)
  // if autoBoost is true, check histogram and boost contrast if needed
  // ndChunks is list of zarr arrays

  // assume all chunks are same shape
  const shape = ndChunks[0].shape;
  const height = shape[0];
  const width = shape[1];
  const pixels = height * width;

  if (!minMaxValues) {
    minMaxValues = ndChunks.map(getMinMaxValues);
  }

  // load luts if needed
  const lutRgbs = luts?.map((lut) => lut && getLutRgb(lut as string));

  // let rgb = [255, 255, 255];
  let start = performance.now();

  let rgba = new Uint8ClampedArray(4 * height * width).fill(0);
  let offset = 0;
  for (let p = 0; p < ndChunks.length; p++) {
    offset = 0;
    let rgb = colors[p];
    let lutRgb = lutRgbs?.[p];
    let data = ndChunks[p].data;
    let range = minMaxValues[p];
    let inverted = inverteds?.[p];
    for (let y = 0; y < pixels; y++) {
      let rawValue = data[y];
      let fraction = (rawValue - range[0]) / (range[1] - range[0]);
      fraction = Math.min(1, Math.max(0, fraction));
      // for red, green, blue,
      for (let i = 0; i < 3; i++) {
        // rgb[i] is 0-255...
        let v;
        if (lutRgb) {
          let val = (fraction * 255) << 0;
          v = lutRgb[val][i];
        } else {
          v = (fraction * rgb[i]) << 0;
        }
        // increase pixel intensity if value is higher
        rgba[offset * 4 + i] = Math.max(rgba[offset * 4 + i], v);
      }
      rgba[offset * 4 + 3] = 255; // alpha
      offset += 1;
    }
  }
  // if iterating pixels is fast, check histogram and boost contrast if needed
  // Thumbnails are less than 5 millisecs. 512x512 is 10-20 millisecs.
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

function boostContrast(rgba: Uint8ClampedArray, factor: number) {
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

function getHistogram(uint8array: Uint8ClampedArray, bins = 5) {
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

export async function getMultiscale(store: zarr.FetchStore) {
  const data = await zarr.open(store, { kind: "group" });
  let attrs: OmeAttrs = data.attrs as OmeAttrs;

  // Handle v0.4 or v0.5 to get the multiscale object
  let multiscale: Multiscale;
  let omero: Omero | null | undefined;
  let zarr_version: 2 | 3 = 2;
  if ("ome" in attrs) {
    attrs = attrs as ImageAttrsV5;
    multiscale = attrs.ome.multiscales[0];
    omero = attrs.ome.omero;
    zarr_version = 3;
  } else {
    attrs = attrs as ImageAttrs;
    multiscale = attrs.multiscales[0];
    omero = attrs.omero;
  }
  return { multiscale, omero, zarr_version };
}

export async function getArray(
  store: zarr.FetchStore,
  multiscale: Multiscale,
  targetSize: number | undefined,
  zarr_version: 2 | 3 | undefined
): Promise<zarr.Array<any>> {
  const paths: Array<string> = multiscale.datasets.map((d) => d.path);
  // By default, we use the largest thumbnail path (first dataset)
  let root = zarr.root(store);
  const openFn =
    zarr_version === 3
      ? zarr.open.v3
      : zarr_version === 2
      ? zarr.open.v2
      : zarr.open;

  // Open the zarr array and check size
  let path: string = paths[0];
  let zarrLocation = root.resolve(path);
  let arr = await openFn(zarrLocation, { kind: "array" });

  // pick a different dataset level if we want a different size
  let shape = arr.shape;
  let dims = shape.length;
  let width = shape[dims - 1];
  let height = shape[dims - 2];
  let longestSide = Math.max(width, height);
  if (targetSize !== undefined && targetSize < longestSide) {
    // use the multiscale.coordinateTransforms to get relative sizes of arrays
    // NB: only in Zarr v0.4 and v0.5 (otherwise have to load arrays in turn, or guess!)
    let scales: number[] = multiscale.datasets.map((ds) => {
      if (Array.isArray(ds.coordinateTransformations)) {
        let ct = ds.coordinateTransformations.find(
          (ct: any) => "scale" in ct
        ) as { scale: number[] };
        let scaleX = ct.scale.at(-1) as number;
        return scaleX;
      }
      // TODO: handle missing coordinateTransformations
      return 1;
    });
    let scalesFrom1 = scales.map((scale) => scale / scales[0]);
    let longestSizes = scalesFrom1.map((scale) => longestSide / scale);

    let pathIndex;
    for (pathIndex = 0; pathIndex < longestSizes.length; pathIndex++) {
      let size = longestSizes[pathIndex];
      let nextSize = longestSizes[pathIndex + 1];
      if (!nextSize) {
        // we have reached smallest
        break;
      } else if (nextSize > targetSize) {
        // go smaller
        continue;
      } else {
        // is targetSize closer to this or next?
        let avg = (size + nextSize) / 2;
        if (targetSize < avg) {
          pathIndex += 1;
        }
        break;
      }
    }
    path = paths[pathIndex];
    zarrLocation = root.resolve(path);
    arr = await openFn(zarrLocation, { kind: "array" });
  }

  return arr;
}
