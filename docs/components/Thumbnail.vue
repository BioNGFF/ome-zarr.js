
<script setup>

import { onMounted } from 'vue';
import { ref } from 'vue'

const imgSrc = ref("");

const props = defineProps(['url', 'targetSize', 'autoBoost', 'slices', 'arrayPathOrIndex']);

let autoBoost = Boolean(props.autoBoost);
const VURL = "https://ome.github.io/ome-ngff-validator/?source="

onMounted(async () => {

  // This loads from http://localhost:5173/ome-zarr.js/@fs/Users/wmoore/Desktop/ZARR/ome-zarr.js/dist/ome-zarr.js
  // NB: needs `npm run build` first!
  const omezarr = await import('ome-zarr.js');

  // WARNING! If the API changes and this needs to be updated, the docs will need to be updated too!
  if (props.slices) {
    let renderOpts = {autoBoost, slices: JSON.parse(props.slices)};
    // if neither arrayPathOrIndex nor targetSize is provided, render() will throw an Error
    if (props.arrayPathOrIndex !== undefined) {
      renderOpts.arrayPathOrIndex = props.arrayPathOrIndex;
    } else if (props.targetSize !== undefined) {
      renderOpts.targetSize = props.targetSize;
    }
    let img = await omezarr.NgffImage.load(props.url);
    // console.log("shapes", await img.calcShapes());
    imgSrc.value = await img.render(renderOpts);
  } else {
    imgSrc.value = await omezarr.render(props.url, props.targetSize, {autoBoost});
  }
});
</script>

<template>
  <a :href="VURL + props.url" target="_blank">
    <img alt="thumbnail" :src="imgSrc" />
  </a>
</template>
