
import * as zarr from "zarrita";

import { NgffImage } from "./image";



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
  let src = await ngffImg.render(targetSize, autoBoost);
  return src;
}
