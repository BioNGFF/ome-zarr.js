
<script setup>

import * as omezarr from "https://cdn.jsdelivr.net/npm/ome-zarr.js/+esm";
import { onMounted } from 'vue';
import { ref } from 'vue'

const imgSrc = ref("");

const props = defineProps(['url', 'targetSize']);

const VURL = "https://ome.github.io/ome-ngff-validator/?source="

onMounted(async () => {
  // const omezarr = await import('ome-zarr.js');

  console.log('targetSize', props.targetSize);

  omezarr.renderThumbnail(props.url, props.targetSize).then(src => {
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