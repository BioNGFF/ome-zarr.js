# ome-zarr.js
Some JavaScript utils for simple rendering of OME-Zarr images.

A work in progress to copy the thumbnail rendering code used in
https://ome.github.io/ome2024-ngff-challenge/
so it's available to use elsewhere.

We use https://github.com/manzt/zarrita.js for loading zarr data.

Supports OME-Zarr v0.4 and v0.5 images.

Usage:

`renderThumbnail()` uses rendering settings from `omero`, metadata if the zarr image has it
and the lowest resolution of the multiscales pyramid by default:

    import * as omezarr from "https://cdn.jsdelivr.net/npm/ome-zarr.js@latest/+esm";
    import * as zarr from "https://cdn.jsdelivr.net/npm/zarrita@next/+esm";

    const source = "https://uk1s3.embassy.ebi.ac.uk/idr/zarr/v0.4/idr0062A/6001240.zarr";
    const store = new zarr.FetchStore(source);

    let src = await omezarr.renderThumbnail(store);
    document.getElementById("thumbnail").src = src;

`renderImage()` uses the highest resolution dataset by default and allows you to
specify rendering settings, Z/T indices

    const store = new zarr.FetchStore(source);
    // arr will be full-sized array by default
    const {arr, omero, multiscale} = await omezarr.getMultiscaleWithArray(store);

    // turn on the channel we want to render... set color (or LUT which overrides color)
    omero.channels[0].active = true;
    omero.channels[0].color = "FF0000";
    omero.channels[0].lut = "thermal.lut";
    omero.channels[0].inverted = true;

    // set rendering window, Z index
    omero.channels[0].window.start = 100;
    omero.channels[0].window.end = 500;
    omero.rdefs.defaultZ = 50;
    
    // render whole image
    let src = await omezarr.renderImage(arr, multiscale.axes, omero);
    document.getElementById("image").src = src;

We can choose to use different resolutions of the multiscales pyramid and to render
a smaller region

    const store = new zarr.FetchStore(source);
    // we get a bunch of info: shapes etc. Optional to choose datasetIndex:
    let datasetIndex = 1
    const {arr, omero, multiscale, shapes, zarr_version} = await omezarr.getMultiscaleWithArray(store, datasetIndex);

    // Shapes are calculated from the datasets.coordinateTransformations 'scale' info and the
    // dimensions of the array that was loaded (largest array is loaded by default)
    // shapes [2, 236, 275, 271], [2, 236, 138, 136], [2, 236, 69, 68]
    console.log("shapes", shapes);

    // load array from chosen path, corresponding to the 'shape' we want
    const paths = multiscale.datasets.map((d) => d.path);
    const path = paths[1];
    // zarr_version is optional, but it means zarrita.js doesn't have to guess
    const arr1 = await omezarr.getArray(store, path, zarr_version);

    // render a region
    let sliceIndices = {"x": [10, 50], "y": [0, 100]};
    let src = await omezarr.renderImage(arr1, multiscale.axes, omero, sliceIndices);


## Demo and Development

The index.html page contains a demo of the features described above and can be
viewed with:

    $ npm install
    $ npm run dev


## Typescript from ome-zarr-models-py

I have experimented with using https://github.com/phillipdupuis/pydantic-to-typescript
to generate typescript interfaces from https://github.com/ome-zarr-models/ome-zarr-models-py.

The `src/types/ome.ts` file was generated with:

    $ pydantic2ts --module src/ome_zarr_models/v04/image.py --output ome.ts
