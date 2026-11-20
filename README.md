# Tanner Aslan

A Next.js personal site with a Three.js Earth study. The homepage, résumé, and Earth lab are prerendered. The planet loads in a persistent client canvas after a lightweight WebP poster appears. The two camera poses share a Takram atmosphere and a WGS84 ellipsoid.

## Development

Use Node.js 22 or newer. Run `npm ci` and `npm run dev`. The Earth controls are available on the homepage, and `/earth-lab` includes a sun-angle slider. Run `npm run typecheck` and `npm run build` before pushing. Vercel can use its Next.js preset with the repository root and the default build command.

## Imagery

The browser requests a small global day map, city lights, packed relief and ocean coverage, and locally hosted atmospheric scattering tables. Switching to the daylight pose requests the sharper North America maps and blends them in. The renderer redraws on demand. With WebGL unavailable, the two controls switch between matching static views.

[Dataset credits](public/earth/data/credits.txt) · [Atmosphere and coordinate tools](https://github.com/takram-design-engineering/three-geospatial)

To rebuild the Earth surface maps, install NumPy, Pillow and Rasterio in a Python environment and run `python scripts/bake-earth.py --cache /tmp/earth-sources`. The prepared assets are checked in, so deployment does not need Python or upstream imagery services.

## Rendering references

Sebastian Lague’s *Geographical Adventures* pairs concentrated city lights with a softer glow across populated terrain. This site uses two filtered samples from the same satellite map at orbital scale, then applies Takram’s atmospheric attenuation and in-scattering. The city shader uses a fixed geographic variation in its twilight threshold so the dawn transition is stable when the camera moves.

- [Creating city lights, episode 2](https://youtu.be/UXD97l7ZT0w?t=532) and [separating sky from depth-dependent haze](https://youtu.be/UXD97l7ZT0w?t=1802)
- [City clustering and low-resolution terrain glow, episode 3](https://youtu.be/pNp4ug5F6To?t=795)
- [Lague’s terrain shading](https://github.com/SebLague/Geographical-Adventures/blob/82fcda20bebb033c749b2339e9ce3a6e58007699/Assets/Scripts/Shaders/Game/Terrain.shader#L141-L164) and [instanced city lights](https://github.com/SebLague/Geographical-Adventures/blob/82fcda20bebb033c749b2339e9ce3a6e58007699/Assets/Scripts/Game/City%20Lights/CityLight.shader#L39-L62)
