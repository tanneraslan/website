import { flightLandingView, type Coordinates } from './locations'

export const satelliteTiles = 'https://tiles.maps.eox.at/wmts/1.0.0/s2cloudless-2025_3857/default/g/{z}/{y}/{x}.jpg'
const key = process.env.NEXT_PUBLIC_MAPTILER_KEY
export const mapTilerTiles = key ? 'https://api.maptiler.com/tiles/satellite-v2/{z}/{x}/{y}.jpg?key=' + encodeURIComponent(key) : null

export function flightBaseZoom(latitude: number, height: number) {
  return Math.max(2, flightLandingView(latitude, height).zoom - 2)
}

export function flightBaseTiles(place: Coordinates, frameHeight: number) {
  const z = flightBaseZoom(place.latitude, frameHeight)
  const count = 2 ** z
  const lat = Math.max(-85, Math.min(85, place.latitude)) * Math.PI / 180
  const x = Math.floor((place.longitude / 360 + 0.5) * count)
  const y = Math.floor((1 - Math.asinh(Math.tan(lat)) / Math.PI) * count / 2)
  const tiles = []
  for (let dy = -1; dy <= 1; dy++) {
    if (y + dy < 0 || y + dy >= count) continue
    for (let dx = -1; dx <= 1; dx++) {
      const url = (mapTilerTiles ?? satelliteTiles).replace('{z}', String(z))
        .replace('{x}', String((x + dx + count) % count)).replace('{y}', String(y + dy))
      tiles.push({ x: x + dx, y: y + dy, z, url })
    }
  }
  return tiles
}

export function warmFlightImagery(place: Coordinates, frameHeight: number) {
  for (const tile of flightBaseTiles(place, frameHeight)) {
    new Image().src = tile.url
  }
}
