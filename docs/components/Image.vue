

<script setup>

import { onMounted } from 'vue';
import { ref } from 'vue'

const imgSrcList = ref([]);

const props = defineProps(['url', 'targetSize']);

const VURL = "https://ome.github.io/ome-ngff-validator/?source="

onMounted(async () => {

  // This loads from http://localhost:5173/ome-zarr.js/@fs/Users/wmoore/Desktop/ZARR/ome-zarr.js/dist/ome-zarr.js
  // NB: needs `npm run build` first!
  const omezarr = await import('ome-zarr.js');

  // For rendering Images, we want to keep the zarr array in hand...
  // `arr` will be the multiscale highest resolution array by default
  const {arr, omero, multiscale} = await omezarr.getMultiscaleWithArray(props.url);
  // turn OFF all channels
  omero.channels.forEach((ch) => (ch.active = false));
  // for each channel...
  omero.channels.forEach(async (channel, index) => {
    // deepcopy omero for each channel...
    let omeroCopy = JSON.parse(JSON.stringify(omero));
    // turn on the channel we want to render...
    omeroCopy.channels[index].active = true;
    let src = await omezarr.renderImage(arr, multiscale.axes, omeroCopy);
    imgSrcList.value.push(src);
  });
});
</script>

<template>
  <a v-for="src in imgSrcList" :key="src" :href="VURL + props.url" target="_blank">
    <img alt="thumbnail" :src="src" />
  </a>
</template>

<style module>
img {
  float: left;
  margin: 5px;
}
</style>
