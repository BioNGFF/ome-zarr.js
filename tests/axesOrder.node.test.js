import { describe, expect, test } from "vitest";
import * as zarr from "zarrita";
import { renderChunk, renderArray } from "../src/render.ts";

function cOrderStrides(shape) {
  const stride = new Array(shape.length).fill(1);
  for (let i = shape.length - 2; i >= 0; i--) {
    stride[i] = stride[i + 1] * shape[i + 1];
  }
  return stride;
}

async function makeArray(shape, dtype, data) {
  const arr = await zarr.create(new Map(), { shape, chunkShape: shape, dtype });
  await zarr.set(arr, null, { data, shape, stride: cOrderStrides(shape) });
  return arr;
}

describe("renderChunk with explicit rowDim/colDim (x before y)", () => {
  test("reads strided data as if x were the outer dimension", () => {
    // shape=[3,2] represents [x=3, y=2] (x before y), C-order stride=[2,1].
    // pixel(x, y) = x * 10 + y.
    const chunk = {
      shape: [3, 2],
      stride: [2, 1],
      data: [0, 1, 10, 11, 20, 21], // (x=0,y=0..1),(x=1,y=0..1),(x=2,y=0..1)
    };
    const fn = (value) => [value, 0, 0];
    // y is chunk dim 1 (rowDim), x is chunk dim 0 (colDim)
    const rendered = renderChunk(chunk, fn, { rowDim: 1, colDim: 0 });

    // Output is canonical row-major [height=2, width=3]:
    // row(y)=0: x=0,1,2 -> 0,10,20 ; row(y)=1: x=0,1,2 -> 1,11,21
    const expected = new Uint8ClampedArray([
      0, 0, 0, 255,
      10, 0, 0, 255,
      20, 0, 0, 255,
      1, 0, 0, 255,
      11, 0, 0, 255,
      21, 0, 0, 255,
    ]);
    expect(rendered).toStrictEqual(expected);
  });

  test("default rowDim/colDim (0,1) matches un-transposed pre-fix behavior", () => {
    const chunk = { shape: [2, 2], stride: [2, 1], data: [0, 1, 2, 3] };
    const fn = (value) => [value * 2, 0, 0];
    const rendered = renderChunk(chunk, fn);
    const expected = new Uint8ClampedArray([
      0, 0, 0, 255,
      2, 0, 0, 255,
      4, 0, 0, 255,
      6, 0, 0, 255,
    ]);
    expect(rendered).toStrictEqual(expected);
  });
});

describe("render.ts renderArray end-to-end (real zarrita in-memory array)", () => {
  // Single channel (c-size=1) -> default color is white, and with no explicit
  // channels/range, renderChunkWithLUT's "no range" LUT for white is an exact
  // grayscale passthrough: transferFunc(v) === [v, v, v, 255]. This lets us
  // verify pixel placement directly from the returned RGBA data.
  const SHARED_OPTS = { calcMinMaxForRange: false };

  test("axes x before y: width/height and pixel data are not transposed", async () => {
    // shape = [c=1, x=3, y=2]; pixel(x, y) = x * 10 + y + 1 (avoid 0 ambiguity)
    const shape = [1, 3, 2];
    const data = new Uint8Array([1, 2, 11, 12, 21, 22]);
    const arr = await makeArray(shape, "uint8", data);
    const axes = [{ name: "c" }, { name: "x", type: "space" }, { name: "y", type: "space" }];

    const { data: rgba, width, height } = await renderArray(
      arr, axes, null, {}, false, SHARED_OPTS
    );

    expect(width).toBe(3);
    expect(height).toBe(2);
    // row-major [height=2, width=3]: row0 = y=0 (x=0,1,2), row1 = y=1 (x=0,1,2)
    const expected = new Uint8ClampedArray([
      1, 1, 1, 255, 11, 11, 11, 255, 21, 21, 21, 255,
      2, 2, 2, 255, 12, 12, 12, 255, 22, 22, 22, 255,
    ]);
    expect(rgba).toStrictEqual(expected);
  });

  test("regression: axes y before x (canonical order) unchanged", async () => {
    // shape = [c=1, y=2, x=3]; pixel(x, y) = x * 10 + y + 1
    const shape = [1, 2, 3];
    const data = new Uint8Array([1, 11, 21, 2, 12, 22]);
    const arr = await makeArray(shape, "uint8", data);
    const axes = [{ name: "c" }, { name: "y", type: "space" }, { name: "x", type: "space" }];

    const { data: rgba, width, height } = await renderArray(
      arr, axes, null, {}, false, SHARED_OPTS
    );

    expect(width).toBe(3);
    expect(height).toBe(2);
    const expected = new Uint8ClampedArray([
      1, 1, 1, 255, 11, 11, 11, 255, 21, 21, 21, 255,
      2, 2, 2, 255, 12, 12, 12, 255, 22, 22, 22, 255,
    ]);
    expect(rgba).toStrictEqual(expected);
  });

  test("arbitrary permutation (t, x, c, z, y) renders correctly", async () => {
    // shape = [t=1, x=3, c=1, z=1, y=2]; pixel(x, y) = x * 10 + y + 1
    const shape = [1, 3, 1, 1, 2];
    const data = new Uint8Array([1, 2, 11, 12, 21, 22]);
    const arr = await makeArray(shape, "uint8", data);
    const axes = [
      { name: "t" },
      { name: "x", type: "space" },
      { name: "c" },
      { name: "z", type: "space" },
      { name: "y", type: "space" },
    ];

    const { data: rgba, width, height } = await renderArray(
      arr, axes, null, {}, false, SHARED_OPTS
    );

    expect(width).toBe(3);
    expect(height).toBe(2);
    const expected = new Uint8ClampedArray([
      1, 1, 1, 255, 11, 11, 11, 255, 21, 21, 21, 255,
      2, 2, 2, 255, 12, 12, 12, 255, 22, 22, 22, 255,
    ]);
    expect(rgba).toStrictEqual(expected);
  });
});
