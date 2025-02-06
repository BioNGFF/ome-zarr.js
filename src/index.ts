import * as zarr from "zarrita";
import { slice } from "zarrita";
// import { Slice } from "@zarrita/indexing";
import { ImageAttrs, Multiscale, Omero } from "./types/ome";
import {
  getDefaultVisibilities,
  hexToRGB,
  getDefaultColors,
  getMinMaxValues,
  renderTo8bitArray,
  MAX_CHANNELS,
} from "./utils";

// For now, the only difference we care about between v0.4 and v0.5 is the nesting
// of the ImageAttrs object within an 'ome' key.
export interface ImageAttrsV5 {
  ome: ImageAttrs;
}
type OmeAttrs = ImageAttrs | ImageAttrsV5;

// Don't try to render thumbnails larger than this
const MAX_SIZE = 1000;

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
  console.log("longestSide", longestSide, "targetSize", targetSize);
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
    console.log("scales", scales, "scalesFrom1", scalesFrom1);

    let pathIndex;
    for (pathIndex = 0; pathIndex < longestSizes.length; pathIndex++) {
      let size = longestSizes[pathIndex];
      let nextSize = longestSizes[pathIndex + 1];
      console.log("pathIndex", pathIndex, "size", size, "nextSize", nextSize);
      if (!nextSize) {
        // we have reached smallest
        console.log("Use smallest!");
        break;
      } else if (nextSize > targetSize) {
        // go smaller
        continue;
      } else {
        // is targetSize closer to this or next?
        let avg = (size + nextSize) / 2;
        console.log("average", avg);
        if (targetSize < avg) {
          pathIndex += 1;
        }
        break;
      }
    }
    console.log("longestSizes", longestSizes);
    console.log("targetSize", targetSize);
    console.log("pathIndex", pathIndex, "result", longestSizes[pathIndex]);
    path = paths[pathIndex];
    zarrLocation = root.resolve(path);
    arr = await openFn(zarrLocation, { kind: "array" });
  }

  return arr;
}

export async function renderThumbnail(
  store: zarr.FetchStore,
  targetSize: number = 100
): Promise<string> {
  const { multiscale, omero, zarr_version } = await getMultiscale(store);

  const arr = await getArray(store, multiscale, targetSize, zarr_version);

  let shape = arr.shape;
  let dims = shape.length;
  let width = shape[dims - 1];
  let height = shape[dims - 2];
  if (height * width > MAX_SIZE * MAX_SIZE) {
    console.log("Lowest resolution too large for Thumbnail: ", shape);
    return "";
  }

  return renderImage(multiscale, arr, omero);
}

export async function renderImage(
  multiscale: Multiscale,
  arr,
  omero: Omero | null | undefined
) {
  let shape = arr.shape;
  let dims = shape.length;
  let width = shape[dims - 1];
  let height = shape[dims - 2];

  // NB: We don't handle pre v0.4 data yet (no axes)
  let axesNames = multiscale.axes.map((a) => a.name);
  let chDim = axesNames.indexOf("c");
  let channel_count = shape[chDim] || 1;
  let visibilities;
  // list of [r,g,b] colors
  let colors;

  // If we have 'omero', use it for channel colors and visibilities
  if (omero) {
    let active_count = 0;
    visibilities = omero.channels.map((ch) => {
      active_count += ch.active ? 1 : 0;
      return ch.active && active_count <= MAX_CHANNELS;
    });
    colors = omero.channels.map((ch) => hexToRGB(ch.color));
  } else {
    visibilities = getDefaultVisibilities(channel_count);
    colors = getDefaultColors(channel_count, visibilities);
  }
  // filter for active channels
  colors = colors.filter((col, idx) => col && visibilities[idx]);
  let activeChannelIndices = visibilities.reduce((prev, active, index) => {
    if (active) prev.push(index);
    return prev;
  }, []);

  // For each active channel, get a multi-dimensional slice
  let chSlices = activeChannelIndices.map((chIndex: number) => {
    let chSlice = shape.map((dimSize, index) => {
      // channel
      if (index == chDim) return chIndex;
      // x and y - we want full range
      if (index >= dims - 2) {
        return slice(0, dimSize);
      }
      // z
      if (axesNames[index] == "z") {
        return parseInt(dimSize / 2 + "");
      }
      if (axesNames[index] == "t") {
        return parseInt(dimSize / 2 + "");
      }
      return 0;
    });
    return chSlice;
  });

  // Wait for all chunks to be fetched...
  let promises = chSlices.map((chSlice: any) => zarr.get(arr, chSlice));
  let ndChunks = await Promise.all(promises);
  console.log("Got all chunks", ndChunks.length);

  // Get min and max values for each chunk, then render to 8bit array
  let minMaxValues = ndChunks.map((ch) => getMinMaxValues(ch));
  let rbgData = renderTo8bitArray(ndChunks, minMaxValues, colors);

  // Use a canvas element to convert the 8bit array to a dataUrl
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d");
  if (!context) {
    return "";
  }
  context.putImageData(new ImageData(rbgData, width, height), 0, 0);
  let dataUrl = canvas.toDataURL("image/png");
  return dataUrl;
}
