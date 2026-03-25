# render

The `render(url)` function takes an OME-Zarr url and returns a `data:` string
for the `src` attribute of an html image.

## Default usage

By default, `render(url)` will use the smallest resolution `dataset` from the
`multiscales` pyramid.

It will also use any [omero](https://ngff.openmicroscopy.org/latest/index.html#omero-metadata-transitional)
rendering settings in the image metadata to choose active channels and colors.

```js
import * as omezarr from "https://cdn.jsdelivr.net/npm/ome-zarr.js/+esm";

let url = "https://uk1s3.embassy.ebi.ac.uk/idr/zarr/v0.4/idr0062A/6001240.zarr";
let thumbSrc = await omezarr.render(url);
document.getElementById("thumbnail").src = thumbSrc;
```

The thumbnails below are rendered at their natural size, corresponding to the smallest
resolution for each `OME-Zarr` Image. Click the thumbnails to inspect each Image in `ome-ngff-validator`:

<script setup>
import Thumbnail from './components/Thumbnail.vue';
import ThumbnailTest from './components/ThumbnailTest.vue';
</script>

<!-- ClientOnly because ome-zarr.js uses browser API: document.createElement('canvas') -->
<ClientOnly>
<div style="float:left; margin:3px"><Thumbnail url="https://uk1s3.embassy.ebi.ac.uk/idr/zarr/v0.1/9836841.zarr" /></div>
<div style="float:left; margin:3px"><Thumbnail url="https://uk1s3.embassy.ebi.ac.uk/idr/zarr/v0.2/idr0070A/9838562.zarr/0/" /></div>
<div style="float:left; margin:3px"><Thumbnail url="https://uk1s3.embassy.ebi.ac.uk/idr/zarr/v0.4/idr0048A/9846151.zarr/0/" /></div>
<div style="float:left; margin:3px"><Thumbnail url="https://uk1s3.embassy.ebi.ac.uk/idr/zarr/v0.4/idr0062A/6001240_ngff-zarr.ome.zarr" /></div>
<div style="float:left; margin:3px"><Thumbnail url="https://uk1s3.embassy.ebi.ac.uk/idr/zarr/v0.4/idr0083A/9822152.zarr" /></div>
<div style="float:left; margin:3px"><Thumbnail url="https://uk1s3.embassy.ebi.ac.uk/idr/zarr/v0.5/idr0066/ExpD_chicken_embryo_MIP.ome.zarr" /></div>
<div style="float:left; margin:3px"><Thumbnail url="https://uk1s3.embassy.ebi.ac.uk/idr/zarr/v0.3/idr0079A/9836998.zarr" /></div>
<div style="float:left; margin:3px"><Thumbnail url="https://s3.janelia.org/funceworm/test-uint64-small.zarr/" /></div>
</ClientOnly>

<div :class="$style.thumb_container"></div>

## Target Size

You can choose a preferred `targetSize` and the resolution level where the longest side (`x` or `y`)
is closest to the `targetSize` will be chosen.

```js
let thumbSrc = await omezarr.render(url, 300);
```
<div style="float:left; margin:3px">
  <Thumbnail url="https://uk1s3.embassy.ebi.ac.uk/idr/zarr/v0.4/idr0048A/9846151.zarr/0/" targetSize=300 />
</div>
<div style="float:left; margin:3px">
  <Thumbnail url="https://uk1s3.embassy.ebi.ac.uk/idr/zarr/v0.3/idr0079A/9836998.zarr" targetSize=300 />
</div>

<!-- Thumbnail are float:left so we need to clear that -->
<div :class="$style.thumb_container"></div>

## Auto-boost

The intensity levels for each channel are mapped over the full intensity range of the
pixels in the image. We find the `min` and `max` intensity values and then render the
`min` intensity to black and the `max` to e.g. red, green, blue or white. However, if
one or two pixels are much brighter than the rest, this can result in a dim image.

If `autoBoost` is `true`, then a histogram is calculated and if the top `20%` of the
histogram has less than `1%` of pixels then we double the intensity of all pixels.

```js
let thumbSrc = await omezarr.render(url, 200, {autoBoost: true});
```

Here we show the same Image thumbnail, with `autoBoost = false` and with `autoBoost = true`.

<div style="float:left; margin:3px">
  <Thumbnail url="https://uk1s3.embassy.ebi.ac.uk/idr/zarr/v0.5/idr0066/ExpD_chicken_embryo_MIP.ome.zarr"
 targetSize=200 />
</div>
<div style="float:left; margin:3px">
  <Thumbnail url="https://uk1s3.embassy.ebi.ac.uk/idr/zarr/v0.5/idr0066/ExpD_chicken_embryo_MIP.ome.zarr"
 targetSize=200 autoBoost=true />
</div>

<div :class="$style.thumb_container"></div>

::: tip
We only attempt to perform `autoBoost` if the initial render process took less than 100 millisecs, so
as not to cause performance issues with larger images.
:::


## Max Size

We want to avoid attempts to render massive images. If the chosen resolution level
has `width x height` greater than `maxSize x maxSize` then `render()` will throw an `Error`,
with the default `maxSize` being `1000`.

To change that threshold, we can specify a different value:

```js
let maxSize = 1500;
let targetSize = 500;
let thumbSrc = await omezarr.render(url, targetSize, {maxSize: maxSize});
```

## Test render()

Here you can test `render()` with your own images.

<ClientOnly>
<ThumbnailTest />
</ClientOnly>


## What's being loaded?

Under the hood, `render()` makes several calls to fetch `zarr` metadata and chunks.

When we specify `targetSize` the calls go like this:

```js
// This loads the multiscales zarr.json or .zattrs and then
// loads the FIRST (largest) array by default, so we know the
// dimensions of the full-size image and can calculate the others
let ngffImg = await omezarr.NgffImage.load(store);

// This will load the appropriate array for the targetSize, then
// load chunks needed to render
let src = await ngffImg.render({targetSize, autoBoost});
```

If we *don't* specify `targetSize`, we save one extra `fetch` as we only need to load
one array instead of 2.

```js
// This loads the image and then loads the LAST (smallest) array
let datasetIndex = -1;  // last index
let ngffImg = await omezarr.NgffImage.load(store, datasetIndex);

// We use the array at datasetIndex that we have alredy loaded.
let src = await ngffImg.render({datasetIndex, autoBoost});
```



<style module>
.thumb_container {
  clear: left;
}
</style>

<!-- Check out the documentation for the [full list of markdown extensions](https://vitepress.dev/guide/markdown). -->
