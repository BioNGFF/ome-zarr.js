<script setup>
import { useTemplateRef, onMounted, watch } from "vue";
import { ref } from "vue";

const sizeZ = ref(0);
const sizeC = ref(0);
const sizeT = ref(0);
const sizeX = ref(0);
const sizeY = ref(0);

const tIndex = ref(0);
const delayMs = ref(200);

const placeholderImage =
  "data:image/gif;base64,R0lGODlhAQABAAD/ACwAAAAAAQABAAACADs=";

// List of src for each frame, indexed by tIndex
let framesSrc = ref([]);

let isPlaying = ref(false);
let controlsVisible = ref(true);

let omezarr;
let dsPath;

// how many frames to keep loaded ahead of the current frame
const BUFFER_SIZE = 25;
// number of parallel image instances used for the one-off initial load
const INITIAL_LOADERS = 5;

// single reusable image instance for buffering frames ahead of playback
let bufferImg;
// bumped whenever loading should restart from a new frame (playback tick or user skip)
let loadGeneration = 0;

const props = defineProps(["url"]);
const canvas = useTemplateRef("galleryCanvas");

console.log("props.url", props.url);
let zarrUrl = props.url;

// override url with query param if present
const urlParams = new URLSearchParams(window.location.search);
if (urlParams.has("source")) {
  zarrUrl = urlParams.get("source");
}
console.log("zarrUrl", zarrUrl);

function incrementTIndex() {
  if (!isPlaying.value) {
    return;
  }
  let nextTIndex = (parseInt(tIndex.value) + 1) % framesSrc.value.length;
  // only increment if the next frame is loaded
  if (framesSrc.value[nextTIndex] !== placeholderImage) {
    tIndex.value = nextTIndex;
  }
  setTimeout(incrementTIndex, delayMs.value);
}

function play(event) {
  isPlaying.value = !isPlaying.value;
  if (isPlaying.value) {
    incrementTIndex();
  }
  // need to stop event bubbling so that clicking the play button doesn't also toggle controlsVisible
  event.stopPropagation();
}

// loads the first BUFFER_SIZE frames in parallel (one-off, using separate image instances)
async function loadInitialFrames() {
  const count = Math.min(BUFFER_SIZE, sizeT.value);
  const loaders = Math.min(INITIAL_LOADERS, count);
  await Promise.all(
    Array.from({ length: loaders }, async (_, offset) => {
      let img = await omezarr.NgffImage.load(zarrUrl);
      img.omero.rdefs = {};
      for (let t = offset; t < count; t += loaders) {
        img.setTIndex(t);
        framesSrc.value[t] = await img.render({ arrayPathOrIndex: dsPath });
      }
    })
  );
}

// keeps loading a buffer of BUFFER_SIZE frames ahead of startIndex, wrapping around.
// Restarting bumps loadGeneration so any in-progress loop from a previous call stops early.
async function loadFramesAhead(startIndex) {
  if (!dsPath || !sizeT.value) {
    return;
  }
  loadGeneration++;
  const myGeneration = loadGeneration;

  if (!bufferImg) {
    bufferImg = await omezarr.NgffImage.load(zarrUrl);
    bufferImg.omero.rdefs = {};
  }
  // if global loadGeneration has changed while bufferImg loaded, stop early
  if (loadGeneration !== myGeneration) {
    return;
  }

  const count = Math.min(BUFFER_SIZE, sizeT.value);
  for (let i = 0; i < count; i++) {
    // again, abort if the loadGeneration has changed while loading frames
    if (loadGeneration !== myGeneration) {
      return;
    }
    // choose the next frame to load, and skip it if it's already loaded
    const t = (startIndex + i) % sizeT.value;
    if (framesSrc.value[t] !== placeholderImage) {
      continue;
    }
    // load the next frame into the buffer image, and add to cache
    bufferImg.setTIndex(t);
    const imgSrc = await bufferImg.render({ arrayPathOrIndex: dsPath });
    framesSrc.value[t] = imgSrc;
  }
}

// re-buffer whenever the current frame changes, whether from playback or the user skipping
watch(tIndex, (newIndex) => {
  loadFramesAhead(Number(newIndex));
});

onMounted(async () => {
  // This loads from http://localhost:5173/ome-zarr.js/@fs/Users/wmoore/Desktop/ZARR/ome-zarr.js/dist/ome-zarr.js
  // NB: needs `npm run build` first!
  omezarr = await import("ome-zarr.js");

  let img = await omezarr.NgffImage.load(zarrUrl);
  //   let shapes = await img.calcShapes();
  dsPath = await img.getPathForTargetSize(300);
  let shape = await img.getShape(dsPath);
  let axes = await img.getAxesNames();
  sizeZ.value = shape[axes.indexOf("z")] || 1;
  sizeC.value = shape[axes.indexOf("c")] || 1;
  sizeT.value = shape[axes.indexOf("t")] || 1;
  sizeX.value = shape[axes.indexOf("x")] || 1;
  sizeY.value = shape[axes.indexOf("y")] || 1;
  img.omero.rdefs = {};

  framesSrc.value = new Array(sizeT.value).fill(placeholderImage);

  // initially only load the first BUFFER_SIZE frames
  await loadInitialFrames();
});
</script>

