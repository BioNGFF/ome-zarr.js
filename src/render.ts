
import * as zarr from "zarrita";
import { slice } from "zarrita";
// import { Slice } from "@zarrita/indexing";
import { Axis, Omero } from "./types/ome";
import {
  getDefaultVisibilities,
  hexToRGB,
  getArray,
  getDefaultColors,
  getMinMaxValues,
  getMultiscale,
  renderTo8bitArray,
  MAX_CHANNELS,
} from "./utils";


export async function renderThumbnail(
  store: zarr.FetchStore,
  targetSize: number = 100,
  maxSize: number = 1000
): Promise<string> {
  const { multiscale, omero, zarr_version } = await getMultiscale(store);

  const arr = await getArray(store, multiscale, targetSize, zarr_version);

  let shape = arr.shape;
  let dims = shape.length;
  let width = shape[dims - 1];
  let height = shape[dims - 2];
  if (height * width > maxSize * maxSize) {
    console.log("Lowest resolution too large for Thumbnail: ", shape);
    return "";
  }

  return renderImage(arr, multiscale.axes, omero);
}

export async function renderImage(
    arr: zarr.Array<any>,
    axes: Axis[],
    omero: Omero | null | undefined
  ) {
    // Main rendering function...
    // We have the zarr Array already in hand, axes for dimensions
    // and omero for rendering settings
    let shape = arr.shape;
    let dims = shape.length;
    let width = shape[dims - 1];
    let height = shape[dims - 2];
  
    // NB: We don't handle pre v0.4 data yet (no axes)
    let axesNames = axes.map((a) => a.name);
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

  