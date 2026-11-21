import { Quaternion, type PerspectiveCamera } from 'three'

export function createStars(sky: HTMLCanvasElement) {
  const context = sky.getContext('2d')
  if (!context) return

  let seed = 0x4a17bb
  function random() {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0
    return seed / 4294967296
  }
  // Sample equal solid angles so the poles are as sparse as the equator.
  const stars = Array.from({ length: 5200 }, () => {
    const z = 2 * random() - 1, azimuth = 2 * Math.PI * random()
    const r = Math.sqrt(1 - z * z)
    const brightness = random() ** 3
    return { x: r * Math.cos(azimuth), y: r * Math.sin(azimuth), z,
      diameter: 2.4 + 4.4 * brightness, opacity: 0.27 + 0.64 * brightness,
      tint: Math.floor(random() * 4) }
  })
  // Bake the soft cores and halos once. Only their sky directions are projected per frame.
  const sprites = document.createElement('canvas')
  const cell = 32
  sprites.width = cell * 4
  sprites.height = cell
  const brush = sprites.getContext('2d')
  if (!brush) return
  const tints = ['204 220 255', '233 239 255', '250 245 231', '255 219 192']
  tints.forEach((rgb, i) => {
    const x = (i + 0.5) * cell, y = cell / 2
    const gradient = brush.createRadialGradient(x, y, 0, x, y, y)
    for (const [stop, alpha] of [[0, 1], [0.16, 0.85], [0.36, 0.28], [0.64, 0.065], [1, 0]]) {
      gradient.addColorStop(stop, `rgb(${rgb} / ${alpha})`)
    }
    brush.fillStyle = gradient
    brush.fillRect(i * cell, 0, cell, cell)
  })

  const orientation = new Quaternion()
  let cx = NaN, cy = NaN, fx = NaN, fy = NaN, pixelRatio = 0
  return (camera: PerspectiveCamera, globe: HTMLCanvasElement) => {
    const width = sky.clientWidth, height = sky.clientHeight
    const dpr = Math.min(2, window.devicePixelRatio || 1, 2400 / Math.max(1, width, height))
    const rect = globe.getBoundingClientRect()
    const p = camera.projectionMatrix.elements
    // The planet canvas occupies a subrectangle of the page. Extend that same
    // frustum over the backdrop, including pan and the asymmetric flight camera.
    const x = rect.left + rect.width * (1 - p[8]) / 2
    const y = rect.top + rect.height * (1 + p[9]) / 2
    const focalX = rect.width * p[0] / 2, focalY = rect.height * p[5] / 2
    const w = Math.round(width * dpr), h = Math.round(height * dpr)
    const resized = w !== sky.width || h !== sky.height
    if (!resized && dpr === pixelRatio && x === cx && y === cy && fx === focalX &&
        fy === focalY && orientation.equals(camera.quaternion)) return
    if (resized) { sky.width = w; sky.height = h }
    orientation.copy(camera.quaternion)
    cx = x; cy = y; fx = focalX; fy = focalY; pixelRatio = dpr
    context.setTransform(dpr, 0, 0, dpr, 0, 0)
    context.clearRect(0, 0, width, height)
    const m = camera.matrixWorldInverse.elements
    for (const star of stars) {
      // Directions at infinity rotate with the camera and have no translation parallax.
      const depth = -(m[2] * star.x + m[6] * star.y + m[10] * star.z)
      if (depth <= 0) continue
      const sx = cx + fx * (m[0] * star.x + m[4] * star.y + m[8] * star.z) / depth
      const sy = cy - fy * (m[1] * star.x + m[5] * star.y + m[9] * star.z) / depth
      if (sx < -4 || sy < -4 || sx > width + 4 || sy > height + 4) continue
      const size = star.diameter
      context.globalAlpha = star.opacity
      context.drawImage(sprites, star.tint * cell, 0, cell, cell, sx - size / 2, sy - size / 2, size, size)
    }
  }
}
