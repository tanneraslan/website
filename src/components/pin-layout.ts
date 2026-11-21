// Offsets are relative to each geographic anchor, in screen pixels.
export const newPinBody = () => ({
  dx: 0, dy: 0, vx: 0, vy: 0, reveal: 0, shownX: 0, shownY: 0,
})
export interface LayoutNode {
  pin: { x: number; y: number; reveal: number }
  body: ReturnType<typeof newPinBody>
  radius: number
  centerY: number
}

// Contact forces alone can't escape a layout where two cities occupy each
// other's best slots. Exchange their endpoints if that shortens the leaders.
// A subpixel margin keeps nearly equivalent assignments stable during rotation.
function shortenLeaders(nodes: LayoutNode[]) {
  for (let i = 0; i < nodes.length; i++) {
    const a = nodes[i]
    if (a.body.reveal < 0.5) continue
    for (let j = i + 1; j < nodes.length; j++) {
      const b = nodes[j]
      if (b.body.reveal < 0.5) continue
      const gapX = b.pin.x - a.pin.x, gapY = b.pin.y - a.pin.y
      const ax = b.body.dx + gapX, ay = b.body.dy + gapY
      const bx = a.body.dx - gapX, by = a.body.dy - gapY
      const current = Math.hypot(a.body.dx, a.body.dy) + Math.hypot(b.body.dx, b.body.dy)
      if (Math.hypot(ax, ay) + Math.hypot(bx, by) + 0.5 >= current) continue
      Object.assign(a.body, { dx: ax, dy: ay, vx: 0, vy: 0 })
      Object.assign(b.body, { dx: bx, dy: by, vx: 0, vy: 0 })
    }
  }
}

export function stepPins(nodes: LayoutNode[], width: number, height: number) {
  let movement = 0
  for (const { body, pin } of nodes) {
    const remaining = pin.reveal - body.reveal
    body.reveal += Math.abs(remaining) < 0.001 ? remaining : remaining * 0.12
    movement = Math.max(movement, Math.abs(remaining))
    body.vx -= body.dx * 0.035
    body.vy += (-24 * body.reveal - body.dy) * 0.035
  }
  for (let i = 0; i < nodes.length; i++) {
    const a = nodes[i]
    for (let j = i + 1; j < nodes.length; j++) {
      const b = nodes[j]
      const dx = b.pin.x + b.body.dx - a.pin.x - a.body.dx
      const dy = b.pin.y + b.body.dy + b.centerY * b.body.reveal - a.pin.y - a.body.dy - a.centerY * a.body.reveal
      const distance = Math.hypot(dx, dy)
      const overlap = a.radius * a.body.reveal + b.radius * b.body.reveal - distance
      if (overlap <= 0) continue
      const push = overlap * 0.34 * Math.min(a.body.reveal, b.body.reveal)
      const fx = distance ? push * dx / distance : push
      const fy = distance ? push * dy / distance : 0
      a.body.vx -= fx
      a.body.vy -= fy
      b.body.vx += fx
      b.body.vy += fy
    }
  }
  for (const { pin, body, radius, centerY } of nodes) {
    body.vx *= 0.72
    body.vy *= 0.72
    const r = radius * body.reveal
    const x = Math.max(r, Math.min(width - r, pin.x + body.dx + body.vx))
    const y = Math.max(r - centerY * body.reveal, Math.min(height - 22 * body.reveal, pin.y + body.dy + body.vy))
    body.dx = x - pin.x
    body.dy = y - pin.y
  }
  shortenLeaders(nodes)
  for (const { body } of nodes) {
    // Ease toward a reassigned slot instead of teleporting its artwork.
    const dx = body.dx - body.shownX, dy = body.dy - body.shownY
    body.shownX += dx * 0.23
    body.shownY += dy * 0.23
    movement = Math.max(movement, Math.abs(dx), Math.abs(dy))
  }
  return movement
}

// Keep the spring speed independent of refresh rate and stop once the pins settle.
export function animatePins(nodes: LayoutNode[], width: number, height: number,
  clock: { current: number }, publish: () => void) {
  if (!nodes.length) return () => {}
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) {
    for (let i = 0; i < 180; i++) stepPins(nodes, width, height)
    publish()
    return () => {}
  }
  const frameMs = 1000 / 60
  let quietSteps = 0
  let raf = 0
  const tick = (now: number) => {
    clock.current = Math.max(clock.current, now - 4 * frameMs)
    let stepped = false
    while (now - clock.current >= frameMs) {
      quietSteps = stepPins(nodes, width, height) < 0.015 ? quietSteps + 1 : 0
      clock.current += frameMs
      stepped = true
    }
    if (stepped) publish()
    if (quietSteps < 4) raf = requestAnimationFrame(tick)
  }
  tick(performance.now())
  return () => cancelAnimationFrame(raf)
}
