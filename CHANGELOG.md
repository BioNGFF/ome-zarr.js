
0.0.17-0.6dev2 (October 2025)
-----------------------------

- Read axes from coordinateSystems [#16](https://github.com/BioNGFF/ome-zarr.js/pull/16)

0.0.16 (October 2025)
---------------------

- Handle omero.rdef.defaultZ with images downsampled in Z [#15](https://github.com/BioNGFF/ome-zarr.js/pull/15)

0.0.15 (October 2025)
---------------------

- Define path to types in package.json (Thanks to [Peyton Lee](https://github.com/ShrimpCryptid)) [#12](https://github.com/BioNGFF/ome-zarr.js/pull/12)

0.0.14 (August 2025)
--------------------

- Support 64-bit data [#10](https://github.com/BioNGFF/ome-zarr.js/pull/10)

0.0.13 (August 2025)
--------------------

- Update README

0.0.12 (May 2025)
-----------------

- Export types used in public methods (Thanks to [Konrad Rokicki](https://github.com/krokicki)) [#7](https://github.com/BioNGFF/ome-zarr.js/pull/7)

0.0.11 (March 2025)
-------------------

- Bump zarrita@^5.0.0

0.0.10 (March 2025)
-------------------

- Ship CommonJS and ES modules again

0.0.9 (March 2025)
------------------

- Fix scaling of renderThumbnail() for v0.1, v0.2, v0.3
- Fix rendering of LUTs when active channel is not first channel
- Support getMultiscaleWithArray(store_or_url)

0.0.8 (February 2025)
---------------------

- Handle missing axes from v0.1, v0.2, v0.3

0.0.7 (February 2025)
---------------------

- Support renderThumbnail(url_or_store)
- Add autoBoost param to renderThumbnail()
- renderThumbnail() throws Error if lowest resolution is too big

0.0.6 (February 2025)
---------------------

- Ship ES modules only

0.0.5 (February 2025)
---------------------

- Create single ome-zarr.d.ts

0.0.4 (February 2025)
---------------------

- Exported getSlice() and getMinMaxValues()
- Export d.ts files with vite-plugin-dts

0.0.3 (February 2025)
---------------------

- Exported LUTS

0.0.2 (February 2025)
---------------------

- Exported renderTo8bitArray()

0.0.1 (February 2025)
---------------------

- Added getMultiscaleWithArray(), renderImage(), getLuts() etc.

0.0.0 (February 2025)
---------------------

- Initial renderThumbnail() working
