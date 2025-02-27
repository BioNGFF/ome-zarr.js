import { defineConfig } from 'vitepress'

// https://vitepress.dev/reference/site-config
export default defineConfig({
  title: "ome-zarr.js",
  description: "Simple rendering of OME-Zarr images",
  themeConfig: {
    // https://vitepress.dev/reference/default-theme-config
    nav: [
      { text: 'Home', link: '/' },
      { text: 'Thumbnail', link: '/render-thumbnail' },
      { text: 'Image', link: '/render-image' }
    ],

    sidebar: [
      {
        text: 'Examples',
        items: [
          { text: 'renderThumbnail', link: '/render-thumbnail' },
          { text: 'renderImage', link: '/render-image' }
        ]
      }
    ],

    socialLinks: [
      { icon: 'github', link: 'https://github.com/will-moore/ome-zarr.js' }
    ]
  },
  base: '/ome-zarr.js/'
})
