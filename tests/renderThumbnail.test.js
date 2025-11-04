import { expect, test } from "vitest";
import { renderThumbnail } from "../src/index.js";
import { data6001240 } from "./imagesAsData.js";

const URL_IDR62 = "https://uk1s3.embassy.ebi.ac.uk/idr/zarr/v0.4/idr0062A/6001240.zarr"

test("render6001240", async () => {
  expect(await renderThumbnail(URL_IDR62)).toBeDefined();
});

test("render6001240_src", async () => {
  expect(await renderThumbnail(URL_IDR62)).toBe(data6001240)});
