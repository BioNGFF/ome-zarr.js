
<script setup>

// works with `npm run docs:dev`
// NOT with `npm run docs:build`...
// "Only URLs with a scheme in: file and data are supported by the default ESM loader. Received protocol 'https:'"
// import * as omezarr from "https://cdn.jsdelivr.net/npm/ome-zarr.js/+esm";

import { onMounted } from 'vue';
import { ref } from 'vue'

const imgSrc = ref("");

const props = defineProps(['url', 'targetSize', 'autoBoost']);

const VURL = "https://ome.github.io/ome-ngff-validator/?source="

onMounted(async () => {

  // works with `npm run docs:dev` - loads from http://localhost:5173/ome-zarr.js/@fs/Users/wmoore/Desktop/ZARR/ome-zarr.js/dist/ome-zarr.js
  // works with `npm run docs:build`
  // NB: needs `npm run build` first!
  const omezarr = await import('ome-zarr.js');

  let autoBoost = Boolean(props.autoBoost);

  omezarr.renderThumbnail(props.url, props.targetSize, autoBoost).then(src => {
    imgSrc.value = src;
  })
});
</script>

<template>
  <a :href="VURL + props.url" target="_blank">
    <img alt="thumbnail" :src="imgSrc" />
  </a>
</template>


<style module>
img {
  float: left;
  margin: 5px;
}

</style>