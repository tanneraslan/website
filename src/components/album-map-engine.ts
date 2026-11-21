import OlMap from 'ol/Map.js'
import View from 'ol/View.js'
import Overlay from 'ol/Overlay.js'
import TileLayer from 'ol/layer/Tile.js'
import XYZ from 'ol/source/XYZ.js'
import { defaults as controls } from 'ol/control/defaults.js'
import { defaults as interactions } from 'ol/interaction/defaults.js'
import { fromLonLat, toLonLat, transformExtent } from 'ol/proj.js'
import { boundingExtent, buffer, extend, getCenter } from 'ol/extent.js'
import { getDistance } from 'ol/sphere.js'
import { easeOut } from 'ol/easing.js'
import { unByKey } from 'ol/Observable.js'
import { flightBaseZoom, mapTilerTiles, satelliteTiles } from '@/earth/flight-imagery'
import type { Coordinates } from '@/earth/locations'
import { addPhotoMapPins } from './photo-map-pins'
import type { PhotoSpot } from './AlbumMap'

const osmCredit = '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap contributors</a>'
const eoxCredit = '<a href="https://maps.eox.at/">EOX Maps</a> · <a href="https://cloudless.eox.at/">EOxCloudless</a> by EOX IT Services GmbH (modified Copernicus Sentinel data 2025)'
const minimumOverviewSpan = 4_000

