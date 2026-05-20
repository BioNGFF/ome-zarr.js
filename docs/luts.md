---
outline: deep
---

<script setup>
import Image from './components/Image.vue';
</script>

# Look-up Tables

Over 40 LUTs are included in `ome-zarr.js`. We can list them all with `getLuts()`.
Each `lut.png` is a `data:` URL of a `256 x 1` pixels png.
Below these are displayed with a height of `15px`:

```js
omezarr.getLuts().forEach((lut) => {
  let html = `<legend>${lut.name}</legend> <img src="${lut.png}" />`;
  document.getElementById("luts").innerHTML += html;
});
```

We can lookup the `rgb` list for a lut by `name`:

```js
let fireRgb = omezarr.getLutRgb("fire.lut")
```

However, if we want to allow tree shaking to skip bundling all the LUTs, we can import
only the LUT we need:

```js
let fireRgb = omezarr.luts.FIRE;
```

To `render()` with a LUT, we can set the `lut` to a list of `rgb` values:

```js
let img = await omezarr.NgffImage.load(url);
img.setChannelLut(0, fireRgb);
let src = await img.render({targetSize: 300});
```

We can also supply our custom LUT of `rgb` values, which can be of any length:

```js
let customRgbLut = [[255, 0, 0], [0, 255, 0], [0, 0, 255]];
img.setChannelLut(0, customRgbLut);
```

Click on a LUT below to re-render the image:

<ClientOnly>
<Image url="https://livingobjects.ebi.ac.uk/idr/zarr/v0.4/idr0062A/6001240.zarr" autoBoost=true example="luts" />
</ClientOnly>

<div :class="$style.clear_left"></div>

Image is from [idr0062-blin-nuclearsegmentation](https://idr.openmicroscopy.org/webclient/?show=project-801).

<style module>
.clear_left {
  clear: left;
}
</style>
