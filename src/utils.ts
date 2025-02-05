
export const MAX_CHANNELS = 4;
export const COLORS = {
  cyan: "#00FFFF",
  yellow: "#FFFF00",
  magenta: "#FF00FF",
  red: "#FF0000",
  green: "#00FF00",
  blue: "#0000FF",
  white: "#FFFFFF",
};
export const MAGENTA_GREEN = [COLORS.magenta, COLORS.green];
export const RGB = [COLORS.red, COLORS.green, COLORS.blue];
export const CYMRGB = Object.values(COLORS).slice(0, -2);

export function hexToRGB(hex: string): [number, number, number] {
  if (hex.startsWith("#")) hex = hex.slice(1);
  const r = parseInt(hex.slice(0, 2), 16);
  const g = parseInt(hex.slice(2, 4), 16);
  const b = parseInt(hex.slice(4, 6), 16);
  return [r, g, b];
}

export function getDefaultVisibilities(n: number) {
  let visibilities;
  if (n <= MAX_CHANNELS) {
    // Default to all on if visibilities not specified and less than 6 channels.
    visibilities = Array(n).fill(true);
  } else {
    // If more than MAX_CHANNELS, only make first set on by default.
    visibilities = [
      ...Array(MAX_CHANNELS).fill(true),
      ...Array(n - MAX_CHANNELS).fill(false),
    ];
  }
  return visibilities;
}

export function getDefaultColors(n: number, visibilities: boolean[]) {
  let colors = [];
  if (n == 1) {
    colors = [COLORS.white];
  } else if (n == 2) {
    colors = MAGENTA_GREEN;
  } else if (n === 3) {
    colors = RGB;
  } else if (n <= MAX_CHANNELS) {
    colors = CYMRGB.slice(0, n);
  } else {
    // Default color for non-visible is white
    colors = Array(n).fill(COLORS.white);
    // Get visible indices
    const visibleIndices = visibilities.flatMap((bool, i) => (bool ? i : []));
    // Set visible indices to CYMRGB colors. visibleIndices.length === MAX_CHANNELS from above.
    for (const [i, visibleIndex] of visibleIndices.entries()) {
      colors[visibleIndex] = CYMRGB[i];
    }
  }
  return colors.map(hexToRGB);
}

export function getMinMaxValues(chunk2d: any): [number, number] {
  const data = chunk2d.data;
  let maxV = 0;
  let minV = Infinity;
  let length = chunk2d.data.length;
  for (let y = 0; y < length; y++) {
    let rawValue = data[y];
    maxV = Math.max(maxV, rawValue);
    minV = Math.min(minV, rawValue);
  }
  return [minV, maxV];
}


export function range(start: number, end: number) {
  // range(5, 10) -> [5, 6, 7, 8, 9]
  return Array.from({ length: end - start }, (_, i) => i + start);
}

export function renderTo8bitArray(ndChunks: any,
    minMaxValues: Array<[number, number]>,
    colors: Array<[number, number, number]>) {
  // Render chunks (array) into 2D 8-bit data for new ImageData(arr)
  // ndChunks is list of zarr arrays

  // assume all chunks are same shape
  const shape = ndChunks[0].shape;
  const height = shape[0];
  const width = shape[1];
  const pixels = height * width;

  if (!minMaxValues) {
    minMaxValues = ndChunks.map(getMinMaxValues);
  }

  // let rgb = [255, 255, 255];
  let start = performance.now();

  let rgba = new Uint8ClampedArray(4 * height * width).fill(0);
  let offset = 0;
  for (let y = 0; y < pixels; y++) {
    for (let p = 0; p < ndChunks.length; p++) {
      let rgb = colors[p];
      let data = ndChunks[p].data;
      let range = minMaxValues[p];
      let rawValue = data[y];
      let fraction = (rawValue - range[0]) / (range[1] - range[0]);
      // for red, green, blue,
      for (let i = 0; i < 3; i++) {
        // rgb[i] is 0-255...
        let v = (fraction * rgb[i]) << 0;
        // increase pixel intensity if value is higher
        rgba[offset * 4 + i] = Math.max(rgba[offset * 4 + i], v);
      }
    }
    rgba[offset * 4 + 3] = 255; // alpha
    offset += 1;
  }
  // if iterating pixels is fast, check histogram and boost contrast if needed
  // Thumbnails are less than 5 millisecs. 512x512 is 10-20 millisecs.
  if (performance.now() - start < 100) {
    let hist = getHistogram(rgba, 5);
    if (hist[4] < 1) {
      // If few pixels in top bin, boost contrast
      rgba = boostContrast(rgba, 2);
    }
  }
  return rgba;
}

function boostContrast(rgba: Uint8ClampedArray, factor: number) {
  // Increase contrast by factor
  for (let pixel = 0; pixel < rgba.length / 4; pixel++) {
    for (let i = 0; i < 3; i++) {
      let v = rgba[pixel * 4 + i];
      v = Math.min(255, v * factor);
      rgba[pixel * 4 + i] = v;
    }
  }
  return rgba;
}

function getHistogram(uint8array: Uint8ClampedArray, bins = 5) {
  // Create histogram from uint8array
  let hist = new Array(bins).fill(0);
  const binSize = 256 / bins;
  let pixelCount = uint8array.length / 4;
  for (let i = 0; i < pixelCount; i++) {
    let maxV = uint8array[i * 4];
    maxV = Math.max(uint8array[i * 4 + 1], maxV);
    maxV = Math.max(uint8array[i * 4 + 2], maxV);
    let bin = Math.floor(maxV / binSize);
    hist[bin] += 1;
  }
  // Normalize
  hist = hist.map((v) => (100 * v) / pixelCount);
  return hist;
}
