---
outline: deep
---

<script setup>
import Image from './components/Image.vue';
import ImageViewer from './components/ImageViewer.vue';
import Thumbnail from './components/Thumbnail.vue';
</script>

# NgffImage

If we want to get image metadata or set the state of an image, we can use the `NgffImage` class.

```js
let url = "https://livingobjects.ebi.ac.uk/idr/zarr/v0.5/idr0062A/6001240_labels.zarr";

// This loads the multiscales image and the first dataset array,
// so we know the image dimensions
let img = await omezarr.NgffImage.load(url);

// Get the OME-Zarr version
img.getVersion()
// 0.5

// Get the zarr_version (2 or 3)
img.getZarrVersion()
// 3

// Use dataset coordinateTransformations to find scales for each dataset
img.getScales()
//   [[1, 0.5002025531914894, 0.3603981534640209, 0.3603981534640209]
//    [1, 0.5002025531914894, 0.7207963069280418, 0.7207963069280418]
//    [1, 0.5002025531914894, 1.4415926138560835, 1.4415926138560835]]

// Shape of the first array. Can use img.getShape(1) to load others
await img.getShape()
// [2, 236, 275, 271]

// Shapes are calculated from the first array shape and the scales above
// NB: This will be an empty list for v0.1-v0.3 (no scale info) 
await img.calcShapes()
//   [[2, 236, 275, 271]
//    [2, 236, 137, 135]
//    [2, 236, 68, 67]]

await img.getNeuroglancerUrl()
// https://neuroglancer-demo.appspot.com/#!%7B%22layers%22%3A%5B%7B%22name%22%3A%226001240_labels.zarr%22%2C%22source%22%3A%22https%3A%2F%2Flivingobjects.ebi.ac.uk%2Fidr%2Fzarr%2Fv0.5%2Fidr0062A%2F6001240_labels.zarr%2F%7Czarr3%3A%22%2C%22type%22%3A%22auto%22%7D%5D%2C%22layout%22%3A%224panel-alt%22%7D
```

## Rendering settings

