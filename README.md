# ome-zarr.js
Some JavaScript utils for simple rendering of OME-Zarr images.

A work in progress to copy the thumbnail rendering code used in
https://ome.github.io/ome2024-ngff-challenge/
so it's available to use elsewhere.

We use https://github.com/manzt/zarrita.js for loading zarr data.

Supports OME-Zarr v0.4 and v0.5 images.

Usage:

    import * as omezarr from "https://cdn.jsdelivr.net/npm/ome-zarr.js@latest/+esm";
    import * as zarr from "https://cdn.jsdelivr.net/npm/zarrita@next/+esm";

    const source = "https://uk1s3.embassy.ebi.ac.uk/idr/zarr/v0.4/idr0062A/6001240.zarr";
    const store = new zarr.FetchStore(source);

    let src = await omezarr.renderThumbnail(store);
    document.getElementById("thumbnail").src = src;


## Typescript from ome-zarr-models-py

I have experimented with using https://github.com/phillipdupuis/pydantic-to-typescript
to generate typescript interfaces from https://github.com/ome-zarr-models/ome-zarr-models-py.

The `src/types/ome.ts` file was generated with:

    $ pydantic2ts --module src/ome_zarr_models/v04/image.py --output ome.ts
