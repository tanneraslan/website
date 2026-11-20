"""Rebuild the browser textures from public Earth observations.

Run with Python 3, NumPy, Pillow (WebP), and Rasterio installed:
    python scripts/bake-earth.py --cache /tmp/earth-sources
The source cache is separate from the website and its build.
"""

import argparse
import json
import shutil
import tempfile
import urllib.request
from pathlib import Path

import numpy as np
import rasterio
from PIL import Image
from rasterio.enums import Resampling
from rasterio.features import rasterize
from rasterio.transform import from_bounds
from rasterio.windows import from_bounds as pixel_window


SOURCES = {
    "day.jpg": "https://assets.science.nasa.gov/content/dam/science/esd/eo/images/bmng/bmng-base/july/world.200407.3x5400x2700.jpg",
    "day-2km.jpg": "https://assets.science.nasa.gov/content/dam/science/esd/eo/images/bmng/bmng-base/july/world.200407.3x21600x10800.jpg",
    "night-3km.jpg": "https://assets.science.nasa.gov/content/dam/science/esd/eo/images/imagerecords/144000/144897/BlackMarble_2016_3km_gray.jpg",
    "night.jpg": "https://assets.science.nasa.gov/content/dam/science/esd/eo/images/imagerecords/144000/144897/BlackMarble_2016_01deg_gray.jpg",
    "etopo.tif": "https://www.ngdc.noaa.gov/mgg/global/relief/ETOPO2022/data/60s/60s_surface_elev_gtif/ETOPO_2022_v1_60s_N90W180_surface.tif",
    "ocean.geojson": "https://raw.githubusercontent.com/nvkelso/natural-earth-vector/v5.1.2/geojson/ne_50m_ocean.geojson",
}
GLOBAL = (-180, -90, 180, 90)
OUTPUT = Path(__file__).resolve().parents[1] / "public/earth/data"


def download_sources(cache):
    cache.mkdir(parents=True, exist_ok=True)
    for name, url in SOURCES.items():
        output = cache / name
        if output.exists():
            continue
        with tempfile.NamedTemporaryFile(dir=cache, delete=False) as file:
            temporary = Path(file.name)
        try:
            with urllib.request.urlopen(url, timeout=180) as source, temporary.open("wb") as target:
                shutil.copyfileobj(source, target)
            temporary.replace(output)
        finally:
            temporary.unlink(missing_ok=True)


def color_crop(image, bounds, size):
    west, south, east, north = bounds
    box = (
        (west + 180) / 360 * image.width,
        (90 - north) / 180 * image.height,
        (east + 180) / 360 * image.width,
        (90 - south) / 180 * image.height,
    )
    return image.resize(size, Image.Resampling.LANCZOS, box=box)


def relief_map(dem, geometries, bounds, size):
    width, height = size
    west, south, east, north = bounds
    elevation = dem.read(
        1,
        window=pixel_window(*bounds, transform=dem.transform),
        out_shape=(height, width),
        resampling=Resampling.average,
    )
    # Take derivatives in metres on the tangent plane, with east and north
    # independent of the Three.js camera or world convention.
    longitude_step = (east - west) / width
    latitude_step = (north - south) / height
    latitudes = north - (np.arange(height) + 0.5) * latitude_step
    metres_per_degree = 6371008.8 * np.pi / 180
    dx = metres_per_degree * longitude_step * np.cos(np.deg2rad(latitudes))[:, None]
    dy = metres_per_degree * latitude_step
    elevation = np.maximum(elevation, 0)
    if bounds == GLOBAL:
        east_gradient = (np.roll(elevation, -1, axis=1) - np.roll(elevation, 1, axis=1)) / 2
    else:
        east_gradient = np.gradient(elevation, axis=1)
    normal_east = -east_gradient / dx * 6
    normal_north = np.gradient(elevation, axis=0) / dy * 6
    length = np.sqrt(1 + normal_east**2 + normal_north**2)

    # Rasterize at 2x resolution for antialiased coastlines in the blue channel.
    high_size = (width * 2, height * 2)
    ocean = rasterize(
        geometries,
        out_shape=high_size[::-1],
        transform=from_bounds(*bounds, *high_size),
        default_value=255,
        fill=0,
        dtype="uint8",
    )
    coverage = np.asarray(Image.fromarray(ocean).resize(size, Image.Resampling.BOX))
    channels = (127.5 + 127.5 * normal_east / length, 127.5 + 127.5 * normal_north / length, coverage)
    return Image.fromarray(np.rint(np.stack(channels, axis=-1)).astype("uint8"))


