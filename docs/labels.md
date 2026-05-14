
# labels

We can use `ngffImage.getLabelsPaths()` to list any labels groups below a multiscales image.

These can then be opened as images and rendered as normal.

Here we use `ngffImage.setChannelColorMap(0, colorMap)` to map label values to `r,g,b` colors.

```js
// load and render the parent image
let url = "https://livingobjects.ebi.ac.uk/idr/zarr/v0.4/idr0079A/idr0079_images.zarr/2/";
let img = await omezarr.NgffImage.load(url);
let imgSrc = await img.render({targetSize: 300});
document.getElementById("img").src = labelSrc;

// find labels and open the first label image
let labelPaths = await img.getLabelsPaths();
let labelImage = await omezarr.NgffImage.load(url + "labels/" + labelPaths[0]);

// Using a LUT (list of [r, g, b] values)...
const lut = omezarr.getLutRgb("green_fire_blue.lut");
// and a table of data for each label value, we can 
// create a colorMap for rendering the labels...
const colorMap = new Map();
ROW_DATA.forEach((row) => {
    const labelValue = row["Label_Value"];
    const paramValue = row["Centroids_RAW_X"];
    const fraction = (paramValue - minValue) / (maxValue - minValue);
    const lutIndex = Math.round(fraction * (lut.length - 1));
    const rgb = lut[lutIndex];
    colorMap.set(labelValue, rgb);
});
// We can use Infinity to specify fillColor (transparent by default)
if (enableFill) {
    colorMap.set(Infinity, fillRGBA);
}
// apply the colorMap to the first channel
labelImage.setChannelColorMap(0, colorMap);

let labelSrc = await labelImage.render({ targetSize: 300 });
document.getElementById("labelImg").src = labelSrc;
```


<script setup>
import Labels from './components/Labels.vue';
</script>


<ClientOnly>
<Labels />
</ClientOnly>

Image above is from <a href="https://idr.openmicroscopy.org/webclient/?show=image-9837025">
idr0079 (Hartmann etal)</a> showing associated
<a href="https://idr.openmicroscopy.org/webclient/omero_table/41585282/">table data</a>.
