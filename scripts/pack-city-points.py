"""Pack the shipped Geographical Adventures city lights for the Earth lab.

    python scripts/pack-city-points.py /path/to/CityLightPoints.json
"""

import argparse
import hashlib
import json
import math
import struct
from pathlib import Path

# Assets/Data/City Lights/CityLightPoints.json at upstream 82fcda20.
SOURCE_HASH = "4f5ba5e400d44b229d1c560ea5425e69fbfb7f4315b2670f5dad3cba8b56a654"
DEST = Path(__file__).resolve().parents[1] / "public/earth/data/city-points.bin"


def pack(path):
    source = path.read_bytes()
    if hashlib.sha256(source).hexdigest() != SOURCE_HASH:
        raise ValueError("Expected the released 151,601-point source (see city-points-license.txt).")

    # Geographic bins let the renderer drop invisible sections with a few dot
    # products. Keep every lamp and preserve the upstream order within a bin.
    bins = {}
    for group in json.loads(source)["items"]:
        for point in group["cityLights"]:
            p = point["pointOnSphere"]
            longitude = math.atan2(p["x"], -p["z"])
            latitude = math.asin(max(-1.0, min(1.0, p["y"])))
            column = min(23, int((longitude + math.pi) / (math.pi / 12)))
            row = min(11, int((latitude + math.pi / 2) / (math.pi / 12)))
            key = row * 24 + column
            bins.setdefault(key, bytearray()).extend(struct.pack(
                "<5f", longitude, latitude, point["height"], point["intensity"], point["randomT"]
            ))

    count = sum(len(records) // 20 for records in bins.values())
    assert count == 151601
    with DEST.open("wb") as target:
        target.write(struct.pack("<4sII", b"LIT1", count, len(bins)))
        for cell, records in sorted(bins.items()):
            target.write(struct.pack("<II", cell, len(records) // 20))
        for records in (bins[key] for key in sorted(bins)):
            target.write(records)
    print(f"{count:,} lamps, {len(bins)} bins, {DEST.stat().st_size:,} bytes")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("source", type=Path)
    pack(parser.parse_args().source)
