import type Map from 'ol/Map.js'
import { boundingExtent } from 'ol/extent.js'
import { fromLonLat } from 'ol/proj.js'
import type { PhotoSpot } from './AlbumMap'
import { newPinBody, stepPins } from './pin-layout'

const thumbnailSize = 56
const countDiameter = 32
export const photoDetailZoom = 15
const svgNS = 'http://www.w3.org/2000/svg'

type PinGroup = { center: number[], members: number[], count: number }

// Work in projected coordinates so panning or crossing the map edge never
// changes a group's membership. Merge the nearest overlapping circles first.
function clusterPins(points: PinGroup[], distance: number) {
  const groups = points.slice()
  while (groups.length > 1) {
    let closest = distance
    let pair: [number, number] | undefined
    for (let i = 0; i < groups.length; i++) {
      for (let j = i + 1; j < groups.length; j++) {
        const a = groups[i].center, b = groups[j].center
        const gap = Math.hypot(a[0] - b[0], a[1] - b[1])
        if (gap < closest) { closest = gap; pair = [i, j] }
      }
    }
    if (!pair) break
    const [i, j] = pair
    const a = groups[i], b = groups[j]
    const count = a.count + b.count
    const center = a.center.map((value, axis) => value + (b.center[axis] - value) * b.count / count)
    groups[i] = { center, count, members: [...a.members, ...b.members] }
    groups.splice(j, 1)
  }
  return groups
}