# OpenGL cube-map selection table, with s and t running from -1 to +1.
# WebGL uploads cube faces with flipY=false, so the first file row is t=-1.
# Each constant is (outward axis, positive s axis, positive t axis) in ECEF.
CUBE_AXES = {
    "px": ((1, 0, 0), (0, 0, -1), (0, -1, 0)),
    "nx": ((-1, 0, 0), (0, 0, 1), (0, -1, 0)),
    "py": ((0, 1, 0), (1, 0, 0), (0, 0, 1)),
    "ny": ((0, -1, 0), (1, 0, 0), (0, 0, -1)),
    "pz": ((0, 0, 1), (1, 0, 0), (0, -1, 0)),
    "nz": ((0, 0, -1), (-1, 0, 0), (0, -1, 0)),
}


def cube_face(source, axes, size):
    """Project area-sampled cube texels into the pixel-centered geographic image."""
    source_height, source_width = source.shape[:2]
    face = np.empty((size, size, 3), dtype=np.uint8)
    normal, horizontal, vertical = axes
    # Sample four subpixels per output texel. Work in strips so generating the
    # six 2K faces doesn't also need six floating-point direction maps in memory.
    width = size * 2
    s = (np.arange(width) + 0.5) / size - 1
    for begin in range(0, size, 32):
        end = min(begin + 32, size)
        t = ((np.arange(begin * 2, end * 2) + 0.5) / size - 1)[:, None]
        x, y, z = [normal[i] + s * horizontal[i] + t * vertical[i] for i in range(3)]
        longitude = np.arctan2(y, x)
        latitude = np.arctan2(z, np.hypot(x, y))
        u = (longitude / (2 * np.pi) + 0.5) * source_width - 0.5
        v = np.clip((0.5 - latitude / np.pi) * source_height - 0.5, 0, source_height - 1)
        left, top = np.floor(u).astype(int), np.floor(v).astype(int)
        du, dv = (u - left)[..., None], (v - top)[..., None]
        left %= source_width
        right = (left + 1) % source_width
        bottom = np.minimum(top + 1, source_height - 1)
        upper = source[top, left] * (1 - du) + source[top, right] * du
        lower = source[bottom, left] * (1 - du) + source[bottom, right] * du
        pixels = upper * (1 - dv) + lower * dv
        face[begin:end] = pixels.reshape(end - begin, 2, size, 2, 3).mean(axis=(1, 3)).round()
    return Image.fromarray(face)


def bake_detail(cache, dem, ocean):
    # This particular NASA JPEG is 21600 x 10800. Let Pillow open the trusted
    # input at native resolution to retain coastlines at oblique cube angles.
    Image.MAX_IMAGE_PIXELS = 21600 * 10800
    with Image.open(cache / "day-2km.jpg") as day:
        source = np.asarray(day)
        for name, axes in CUBE_AXES.items():
            face = cube_face(source, axes, 2048)
            face.save(OUTPUT / f"day-{name}.webp", quality=88, method=6)
            mobile = face.resize((1024, 1024), Image.Resampling.LANCZOS)
            mobile.save(OUTPUT / f"day-1k-{name}.webp", quality=86, method=6)
    del source
    with Image.open(cache / "night-3km.jpg") as night:
        color_crop(night, GLOBAL, (4096, 2048)).save(OUTPUT / "night-detail.webp", lossless=True, method=6)
    relief = relief_map(dem, ocean, GLOBAL, (4096, 2048))
    relief.save(OUTPUT / "relief-detail.webp", lossless=True, method=6)


def bake(cache):
    download_sources(cache)
    OUTPUT.mkdir(parents=True, exist_ok=True)
    ocean = [f["geometry"] for f in json.loads((cache / "ocean.geojson").read_text())["features"]]
    with Image.open(cache / "day.jpg") as day, rasterio.open(cache / "etopo.tif") as dem:
        base_size = (1024, 512)
        color_crop(day, GLOBAL, base_size).save(OUTPUT / "day.webp", quality=85, method=6)
        relief_map(dem, ocean, GLOBAL, base_size).save(OUTPUT / "relief.webp", lossless=True, method=6)
        bake_detail(cache, dem, ocean)
    with Image.open(cache / "night.jpg") as night:
        color_crop(night.convert("L"), GLOBAL, (2048, 1024)).save(OUTPUT / "night.webp", lossless=True, method=6)


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--cache", required=True, type=Path)
    bake(parser.parse_args().cache)
