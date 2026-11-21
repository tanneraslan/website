import { useEffect, useRef, type RefObject } from 'react'
import type { EarthController } from '@/earth'
import { globeDiameterFraction } from '@/earth/locations'

type Contact = { x: number; y: number; time: number; canRotate: boolean }

export function OrbitControl({ scene }: { scene: RefObject<EarthController | null> }) {
  const control = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const disk = control.current
    const frame = disk?.closest<HTMLElement>('.earth-frame')
    const earth = scene.current
    if (!disk || !frame || !earth) return

    const contacts = new Map<number, Contact>()
    let pinchDistance = 0
    let longitudeSpeed = 0
    let latitudeSpeed = 0
    let shownZoom = 1
    const unsubscribe = earth.observeOrbit(({ zoom }) => {
      if (zoom === shownZoom) return
      shownZoom = zoom
      disk.style.transform = `scale(${zoom})`
    })
    const framePoint = (clientX: number, clientY: number) => {
      const rect = frame.getBoundingClientRect()
      return { x: (clientX - rect.left - rect.width / 2) / rect.width, y: (clientY - rect.top - rect.height / 2) / rect.width }
    }
    const pinch = () => {
      const [a, b] = contacts.values()
      return { span: Math.hypot(b.x - a.x, b.y - a.y), midpoint: framePoint((a.x + b.x) / 2, (a.y + b.y) / 2) }
    }
    const overGlobe = (target: EventTarget | null) =>
      target === disk || (target instanceof Element && Boolean(target.closest('[data-place-pin]')))
    const down = (event: PointerEvent) => {
      if (event.button !== 0 || !overGlobe(event.target) || contacts.size >= 2) return
      if (event.pointerType !== 'touch' && event.target !== disk) return
      contacts.set(event.pointerId, { x: event.clientX, y: event.clientY, time: event.timeStamp, canRotate: event.target === disk })
      longitudeSpeed = latitudeSpeed = 0
      earth.stopCoasting()
      if (contacts.size === 2) {
        const { span, midpoint } = pinch()
        pinchDistance = span
        earth.zoomBy(1, midpoint)
        for (const id of contacts.keys()) disk.setPointerCapture(id)
      } else if (event.target === disk) disk.setPointerCapture(event.pointerId)
    }
    const move = (event: PointerEvent) => {
      const contact = contacts.get(event.pointerId)
      if (!contact) return
      const dx = contact.x - event.clientX
      const dy = event.clientY - contact.y
      const dt = Math.max(0.001, (event.timeStamp - contact.time) / 1000)
      Object.assign(contact, { x: event.clientX, y: event.clientY, time: event.timeStamp })
      if (contacts.size === 2) {
        const { span, midpoint } = pinch()
        if (pinchDistance > 1 && span > 1) earth.zoomBy(span / pinchDistance, midpoint, true)
        pinchDistance = span
      } else if (contact.canRotate && (dx || dy)) {
        const scale = 2.4 / (disk.clientWidth * shownZoom)
        const longitude = dx * scale, latitude = dy * scale
        earth.rotateBy(longitude, latitude)
        const weight = 1 - Math.exp(-dt / 0.045)
        longitudeSpeed += weight * (longitude / dt - longitudeSpeed)
        latitudeSpeed += weight * (latitude / dt - latitudeSpeed)
      }
    }
    const end = (event: PointerEvent) => {
      const contact = contacts.get(event.pointerId)
      if (!contact) return
      contacts.delete(event.pointerId)
      if (contacts.size) {
        const [remaining] = contacts.values()
        remaining.canRotate = true
        remaining.time = event.timeStamp
        longitudeSpeed = latitudeSpeed = 0
      } else if (contact.canRotate && event.type === 'pointerup') {
        const idleMs = Math.max(0, event.timeStamp - contact.time)
        if (idleMs < 150) {
          const weight = Math.exp(-idleMs / 65)
          earth.coast(longitudeSpeed * weight, latitudeSpeed * weight)
        }
      }
    }
    const lost = (event: PointerEvent) => {
      if (event.target === disk && !disk.hasPointerCapture(event.pointerId)) end(event)
    }
    const wheel = (event: WheelEvent) => {
      if (!overGlobe(event.target)) return
      const page = document.scrollingElement
      if (!event.ctrlKey && page && page.scrollHeight > page.clientHeight + 1) return
      const unit = event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? frame.clientHeight : 1
      const factor = Math.exp(-event.deltaY * unit * (event.ctrlKey ? 0.01 : 0.002))
      const changed = earth.zoomBy(factor, framePoint(event.clientX, event.clientY))
      if (changed || event.ctrlKey) event.preventDefault()
    }
    frame.addEventListener('wheel', wheel, { passive: false })
    frame.addEventListener('pointerdown', down)
    frame.addEventListener('pointermove', move)
    frame.addEventListener('pointerup', end)
    frame.addEventListener('pointercancel', end)
    frame.addEventListener('lostpointercapture', lost)
    return () => {
      unsubscribe()
      frame.removeEventListener('wheel', wheel)
      frame.removeEventListener('pointerdown', down)
      frame.removeEventListener('pointermove', move)
      frame.removeEventListener('pointerup', end)
      frame.removeEventListener('pointercancel', end)
      frame.removeEventListener('lostpointercapture', lost)
    }
  }, [scene])

  return <div className="orbit-control-clip"><div ref={control} className="orbit-control" role="group" tabIndex={0}
    aria-label="Rotate Earth by dragging or using the arrow keys. Pinch, Ctrl-scroll, or use plus and minus to zoom."
    style={{ inset: (1 - globeDiameterFraction) * 50 + '%' }}
    onKeyDown={event => {
      const step = Math.PI / 18
      switch (event.key) {
        case 'ArrowLeft': scene.current?.rotateBy(step, 0); break
        case 'ArrowRight': scene.current?.rotateBy(-step, 0); break
        case 'ArrowUp': scene.current?.rotateBy(0, -step); break
        case 'ArrowDown': scene.current?.rotateBy(0, step); break
        case '+': case '=': scene.current?.zoomBy(1.2); break
        case '-': scene.current?.zoomBy(1 / 1.2); break
        default: return
      }
      event.preventDefault()
    }}/></div>
}
