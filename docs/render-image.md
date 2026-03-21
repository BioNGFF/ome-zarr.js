---
outline: deep
---

<script setup>
import Image from './components/Image.vue';
import ImageViewer from './components/ImageViewer.vue';
</script>

# Rendering settings

We can apply various rendering settings (color, levels, inverted) to each `Channel` in the
image and turn channels on and off.
If any [omero](https://ngff.openmicroscopy.org/latest/index.html#omero-metadata-transitional) metadata
is found on the image, this will form the initial settings, otherwise default settings
will be created.

```js
// We create a NgffImage, update rendering settings and render()
let url = "https://uk1s3.embassy.ebi.ac.uk/bia-integrator-data/S-BIAD855/781ac3d7-673f-47be-a4d2-3fdf3f477047/781ac3d7-673f-47be-a4d2-3fdf3f477047.zarr/D/3/0";

// This loads the first array, so we know the channel count and can
// create default settings if needed
let img = await omezarr.NgffImage.load(url);

// turn first channel off
img.setChannelActive(0, false)
// set 2nd channel to blue
img.setChannelColor(1, "0000FF");
// set start/end range of 2nd channel
img.setChannelStart(1, 100);
img.setChannelEnd(1, 300);

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

Set the Z and T indicies. If not specified, they will default to middle of the Z or T range.

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


<!-- TODO: replace? -->
<!-- ## getMultiscaleWithArray

The first call in the `renderImage()` example above is `getMultiscaleWithArray()` and this is also used
by `render()`. By default, this loads the first (highest resolution) `multiscale.dataset` of the pyramid,
but the `datasetIndex` can be used to specify a different one. 

It loads both the first `multiscale` metadata for the Image, as well as one of the zarr arrays from the
`multiscale.datasets` pyramid which is used to calculate the `shapes` of all the other arrays, using the
`scale` information from each `dataset.coordinateTransforms`. The `coordinateTransforms` metadata is not
found in `OME-Zarr < v0.4` so in that case `shapes` will be `undefined`.

The first argument can be a URL as above, or a `zarrita` store, which may be useful if you want to re-use the store:

```js
let store = new zarr.FetchStore(url);
let datasetIndex = -1;  // will load the smallest dataset array
let { multiscale, omero, zarr_version, arr, shapes } = await omezarr.getMultiscaleWithArray(store, datasetIndex);
// shapes is e.g. [[3, 50, 512, 512], [3, 50, 256, 256], [3, 50, 128, 128]]
// We can use the shapes to choose our preferred array, then open it with:
const paths = multiscale.datasets.map((d) => d.path);
// zarr_version (2 or 3) saves an extra call for zarrita to look this up
arr = await omezarr.getArray(store, paths[2], zarr_version);
// now we can use the `arr` array in renderImage() as above.
``` -->