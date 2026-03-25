import { expect, test } from "vitest";
import { renderThumbnail } from "../src/index.js";
import { NgffImage } from "../src/image.js";
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

test("render6001240", async () => {
  expect(await renderThumbnail(URL_IDR62)).toBeDefined();
}, 10_000); // timeout in ms

test("render6001240_src", async () => {
  const got = await renderThumbnail(URL_IDR62);
  // compare decoded pixel bytes from data URLs
  expect(rgbaFromDataUrl(got)).toStrictEqual(rgbaFromDataUrl(data6001240));
}, 10_000); // timeout in ms

test("version6001240", async () => {
  const img = await NgffImage.load(URL_IDR62);
  expect(img.getVersion()).toEqual("0.4");
}, 10_000);
