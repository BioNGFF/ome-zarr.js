import * as zarr from "zarrita";

import { describe, expect, test } from "vitest";
import { renderThumbnail } from "../src/index.ts";
import { getGroup } from "../src/utils.ts";
import { data6001240 } from "./imagesAsData.js";

import { PNG } from "pngjs";
import { Buffer } from "buffer";

const URL_IDR62 =
  "https://uk1s3.embassy.ebi.ac.uk/idr/zarr/v0.4/idr0062A/6001240.zarr";

function rgbaFromDataUrl(dataUrl) {
  // turn a data URL into decoded RGBA bytes
  const base64 = dataUrl.split(",")[1];
  const buf = Buffer.from(base64, "base64");
  const { data: rgba } = PNG.sync.read(buf); // data is RGBA (Buffer)
  return rgba;
}

describe("renderThumbnail", () => {
  test("render6001240_fromURL", async () => {
    const result = await renderThumbnail(URL_IDR62);
    expect(result).toBeDefined();
    expect(rgbaFromDataUrl(result)).toStrictEqual(rgbaFromDataUrl(data6001240));
  }, 10_000); // timeout in ms

  test("render6001240_fromFetchStore", async () => {
    const store = new zarr.FetchStore(URL_IDR62);
    const result = await renderThumbnail(store);
    expect(result).toBeDefined();
    expect(rgbaFromDataUrl(result)).toStrictEqual(rgbaFromDataUrl(data6001240));
  }, 10_000); // timeout in ms

  test("render6001240_fromGroup", async () => {
    const group = await getGroup(URL_IDR62);
    const result = await renderThumbnail(group);
    expect(result).toBeDefined();
    expect(rgbaFromDataUrl(result)).toStrictEqual(rgbaFromDataUrl(data6001240));
  }, 10_000); // timeout in ms

  test("render6001240_signal", async () => {
    const controller = new AbortController();
    controller.abort();
    await expect(
      renderThumbnail(URL_IDR62, undefined, false, 1000, {
        signal: controller.signal,
      })
    ).rejects.toThrow();
  }, 10_000); // timeout in ms
});
