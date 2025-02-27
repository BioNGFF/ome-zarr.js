# renderThumbnail


## Default usage

By default, `renderThumbnail(url)` will use the smallest resolution `dataset` from the
`multiscales` pyramid.

It will also use any `omero` rendering settings to choose active channels and colors.

```js
import * as omezarr from "https://cdn.jsdelivr.net/npm/ome-zarr.js/+esm";

let url = "https://uk1s3.embassy.ebi.ac.uk/idr/zarr/v0.4/idr0062A/6001240.zarr";
let thumbSrc = await omezarr.renderThumbnail(url);
document.getElementById("thumbnail").src = thumbSrc;
```

The thumbnails below are rendered at their natural size, corresponding to the smallest
resolution for each `OME-Zarr` Image. Click the thumbnails to inspect each Image in `ome-ngff-validator`:

<script setup>
import Thumbnail from './components/Thumbnail.vue';
</script>

<ClientOnly>
<Thumbnail url="https://uk1s3.embassy.ebi.ac.uk/idr/zarr/v0.1/9836841.zarr" />
<Thumbnail url="https://uk1s3.embassy.ebi.ac.uk/idr/zarr/v0.2/idr0070A/9838562.zarr/0/" />
<Thumbnail url="https://uk1s3.embassy.ebi.ac.uk/idr/zarr/v0.4/idr0048A/9846151.zarr/0/" />
<Thumbnail url="https://uk1s3.embassy.ebi.ac.uk/idr/zarr/v0.4/idr0062A/6001240.zarr" />
<Thumbnail url="https://uk1s3.embassy.ebi.ac.uk/idr/zarr/v0.4/idr0083A/9822152.zarr" />
<Thumbnail url="https://uk1s3.embassy.ebi.ac.uk/idr/zarr/v0.5/idr0066/ExpD_chicken_embryo_MIP.ome.zarr" />
<Thumbnail url="https://uk1s3.embassy.ebi.ac.uk/idr/zarr/v0.3/idr0079A/9836998.zarr" />
</ClientOnly>

<div :class="$style.thumb_container"></div>

## Target Size

You can choose a preferred `targetSize` and the `dataset` where the longest side (`x` or `y`)
is closest to the `targetSize` will be chosen.

```js
let thumbSrc = await omezarr.renderThumbnail(url, 300);
```

<Thumbnail url="https://uk1s3.embassy.ebi.ac.uk/idr/zarr/v0.4/idr0048A/9846151.zarr/0/" targetSize=300 />
<Thumbnail url="https://uk1s3.embassy.ebi.ac.uk/idr/zarr/v0.4/idr0062A/6001240.zarr" targetSize=300 />
<Thumbnail url="https://uk1s3.embassy.ebi.ac.uk/idr/zarr/v0.3/idr0079A/9836998.zarr" targetSize=300 />

<div :class="$style.thumb_container"></div>

<style module>
.thumb_container {
  clear: left;
}
</style>

<!-- Check out the documentation for the [full list of markdown extensions](https://vitepress.dev/guide/markdown). -->
