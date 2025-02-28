---
outline: deep
---

<script setup>
import Image from './components/Image.vue';
</script>

# renderImage

::: warning
ome-zarr.js is not yet stable and the API may change in patch releases.
:::

For rending images with default rendering settings, we can use `renderThumbnail()` but if we
want more control then we need to use `renderImage()`. The rendering settings are defined
by the [omero](https://ngff.openmicroscopy.org/latest/index.html#omero-md) object.

```js
// For rendering Images, we want to keep the zarr array in hand...
// `arr` will be the multiscale highest resolution array by default
let url = "https://uk1s3.embassy.ebi.ac.uk/bia-integrator-data/S-BIAD855/781ac3d7-673f-47be-a4d2-3fdf3f477047/781ac3d7-673f-47be-a4d2-3fdf3f477047.zarr/D/3/0";
const {arr, omero, multiscale} = await omezarr.getMultiscaleWithArray(url);
// turn OFF all channels
omero.channels.forEach((ch) => (ch.active = false));
// for each channel...
omero.channels.forEach(async (channel, index) => {
  // deepcopy omero for each channel...
  let omeroCopy = JSON.parse(JSON.stringify(omero));
  // turn on the channel we want to render...
  omeroCopy.channels[index].active = true;
  let src = await omezarr.renderImage(arr, multiscale.axes, omeroCopy);
  document.getElementById("splitview").innerHTML += `<img src="${src}" />`;
});
```


<ClientOnly>
<Image url="https://uk1s3.embassy.ebi.ac.uk/bia-integrator-data/S-BIAD855/781ac3d7-673f-47be-a4d2-3fdf3f477047/781ac3d7-673f-47be-a4d2-3fdf3f477047.zarr/D/3/0" autoBoost=true />
</ClientOnly>

<div :class="$style.clear_left"></div>

Image is from [idr0036-gustafsdottir-cellpainting](https://idr.openmicroscopy.org/webclient/?show=screen-1952).


<style module>
.clear_left {
  clear: left;
}
</style>
