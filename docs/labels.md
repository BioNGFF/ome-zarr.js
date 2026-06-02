
# labels

We can use `ngffImage.getLabelsPaths()` to list any labels groups below a multiscales image.

These groups can then be opened as images and rendered as normal. Here we use a
`LabelsImage` which will map pixel values directly to LUT indices when rendering LUTs (instead
of scaling by start/end values as for a regular Image).

```js
// load and render the parent image
let url = "https://livingobjects.ebi.ac.uk/idr/zarr/v0.4/idr0079A/idr0079_images.zarr/2/";
let img = await omezarr.NgffImage.load(url);
let imgSrc = await img.render({targetSize: 300});
document.getElementById("img").src = labelSrc;

// find labels and open the first label image
let labelPaths = await img.getLabelsPaths();
let labelImage = await omezarr.LabelsImage.load(url + "labels/" + labelPaths[0]);
```

We can render by `LUTs` (lookup-tables) which are lists of colors; each color is
defined by `[red, green, blue]`, or `[red, green, blue, alpha]` values.

The first item of the `LUT` list will be used for background (where `pixel value = 0`).
The remaining colors will be used for other label values, repeating as necessary.

```js
// for the "Color Picker" option (in the demo below) we only need to specify the background
// and a single additional color for all the labels:
let transparent = [0, 0, 0, 0];
let cyan = [0, 255, 255];
let lut = [transparent, cyan];

// OR, for the "Auto" option, we can use the "glasbey" LUT...
const glasbeyRgb = omezarr.getLutRgb("glasbey.lut");
// ...and add the first value as transparent
let lut = [transparent, ...glasbeyRgb];

// In either case, we can apply the LUT to channel 0 and render:
labelImage.setChannelLut(0, lut);
let labelSrc = await labelImage.render({ targetSize: 300 });
document.getElementById("labelImg").src = labelSrc;
```

If we want to precisely map pixel values to colors, we can use a `colorMap`, which is
a `Map` of `integer: [r, g, b]` (or `[r, g, b, a]`).

If we have a table of data, with a row for each label, we can build a `colorMap` for
a chosen table column, e.g. `Centroids_RAW_X`.

```js
// Using a LUT (list of [r, g, b] values)...
const lut = omezarr.getLutRgb("green_fire_blue.lut");
// and a table of data for each label value, we can 
// create a colorMap for rendering the labels...
const colorMap = new Map();
TABLE_DATA.forEach((row) => {
    const labelValue = row["Label_Value"];
    const paramValue = row["Centroids_RAW_X"];
    // minValue and maxValue are determined for the chosen column (not shown)
    const fraction = (paramValue - minValue) / (maxValue - minValue);
    const lutIndex = Math.round(fraction * (lut.length - 1));
    const rgb = lut[lutIndex];
    colorMap.set(labelValue, rgb);
});
// We can use omezarr.FILL_VALUE_KEY to specify fillColor (transparent by default)
// This will be used for background (since 0 is not in our colorMap) and for any
// other label values that are missing from our colorMap
if (enableFill) {
    colorMap.set(omezarr.FILL_VALUE_KEY, fillRGBA);
}
// apply the colorMap to the first channel of the label image, then render
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
