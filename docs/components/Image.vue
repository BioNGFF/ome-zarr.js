

<script setup>

import { onMounted } from 'vue';
import { ref } from 'vue'

const VURL = "https://ome.github.io/ome-ngff-validator/?source=";

const imgSrcList = ref([]);

const props = defineProps(['url', 'autoBoost', 'example']);

const autoBoost = Boolean(props.autoBoost);

const maxWidth = (props.example == 'splitView') ? 200 : 500;

// We store image array and metadata in these refs
let arrRef = null;
const omeroRef = ref({channels: []});
const multiscaleRef = ref(null);


// hard-coded for now
const theZ = ref(100);
const theT = ref(0);

let omezarr;

onMounted(async () => {
  console.log("onMounted omero before", omeroRef.value);

  omezarr = await import('ome-zarr.js');

  // WARNING! If the API changes and this needs to be updated, the docs will need to be updated too!
  const {arr, omero, multiscale} = await omezarr.getMultiscaleWithArray(props.url);
  arrRef = arr;
  omeroRef.value = omero;
  multiscaleRef.value = multiscale;

  console.log("onMounted omero", omeroRef.value);
  render();

});

function handleZ(event) {
  console.log('handleZ', event.target.value, theZ.value);
  render();
}

async function render() {
  // This loads from http://localhost:5173/ome-zarr.js/@fs/Users/wmoore/Desktop/ZARR/ome-zarr.js/dist/ome-zarr.js
  // NB: needs `npm run build` first!

  console.log("rendering omeroRef.value", omeroRef.value);

  if (imgSrcList.length == 0) {
    // initialize imgSrcList
    omeroRef.value.channels.forEach((ch) => imgSrcList.value.push(""));
  }

  // turn OFF all channels
  omeroRef.value.channels.forEach((ch) => (ch.active = false));
  // for each channel...
  omeroRef.value.channels.forEach(async (channel, index) => {
    // deepcopy omero for each channel...
    let omeroCopy = JSON.parse(JSON.stringify(omeroRef.value));
    // turn on the channel we want to render...
    omeroCopy.channels[index].active = true;

    // for Z/T slider example, set the Z/T...
    if (props.example == 'ztSliders') {
      omeroCopy.rdefs = { defaultZ: parseInt(theZ.value), defaultT: parseInt(theT.value) };
      // we know the image is greyscale...
      omeroCopy.channels[index].color = "FFFFFF";
      omeroCopy.channels[index].window.end = 2000;
    }

    let multiscale = JSON.parse(JSON.stringify(multiscaleRef.value));

    console.log("omeroCopy", omeroCopy, multiscale, arrRef)

    // WARNING! If the API changes and this needs to be updated, the docs will need to be updated too!
    let src = await omezarr.renderImage(arrRef, multiscale.axes, omeroCopy, {}, autoBoost);

    // replace the src
    imgSrcList.value[index] = src;
  });
};
</script>

<template>
  <a v-for="src in imgSrcList" :key="src" :href="VURL + props.url" target="_blank">
    <img alt="thumbnail" :src="src" :style="{ maxWidth: maxWidth + 'px' }"/>
  </a>

  <div v-if="props.example == 'ztSliders'">
  TheZ:
  <input @change="handleZ" type="range" min="0" max="201" v-model="theZ" />
  {{ theZ }}
  <br>
  TheT:
  <input @change="handleZ" type="range" min="0" max="79" v-model="theT" />
  {{ theT }}
</div>

</template>

<style module>
img {
  float: left;
  margin: 5px;
}
</style>
