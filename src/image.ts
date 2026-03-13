
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
  paths: string[];
  scales: number[][];
  arrays: { [key: string]: zarr.Array<any> } = {};
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
    // for convenience, we also add top-level keys for the most commonly used fields
    this.paths = this.multiscales[0].datasets.map((d) => d.path);
    // TODO: handle v0.1-v0.3 axes
    this.axes = this.multiscales[0].axes;
    this.scales = this.getScales();
  }

  async openArray(pathOrIndex: string | number): Promise<zarr.Array<any>> {
    // Open the zarr array at the given path or index. This is a helper function for users who want to access the zarr arrays directly.
    let path: string;
    if (typeof pathOrIndex === "number") {
      if (pathOrIndex < 0) {
        pathOrIndex = this.paths.length + pathOrIndex;
      }
      path = this.paths[pathOrIndex];
    } else {
      path = pathOrIndex;
    }
    if (this.arrays[path]) {
      return this.arrays[path];
    }
    let arr = await getArray(this.store, path, this.zarr_version);
    // cache the array for future use
    this.arrays[path] = arr;
    return arr;
  }

  async calcShapes(datasetIndex?: number): Promise<number[][]> {
    // if we're not given an index, find first cached arrays...
    if (datasetIndex === undefined) {
      for (let i=0; i < this.paths.length; i++) {
        if (this.arrays[this.paths[i]]) {
          datasetIndex = i;
          break;
        }
      }
    }
    if (datasetIndex === undefined) {
      datasetIndex = 0;
    }
    let arr = await this.openArray(datasetIndex);
    const shape = arr.shape;
    const scales: number[][] = this.scales;
    const arrayScale = scales[datasetIndex];

    // we know the shape and scale of the chosen array, so we can calculate the
    // shapes of other arrays in the multiscale pyramid...
    const shapes = scales.map((scale) => {
      return shape.map((dim, i) =>
        Math.ceil((dim * arrayScale[i]) / scale[i])
      );
    });
    return shapes;
  }

  // private method to get scales for each level, if they exist. Returns undefined if no scales are found.
  getScales() {
    const scales = this.multiscales[0].datasets
      .map((ds) => {
        let scale: number[] | undefined = undefined;
        if (Array.isArray(ds.coordinateTransformations)) {
          for (const ct of ds.coordinateTransformations) {
            if ("scale" in ct) {
              scale = (ct as { scale: number[] }).scale;
              break;
            } else if ("transformations" in ct) {
              // handle nested transformations
              for (const sct of (ct as { transformations: any[] })
                .transformations) {
                if ("scale" in sct) {
                  scale = (sct as { scale: number[] }).scale;
                  break;
                }
              }
            }
          }
        }
        // handle missing coordinateTransformations below
        return scale;
      })
      .filter((s) => s !== undefined) as number[][]; // remove undefined

    if (scales.length > 0 && scales.length !== this.multiscales[0].datasets.length) {
      throw new Error("Could not determine scales for all datasets");
    }
    return scales;
  }
}
