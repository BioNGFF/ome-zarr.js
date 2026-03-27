import { expect, test } from "vitest";
import { render } from "../src/api.js";
import { renderThumbnail } from "../src/index.js";
import { NgffImage } from "../src/image.js";
import { data6001240 } from "./imagesAsData.js";
import { getPixelValueRange } from "../src/utils.js";

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

test("old_api_render6001240_src", async () => {
  const got = await renderThumbnail(URL_IDR62);
  // compare decoded pixel bytes from data URLs
  expect(rgbaFromDataUrl(got)).toStrictEqual(rgbaFromDataUrl(data6001240));
}, 10_000); // timeout in ms

test("render6001240_src", async () => {
  const got = await render(URL_IDR62);
  expect(rgbaFromDataUrl(got)).toStrictEqual(rgbaFromDataUrl(data6001240));
}, 10_000);

test("version6001240", async () => {
  const img = await NgffImage.load(URL_IDR62);
  expect(img.getVersion()).toEqual("0.4");
  expect(img.getZarrVersion()).toEqual(2);
});

test("shapes6001240", async () => {
  const img = await NgffImage.load(URL_IDR62);
  expect(await img.calcShapes()).toEqual([
    [2, 236, 275, 271],
    [2, 236, 137, 135],
    [2, 236, 68, 67]]);
  // If we load the SMALLEST array, calculated shapes are less accurate
  let datasetIndex = -1;
  const imgThumb = await NgffImage.load(URL_IDR62, {datasetIndex});
  expect(await imgThumb.calcShapes()).toEqual([
    [2, 236, 272, 268],
    [2, 236, 136, 134],
    [2, 236, 68, 67]]);
});

test("attrs6001240", async () => {
  let zarrJson = await fetch(`${URL_IDR62}/.zattrs`).then((res) => res.json());
  // Hack the scale (z downsampling) to test that attrs can be passed in directly
  zarrJson.multiscales[0].datasets[0].coordinateTransformations[0].scale = [1, 1, 1, 1];
  zarrJson.multiscales[0].datasets[1].coordinateTransformations[0].scale = [1, 2, 2, 2];
  zarrJson.multiscales[0].datasets[2].coordinateTransformations[0].scale = [1, 4, 4, 4];
  // This won't need to load the zarr group again
  const img = await NgffImage.load(URL_IDR62, {attrs: zarrJson});
  expect(await img.calcShapes()).toEqual([
    [2, 236, 275, 271],
    [2, 118, 137, 135],
    [2, 59, 68, 67]]);
});

test("getPixelValueRange", () => {
  // test some common dtypes
  expect(getPixelValueRange("int8")).toEqual({ min: -128, max: 127 });
  expect(getPixelValueRange("int16")).toEqual({ min: -32768, max: 32767 });
  expect(getPixelValueRange("int32")).toEqual({ min: -2147483648, max: 2147483647 });
  expect(getPixelValueRange("int64")).toEqual({ min: -9223372036854775808, max: 9223372036854775807 });
  expect(getPixelValueRange("uint8")).toEqual({ min: 0, max: 255 });
  expect(getPixelValueRange("uint16")).toEqual({ min: 0, max: 65535 });
  expect(getPixelValueRange("uint32")).toEqual({ min: 0, max: 4294967295 });
  expect(getPixelValueRange("uint64")).toEqual({ min: 0, max: 18446744073709551615 });
  expect(getPixelValueRange("float32")).toEqual({ min: 0, max: 65535 });
  expect(getPixelValueRange("foo_bar")).toEqual({ min: 0, max: 65535 }); // default case
});
