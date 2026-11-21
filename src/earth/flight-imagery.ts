export const satelliteTiles = 'https://tiles.maps.eox.at/wmts/1.0.0/s2cloudless-2025_3857/default/g/{z}/{y}/{x}.jpg'
const key = process.env.NEXT_PUBLIC_MAPTILER_KEY
export const mapTilerTiles = key ? 'https://api.maptiler.com/tiles/satellite-v2/{z}/{x}/{y}.jpg?key=' + encodeURIComponent(key) : null

// Each 640px image is a city-centered WMS export in EPSG:3857. Half-widths
// are projected metres and match the bounds of the bundled WebP files.
export const albumPreviewLevels = [
  { name: 'region', radius: 400000 }, { name: 'city', radius: 32000 },
] as const
type PreviewLevel = typeof albumPreviewLevels[number]['name']

const decoded = new Map<string, Promise<HTMLImageElement>>()

export function loadAlbumPreview(id: string, level: PreviewLevel) {
  const url = `/earth/regions/${id}-${level}.webp`
  const cached = decoded.get(url)
  if (cached) return cached
  const image = new Image()
  image.src = url
  const ready = image.decode().then(() => image).catch((error: unknown) => {
    if (decoded.get(url) === ready) decoded.delete(url)
    throw error
  })
  // Keep the last three destinations decoded across the route handoff.
  if (decoded.size >= 6) decoded.delete(decoded.keys().next().value!)
  decoded.set(url, ready)
  return ready
}

export function warmAlbumPreview(href: string) {
  const id = href.match(/^\/photos\/([^/]+)$/)?.[1]
  if (id) for (const { name } of albumPreviewLevels) {
    void loadAlbumPreview(id, name).catch(() => {})
  }
}
