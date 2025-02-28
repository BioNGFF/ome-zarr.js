

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


const luts = ref([]);
const lut = ref("fire.lut");

// hard-coded for now
const theZ = ref(100);
const theT = ref(0);

let omezarr;

onMounted(async () => {
  console.log("onMounted omero before", omeroRef.value);

  omezarr = await import('ome-zarr.js');

  if (props.example == 'luts') {
    // WARNING! If the API changes and this needs to be updated, the docs will need to be updated too!
    luts.value = omezarr.getLuts();
  }

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

function handleLut(lutName) {
  lut.value = lutName;
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
    } else if (props.example == 'luts') {
      omeroCopy.channels[index].lut = lut.value;
    }

    // WARNING! If the API changes and this needs to be updated, the docs will need to be updated too!
    let src = await omezarr.renderImage(arrRef, multiscaleRef.value.axes, omeroCopy, {}, autoBoost);

    // replace the src
    imgSrcList.value[index] = src;
  });
};
</script>

<template>
  <div :class="$style.luts" v-if="props.example == 'luts'">
    <button @click="()=>{handleLut(lut.name)}" :class="$style.lut" v-for="lut in luts" :key="lut.name">
      <legend>{{lut.name}}</legend>
      <img :src="lut.png" />
    </button>
  </div>

  <div :class="$style.clear_left"></div>

  <h4 v-if="props.example == 'luts'">{{ lut }}</h4>

  <a v-for="src in imgSrcList" :key="src" :href="VURL + props.url" target="_blank">
    <img :class="$style.renderedImage" :src="src" :style="{ maxWidth: maxWidth + 'px' }"/>
  </a>

  <div v-if="props.example == 'ztSliders'" style="margin: 10px;">
    Z:
    <input @change="handleZ" type="range" min="0" max="201" v-model="theZ" />
    {{ theZ }}
    <br>
    T:
    <input @change="handleZ" type="range" min="0" max="79" v-model="theT" />
    {{ theT }}
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
