

<script setup>

import { onMounted } from 'vue';
import { ref } from 'vue'

const VURL = "https://ome.github.io/ome-ngff-validator/?source=";

const imgSrc = ref(null);

const props = defineProps(['url']);

// We store image array and metadata in these refs
let arrRef = null;
const omeroRef = ref({channels: []});
const multiscaleRef = ref(null);

// const theZ = ref(0);
// const theT = ref(0);
const maxWidth = 500;

let omezarr;

function toggleChannel(index) {
  console.log('toggleChannel', index);
  omeroRef.value.channels[index].active = !omeroRef.value.channels[index].active;
  render();
}

onMounted(async () => {
  // This loads from http://localhost:5173/ome-zarr.js/@fs/Users/wmoore/Desktop/ZARR/ome-zarr.js/dist/ome-zarr.js
  // NB: needs `npm run build` first!
  omezarr = await import('ome-zarr.js');

  // WARNING! If the API changes and this needs to be updated, the docs will need to be updated too!
  const {arr, omero, multiscale} = await omezarr.getMultiscaleWithArray(props.url);
  arrRef = arr;
  omeroRef.value = omero;
  multiscaleRef.value = multiscale;

  console.log("onMounted omero", omeroRef.value);
  render();
});


async function render() {

  // WARNING! If the API changes and this needs to be updated, the docs will need to be updated too!
  imgSrc.value = await omezarr.renderImage(arrRef, multiscaleRef.value.axes, omeroRef.value);
};
</script>

<template>

  <a :href="VURL + props.url" target="_blank">
    <img :class="$style.renderedImage" :src="imgSrc" :style="{ maxWidth: maxWidth + 'px' }"/>
  </a>

  <div v-for="(ch, index) in omeroRef.channels">
    <label><input type="checkbox" :checked="ch.active" @click="()=>{toggleChannel(index)}" />{{ ch.label }}</label>
  </div>

<div :class="$style.clear_left"></div>

</template>

<style module>
.renderedImage {
  float: left;
  margin: 5px;
}
.luts {
  height: 318px;
  overflow: auto;
  margin-bottom: 10px;
}
.lut {
  float: left;
  margin: 2px 5px;
}
.lut img {
  width: 200px;
  height: 15px;
}

.clear_left {
  clear: left;
}

</style>
