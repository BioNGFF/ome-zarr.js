

<script setup>

import { onMounted } from 'vue';
import { ref } from 'vue'

const VURL = "https://ome.github.io/ome-ngff-validator/?source=";

const imgSrcList = ref([]);

const props = defineProps(['url', 'autoBoost', 'example']);

const autoBoost = Boolean(props.autoBoost);

const maxWidth = (props.example == 'splitView') ? 200 : 500;

// We store image for doing the rendering
let img = null;
// omero ref used for UI components
const omeroRef = ref({channels: []});


const luts = ref([]);
const lut = ref("fire.lut");
const playing = ref(false);

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
  img = await omezarr.NgffImage.load(props.url);
  // make a deep copy so we don't mix Vue refs with the original image object
  omeroRef.value = JSON.parse(JSON.stringify(img.omero));

  console.log("onMounted omero", omeroRef.value);
  render();

});

function handleZ(event) {
  console.log('handleZ', event.target.value, theZ.value);
  img.setZIndex(parseInt(theZ.value));
  render();
}

function handleT(event) {
  console.log('handleT', event.target.value, theT.value);
  img.setTIndex(parseInt(theT.value));
  render();
}

function handleLut(lutName) {
  lut.value = lutName;
  render();
}

function play() {
  playing.value = !playing.value;
  let t = theT.value;
  async function next() {
    theT.value = t;
    t = (t + 1) % 79;
    img.setTIndex(parseInt(theT.value));
    await render();
    if (playing.value) {
      setTimeout(next, 50);
    }
  }
  if (playing.value) {
    next();
  }
}



async function render() {
  // This loads from http://localhost:5173/ome-zarr.js/@fs/Users/wmoore/Desktop/ZARR/ome-zarr.js/dist/ome-zarr.js
  // NB: needs `npm run build` first!

  if (imgSrcList.length == 0) {
    // initialize imgSrcList
    omeroRef.value.channels.forEach((ch) => imgSrcList.value.push(""));
  }

  // for each channel...
  for (let index = 0; index < omeroRef.value.channels.length; index++) {
    // turn OFF all channels
    for (let index = 0; index < omeroRef.value.channels.length; index++) {
      img.setChannelActive(index, false);
    }
    // turn on the channel we want to render...
    img.setChannelActive(index, true);

    // for Z/T slider example, set the Z/T...
    if (props.example == 'ztSliders') {
      // we know the image is greyscale...
      img.setChannelColor(index, "FFFFFF");
      img.setChannelEnd(index, 2000);
    } else if (props.example == 'luts') {
      img.setChannelLut(index, lut.value);
    }

    // WARNING! If the API changes and this needs to be updated, the docs will need to be updated too!
    let src = await img.render({targetSize: 300, autoBoost});

    // replace the src
    imgSrcList.value[index] = src;
  };
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
    <input @change="handleT" type="range" min="0" max="79" v-model="theT" />
    {{ theT }}

    <hr >
    <button @click="()=>{play()}">{{ playing ? '■ Stop Movie' : '► Play Movie' }}</button>
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

button {
  border: solid 1px #ccc;
  padding: 5px;
  border-radius: 5px;
  background-color: transparent;
  cursor: pointer;
}

</style>
