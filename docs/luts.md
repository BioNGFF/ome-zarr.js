---
outline: deep
---

<script setup>
import Image from './components/Image.vue';
</script>

# Look-up Tables

::: warning
ome-zarr.js is not yet stable and the API may change in patch releases.
:::

Over 40 LUTs are included in `ome-zarr.js`. Each `lut.png` is a png of `256 x 1` pixels.
Below these are displayed with a height of `15px`:

```js
omezarr.getLuts().forEach((lut) => {
  let html = `<legend>${lut.name}</legend> <img src="${lut.png}" />`;
  document.getElementById("luts").innerHTML += html;
});
```

To `renderImage()` with a LUT, we can set the `lut` attribute of `omero.channels`:

```js
omero.channels[0].lut = "fire.lut";
let src = await omezarr.renderImage(arr, multiscale.axes, omero);
```

Click on a LUT below to re-render the image:

<ClientOnly>
<Image url="https://uk1s3.embassy.ebi.ac.uk/idr/zarr/v0.4/idr0062A/6001240.zarr" autoBoost=true example="luts" />
</ClientOnly>

<div :class="$style.clear_left"></div>

Image is from [idr0062-blin-nuclearsegmentation](https://idr.openmicroscopy.org/webclient/?show=project-801).

<style module>
.clear_left {
  clear: left;
}
</style>
