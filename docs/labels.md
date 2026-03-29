
# labels

We can use `ngffImage.getLabelsPaths()` to list any labels groups below a multiscales image.

These can then be opened as images and rendered as normal.

```js

function blackToTransparentRgba(d) {
    for (let i = 0; i < d.length; i += 4) {
        if (d[i] === 0 && d[i + 1] === 0 && d[i + 2] === 0) {
        d[i + 3] = 0;
        }
    }
}

let url = "https://uk1s3.embassy.ebi.ac.uk/idr/zarr/v0.4/idr0079A/idr0079_images.zarr/2/";
let img = await omezarr.NgffImage.load(url);
let imgSrc = await img.render({targetSize: 300, autoBoost: true})

// renderRgba gives us an rgba array we can manipulate, to convert black to transparent
let {data, width} = await img.renderRgba({targetSize: 300);
blackToTransparentRgba(data)

// convert the rgba array back to image src
let labelSrc = await omezarr.convertRbgDataToDataUrl(data, width);
document.getElementById("labelImg").src += labelSrc;
```


<script setup>
import Labels from './components/Labels.vue';
import Thumbnail from './components/Thumbnail.vue';
</script>


<ClientOnly>
<!-- <Labels> -->

<div>Test</div>

<Labels />
</ClientOnly>
