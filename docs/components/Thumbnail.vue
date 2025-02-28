
<script setup>

import { onMounted } from 'vue';
import { ref } from 'vue'

const imgSrc = ref("");

const props = defineProps(['url', 'targetSize', 'autoBoost']);

let autoBoost = Boolean(props.autoBoost);
const VURL = "https://ome.github.io/ome-ngff-validator/?source="

onMounted(async () => {

  // This loads from http://localhost:5173/ome-zarr.js/@fs/Users/wmoore/Desktop/ZARR/ome-zarr.js/dist/ome-zarr.js
  // NB: needs `npm run build` first!
  const omezarr = await import('ome-zarr.js');

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
