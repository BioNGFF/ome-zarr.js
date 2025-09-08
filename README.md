# ome-zarr.js
Some JavaScript utils for simple rendering of OME-Zarr images.


## About

See the [Documentation pages](https://biongff.github.io/ome-zarr.js/)
for more details and demos.

To test thumbnail rendering of a sample image, the easiest option is to try
https://ome.github.io/ome-ngff-validator/ which uses `ome-zarr.js` to display
a thumbnail.

We use https://github.com/manzt/zarrita.js for loading zarr data.

Supports all versions of OME-Zarr v0.1 -> v0.5.

The URL must point to a `multiscales` image (not a `plate` or `bioformats2raw.layout` group).

## Usage

`renderThumbnail()` uses rendering settings from the `omero` metadata if the zarr image has it
and the lowest resolution of the multiscales pyramid by default:

```javascript
import * as omezarr from "https://cdn.jsdelivr.net/npm/ome-zarr.js@latest/+esm";

const url = "https://uk1s3.embassy.ebi.ac.uk/idr/zarr/v0.4/idr0062A/6001240.zarr";
let src = await omezarr.renderThumbnail(url);
document.getElementById("thumbnail").src = src;
```

`renderImage()` uses the highest resolution dataset by default and allows you to
specify rendering settings, Z/T indices.

We can choose to use different resolutions of the multiscales pyramid and to render
a smaller region. See docs above for more details.


## Demo and Development

The index.html page contains a demo of the features described above and can be
viewed with:

    $ npm install
    $ npm run dev

To develop and build the docs, we need to build ome-zarr.js first so it can be
imported from /dist/ by the docs:

    $ npm run build
    $ npm run docs:dev

## Typescript from ome-zarr-models-py

I have experimented with using https://github.com/phillipdupuis/pydantic-to-typescript
to generate typescript interfaces from https://github.com/ome-zarr-models/ome-zarr-models-py.

The `src/types/ome.ts` file was generated with:

    $ pydantic2ts --module src/ome_zarr_models/v04/image.py --output ome.ts


## License

Distributed under the terms of the [BSD](https://opensource.org/licenses/BSD-2-Clause)
license, "ome-zarr.js" is free and open source software.


## Release steps

 - Fetch `origin/main`, checkout `main` and rebase
 - Bump version in `package.json`
 - Update `CHANGELOG.md`
 - Commit changes

Then:

    $ npm run build

    # check the docs are up to date (images are rendering correctly)
    $ npm run docs:build
    $ npm run docs:preview

    $ npm pack
    $ npm publish

    $ git tag v0.0.14
    $ git push origin HEAD v0.0.14
