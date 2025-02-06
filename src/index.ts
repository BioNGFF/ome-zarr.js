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

export async function renderThumbnail(
  store: zarr.FetchStore,
  thumbDatasetIndex?: number
): Promise<string> {
  // create 'root' so we can traverse the zarr store (below)
  let root = zarr.root(store);
  const data = await zarr.open(root, { kind: "group" });

  let attrs: OmeAttrs = data.attrs as OmeAttrs;

  // Handle v0.4 or v0.5 to get the multiscale object
  let multiscale: Multiscale;
  let zarr_version: 2 | 3 = 2;
  if ("ome" in attrs) {
    attrs = attrs as ImageAttrsV5;
    multiscale = attrs.ome.multiscales[0];
    zarr_version = 3;
  } else {
    attrs = attrs as ImageAttrs;
    multiscale = attrs.multiscales[0];
  }

  const paths: Array<string> = multiscale.datasets.map((d) => d.path);
  // By default, we use the smallest thumbnail path (last dataset)
  let path: string = paths[paths.length - 1];
  if (thumbDatasetIndex != undefined && thumbDatasetIndex < paths.length) {
    // but if we have a valid dataset index, use that...
    path = paths[thumbDatasetIndex];
  }

  // Open the zarr array and check size
  const zarrLocation = root.resolve(path);
  const openFn = zarr_version === 3 ? zarr.open.v3 : zarr.open.v2;
  const arr = await openFn(zarrLocation, { kind: "array" });
  let shape = arr.shape;
  let dims = shape.length;
  let width = shape[dims - 1];
  let height = shape[dims - 2];
  if (height * width > MAX_SIZE * MAX_SIZE) {
    console.log("Lowest resolution too large for Thumbnail: ", shape);
    return "";
  }

  // NB: We don't handle pre v0.4 data yet (no axes)
  let axesNames = multiscale.axes.map((a) => a.name);
  let chDim = axesNames.indexOf("c");
  let channel_count = shape[chDim] || 1;
  let visibilities;
  // list of [r,g,b] colors
  let colors;

  // If we have 'omero', use it for channel colors and visibilities
  if ("omero" in attrs) {
    let omero: Omero = attrs.omero as Omero;
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
      // x and y
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