export function addPhotoMapPins(map: Map, spots: PhotoSpot[], onSelect: (key: string) => void) {
  const layer = document.createElement('div')
  layer.className = 'photo-map-pins'
  layer.style.setProperty('--thumbnail-size', thumbnailSize + 'px')
  layer.style.setProperty('--count-size', countDiameter + 'px')
  map.getOverlayContainer()!.append(layer)
  const leaders = document.createElementNS(svgNS, 'svg')
  leaders.setAttribute('aria-hidden', 'true')
  layer.append(leaders)
  const popupHost = document.createElement('div')
  popupHost.className = 'spot-popup'
  popupHost.hidden = true
  const nodes = spots.map(spot => {
    const button = document.createElement('button')
    button.type = 'button'
    button.className = 'photo-map-marker'
    const description = spot.name + ', ' + spot.pictures.length + (spot.pictures.length === 1 ? ' photo' : ' photos')
    button.setAttribute('aria-label', description)
    button.setAttribute('aria-pressed', 'false')
    const face = document.createElement('span')
    face.className = 'photo-marker-face'
    const crop = document.createElement('span')
    crop.className = 'photo-marker-crop'
    const image = document.createElement('img')
    image.alt = ''
    crop.append(image)
    face.append(crop)
    if (spot.pictures.length > 1) {
      const count = document.createElement('span')
      count.className = 'photo-marker-count'
      count.textContent = String(spot.pictures.length)
      face.append(count)
    }
    const label = document.createElement('span')
    label.className = 'photo-marker-label home-location-label liquid-glass'
    label.setAttribute('aria-hidden', 'true')
    label.textContent = spot.name
    const total = document.createElement('span')
    total.className = 'photo-marker-total'
    button.append(face, label, total)
    layer.append(button)
    const group = document.createElementNS(svgNS, 'g')
    const line = document.createElementNS(svgNS, 'line')
    const dot = document.createElementNS(svgNS, 'circle')
    dot.setAttribute('r', '2.5')
    group.append(line, dot)
    leaders.append(group)
    return { spot, position: fromLonLat([spot.longitude, spot.latitude]), button, group, line, total, image, description,
      pin: { x: 0, y: 0, reveal: 1 }, body: newPinBody(), radius: thumbnailSize / Math.SQRT2 + 3, centerY: -thumbnailSize / 2 }
  })
  layer.append(popupHost)
  let selected = ''
  let lastStep = 0
  let movement = 0
  const motion = matchMedia('(prefers-reduced-motion: reduce)')
  const view = map.getView()
  const points = nodes.map(({ position, spot }, i) => ({ center: position, members: [i], count: spot.pictures.length }))
  // The area needed by k nearby thumbnails grows with k. Measure their
  // distances once in map units, then convert to CSS pixels at each scale.
  const spacing = points.map((point, index) => {
    const distances = points.filter((_, i) => i !== index)
      .map(other => Math.hypot(point.center[0] - other.center[0], point.center[1] - other.center[1]))
      .sort((a, b) => a - b)
    return distances.slice(0, 4).reduce((room, distance, i) => Math.min(room, distance / Math.sqrt(i + 1)), Infinity)
  })
  const automaticPreview = points.map(() => false)
  let groups: PinGroup[] = []
  let layoutResolution: number | undefined
  let expanded = new Set<number>()
  let previousResolution = view.getResolution()!
  let settleImmediately = false
  function expand(members: number[]) {
    expanded = new Set(members)
    layoutResolution = undefined
    settleImmediately = true
    render()
  }

  nodes.forEach(({ button, spot, position }, index) => {
    button.onclick = () => {
      const cluster = groups.find(g => g.members[0] === index)
      if (cluster) expand(cluster.members)
      const duration = motion.matches ? 0 : 500
      if (cluster && cluster.members.length > 1) {
        const bounds = boundingExtent(cluster.members.map(i => nodes[i].position))
        view.cancelAnimations()
        view.fit(bounds, { padding: [48, 48, 48, 48], maxZoom: Math.max(view.getZoom()!, photoDetailZoom), duration })
      } else if (cluster && selected === spot.key) {
        view.cancelAnimations()
        view.animate({ center: position, zoom: Math.max(view.getZoom()!, photoDetailZoom), duration })
      } else onSelect(spot.key)
    }
  })

  function renderCounts(resolution: number, w: number, h: number) {
    if (resolution !== layoutResolution) {
      layoutResolution = resolution
      // Keep a little slack when zooming out so a small gesture at the
      // boundary doesn't repeatedly switch between a count and a photo.
      for (let i = 0; i < points.length; i++) {
        const clearance = thumbnailSize + (automaticPreview[i] ? 16 : 28)
        automaticPreview[i] = spacing[i] >= clearance * resolution
      }
      groups = clusterPins(points.filter((_, i) => !automaticPreview[i] && !expanded.has(i)), countDiameter * resolution)
      layer.classList.toggle('show-counts', groups.length > 0)
      for (const [i, node] of nodes.entries()) {
        const compact = !automaticPreview[i] && !expanded.has(i)
        node.button.classList.toggle('is-count', compact)
        if (compact) node.group.style.display = 'none'
        else {
          node.button.setAttribute('aria-label', node.description)
          node.button.setAttribute('aria-pressed', String(node.spot.key === selected))
        }
      }
      for (const { count, members } of groups) {
        const node = nodes[members[0]]
        for (const i of members.slice(1)) nodes[i].button.hidden = true
        node.button.removeAttribute('aria-pressed')
        node.total.textContent = String(count)
        node.button.setAttribute('aria-label', members.length === 1 ? node.description :
          `Zoom in on ${count} photos at ${members.length} locations`)
      }
    }
    for (const { center, members } of groups) {
      const { button } = nodes[members[0]]
      const [x, y] = map.getPixelFromCoordinate(center)
      button.hidden = x < 0 || x > w || y < 0 || y > h
      button.style.transform = `translate(${x - countDiameter / 2}px,${y - countDiameter / 2}px)`
    }
  }
  // Project the buttons and their leaders from the same frame as the tile canvas.
  // Request another map frame only while the springs are still moving.
  function render() {
    const [w, h] = map.getSize()!
    const resolution = view.getResolution()!
    // A click opens just that group. Return to ordinary clustering when the
    // user zooms back out, including when they interrupt the camera animation.
    if (expanded.size && resolution > previousResolution * 1.000001) {
      expanded.clear()
      layoutResolution = undefined
    }
    previousResolution = resolution
    renderCounts(resolution, w, h)
    const visible = nodes.filter((node, index) => {
      if (!automaticPreview[index] && !expanded.has(index)) return false
      const [x, y] = map.getPixelFromCoordinate(node.position)
      const hidden = x < 0 || y < 0 || x > w || y > h
      node.button.hidden = hidden
      if (!hidden && !node.image.hasAttribute('src')) {
        node.image.src = '/_next/image?url=' + encodeURIComponent(node.spot.pictures[0].src) + '&w=128&q=75'
      }
      node.group.style.display = hidden ? 'none' : ''
      Object.assign(node.pin, { x, y })
      return !hidden
    })
    const now = performance.now()
    const step = 1000 / 60
    lastStep = Math.max(lastStep, now - 4 * step)
    if (motion.matches || settleImmediately) {
      settleImmediately = false
      for (let i = 0; i < 180; i++) {
        if (stepPins(visible, w, h) < 0.015) break
      }
      movement = 0
      lastStep = now
    } else {
      while (now - lastStep >= step) {
        movement = stepPins(visible, w, h)
        lastStep += step
      }
    }
    let showPopup = false
    for (const { spot, button, group, line, pin, body } of visible) {
      const x = pin.x + body.shownX, y = pin.y + body.shownY
      button.style.transform = 'translate(' + (x - thumbnailSize / 2) + 'px,' + (y - thumbnailSize) + 'px)'
      group.setAttribute('transform', 'translate(' + pin.x + ' ' + pin.y + ')')
      line.setAttribute('x2', String(body.shownX))
      line.setAttribute('y2', String(body.shownY))
      if (spot.key === selected) {
        showPopup = true
        popupHost.style.transform = 'translate(' + x + 'px,' + (y - thumbnailSize - 8) + 'px) translate(-50%,-100%)'
      }
    }
    popupHost.hidden = !showPopup
    if (movement > 0.015) map.render()
  }
  map.on('postrender', render)
  motion.addEventListener('change', render)
  map.render()
  return { popupHost, select(key: string) {
    selected = key
    const index = nodes.findIndex(node => node.spot.key === key)
    if (index >= 0 && !automaticPreview[index] && !expanded.has(index)) expand([index])
    if (!key && expanded.size) {
      expanded.clear()
      layoutResolution = undefined
    }
    for (const { button, spot } of nodes) {
      if (!button.classList.contains('is-count')) button.setAttribute('aria-pressed', String(spot.key === key))
    }
    map.render()
  }, dispose() {
    map.un('postrender', render)
    motion.removeEventListener('change', render)
    layer.remove()
  } }
}
