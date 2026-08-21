import { describe, expect, test, vi } from "vitest";
import { NgffImage } from "../src/image.js";

// ---- fixtures (no network, no fs) ----

// v0.4, axes ["y","x","c"], 3-level pyramid with scales
const ATTRS_YXC_V04 = {
  multiscales: [{
    version: "0.4",
    axes: [
      { name: "y", type: "space" },
      { name: "x", type: "space" },
      { name: "c", type: "channel" },
    ],
    datasets: [
      { path: "0", coordinateTransformations: [{ type: "scale", scale: [1, 1, 1] }] },
      { path: "1", coordinateTransformations: [{ type: "scale", scale: [2, 2, 1] }] },
      { path: "2", coordinateTransformations: [{ type: "scale", scale: [4, 4, 1] }] },
    ],
  }],
};

// v0.3-style: bare-string axes AND no coordinateTransformations -> scales === []
const ATTRS_YXC_V03 = {
  multiscales: [{
    version: "0.3",
    axes: ["y", "x", "c"],
    datasets: [{ path: "0" }, { path: "1" }, { path: "2" }],
  }],
};

// regression: canonical 5D tczyx
const ATTRS_TCZYX_V04 = {
  multiscales: [{
    version: "0.4",
    axes: [
      { name: "t", type: "time" },
      { name: "c", type: "channel" },
      { name: "z", type: "space" },
      { name: "y", type: "space" },
      { name: "x", type: "space" },
    ],
    datasets: [
      { path: "0", coordinateTransformations: [{ type: "scale", scale: [1, 1, 1, 1, 1] }] },
      { path: "1", coordinateTransformations: [{ type: "scale", scale: [1, 1, 1, 2, 2] }] },
      { path: "2", coordinateTransformations: [{ type: "scale", scale: [1, 1, 1, 4, 4] }] },
    ],
  }],
};

// v0.2-style: no axes at all -> constructor synthesizes 5 axes for a 3D array
const ATTRS_V02_NO_AXES = {
  multiscales: [{
    version: "0.2",
    datasets: [{ path: "0" }, { path: "1" }, { path: "2" }],
  }],
};

function fakeArr(shape, dtype = "uint8") {
  return { shape, dtype };
}

// Build an NgffImage with no I/O. Seeding arrays[path] short-circuits openArray()
// at image.ts:226 *before* the createOmero block, so calcShapes() still runs for
// real on pure arithmetic. omero is deliberately left undefined - nothing under
// test reads it before the maxSize guard.
function offlineImage(attrs, { path = "0", shape } = {}) {
  const img = new NgffImage(attrs, {});
  img.arrays[path] = fakeArr(shape);
  return img;
}

function abortedSignal() {
  const c = new AbortController();
  c.abort(new Error("SENTINEL_ABORT"));
  return c.signal;
}

// ---- the bug: [H, W, C] with H > W ----

describe("yxc layout (H > W)", () => {
  test("pyramid shapes are derived as expected (sanity, no I/O)", async () => {
    const img = offlineImage(ATTRS_YXC_V04, { shape: [1024, 256, 3] });
    expect(await img.calcShapes()).toEqual([
      [1024, 256, 3],
      [512, 128, 3],
      [256, 64, 3],
    ]);
  });

  test("resolves y/x by axis name, not position", () => {
    const img = offlineImage(ATTRS_YXC_V04, { shape: [1024, 256, 3] });
    expect(img.getYXDimIndices(3)).toEqual({ yDim: 0, xDim: 1 });
  });

  test("getPathForTargetSize ranks the pyramid by max(H, W)", async () => {
    const img = offlineImage(ATTRS_YXC_V04, { shape: [1024, 256, 3] });
    // longest sides are [1024, 512, 256]; pre-fix they were [256, 128, 64] and
    // every target below collapsed to "0".
    expect(await img.getPathForTargetSize(512)).toBe("1");
    expect(await img.getPathForTargetSize(256)).toBe("2");
  });

  test("getPathForTargetSize works with no scales (v0.3, string axes)", async () => {
    const img = offlineImage(ATTRS_YXC_V03, { shape: [1024, 256, 3] });
    expect(img.scales).toEqual([]); // exercises the scales.length == 0 branch
    expect(img.getYXDimIndices(3)).toEqual({ yDim: 0, xDim: 1 });
    // longest sides [1024, 512, 256] (pre-fix: [256, 128, 64])
    expect(await img.getPathForTargetSize(512)).toBe("1");
    expect(await img.getPathForTargetSize(256)).toBe("2");
  });

  test("maxSize guard uses H * W, not W * C", async () => {
    const img = offlineImage(ATTRS_YXC_V04, { shape: [1024, 256, 3] });
    // 1024 * 256 = 262144 > 500 * 500. Pre-fix: 256 * 3 = 768, guard let it through.
    await expect(
      img.renderArray({ arr: fakeArr([1024, 256, 3]), maxSize: 500 })
    ).rejects.toThrow(/Array size \(256 \* 1024\) is larger than specified 'maxSize' of 500 \* 500/);
  });

  test("maxSize guard still admits planes that fit (no network)", async () => {
    const img = offlineImage(ATTRS_YXC_V04, { shape: [1024, 256, 3] });
    // Guard passes, so we fall through to render.ts renderArray, whose first
    // statement is signal?.throwIfAborted() -> our sentinel. Proves no fetch.
    await expect(
      img.renderArray({ arr: fakeArr([1024, 256, 3]), maxSize: 5000, signal: abortedSignal() })
    ).rejects.toThrow("SENTINEL_ABORT");
  });
});