export function createAlbumMap(el: HTMLElement, slot: HTMLElement, city: Coordinates & { id: string, title: string },
  spots: PhotoSpot[], onSelect: (key: string) => void, onLand: () => void,
  onFailed: (failed: boolean) => void, onMapTiler: (enabled: boolean) => void) {
  const cityPoint = [city.longitude, city.latitude]
  const pins = spots.map(p => [p.longitude, p.latitude])
    .sort((a, b) => getDistance(a, cityPoint) - getDistance(b, cityPoint))
  const excursion = pins.length >= 4 && getDistance(pins.at(-1)!, cityPoint) >
    Math.max(minimumOverviewSpan, 3 * getDistance(pins.at(-2)!, cityPoint))
  const points = pins.map(p => fromLonLat(p))
  const bounds = boundingExtent(excursion ? points.slice(0, -1) : points)
  const target = points.length ? getCenter(bounds) : fromLonLat(cityPoint)
  const metresPerProjectedMetre = Math.cos(toLonLat(target)[1] * Math.PI / 180)
  extend(bounds, buffer(boundingExtent([target]), minimumOverviewSpan / (2 * metresPerProjectedMetre)))
  const outerBounds = boundingExtent(points)
  const view = new View({ center: target, zoom: 12, minZoom: 3, maxZoom: 18, enableRotation: false })
  function overviewZoom() {
    if (!points.length) return 12
    const size = [Math.max(1, slot.clientWidth - 110), Math.max(1, slot.clientHeight - 85)]
    const fit = view.getZoomForResolution(view.getResolutionForExtent(bounds, size))!
    const widest = excursion ? view.getZoomForResolution(view.getResolutionForExtent(outerBounds, size))! + 1 : fit
    return Math.max(3, Math.min(14, fit, widest))
  }
  view.setZoom(overviewZoom())

  const vancouver = city.id === 'vancouver'
  const satellite = new XYZ({ url: satelliteTiles, attributions: eoxCredit, maxZoom: 14 })
  const primary = mapTilerTiles ? new XYZ({ url: mapTilerTiles, maxZoom: 19,
    attributions: '&copy; <a href="https://www.maptiler.com/copyright/">MapTiler</a> · ' + osmCredit }) : satellite
  const street = new XYZ({ url: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png', attributions: osmCredit, maxZoom: 19 })
  // Keep a low-resolution image beneath the detail tiles during the orbit handoff.
  const baseZoom = flightBaseZoom(city.latitude, Math.min(window.innerHeight * 0.66, window.innerWidth, 840))
  const backdrop = new TileLayer({ source: new XYZ({ url: mapTilerTiles ?? satelliteTiles, maxZoom: baseZoom,
    attributions: primary.getAttributions() ?? undefined }), zIndex: 0 })
  const imagery = new TileLayer({ source: primary, preload: 1, zIndex: 1 })
  const aerial = new TileLayer({ visible: primary === satellite, minZoom: 14.5, zIndex: 2,
    extent: transformExtent(vancouver ? [-123.23,49.18,-123.02,49.33] : [-125,24,-66,50], 'EPSG:4326', 'EPSG:3857'),
    source: new XYZ({
      url: (vancouver ? 'https://tiles.arcgis.com/tiles/qrcTTRTwUoS8N47o/arcgis/rest/services/Orthophotos_2022/MapServer'
        : 'https://basemap.nationalmap.gov/arcgis/rest/services/USGSImageryOnly/MapServer') + '/tile/{z}/{y}/{x}',
      minZoom: vancouver ? 11 : 3, maxZoom: vancouver ? 19 : 16,
      attributions: vancouver ? 'Imagery &copy; <a href="https://opendata.vancouver.ca/explore/dataset/orthophoto-imagery-2022/">City of Vancouver</a>'
        : 'Imagery: USDA, <a href="https://www.usgs.gov/programs/national-geospatial-program/national-map">USGS The National Map</a>',
    }),
  })
  const map = new OlMap({ target: el, view, layers: [backdrop, imagery, aerial],
    controls: controls({ rotate: false, attributionOptions: { collapsible: false } }),
    interactions: interactions({ altShiftDragRotate: false, pinchRotate: false }),
  })
  let landed = false
  const land = () => { if (!landed) { landed = true; onLand() } }
  const timer = window.setTimeout(land, 1600)
  const listeners = [backdrop.getSource()!.on('tileloadend', land)]
  onMapTiler(primary !== satellite)
  for (const source of new Set([primary, satellite, street])) {
    let pending = 0, successes = 0
    listeners.push(source.on('tileloadstart', () => { if (!pending++) successes = 0 }),
      source.on('tileloadend', () => {
        pending--
        successes++
        if (imagery.getSource() === source) { onFailed(false); land() }
      }),
      source.on('tileloaderror', () => {
        if (--pending > 0 || successes || imagery.getSource() !== source) return
        if (source === street) { onFailed(true); land(); return }
        const next = source === satellite ? street : satellite
        imagery.setSource(next)
        aerial.setVisible(next === satellite)
        backdrop.setVisible(false)
        onMapTiler(false)
      }))
  }

  if (!spots.length) {
    const dot = document.createElement('span')
    dot.className = 'album-city-dot'
    dot.textContent = city.title
    map.addOverlay(new Overlay({ element: dot, position: target, positioning: 'bottom-center', stopEvent: false }))
  }
  const photoPins = addPhotoMapPins(map, spots, onSelect)
  // Safari desktop exposes trackpad magnification through GestureEvent. Feed its
  // scale into the same anchored View interaction used by the touchscreen handler.
  const abort = new AbortController()
  if ('GestureEvent' in window) {
    let touches = 0
    let previous: number | null = null
    const options = { passive: false, signal: abort.signal }
    for (const type of ['touchstart', 'touchend', 'touchcancel'] as const) {
      el.addEventListener(type, e => { touches = e.touches.length }, { passive: true, capture: true, signal: abort.signal })
    }
    el.addEventListener('gesturestart', e => {
      if (touches) return
      e.preventDefault()
      previous = 1
      view.beginInteraction()
    }, options)
    el.addEventListener('gesturechange', e => {
      if (previous === null || touches) return
      e.preventDefault()
      const gesture = e as MouseEvent & { scale: number }
      view.adjustZoom(Math.log2(gesture.scale / previous), map.getEventCoordinate(gesture))
      previous = gesture.scale
    }, options)
    el.addEventListener('gestureend', e => {
      if (previous === null) return
      e.preventDefault()
      previous = null
      view.endInteraction()
    }, options)
  }
  function focus(center: number[], zoom: number, duration: number) {
    view.cancelAnimations()
    view.animate({ center, zoom, duration: matchMedia('(prefers-reduced-motion: reduce)').matches ? 0 : duration, easing: easeOut })
  }
  return { map, view, popupHost: photoPins.popupHost, overviewZoom, focus,
    overview: (duration: number) => focus(target, overviewZoom(), duration),
    select: photoPins.select, fromLonLat, toLonLat,
    dispose() {
      clearTimeout(timer)
      abort.abort()
      unByKey(listeners)
      photoPins.dispose()
      view.cancelAnimations()
      map.dispose()
      for (const layer of [backdrop, imagery, aerial]) layer.dispose()
    },
  }
}
export type AlbumMapEngine = ReturnType<typeof createAlbumMap>
