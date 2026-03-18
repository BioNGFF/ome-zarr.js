
import * as zarr from "zarrita";

import { Axis, Omero } from "./types/ome";
import { getRgba, convertRbgDataToDataUrl } from "./render";
import { NgffImage } from "./image";


export async function render(
  store: zarr.FetchStore | string,
  targetSize?: number, 
  options: {
    autoBoost?: boolean,
    maxSize?: number
  } = {},
): Promise<string> {

  let ngffImg = await NgffImage.load(store);
  // by default we render smallest resolution
  let arrayPathOrIndex: string | number | undefined = undefined;
  if (targetSize == undefined) {
    arrayPathOrIndex = -1;
  }

  let src = await ngffImg.render({
    targetSize,
    arrayPathOrIndex,
    autoBoost: options.autoBoost,
    maxSize: options.maxSize});
  return src;
}


// Legacy API
export async function renderThumbnail(
  store: zarr.FetchStore | string,
  targetSize: number | undefined = undefined,
  autoBoost: boolean = false,
  maxSize: number = 1000
): Promise<string> {
  return render(store, targetSize, {autoBoost, maxSize});
}


// API, but also used under the hood by NgffImage.render()
export async function renderImage(
  arr: zarr.Array<any>,
  axes: Axis[],
  omero: Omero | null | undefined,
  sliceIndices: { [k: string]: number | [number, number] | undefined } = {},
  autoBoost: boolean = false,
  originalShape?: number[]
): Promise<string> {
  let { data, width, height } = await getRgba(
    arr,
    axes,
    omero,
    sliceIndices,
    originalShape,
    autoBoost
  );
  return convertRbgDataToDataUrl(data, width, height);
}
