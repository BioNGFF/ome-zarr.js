
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

  let maxSize = options.maxSize || 1000;
  let ngffImg = await NgffImage.load(store);

  // We render lowest resolution, unless targetSize is specified
  let path: string | number = -1;
  if (targetSize !== undefined) {
    path = await ngffImg.getPathForTargetSize(targetSize);
  }
  let arr = await ngffImg.openArray(path);
  let shape = arr.shape;
  let dims = shape.length;
  let width = shape[dims - 1];
  let height = shape[dims - 2];
  // ...and it also allows us to check size up front
  if (height * width > maxSize * maxSize) {
    throw new Error(
      `Lowest resolution (${width} * ${height}) is larger than 'maxSize'. Limit is ${maxSize} * ${maxSize}`
    );
  }
  let src = await ngffImg.render({targetSize: targetSize, autoBoost: options.autoBoost});
  // return renderImage(arr, ngffImg.axes!, ngffImg.omero, {}, options.autoBoost);
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
