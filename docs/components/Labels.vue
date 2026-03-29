<script setup>

import { onMounted } from 'vue';
import { ref } from 'vue';

const imgSrc = ref("");
const labelSrc = ref("");

const VURL = "https://ome.github.io/ome-ngff-validator/?source="

onMounted(async () => {

  // This loads from http://localhost:5173/ome-zarr.js/@fs/Users/wmoore/Desktop/ZARR/ome-zarr.js/dist/ome-zarr.js
  // NB: needs `npm run build` first!
  const omezarr = await import('ome-zarr.js');

  function blackToTransparentRgba(d) {
    for (let i = 0; i < d.length; i += 4) {
      if (d[i] === 0 && d[i + 1] === 0 && d[i + 2] === 0) {
      d[i + 3] = 0;
      }
    }
  }

  let url = "https://uk1s3.embassy.ebi.ac.uk/idr/zarr/v0.4/idr0079A/idr0079_images.zarr/2/";
  let img = await omezarr.NgffImage.load(url);
  imgSrc.value = await img.render({targetSize: 300})

  let labelPaths = await img.getLabelsPaths();
  let labelImage = await omezarr.NgffImage.load(url + "labels/" + labelPaths[0]);
  labelImage.setChannelActive(0, true);
  labelImage.setChannelLut(0, "glasbey_inverted.lut");

  // renderRgba gives us an rgba array we can manipulate, to convert black to transparent
  let labelRgba = await labelImage.renderRgba({targetSize: 300});
  blackToTransparentRgba(labelRgba.data);


  // convert the rgba array back to image src
  labelSrc.value = await omezarr.convertRbgDataToDataUrl(labelRgba.data, labelRgba.width);
});
</script>

<template>
  <a :href="VURL + `https://uk1s3.embassy.ebi.ac.uk/idr/zarr/v0.4/idr0079A/idr0079_images.zarr/2/`" target="_blank">
    <img alt="thumbnail" :src="imgSrc" />
    <img alt="label" :src="labelSrc" />
  </a>
  <h1>WTF</h1>
</template>
