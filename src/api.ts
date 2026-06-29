
import * as zarr from "zarrita";

import { Axis, Channel, OmeAttrs } from "./types/ome";
import { renderRgba } from "./render";
import { NgffImage } from "./image";
import { createRgbDataUrl } from "./utils";


export async function render(
  store: zarr.Group<zarr.Readable> | zarr.Readable | string,
  targetSize?: number, 
  options: {
    autoBoost?: boolean,
    maxSize?: number,
    attrs?: OmeAttrs,
    signal?: AbortSignal,
    datasetIndex?: number,
  } = {},
): Promise<string> {
  
  const { signal } = options ?? {};
  signal?.throwIfAborted();
  let datasetIndex: number | undefined;
  let ngffImg: NgffImage;

  // If no targetSize, we ONLY load the specified/smallest array, and render same array below...
  if (targetSize == undefined) {
    datasetIndex = options.datasetIndex ?? -1
    ngffImg = await NgffImage.load(store, {datasetIndex: datasetIndex, attrs: options.attrs});
  } else {
    // ...but if we know the targetSize, we load the largest array here (default),
    // then use targetSize below to pick right resolution
    ngffImg = await NgffImage.load(store, {attrs: options.attrs});
  }

  if (ngffImg.omero) {
    // we want to remove any start/end values from window, to calculate min/max
    if ("channels" in ngffImg.omero) {
      ngffImg.omero.channels = ngffImg.omero.channels.map((ch: Channel) => {
        if (ch.window) {
          ch.window.start = undefined;
          ch.window.end = undefined;
        }
        return ch;
      });
    }
  }

  let src = await ngffImg.render({
    targetSize,
    arrayPathOrIndex: datasetIndex,
    autoBoost: options.autoBoost,
    maxSize: options.maxSize});
  return src;
}


// Legacy API
export async function renderThumbnail(
  store: zarr.FetchStore | string,
  targetSize: number | undefined = undefined,
  autoBoost: boolean = false,
  maxSize: number = 1000,
  options?: { signal?: AbortSignal }
): Promise<string> {
  return render(store, targetSize, {autoBoost, maxSize, ...options});
}


// Legacy API
export async function renderImage(
  arr: zarr.Array<any>,
  axes: Axis[],
  channels: Channel[] | null | undefined,
  sliceIndices: { [k: string]: number | [number, number] | undefined } = {},
  autoBoost: boolean = false
): Promise<string> {
  let { data, width } = await renderRgba(
    arr,
    axes,
    channels,
    sliceIndices,
    autoBoost,
    {calcMinMaxForRange: true}
  );
  return createRgbDataUrl(data, width);
}
