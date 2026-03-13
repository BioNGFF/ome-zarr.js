
import * as zarr from "zarrita";
import { ImageAttrs, ImageAttrsV5, OmeAttrs, Multiscale, Omero, Axis } from "./types/ome";
import { getArray } from "./utils";

export class NgffImage {
  /**
   * This is the main Image class for the API. It handles both v0.4 and v0.5 formats, 
   * and provides a consistent interface for accessing the multiscale datasets,
   * omero metadata, and zarr version.
   *
   * @minItems 1
   */
  attrs: OmeAttrs;
  store: zarr.FetchStore;
  multiscales: [Multiscale, ...Multiscale[]];
  shapes: number[][] | undefined;
  omero?: Omero | null;
  axes?: Axis[];
  zarr_version: 2 | 3;
  [k: string]: unknown;

  constructor(attrs: OmeAttrs, store: zarr.FetchStore) {
    // Handle v0.4 or v0.5 to get the multiscale object
    // attrs is just the dictionary we get from zarr
    this.store = store;
    if ("ome" in attrs) {
      this.attrs = attrs as ImageAttrsV5;
      this.multiscales = this.attrs.ome.multiscales;
      this.omero = this.attrs.ome.omero;
      this.zarr_version = 3;
      // v0.6 moved 'axes' into coordinateSystems
      // In this case we "move it back" for compatibility
      // TODO: Don't just pick the first coordinateSystem - handle multiple coordinateSystems properly
      for (const multiscale of this.multiscales) {
        if (!multiscale.axes && multiscale.coordinateSystems?.[0]?.axes) {
          multiscale.axes = multiscale.coordinateSystems[0].axes;
        }
      }
    } else {
      // Just copy over the fields for v0.4
      this.attrs = attrs as ImageAttrs;
      this.multiscales = this.attrs.multiscales;
      this.omero = this.attrs.omero;
      this.zarr_version = 2;
    }
  }

  async openArray(pathOrIndex: string | number): Promise<zarr.Array<any>> {
    // Open the zarr array at the given path or index. This is a helper function for users who want to access the zarr arrays directly.
    let path: string;
    if (typeof pathOrIndex === "number") {
      const datasets = this.multiscales[0].datasets;
      if (pathOrIndex < 0) {
        pathOrIndex = datasets.length + pathOrIndex;
      }
      path = datasets[pathOrIndex].path;
    } else {
      path = pathOrIndex;
    }
    let arr = await getArray(this.store, path, this.zarr_version);
    return arr;
  }
}