<template>
  <!-- if controlsVisible add controlsVisible class -->
  <div
    :class="[$style.viewer, controlsVisible ? $style.controlsVisible : '']"
    @click="controlsVisible = !controlsVisible"
  >
    <img :class="$style.image" :src="framesSrc[tIndex]" />

    <!-- play -->
    <button
      :class="$style.playButton"
      @click="
        (event) => {
          play(event);
        }
      "
    >
      <span v-if="isPlaying" :class="$style.pause"></span>
      <span v-else>►</span>
    </button>
  </div>
  <!-- footer is outside the main viewer div -->
  <div :class="$style.footer">
    <div style="text-align: center; margin-bottom: 25px">
      <div :class="$style.tsliderTrackContainer">
        <div :class="$style.tsliderTrack">
          <div
            v-for="(frame, index) in framesSrc"
            :key="index"
            :class="[
              $style.loadedFrame,
              frame !== placeholderImage ? $style.loaded : '',
            ]"
          ></div>
        </div>
      </div>
      <input
        :class="$style.tslider"
        type="range"
        v-model="tIndex"
        :min="0"
        :max="sizeT - 1"
        :step="1"
      />
    </div>
    <div style="float: right; margin: 10px">
      Shape: {{ sizeT }} x {{ sizeC }} x {{ sizeZ }} x {{ sizeY }} x
      {{ sizeX }}
    </div>
  </div>
</template>

<style module>
.viewer {
  /* fill the screen */
  width: 100%;
  height: 100%;
  position: fixed;
  top: 0;
  left: 0;
  z-index: 100;
  background-color: black;
  display: flex;
  justify-content: center;
  align-items: center;
}
.controlsVisible {
  /* move the viewer behind page nav etc */
  z-index: 0;
}

.image {
  max-width: 100%;
  max-height: 100%;
  object-fit: contain;
}

.playButton {
  /* place in middle of screen */
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  z-index: 101;
  color: white;
  background-color: transparent;
  border: none;
  font-size: 50px;
  visibility: hidden;
}

.pause {
  display: inline-block;
  width: 40px;
  height: 40px;
  background-color: transparent;
  border-left: 12px solid white;
  border-right: 12px solid white;
  position: relative;
}

.tslider,
.tsliderTrackContainer {
  width: 400px;
  max-width: 95%;
  position: absolute;
  left: 50%;
  transform: translateX(-50%);
  height: 20px;
}

.tsliderTrackContainer {
  display: flex;
  align-items: center;
  border: solid transparent 2px;
  box-sizing: unset;
}

.tsliderTrack {
  height: 5px;
  background-color: rgb(191, 190, 190);
  width: 100%;
  top: calc(50% - 2.5px);
  margin: 0;
  display: flex;
  flex-direction: row;
  margin-left: 10px;
  margin-left: 10px;
}

.tsliderTrack div {
  height: 5px;
  flex: 1 1 auto;
}

input[type="range"] {
  -webkit-appearance: none;
  appearance: none;
  background: transparent;
  cursor: pointer;
  width: 25rem;
}

.loaded {
  background-color: red;
}

/* Removes default focus */
input[type="range"]:focus {
  outline: none;
}

/******** Chrome, Safari, Opera and Edge Chromium styles ********/
/* slider track */
input[type="range"]::-webkit-slider-runnable-track {
  background-color: rgba(0, 0, 0, 0.01);
  border-radius: 0rem;
  height: 5px;
  border: none;
}

/* slider thumb */
input[type="range"]::-webkit-slider-thumb {
  -webkit-appearance: none; /* Override default look */
  appearance: none;
  margin-top: -5.5px; /* Centers thumb on the track */
  background-color: rgba(255, 255, 255, 0.75);
  border-radius: 0.5rem;
  height: 1rem;
  width: 1rem;
}

input[type="range"]:focus::-webkit-slider-thumb {
  outline: 3px solid white;
  outline-offset: 0.125rem;
}

/*********** Firefox styles ***********/
/* slider track */
input[type="range"]::-moz-range-track {
  background-color: #dedede;
  border-radius: 0rem;
  height: 5px;
}

/* slider thumb */
input[type="range"]::-moz-range-thumb {
  background-color: white;
  border: none; /*Removes extra border that FF applies*/
  border-radius: 0.5rem;
  height: 1rem;
  width: 1rem;
}

input[type="range"]:focus::-moz-range-thumb {
  outline: 3px solid white;
  outline-offset: 0.125rem;
}

canvas {
  border: 1px solid red;
  margin: 10px;
}

.footer {
  position: fixed;
  bottom: 0;
  left: 0;
  width: 100%;
  background-color: rgba(0, 0, 0, 0.5);
  color: white;
}

.controlsVisible .footer,
.controlsVisible .playButton {
  visibility: visible;
}

.frame {
  height: 100px;
  width: 10px;
  flex: 0 0 10px;
}
.activeFrame {
  border: 1px solid red;
}
</style>
