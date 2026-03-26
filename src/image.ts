
import * as zarr from "zarrita";
import { ImageAttrs, ImageAttrsV5, OmeAttrs, Multiscale, Omero, Axis } from "./types/ome";
import { getArray, createOmero } from "./utils";
import { renderImage } from "./api";

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
  shapes?: number[][];
  arrays: { [key: string]: zarr.Array<any> } = {};
  omero?: Omero;
  axes: Axis[];
  zarr_version: 2 | 3;
  omezarr_version: string;
  [k: string]: unknown;

  constructor(attrs: OmeAttrs, store: zarr.FetchStore) {
    // Handle v0.4 or v0.5 to get the multiscale object
    // attrs is just the dictionary we get from zarr
    this.store = store;
    let imgAttrs: ImageAttrs;
    if ("ome" in attrs) {
      this.attrs = attrs as ImageAttrsV5;
      // deep copy to avoid mutating original attrs object
      imgAttrs = JSON.parse(JSON.stringify(this.attrs.ome));
      this.zarr_version = 3;
      this.omezarr_version = imgAttrs.version;
      this.axes = imgAttrs.multiscales[0].axes;
      // v0.6 moved 'axes' into coordinateSystems
      // TODO: Don't just pick the first coordinateSystem - handle multiple coordinateSystems properly
      if (!this.axes && imgAttrs.multiscales[0].coordinateSystems?.[0]?.axes) {
        this.axes = imgAttrs.multiscales[0].coordinateSystems[0].axes;
      }
    } else {
      // Just copy over the fields for v0.4
      this.attrs = attrs as ImageAttrs;
      // deep copy to avoid mutating original attrs object
      imgAttrs = JSON.parse(JSON.stringify(this.attrs));
      this.zarr_version = 2;
      this.omezarr_version = imgAttrs.multiscales[0].version || "0.4";
      // check v0.1-v0.3 axes - default to 'tczyx' if not found
      this.axes = imgAttrs.multiscales[0].axes || ['t', 'c', 'z', 'y', 'x'].map((name) => ({ name }));
    }
    this.multiscales = imgAttrs.multiscales;
    this.omero = imgAttrs.omero;

    // for convenience, we also add top-level keys for the most commonly used fields
    this.paths = this.multiscales[0].datasets.map((d) => d.path);
    // NB: scales can be empty list for v0.1-v0.3
    this.scales = this.getScales();
  }

  // static method to load an image from a zarr store or url
  static async load(store: zarr.FetchStore | string, datasetIndex: number = 0): Promise<NgffImage> {
    if (typeof store === "string") {
      store = new zarr.FetchStore(store);
    }
    const data = await zarr.open(store, { kind: "group" });
    let attrs: OmeAttrs = data.attrs as OmeAttrs;
    
    const img = new NgffImage(attrs, store);

    // default behaviour is to open first array (or specified datasetIndex); populates `omero` if missing.
    if (datasetIndex !== undefined) {
      await img.openArray(datasetIndex);
    }
    return img;
  }

  checkChannelIndex(channelIndex: number): Omero {
    if (!this.omero) {
      throw new Error("No Omero metadata found in image");
    }
    if (channelIndex < 0 || channelIndex >= this.omero.channels.length) {
      throw new Error(`Invalid channel index: ${channelIndex} for image with ${this.omero.channels.length} channels`);
    }
    return this.omero;
  }

  setChannelActive(channelIndex: number, active: boolean) {
    let omero = this.checkChannelIndex(channelIndex);
    omero.channels[channelIndex].active = active;
  }

  setChannelColor(channelIndex: number, color: string) {
    let omero = this.checkChannelIndex(channelIndex);
    omero.channels[channelIndex].color = color;
  }

  setChannelStart(channelIndex: number, start: number) {
    let omero = this.checkChannelIndex(channelIndex);
    omero.channels[channelIndex].window.start = start;
  }

  setChannelEnd(channelIndex: number, end: number) {
    let omero = this.checkChannelIndex(channelIndex);
    omero.channels[channelIndex].window.end = end;
  }

  setChannelInverted(channelIndex: number, inverted: boolean) {
    let omero = this.checkChannelIndex(channelIndex);
    omero.channels[channelIndex].inverted = inverted;
  }

  setChannelLut(channelIndex: number, lut: string) {
    let omero = this.checkChannelIndex(channelIndex);
    omero.channels[channelIndex].lut = lut;
  }

  setZIndex(zIndex: number) {
    if (!this.omero) {throw new Error("No Omero metadata found in image");}
    this.omero.rdefs.defaultZ = zIndex;
  }

  setTIndex(tIndex: number) {
    if (!this.omero) {throw new Error("No Omero metadata found in image");}
    this.omero.rdefs.defaultT = tIndex;
  }

  getVersion() {
    return this.omezarr_version;
  }

  getZarrVersion() {
    return this.zarr_version;
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
    // since we now have array shape and dtype, we can create `omero` if doesn't exist yet
    if (!this.omero) {
      let shapes = await this.calcShapes();
      let shape0 = shapes?.[0] || arr.shape;
      let axesNames = this.axes.map((a) => a.name || a.toString());
      let sizeC = shape0[axesNames.findIndex(a => a === 'c')] || 1;
      let sizeZ = shape0[axesNames.findIndex(a => a === 'z')] || 1;
      let sizeT = shape0[axesNames.findIndex(a => a === 't')] || 1;
      this.omero = createOmero({sizeC, sizeZ, sizeT}, arr.dtype);
      if (axesNames.includes('z')) {
        let sizeZ = shape0[axesNames.findIndex(a => a === 'z')] || 1;
        this.omero.rdefs.defaultZ = Math.floor(sizeZ / 2);
      }
    }
    return arr;
  }

  async calcShapes(datasetIndex?: number): Promise<number[][]> {
    // NB: can return empty list for v0.1-v0.3 (no scales)

    if (this.shapes !== undefined) {
      // return cached shapes if we have them
      return this.shapes;
    }
    if (datasetIndex === undefined) {
      // if we're not given an index, find first cached arrays...
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
        Math.floor((dim * arrayScale[i]) / scale[i])
      );
    });
    // cache the result
    this.shapes = shapes
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

  async getPathForTargetSize(targetSize: number, datasetIndex?: number): Promise<string> {

    let longestSizes: number[] = [];
    if (datasetIndex == undefined) {
      datasetIndex = 0;
      // if we're not given an index, find first cached arrays...
      for (let i=0; i < this.paths.length; i++) {
        if (this.arrays[this.paths[i]]) {
          datasetIndex = i;
          break;
        }
      }
    }
    if (this.scales.length == 0) {
      // for v0.1-v0.3, we "guess" scale of * 2 for each level
      let arr = await this.openArray(datasetIndex);
      let shape = arr.shape;
      let dims = shape.length;
      let width = shape[dims - 1];
      let height = shape[dims - 2];
      let longestSide = Math.max(width, height);

      longestSizes = this.paths.map(
        (_, i) => longestSide * 2 ** (datasetIndex - i)
      );
    } else {
      // This caches shapes
      let shapes = await this.calcShapes();
      let dims = shapes[0].length;
      longestSizes = shapes.map((shape) =>
        Math.max(shape[dims - 1], shape[dims - 2])
      );
    }

    let pathIndex;
    for (pathIndex = 0; pathIndex < longestSizes.length; pathIndex++) {
      let size = longestSizes[pathIndex];
      let nextSize = longestSizes[pathIndex + 1];
      if (!nextSize) {
        // we have reached smallest
        break;
      } else if (nextSize > targetSize) {
        // go smaller
        continue;
      } else {
        // is targetSize closer to this or next?
        let avg = (size + nextSize) / 2;
        if (targetSize < avg) {
          pathIndex += 1;
        }
        break;
      }
    }
    let path = this.paths[pathIndex];
    return path;
  }

  async render(options: {
    // Array can be provided directly, or we will load based on targetSize or arrayPathOrIndex
    arr?: zarr.Array<any> | string,
    targetSize?: number,
    arrayPathOrIndex?: string | number, 
    slices?: { [k: string]: number | [number, number] | undefined },
    autoBoost?: boolean,
    omero?: Omero,
    maxSize?: number
  } = {}
  ): Promise<string> {

    let arr;
    if (options.arr) {
      if (typeof options.arr === "string") {
        const store = new zarr.FetchStore(options.arr);
        arr = await zarr.open(store, { kind: "array" });
      } else {
        arr = options.arr;
      }
    } else {
      let path: string | number;
      if (options.arrayPathOrIndex !== undefined) {
        path = options.arrayPathOrIndex;
      } else if (options.targetSize !== undefined) {
        path = await this.getPathForTargetSize(options.targetSize);
      } else {
        throw new Error("Need to specify arr OR targetSize OR arrayPathOrIndex ")
      }
      arr = await this.openArray(path);
    }

    // TODO: decide when to ignore maxSize? 
    // E.g. if targetSize is specified, use maxSize = 2 x targetSize?
    let maxSize = options.maxSize ?? 1000;
    let shape = arr.shape;
    let dims = shape.length;
    let width = shape[dims - 1];
    let height = shape[dims - 2];
    // Reject if whole plane is too big and no slices are provided.
    if (height * width > maxSize * maxSize && !options.slices) {
      // TODO: if we have slices, we should check the size of the sliced region
      throw new Error(
        `Array size (${width} * ${height}) is larger than specified 'maxSize' of ${maxSize} * ${maxSize}`
      );
    }

    let omero = options.omero || this.omero;
    let slices = options.slices || {};
    // We need originalShape to know if we have Z-downsampling.
    let shapes = await this.calcShapes();
    const originalShape = shapes?.[0];

    return renderImage(arr, this.axes, omero, slices, options.autoBoost, originalShape);
  }
}
