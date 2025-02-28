

<script setup>

import { onMounted } from 'vue';
import { ref } from 'vue'

const VURL = "https://ome.github.io/ome-ngff-validator/?source=";

const imgSrcList = ref([]);

const props = defineProps(['url', 'targetSize', 'autoBoost']);

const autoBoost = Boolean(props.autoBoost);

const maxWidth = 200;

onMounted(async () => {

  // This loads from http://localhost:5173/ome-zarr.js/@fs/Users/wmoore/Desktop/ZARR/ome-zarr.js/dist/ome-zarr.js
  // NB: needs `npm run build` first!
  const omezarr = await import('ome-zarr.js');

  // WARNING! If the API changes and this needs to be updated, the docs will need to be updated too!
  const {arr, omero, multiscale} = await omezarr.getMultiscaleWithArray(props.url);

  // turn OFF all channels
  omero.channels.forEach((ch) => (ch.active = false));
  // for each channel...
  omero.channels.forEach(async (channel, index) => {
    // deepcopy omero for each channel...
    let omeroCopy = JSON.parse(JSON.stringify(omero));
    // turn on the channel we want to render...
    omeroCopy.channels[index].active = true;

    // WARNING! If the API changes and this needs to be updated, the docs will need to be updated too!
    let src = await omezarr.renderImage(arr, multiscale.axes, omeroCopy, {}, autoBoost);
    imgSrcList.value.push(src);
  });
});
</script>

<template>
  <a v-for="src in imgSrcList" :key="src" :href="VURL + props.url" target="_blank">
    <img alt="thumbnail" :src="src" :style="{ maxWidth: maxWidth + 'px' }"/>
  </a>
</template>

<style module>
img {
  float: left;
  margin: 5px;
}
</style>
