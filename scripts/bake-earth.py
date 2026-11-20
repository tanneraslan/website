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
    "night.jpg": "https://assets.science.nasa.gov/content/dam/science/esd/eo/images/imagerecords/144000/144897/BlackMarble_2016_01deg_gray.jpg",
    "etopo.tif": "https://www.ngdc.noaa.gov/mgg/global/relief/ETOPO2022/data/60s/60s_surface_elev_gtif/ETOPO_2022_v1_60s_N90W180_surface.tif",
    "ocean.geojson": "https://raw.githubusercontent.com/nvkelso/natural-earth-vector/v5.1.2/geojson/ne_50m_ocean.geojson",
}
GLOBAL = (-180, -90, 180, 90)
NORTH_AMERICA = (-140, 15, -50, 70)
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


def bake(cache):
    download_sources(cache)
    OUTPUT.mkdir(parents=True, exist_ok=True)
    ocean = [f["geometry"] for f in json.loads((cache / "ocean.geojson").read_text())["features"]]
    with Image.open(cache / "day.jpg") as day, rasterio.open(cache / "etopo.tif") as dem:
        for prefix, bounds, size in [
            ("", GLOBAL, (1024, 512)),
            ("north-america-", NORTH_AMERICA, (1152, 704)),
        ]:
            color_crop(day, bounds, size).save(OUTPUT / f"{prefix}day.webp", quality=85, method=6)
            relief_map(dem, ocean, bounds, size).save(OUTPUT / f"{prefix}relief.webp", lossless=True, method=6)
    with Image.open(cache / "night.jpg") as night:
        color_crop(night.convert("L"), GLOBAL, (2048, 1024)).save(OUTPUT / "night.webp", lossless=True, method=6)


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--cache", required=True, type=Path)
    bake(parser.parse_args().cache)
