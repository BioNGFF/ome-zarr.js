import { describe, expect, test } from "vitest";
import * as zarr from "zarrita";
import { resolveAxesNames, getSlices } from "../src/utils.ts";
import { renderArray } from "../src/render.ts";
import { NgffImage } from "../src/image.ts";

function cOrderStrides(shape) {
  const stride = new Array(shape.length).fill(1);
  for (let i = shape.length - 2; i >= 0; i--) {
    stride[i] = stride[i + 1] * shape[i + 1];
  }
  return stride;
}

async function makeArray(path, shape, dtype, data) {
  const store = new Map();
  const root = zarr.root(store);
  const arr = await zarr.create(root.resolve(path), { shape, chunkShape: shape, dtype });
  if (data) {
    await zarr.set(arr, null, { data, shape, stride: cOrderStrides(shape) });
  }
  return { store, arr };
}

describe("resolveAxesNames", () => {
  const TCZYX = ["t", "c", "z", "y", "x"];

  test("right-aligns synthesized names longer than ndim", () => {
    const axes = TCZYX.map((name) => ({ name }));
    expect(resolveAxesNames(axes, 3)).toEqual(["z", "y", "x"]);
    expect(resolveAxesNames(axes, 4)).toEqual(["c", "z", "y", "x"]);
  });

  test("leaves names unchanged when already the right length", () => {
    const axes = TCZYX.map((name) => ({ name }));
    expect(resolveAxesNames(axes, 5)).toEqual(TCZYX);
  });

  test("defaults to tczyx (right-aligned) when axes is undefined", () => {
    expect(resolveAxesNames(undefined, 5)).toEqual(TCZYX);
    expect(resolveAxesNames(undefined, 3)).toEqual(["z", "y", "x"]);
  });

  test("leaves names unchanged (no-op) when shorter than ndim", () => {
    const axes = [{ name: "y" }, { name: "x" }];
    expect(resolveAxesNames(axes, 5)).toEqual(["y", "x"]);
  });
});

describe("getSlices with right-aligned vs naive (left-aligned) axes names", () => {
  test("right-aligned names correctly identify the real z/y/x dimensions", () => {
    // A legacy v0.2 file synthesizes 5 names, but this array only has 3 real
    // dimensions ([z=4, y=275, x=271]).
    const synthesized = ["t", "c", "z", "y", "x"];
    const shape = [4, 275, 271];

    const rightAligned = resolveAxesNames(
      synthesized.map((name) => ({ name })),
      shape.length
    );
    expect(rightAligned).toEqual(["z", "y", "x"]);

    const [chSlice] = getSlices([0], shape, rightAligned, {});
    // real z (dim 0, size 4) -> middle index 2; real y,x -> full-range slices
    expect(chSlice[0]).toBe(2);
    expect(chSlice[1]).toEqual(zarr.slice(0, 275));
    expect(chSlice[2]).toEqual(zarr.slice(0, 271));
  });

  test("naive left-aligned names (pre-fix behavior) misassign every dimension", () => {
    const synthesized = ["t", "c", "z", "y", "x"];
    const shape = [4, 275, 271];

    // Without right-alignment, axesNames[index] pairs shape[0..2] with the
    // first 3 synthesized names (t, c, z) instead of the real (z, y, x).
    const [chSlice] = getSlices([0], shape, synthesized, {});
    // dim 0 (real z, size 4) is misread as "t" -> middle index, same as
    // correct behavior here (coincidence: both t and z default to a middle
    // index), but dim 1 (real y, size 275) is misread as "c" -> collapsed to
    // the fixed channel index 0 instead of a full-range spatial slice.
    expect(chSlice[1]).toBe(0);
    expect(chSlice[1]).not.toEqual(zarr.slice(0, 275));
  });
});

describe("render.ts renderArray end-to-end: legacy synthesized axes on a sub-5D array", () => {
  test("picks the correct middle z-slice and renders y/x untransposed", async () => {
    // shape = [z=4, y=2, x=3], no axes metadata at all (axes=undefined),
    // matching a v0.2 file with no axes and fewer than 5 real dimensions.
    const shape = [4, 2, 3];
    const data = new Uint8Array(shape[0] * shape[1] * shape[2]);
    for (let z = 0; z < shape[0]; z++) {
      for (let y = 0; y < shape[1]; y++) {
        for (let x = 0; x < shape[2]; x++) {
          data[z * 6 + y * 3 + x] = z * 20 + y * 5 + x + 1;
        }
      }
    }
    const { arr } = await makeArray("0", shape, "uint8", data);

    const { data: rgba, width, height } = await renderArray(
      arr, undefined, null, {}, false, { calcMinMaxForRange: false }
    );

    expect(width).toBe(3);
    expect(height).toBe(2);
    // middle z index for size 4 is 2; pixel(z=2,y,x) = 2*20 + y*5 + x + 1
    const expected = new Uint8ClampedArray([
      41, 41, 41, 255, 42, 42, 42, 255, 43, 43, 43, 255,
      46, 46, 46, 255, 47, 47, 47, 255, 48, 48, 48, 255,
    ]);
    expect(rgba).toStrictEqual(expected);
  });
});

describe("NgffImage.openArray: default omero sizeC/sizeZ/sizeT on a sub-5D legacy array", () => {
  test("resolves sizeC/sizeZ/sizeT from the real (right-aligned) dimensions, not the synthesized ones", async () => {
    // shape = [c=2, z=4, y=5, x=6]: a real 4D array (no time axis) with no
    // axes metadata, so the constructor synthesizes 5 names (t,c,z,y,x).
    const shape = [2, 4, 5, 6];
    const { store } = await makeArray("0", shape, "uint16");

    const attrs = {
      multiscales: [{ version: "0.2", datasets: [{ path: "0" }] }],
    };
    const img = new NgffImage(attrs, store);
    // zarr.create() (used by makeArray) only writes zarr storage-format v3.
    // Axis-name synthesis is governed by the OME-NGFF attrs shape, not by
    // zarr_version, so overriding it here (only to match how the in-memory
    // fixture was written) doesn't affect what this test is checking.
    img.zarr_version = 3;
    await img.openArray(0);

    expect(img.omero).toBeDefined();
    // sizeC should resolve to 2 (real), not 4 (what left-alignment would have
    // read from the position of the synthesized "c" name).
    expect(img.omero.channels.length).toBe(2);
    // sizeZ should resolve to 4 (real), not 5.
    expect(img.omero.rdefs.defaultZ).toBe(2); // floor(4 / 2)
  });
});