We can apply various rendering settings (color, levels, inverted) to each `Channel` in the
image and turn channels on and off.
If any [omero](https://ngff.openmicroscopy.org/latest/index.html#omero-metadata-transitional) metadata
is found on the image, this will form the initial settings, otherwise default settings
will be created.

```js
// We create a NgffImage, update rendering settings and render()
let url = "https://uk1s3.embassy.ebi.ac.uk/bia-integrator-data/S-BIAD855/781ac3d7-673f-47be-a4d2-3fdf3f477047/781ac3d7-673f-47be-a4d2-3fdf3f477047.zarr/D/3/0";

// When the image is loaded, default rendering settings are created
// if there is no "omero" metadata found
let img = await omezarr.NgffImage.load(url);

// turn first channel off
img.setChannelActive(0, false)
// set 2nd channel to blue
img.setChannelColor(1, "0000FF");
// set start/end range of 2nd channel
img.setChannelStart(1, 100);
img.setChannelEnd(1, 300);
// set first channel inverted
img.setChannelInverted(0, true);

// This call will load the chunks and render to rgb image
let src = await img.render({targetSize: 500});
document.getElementById("image").src = src;
```

Note: The UI elements of the viewer below and others on the docs pages are provided by Vue.js [components within the
documentation](https://github.com/biongff/ome-zarr.js/blob/main/docs/components/), rather than the `ome-zarr.js` library itself.
The example below is from [ImageViewer](https://github.com/biongff/ome-zarr.js/blob/main/docs/components/ImageViewer.vue) component.

<ClientOnly>
<ImageViewer url="https://uk1s3.embassy.ebi.ac.uk/bia-integrator-data/S-BIAD855/781ac3d7-673f-47be-a4d2-3fdf3f477047/781ac3d7-673f-47be-a4d2-3fdf3f477047.zarr/D/3/0" />
</ClientOnly>

Image is from [idr0036-gustafsdottir-cellpainting](https://idr.openmicroscopy.org/webclient/?show=screen-1952).

## Z and T indices

Set the Z and T indices. If not specified in the
[omero](https://ngff.openmicroscopy.org/specifications/0.5/index.html#omero-metadata-transitional)
metadata, they will default to the middle of the Z or T range.

```js
img.setZIndex(100);
img.setTIndex(0);
let src = await img.render({targetSize: 300});
```

When updating Z and T, we keep the same Zarr array in hand. `render()` only needs to fetch the zarr chunks for each re-render. 

<ClientOnly>
<Image url="https://uk1s3.embassy.ebi.ac.uk/bia-integrator-data/S-BIAD815/c49efcfd-e767-4ae5-adbf-299cafd92120/c49efcfd-e767-4ae5-adbf-299cafd92120.zarr/0/" autoBoost=true example="ztSliders" />
</ClientOnly>


Image is from [idr0051-fulton-tailbudlightsheet](https://idr.openmicroscopy.org/webclient/?show=project-552).


## Slices

We can render a tile or region of an array by specifying `slices`.

```js
let url = "https://uk1s3.embassy.ebi.ac.uk/idr/zarr/v0.5/idr0066/ExpD_chicken_embryo_MIP.ome.zarr";
// This loads the first dataset array, so we know it's shape...
let img = await omezarr.NgffImage.load(url);
// Calulate the shape of other arrays using 'scale' transforms
let shapes = await img.calcShapes();
// [8978, 6510]
// [4489, 3255]
// [2244, 1627]
// [1122, 813]
// [561, 406]
// [280, 203]
// [140, 101]
// [70, 50]

// render 4 tiles from the first dataset array
let src1 = await img.render({arrayPathOrIndex: 0, slices:{"x":[3000,3200], "y":[4000, 4200]}})
let src2 = await img.render({arrayPathOrIndex: 0, slices:{"x":[3200,3400], "y":[4000, 4200]}})
let src3 = await img.render({arrayPathOrIndex: 0, slices:{"x":[3000,3200], "y":[4200, 4400]}})
let src4 = await img.render({arrayPathOrIndex: 0, slices:{"x":[3200,3400], "y":[4200, 4400]}})
```

<ClientOnly>
<table>
<tbody>
<tr>
<td style="padding: 0">
<Thumbnail url="https://uk1s3.embassy.ebi.ac.uk/idr/zarr/v0.5/idr0066/ExpD_chicken_embryo_MIP.ome.zarr" slices='{"x":[3000,3200], "y":[4000, 4200]}' arrayPathOrIndex=0 />
</td>
<td style="padding: 0">
<Thumbnail url="https://uk1s3.embassy.ebi.ac.uk/idr/zarr/v0.5/idr0066/ExpD_chicken_embryo_MIP.ome.zarr" slices='{"x":[3200,3400], "y":[4000, 4200]}' arrayPathOrIndex=0 />
</td>
</tr>
<tr>
<td style="padding: 0">
<Thumbnail url="https://uk1s3.embassy.ebi.ac.uk/idr/zarr/v0.5/idr0066/ExpD_chicken_embryo_MIP.ome.zarr" slices='{"x":[3000,3200], "y":[4200, 4400]}' arrayPathOrIndex=0 />
</td>
<td style="padding: 0">
<Thumbnail url="https://uk1s3.embassy.ebi.ac.uk/idr/zarr/v0.5/idr0066/ExpD_chicken_embryo_MIP.ome.zarr" slices='{"x":[3200,3400], "y":[4200, 4400]}' arrayPathOrIndex=0 />
</td>
</tr>
</tbody>
</table>
</ClientOnly>

This functionality is used by the <a href="https://github.com/TissUUmaps/OMEZarrTileSource">OMEZarrTileSource</a> for OpenSeadragon.

