---
# https://vitepress.dev/reference/default-theme-home-page
layout: home

hero:
  name: "ome-zarr.js"
  text: "Simple rendering of OME-Zarr images"
  tagline: Load data with zarrita.js, and render to rgb image
  actions:
    - theme: brand
      text: renderThumbnail
      link: /render-thumbnail
    - theme: alt
      text: renderImage
      link: /render-image

features:
  - title: Minimal dependencies
    details: We use zarrita.js to load zarr data, and that's it!
  - title: Rendering settings 
    details: Choose active channels, colors, min/max intensities.
  - title: Look-up tables supported
    details: ome-zarr.js includes over 40 LUTs you can choose for rendering.
---

