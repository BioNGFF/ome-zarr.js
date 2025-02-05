
import * as zarr from "zarrita";
import { slice } from "zarrita";
import { ImageAttrs, Multiscale, Omero } from "./types/ome";
import { getDefaultVisibilities, hexToRGB, getDefaultColors, getMinMaxValues, renderTo8bitArray } from "./utils";

export interface ImageAttrsV5 {
  ome: ImageAttrs
}

// const controller = new AbortController();

const max_size = 1000;

export async function renderThumbnail(
  store: zarr.FetchStore,
  thumbDatasetIndex?: number): Promise<string> {
  
  let root = zarr.root(store);
  const data = await zarr.open(root);

  type OmeAttrs = ImageAttrs | ImageAttrsV5;

  let attrs: OmeAttrs = data.attrs as OmeAttrs;

  // if arrs is an instance of ImageAttrsV5...
  let multiscale: Multiscale;
  if ("ome" in attrs) {
    attrs = attrs as ImageAttrsV5;
    multiscale = attrs.ome.multiscales[0];
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

  const zarrLocation = root.resolve(path);
  const arr = await zarr.open(zarrLocation, { kind: "array" });

  console.log('arr', arr);

  let shape = arr.shape;
  let dims = shape.length;
  let width = shape[dims - 1];
  let height = shape[dims - 2];
  if (height * width > max_size * max_size) {
    console.log("Lowest resolution too large for Thumbnail: ", shape);
    return "";
  }

  let axesNames = multiscale.axes.map((a) => a.name);
  let chDim = axesNames.indexOf("c");


  let channel_count = shape[chDim] || 1;
  let visibilities;
  let colors;

  if ("omero" in attrs) {
    let omero: Omero = attrs.omero as Omero;
    visibilities = omero.channels.map((ch) => ch.active);
    colors = omero.channels.map((ch) => hexToRGB(ch.color));
  } else {
    visibilities = getDefaultVisibilities(channel_count);
    colors = getDefaultColors(channel_count, visibilities);
  }
  // filter for active channels
  colors = colors.filter((col, idx) => visibilities[idx]);

  let activeChannels = visibilities.reduce((prev, active, index) => {
    if (active) prev.push(index);
    return prev;
  }, []);

  let promises = activeChannels.map((chIndex: number) => {
    let slices = shape.map((dimSize, index) => {
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
    // return zarr.get(arr, slices, { opts: { signal: controller.signal } });
    return zarr.get(arr, slices);
  });

  let ndChunks = await Promise.all(promises);
  let minMaxValues = ndChunks.map((ch) => getMinMaxValues(ch));
  let rbgData = renderTo8bitArray(ndChunks, minMaxValues, colors);

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
