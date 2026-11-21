# Tanner Aslan

A Next.js personal site with a Three.js Earth study. The homepage, resume, and photo albums are prerendered. The planet loads in a persistent client canvas after a lightweight WebP poster appears. The two camera poses share a Takram atmosphere and a WGS84 ellipsoid.

## Development

Use Node.js 22 or newer. Run `npm ci` and `npm run dev`. Run `npm run typecheck` and `npm run build` before pushing. Vercel can use its Next.js preset with the repository root and the default build command.

## Editing the site

- Edit the home introduction, featured photo and biography in `src/content/index.mdx`.
- Edit experience and education in `src/content/resume.mdx`. A location with coordinates also supplies its globe pin and experience card. Set the optional `logo` prop to an SVG in `public/logos/` (for example, `logo="/logos/michigan.svg"`) to display the same mark in both places.
- Edit album details, coordinates, captions and Markdown images in `src/content/photos.mdx`. Put new originals in `public/`. The build reads their dimensions and orientation to size each tile. Album coordinates use latitude, then longitude.
- Add posts in `src/content/posts/` and scores in `src/content/music/`. Copy the front matter from a nearby entry. File names become URLs and entries automatically appear in their lists and sitemap. Music entries reference audio and sheet music in `public/music/`.
- Visit `/style-guide` for typography, semantic color, and glass navigation guidelines. This maintainer reference is excluded from search indexing and public navigation.

## Imagery

The browser requests a small global day map, city lights, packed relief and ocean coverage, and locally hosted atmospheric scattering tables. After the first frame, day imagery refines to a six-face cube projected from a 21,600 × 10,800 source. The drawn globe size selects 1024- or 2048-pixel faces, with sharper night and relief maps for larger globes. Clouds use a separate 8.5 km shell lit by the shared sun. The first live frame uses the bundled cloud snapshot when available, then blends in Matt Eason’s 2048-pixel map as it arrives. The cloud source mirrors its caps past 67.5° north and south. The density texture blends to stylized spherical noise near the data boundary. Cloud opacity accounts for the longer viewing path near the horizon. A visible tab checks again after three hours. Contains modified EUMETSAT data. [Live Cloud Maps](https://github.com/matteason/live-cloud-maps)

Wide atmosphere exaggerates the apparent altitude above the horizon tenfold using Takram’s scattering tables. An artistic moon stays fixed over the North Pacific. Its light reveals terrain and cloud tops and scatters along the night horizon. A coarse mip of the night map supplies localized city skyglow in the air and clouds. A hue adjustment on scattered light reduces violet at the daylight horizon.

The renderer animates visible globes at up to 30 fps and holds the water and clouds still with reduced motion. A GPU pass backtraces air parcels through a packaged 2016 NOAA wind field and writes cloud density to a shared texture up to eight times per second. The archived wind supplies artistic drift. The ocean uses two scrolling triplanar layers from the original WebGL engine normal map. ETOPO seafloor depth drives the shelf-to-deep-water color gradient. The homepage uses a crescent view. The resume and photo pages center North America for their location pins. Each page has a matching static view while its assets load or when WebGL is unavailable.

[Dataset credits](public/earth/data/credits.txt) · [Atmosphere and coordinate tools](https://github.com/takram-design-engineering/three-geospatial)

To rebuild the Earth surface maps, install NumPy, Pillow and Rasterio in a Python environment and run `python scripts/bake-earth.py --cache /tmp/earth-sources`. The prepared assets are checked in, so deployment does not need Python or upstream imagery services.

## Rendering references

Sebastian Lague’s *Geographical Adventures* pairs concentrated city lights with a softer glow across populated terrain. The globe renders the shipped city positions, intensities, and dusk variation as instanced lamps. The bloom pass spreads light according to cloud cover. Coarse satellite night-map samples provide softer illumination on nearby terrain and clouds.

- [Creating city lights, episode 2](https://youtu.be/UXD97l7ZT0w?t=532) and [separating sky from depth-dependent haze](https://youtu.be/UXD97l7ZT0w?t=1802)
- [City clustering and low-resolution terrain glow, episode 3](https://youtu.be/pNp4ug5F6To?t=795)
- [Lague’s terrain shading](https://github.com/SebLague/Geographical-Adventures/blob/82fcda20bebb033c749b2339e9ce3a6e58007699/Assets/Scripts/Shaders/Game/Terrain.shader#L141-L164) and [instanced city lights](https://github.com/SebLague/Geographical-Adventures/blob/82fcda20bebb033c749b2339e9ce3a6e58007699/Assets/Scripts/Game/City%20Lights/CityLight.shader#L39-L62)
