import type Map from 'ol/Map.js'
import { fromLonLat } from 'ol/proj.js'
import type { PhotoSpot } from './AlbumMap'
import { newPinBody, stepPins } from './pin-layout'

const diameter = 48
const svgNS = 'http://www.w3.org/2000/svg'

export function addPhotoMapPins(map: Map, spots: PhotoSpot[], onSelect: (key: string) => void) {
  const layer = document.createElement('div')
  layer.className = 'photo-map-pins'
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
    button.style.width = button.style.height = diameter + 'px'
    button.setAttribute('aria-label', spot.name + ', ' + spot.pictures.length + (spot.pictures.length === 1 ? ' photo' : ' photos'))
    button.setAttribute('aria-pressed', 'false')
    button.onclick = () => onSelect(spot.key)
    const face = document.createElement('span')
    face.className = 'photo-marker-face'
    const crop = document.createElement('span')
    crop.className = 'photo-marker-crop'
    const image = document.createElement('img')
    image.alt = ''
    image.src = '/_next/image?url=' + encodeURIComponent(spot.pictures[0].src) + '&w=128&q=75'
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
    button.append(face, label)
    layer.append(button)
    const group = document.createElementNS(svgNS, 'g')
    const line = document.createElementNS(svgNS, 'line')
    const dot = document.createElementNS(svgNS, 'circle')
    dot.setAttribute('r', '2.5')
    group.append(line, dot)
    leaders.append(group)
    return { spot, position: fromLonLat([spot.longitude, spot.latitude]), button, group, line,
      pin: { x: 0, y: 0, reveal: 1 }, body: newPinBody(), radius: diameter / 2 + 8, centerY: -diameter / 2 }
  })
  layer.append(popupHost)
  let selected = ''
  let lastStep = 0
  let movement = 0
  const motion = matchMedia('(prefers-reduced-motion: reduce)')
  // Project the buttons and their leaders from the same frame as the tile canvas.
  // Request another map frame only while the springs are still moving.
  const render = () => {
    const [w, h] = map.getSize()!
    const visible = nodes.filter(node => {
      const [x, y] = map.getPixelFromCoordinate(node.position)
      const hidden = x < 0 || y < 0 || x > w || y > h
      node.button.hidden = hidden
      node.group.style.display = hidden ? 'none' : ''
      Object.assign(node.pin, { x, y })
      return !hidden
    })
    const now = performance.now()
    const step = 1000 / 60
    lastStep = Math.max(lastStep, now - 4 * step)
    if (motion.matches) {
      for (let i = 0; i < 180; i++) {
        if (stepPins(visible, w, h) < 0.015) break
      }
      movement = 0
    } else {
      while (now - lastStep >= step) {
        movement = stepPins(visible, w, h)
        lastStep += step
      }
    }
    let showPopup = false
    for (const { spot, button, group, line, pin, body } of visible) {
      const x = pin.x + body.shownX, y = pin.y + body.shownY
      button.style.transform = 'translate(' + (x - diameter / 2) + 'px,' + (y - diameter) + 'px)'
      group.setAttribute('transform', 'translate(' + pin.x + ' ' + pin.y + ')')
      line.setAttribute('x2', String(body.shownX))
      line.setAttribute('y2', String(body.shownY))
      if (spot.key === selected) {
        showPopup = true
        popupHost.style.transform = 'translate(' + x + 'px,' + (y - diameter - 8) + 'px) translate(-50%,-100%)'
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
    for (const { button, spot } of nodes) button.setAttribute('aria-pressed', String(spot.key === key))
    map.render()
  }, dispose() {
    map.un('postrender', render)
    motion.removeEventListener('change', render)
    layer.remove()
  } }
}
