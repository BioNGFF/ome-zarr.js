---
outline: deep
---

<script setup>
import Image from './components/Image.vue';
import ImageViewer from './components/ImageViewer.vue';
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
// turn channel on/off
omero.channels[0].active = true;
// set channel color
omero.channels[0].color = "FFFFFF";
// set start/end range
omero.channels[0].window.start = 100;
omero.channels[0].window.end = 200;
let src = await omezarr.renderImage(arr, multiscale.axes, omeroCopy);
document.getElementById("splitview").innerHTML += `<img src="${src}" />`;
```


<ClientOnly>
<ImageViewer url="https://uk1s3.embassy.ebi.ac.uk/bia-integrator-data/S-BIAD855/781ac3d7-673f-47be-a4d2-3fdf3f477047/781ac3d7-673f-47be-a4d2-3fdf3f477047.zarr/D/3/0" />
</ClientOnly>

Image is from [idr0036-gustafsdottir-cellpainting](https://idr.openmicroscopy.org/webclient/?show=screen-1952).

# Z and T indices

Set the Z and T indicies. If not specified, they will default to middle of the Z or T range.

```js
omero.rdefs = { defaultZ: 100, defaultT: 0 };
let src = await omezarr.renderImage(arr, multiscale.axes, omero);
```

When updating Z and T, we keep the same `arr` object in hand. `renderImage()` only needs to fetch the zarr chunks for each re-render. 

<ClientOnly>
<Image url="https://uk1s3.embassy.ebi.ac.uk/bia-integrator-data/S-BIAD815/c49efcfd-e767-4ae5-adbf-299cafd92120/c49efcfd-e767-4ae5-adbf-299cafd92120.zarr/0/" autoBoost=true example="ztSliders" />
</ClientOnly>


Image is from [idr0051-fulton-tailbudlightsheet](https://idr.openmicroscopy.org/webclient/?show=project-552).