// ---- regression: canonical tczyx must be byte-identical ----

describe("tczyx regression", () => {
  const SHAPE = [1, 2, 236, 275, 271];

  test("y/x are the last two dims", () => {
    const img = offlineImage(ATTRS_TCZYX_V04, { shape: SHAPE });
    expect(img.getYXDimIndices(5)).toEqual({ yDim: 3, xDim: 4 });
  });

  test("pyramid selection unchanged", async () => {
    const img = offlineImage(ATTRS_TCZYX_V04, { shape: SHAPE });
    expect(await img.calcShapes()).toEqual([
      [1, 2, 236, 275, 271],
      [1, 2, 236, 137, 135],
      [1, 2, 236, 68, 67],
    ]);
    // longest sides [275, 137, 68]
    expect(await img.getPathForTargetSize(275)).toBe("0");
    expect(await img.getPathForTargetSize(137)).toBe("1");
    expect(await img.getPathForTargetSize(68)).toBe("2");
  });

  test("maxSize guard message and ordering unchanged", async () => {
    const img = offlineImage(ATTRS_TCZYX_V04, { shape: SHAPE });
    await expect(
      img.renderArray({ arr: fakeArr(SHAPE), maxSize: 100 })
    ).rejects.toThrow(/Array size \(271 \* 275\) is larger than specified 'maxSize' of 100 \* 100/);
  });
});

// ---- fallbacks ----

describe("fallbacks", () => {
  test("axes.length > ndim (v0.1-v0.3 synthesized tczyx) falls back to the last two dims", async () => {
    const img = offlineImage(ATTRS_V02_NO_AXES, { shape: [236, 275, 271] });
    expect(img.getAxesNames()).toEqual(["t", "c", "z", "y", "x"]);
    expect(img.getYXDimIndices(3)).toEqual({ yDim: 1, xDim: 2 });
    // no scales: longest side 275 -> [275, 137.5, 68.75]
    expect(await img.getPathForTargetSize(137)).toBe("1");
  });

  test("arbitrary names with type space use the last two space axes", () => {
    const attrs = JSON.parse(JSON.stringify(ATTRS_YXC_V04));
    attrs.multiscales[0].axes = [
      { name: "row", type: "space" },
      { name: "col", type: "space" },
      { name: "ch", type: "channel" },
    ];
    const img = offlineImage(attrs, { shape: [1024, 256, 3] });
    expect(img.getYXDimIndices(3)).toEqual({ yDim: 0, xDim: 1 });
  });

  test("no y/x and no space axes warns and falls back positionally", () => {
    const attrs = JSON.parse(JSON.stringify(ATTRS_YXC_V04));
    attrs.multiscales[0].axes = [{ name: "a" }, { name: "b" }, { name: "d" }];
    const img = offlineImage(attrs, { shape: [1024, 256, 3] });
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    try {
      expect(img.getYXDimIndices(3)).toEqual({ yDim: 1, xDim: 2 });
      expect(warn).toHaveBeenCalled();
    } finally {
      warn.mockRestore();
    }
  });
});
