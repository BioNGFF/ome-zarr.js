
import * as zarr from "zarrita";

import { Axis, Omero, Channel } from "./types/ome";
import {
  getDefaultVisibilities,
  hexToRGB,
  getArray,
  getDefaultColors,
  getMinMaxValues,
  getMultiscale,
  getSlices,
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
  // we want to remove any start/end values from window, to calculate min/max
  if (omero && "channels" in omero) {
    omero.channels = omero.channels.map((ch: Channel) => {
      if (ch.window) {
        ch.window.start = undefined;
        ch.window.end = undefined;
      }
      return ch;
    });
  }

  let autoBoost = true;
  return renderImage(arr, multiscale.axes, omero, {}, autoBoost);
}

export async function renderImage(
    arr: zarr.Array<any>,
    axes: Axis[],
    omero: Omero | null | undefined,
    sliceIndices: {[k: string]: (number | [number, number] | undefined)}  = {},
    autoBoost: boolean = false
  ) {
    // Main rendering function...
    // We have the zarr Array already in hand, axes for dimensions
    // and omero for rendering settings
    // if autoBoost is true, check histogram and boost contrast if needed
    let shape = arr.shape;
  
    // NB: We don't handle pre v0.4 data yet (no axes)
    let axesNames = axes.map((a) => a.name);
    let chDim = axesNames.indexOf("c");
    let channel_count = shape[chDim] || 1;
    let visibilities;
    // list of [r,g,b] colors
    let rgbColors: Array<[number, number, number]>;
    let luts: Array<string | undefined> | undefined = undefined;
    let inverteds: Array<boolean> | undefined = undefined;
  
    // If we have 'omero', use it for channel rgbColors and visibilities
    if (omero) {
      let active_count = 0;
      visibilities = omero.channels.map((ch) => {
        active_count += ch.active ? 1 : 0;
        return ch.active && active_count <= MAX_CHANNELS;
      });
      rgbColors = omero.channels.map((ch) => hexToRGB(ch.color));
      luts = omero.channels.map((ch) => "lut" in ch ? ch.lut as string : undefined);
    } else {
      visibilities = getDefaultVisibilities(channel_count);
      rgbColors = getDefaultColors(channel_count, visibilities);
    }
    // filter for active channels
    let activeChannelIndices = visibilities.reduce((prev, active, index) => {
      if (active) prev.push(index);
      return prev;
    }, []);
    rgbColors = activeChannelIndices.map((chIndex: number) => rgbColors[chIndex]);
    inverteds = activeChannelIndices.map((chIndex: number) => Boolean(omero?.channels[chIndex].inverted));
  
    // Get slices for each channel
    if (sliceIndices["z"] == undefined) {
        sliceIndices["z"] = omero?.rdefs?.defaultZ;
    }
    if (sliceIndices["t"] == undefined) {
      sliceIndices["t"] = omero?.rdefs?.defaultT;
    }
    let chSlices = getSlices(activeChannelIndices, shape, axesNames, sliceIndices);
  
    // Wait for all chunks to be fetched...
    let promises = chSlices.map((chSlice: any) => zarr.get(arr, chSlice));
    let ndChunks = await Promise.all(promises);
  
    // Use start/end values from 'omero' if available, otherwise calculate min/max
    let minMaxValues = activeChannelIndices.map((chIndex:number, i:number) => {
        if (omero && omero.channels[chIndex]) {
            let chOmero = omero.channels[chIndex];
            if (chOmero?.window?.start !== undefined && chOmero?.window?.end !== undefined) {
                return [chOmero.window.start, chOmero.window.end];
            }
        }
        return getMinMaxValues(ndChunks[i]);
    });

    // Render to 8bit rgb array
    let rbgData = renderTo8bitArray(ndChunks, minMaxValues, rgbColors, luts, inverteds, autoBoost);
    // Use a canvas element to convert the 8bit array to a dataUrl
    const canvas = document.createElement("canvas");
    const height = ndChunks[0].shape[0];
    const width = ndChunks[0].shape[1];
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

  