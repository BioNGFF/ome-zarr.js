/* tslint:disable */
/* eslint-disable */
/**
/* This file was automatically generated from pydantic models by running pydantic2ts.
/* pydantic2ts --module src/ome_zarr_models/v04/image.py --output ome.ts
/* Do not modify it by hand - just update the pydantic models and then re-run the script
*/


/**
 * The base pydantic model for all metadata classes
 */
export interface BaseAttrs {
  [k: string]: unknown;
}
/**
 * Model for the metadata of OME-Zarr data.
 *
 * See https://ngff.openmicroscopy.org/0.4/#image-layout.
 */
export interface ImageAttrs {
  /**
   * The multiscale datasets for this image
   *
   * @minItems 1
   */
  multiscales: [Multiscale, ...Multiscale[]];
  omero?: Omero | null;
  [k: string]: unknown;
}
/**
 * An element of multiscales metadata.
 */
export interface Multiscale {
  axes: Axis[];
  /**
   * @minItems 1
   */
  datasets: [Dataset, ...Dataset[]];
  version?: "0.4" | null;
  coordinateTransformations?: [unknown] | [unknown, unknown] | null;
  metadata?: {
    [k: string]: unknown;
  };
  name?: unknown;
  type?: {
    [k: string]: unknown;
  };
  [k: string]: unknown;
}
/**
 * Model for an element of `Multiscale.axes`.
 *
 * See https://ngff.openmicroscopy.org/0.4/#axes-md.
 */
export interface Axis {
  name: string;
  type?: string | null;
  unit?: unknown;
  [k: string]: unknown;
}
/**
 * An element of Multiscale.datasets.
 */
export interface Dataset {
  path: string;
  coordinateTransformations: [unknown] | [unknown, unknown];
  [k: string]: unknown;
}
/**
 * omero model.
 */
export interface Omero {
  channels: Channel[];
  [k: string]: unknown;
}
/**
 * A single omero channel.
 */
export interface Channel {
  color: string;
  window: Window;
  [k: string]: unknown;
}
/**
 * A single window.
 */
export interface Window {
  max: number;
  min: number;
  start: number;
  end: number;
  [k: string]: unknown;
}
