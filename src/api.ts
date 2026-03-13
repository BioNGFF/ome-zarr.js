
import * as zarr from "zarrita";

import { Axis, Omero } from "./types/ome";
import { getRgba, convertRbgDataToDataUrl } from "./render";
import { NgffImage } from "./image";


export async function render(
  store: zarr.FetchStore | string,
  options: {
    targetSize?: number, 
    autoBoost?: boolean,
    maxSize?: number
  } = {},
): Promise<string> {

  let maxSize = options.maxSize || 1000;
  let ngffImg = await NgffImage.load(store);
  let path: string | number = -1;
  if (options.targetSize !== undefined) {
    path = await ngffImg.getPathForTargetSize(options.targetSize);
  }
  let arr = await ngffImg.openArray(path);
  let shape = arr.shape;
  let dims = shape.length;
  let width = shape[dims - 1];
  let height = shape[dims - 2];
  // ...and it also allows us to check size up front
  if (height * width > maxSize * maxSize) {
    throw new Error(
      `Lowest resolution (${width} * ${height}) is too large for Thumbnail. Limit is ${maxSize} * ${maxSize}`
    );
  }
  let src = await ngffImg.render({targetSize: options.targetSize, autoBoost: options.autoBoost});
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

  let ngffImg = await NgffImage.load(store);

  // force loading of smallest resolution...
  // for renderThumbnail() there's a good chance it's the one we want to render
  let arr = await ngffImg.openArray(-1);
  let shape = arr.shape;
  let dims = shape.length;
  let width = shape[dims - 1];
  let height = shape[dims - 2];
  // ...and it also allows us to check size up front
  if (height * width > maxSize * maxSize) {
    throw new Error(
      `Lowest resolution (${width} * ${height}) is too large for Thumbnail. Limit is ${maxSize} * ${maxSize}`
    );
  }
  let src = await ngffImg.render({targetSize, autoBoost});
  return src;
}


// legacy API
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
