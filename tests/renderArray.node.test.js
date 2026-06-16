
import { describe, expect, test } from "vitest";
import { renderChunk, renderChunkWithLUT } from "../src/render.ts";


test("renderChunk", async () => {

    let fakeChunk = {shape: [2, 2], data: [0, 1, 2, 3]};
    let fn = (value) => ([value * 2, 0, 0])
    let rendered = renderChunk(fakeChunk, fn);

    let expected = new Uint8ClampedArray([
        0, 0, 0, 255,
        2, 0, 0, 255,
        4, 0, 0, 255,
        6, 0, 0, 255,
    ]);
    expect(rendered).toStrictEqual(expected);
});


test("renderChunkWithLUT", async () => {
    
    let fakeChunk = {shape: [3, 3], data: [0, 1, 2, 3, 4, 5, 6, 7, 8]};
    let transparent = [0, 0, 0, 0];
    let red = [255, 0, 0];
    let green = [0, 255, 0];
    let blue = [0, 0, 255];
    let lut = [transparent, red, green, blue]

    // without range, values are indices into the LUT, wrapping around to 1
    let rendered = renderChunkWithLUT(fakeChunk, lut);

    let expected = new Uint8ClampedArray([
        0,0,0,0,
        255,0,0,255,  //red
        0,255,0,255,  //green
        0,0,255,255,  //blue
        255,0,0,255,  //red
        0,255,0,255,  //green
        0,0,255,255,  // etc...
        255,0,0,255,
        0,255,0,255,
    ]);
    expect(rendered).toStrictEqual(expected);
});


test("renderChunkWithLUTrange", async () => {
    
    let fakeChunk = {shape: [3, 3], data: [0, 1, 2, 3, 4, 5, 6, 7, 8]};
    let lut = Array.from({length: 256}, (_, i) => [i, 0, 0, 255]); // red gradient

    // with range, values are scaled to the LUT range
    let rendered = renderChunkWithLUT(fakeChunk, lut, {range: [0, 8]});
    console.log("rendered", rendered);

    let expected = new Uint8ClampedArray([
        0,    0,   0, 255,
        32,   0,   0, 255,
        64,   0,   0, 255,
        96,   0,   0, 255,
       128,   0,   0, 255,
       159,   0,   0, 255,
       191,   0,   0, 255,
       223,   0,   0, 255,
       255,   0,   0, 255
    ]);
    expect(rendered).toStrictEqual(expected);
});

