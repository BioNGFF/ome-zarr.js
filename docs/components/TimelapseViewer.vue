<script setup>
import { useTemplateRef, onMounted } from "vue";
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
let frameWidth = 10;

let omezarr;
let dsPath;

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

async function loadFrames(step, offset) {
  let img = await omezarr.NgffImage.load(zarrUrl);
  let shape = await img.getShape(dsPath);
  img.omero.rdefs = {};

  // load all frames...
  for (let t = offset; t < sizeT.value; t += step) {
    img.setTIndex(t);
    let imgSrc = await img.render({ arrayPathOrIndex: dsPath });
    framesSrc.value[t] = imgSrc;
  }
}

onMounted(async () => {
  // This loads from http://localhost:5173/ome-zarr.js/@fs/Users/wmoore/Desktop/ZARR/ome-zarr.js/dist/ome-zarr.js
  // NB: needs `npm run build` first!
  omezarr = await import("ome-zarr.js");
  console.log("MOUNTED omezarr 2");

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

  loadFrames(5, 0);
  loadFrames(5, 1);
  loadFrames(5, 2);
  loadFrames(5, 3);
  loadFrames(5, 4);
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

    <div :class="$style.footer">
      <div style="text-align: center; margin-bottom: 5px;">
        <div :class="$style.tsliderTrackContainer">
          
          <div
            :class="$style.tsliderTrack"
          >
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
      <div>
        T index: {{ tIndex }} / {{ sizeT - 1 }} <br/>
        Size: {{ sizeX }} x {{ sizeY }} x {{ sizeZ }} x {{ sizeC }} x
        {{ sizeT }}
      </div>
      <div :class="$style.galleryScroller">
        <table
          :class="$style.gallery"
          :style="{ width: frameWidth * sizeT + 'px' }"
        >
          <tbody>
            <tr>
              <!-- some images stray outside of the .gallery flex row? -->
              <td v-for="(frame, index) in framesSrc" :key="index">
                <!-- if index==tIndex add $style.activeFrame -->
                <img
                  :class="[
                    $style.frame,
                    index === tIndex ? $style.activeFrame : '',
                  ]"
                  :src="frame"
                  :style="{ width: frameWidth + 'px' }"
                />
              </td>
            </tr>
          </tbody>
        </table>
      </div>
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

.tslider, .tsliderTrackContainer {
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

input[type="range"]:focus::-moz-range-thumb{
  outline: 3px solid white;
  outline-offset: 0.125rem;
}

canvas {
  border: 1px solid red;
  margin: 10px;
  /* max-height: 200px; */
}

.footer {
  visibility: hidden;
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

.galleryScroller {
  overflow-x: auto;
  white-space: nowrap;
  width: 100%;
}

.gallery td {
  /* flex-direction: row;
  display: flex;
  justify-content: center;
  align-items: center;
  width: max-content; */
  padding: 0;
  margin: 0;
  border: 0;
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
