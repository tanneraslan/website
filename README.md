# Tanner Aslan

A Next.js personal site with a Three.js Earth study. The homepage, résumé, and Earth lab are prerendered. The planet loads in a persistent client canvas after a lightweight WebP poster appears. The two camera poses share a Takram atmosphere and a WGS84 ellipsoid.

## Development

Use Node.js 22 or newer. Run `npm ci` and `npm run dev`. The Earth controls are available on the homepage, and `/earth-lab` compares the satellite texture and instanced city lights with a shared sun-angle slider and a play/pause sweep. Run `npm run typecheck` and `npm run build` before pushing. Vercel can use its Next.js preset with the repository root and the default build command.

## Imagery

The browser requests a small global day map, city lights, packed relief and ocean coverage, and locally hosted atmospheric scattering tables. After the first frame, day imagery refines to a six-face cube projected from a 21,600 × 10,800 source. The drawn globe size selects 1024- or 2048-pixel faces, with sharper night and relief maps for larger globes. Clouds use a separate 8.5 km shell lit by the shared sun. After the first frame the renderer loads a small bundled snapshot and requests Matt Eason’s latest 1024- or 2048-pixel cloud coverage. A visible tab checks again after three hours. The lab’s Clouds control applies to both globes. Contains modified EUMETSAT data. [Live Cloud Maps](https://github.com/matteason/live-cloud-maps)

Wide atmosphere exaggerates the apparent altitude above the horizon sixfold using Takram’s scattering tables. Switching it off restores physical thickness. Surface haze still uses the physical model in both modes.

The renderer redraws on demand. With WebGL unavailable, the two controls switch between matching static views.

[Dataset credits](public/earth/data/credits.txt) · [Atmosphere and coordinate tools](https://github.com/takram-design-engineering/three-geospatial)

To rebuild the Earth surface maps, install NumPy, Pillow and Rasterio in a Python environment and run `python scripts/bake-earth.py --cache /tmp/earth-sources`. The prepared assets are checked in, so deployment does not need Python or upstream imagery services.

## Rendering references

Sebastian Lague’s *Geographical Adventures* pairs concentrated city lights with a softer glow across populated terrain. The lab’s left globe uses a satellite emission texture. The right uses Lague’s shipped light positions, brightness, and dusk variation on small instanced meshes. Both renders share the ground glow, camera, sunlight, scattering, and tone mapping. In Crescent, switch off Point bloom and toggle Terrain glow to see the land brighten around the Great Lakes. Both globes sample coarse night-map mips at global widths of 512 and 256 pixels and tint the ground using its grayscale albedo and land mask. Point bloom independently blurs the visible lamps on the right before the glass and tone-mapping passes. The point dataset is requested only in the lab. The city shader uses a fixed geographic variation in its twilight threshold so the dawn transition is stable when the camera moves.

- [Creating city lights, episode 2](https://youtu.be/UXD97l7ZT0w?t=532) and [separating sky from depth-dependent haze](https://youtu.be/UXD97l7ZT0w?t=1802)
- [City clustering and low-resolution terrain glow, episode 3](https://youtu.be/pNp4ug5F6To?t=795)
- [Lague’s terrain shading](https://github.com/SebLague/Geographical-Adventures/blob/82fcda20bebb033c749b2339e9ce3a6e58007699/Assets/Scripts/Shaders/Game/Terrain.shader#L141-L164) and [instanced city lights](https://github.com/SebLague/Geographical-Adventures/blob/82fcda20bebb033c749b2339e9ce3a6e58007699/Assets/Scripts/Game/City%20Lights/CityLight.shader#L39-L62)
