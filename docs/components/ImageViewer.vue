<script setup>

import { onMounted } from 'vue';
import { ref } from 'vue'

const VURL = "https://ome.github.io/ome-ngff-validator/?source=";

const imgSrc = ref(null);

const props = defineProps(['url']);

// We store image array and metadata in these refs
let img = null;
const omeroRef = ref({ channels: [] });

const maxWidth = 450;

let omezarr;

function toggleChannel(index, active) {
  console.log('toggleChannel', index);
  omeroRef.value.channels[index].active = active;
  // update the image itself
  img.setChannelActive(index, active);
  render();
}

function handleColor(index, event) {
  console.log('handleColor', index, event.target.value);
  omeroRef.value.channels[index].color = event.target.value.replace("#", "");
  // update the image itself
  img.setChannelColor(index, omeroRef.value.channels[index].color);
  render();
}

function handleWindowStart(index, event) {
  console.log('handleWindowStart', index, event.target.value);
  omeroRef.value.channels[index].window.start = parseInt(event.target.value);
  // update the image itself
  img.setChannelStart(index, omeroRef.value.channels[index].window.start);
  render();
}

function handleWindowEnd(index, event) {
  console.log('handleWindowEnd', index, event.target.value);
  omeroRef.value.channels[index].window.end = parseInt(event.target.value);
  // update the image itself
  img.setChannelEnd(index, omeroRef.value.channels[index].window.end);
  render();
}

onMounted(async () => {
  // This loads from http://localhost:5173/ome-zarr.js/@fs/Users/wmoore/Desktop/ZARR/ome-zarr.js/dist/ome-zarr.js
  // NB: needs `npm run build` first!
  omezarr = await import('ome-zarr.js');

  img = await omezarr.NgffImage.load(props.url);
  // make a deep copy so we don't mix Vue refs with the original image object
  omeroRef.value = JSON.parse(JSON.stringify(img.omero));

  console.log("onMounted omero", omeroRef.value);
  render();
});

async function render() {
  // Simply render with the current image settings
  imgSrc.value = await img.render({targetSize: 500});
};
</script>

<template>

  <div :class="$style.viewer">
    <a :href="VURL + props.url" target="_blank">
      <img :class="$style.renderedImage" :src="imgSrc" :style="{ maxWidth: maxWidth + 'px' }" />
    </a>

    <div>
      <div v-for="(ch, index) in omeroRef.channels">
        <input type="color" @change="(event) => { handleColor(index, event) }" :value="'#' + ch.color" />
        <label>
          <input type="checkbox" :checked="ch.active" @click="() => { toggleChannel(index, !ch.active) }" />
          {{ ch.label }}
        </label>
        <br>
        <div>
          <label>Start: {{ ch.window.start }}</label>
          <input type="range" :min="ch.window.min" :max="ch.window.max" :value="ch.window.start" @change="(event) => { handleWindowStart(index, event) }" />
        </div>
        <div>
          <label>End: {{ ch.window.end }}</label>
          <input type="range" :min="ch.window.min" :max="ch.window.max" :value="ch.window.end" @change="(event) => { handleWindowEnd(index, event) }" />
        </div>
      </div>
    </div>
  </div>

</template>

<style module>
input {
  vertical-align: middle;
}
label {
  display: inline-block;
  font-size: 12px;
}
.viewer {
  display: flex;
  flex-direction: row;
}

/* Range input for channel sliders */
.ch_slider {
  position: relative;
  margin: 20px;
  height: 10px;
  width: 100%;
}

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
