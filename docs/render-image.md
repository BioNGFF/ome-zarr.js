---
outline: deep
---

<script setup>
import Image from './components/Image.vue';
</script>

# renderImage

For rending images with default rendering settings, we can use `renderThumbnail()` but if we
want more control then we need to use `renderImage()`. The rendering settings are defined
by the [omero](https://ngff.openmicroscopy.org/latest/index.html#omero-md) object.

```js
// For rendering Images, we want to keep the zarr array in hand...
// `arr` will be the multiscale highest resolution array by default
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
<Image url="https://uk1s3.embassy.ebi.ac.uk/idr/zarr/v0.4/idr0062A/6001240.zarr" />
</ClientOnly>

<div :class="$style.clear_left"></div>




<style module>
.clear_left {
  clear: left;
}
</style>
