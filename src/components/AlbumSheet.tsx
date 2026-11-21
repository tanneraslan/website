import { useRef, useState, type CSSProperties, type PointerEvent, type ReactNode } from 'react'

const stops = ['peek', 'browse', 'expanded'] as const
type Stop = typeof stops[number]

export function AlbumSheet({ heading, children }: { heading: ReactNode, children: ReactNode }) {
  const [stop, setStop] = useState<Stop>('browse')
  const [dragHeight, setDragHeight] = useState<number>()
  const sheet = useRef<HTMLDivElement>(null)
  const drag = useRef<{ id: number, y: number, height: number, limits: number[] } | null>(null)
  const skipClick = useRef(false)

  function start(event: PointerEvent<HTMLElement>) {
    const panel = sheet.current
    if (!panel || !event.isPrimary || event.button !== 0 || (event.target as Element).closest('a')) return
    const stage = panel.parentElement!.clientHeight
    if (!matchMedia('(max-width: 899px)').matches) return
    const collection = panel.querySelector<HTMLElement>('.album-collection')!
    const peek = panel.querySelector('header')!.offsetHeight + parseFloat(getComputedStyle(collection).minHeight)
    const limits = [peek, Math.max(peek, stage * .5), Math.max(peek, stage - 52)]
    drag.current = { id: event.pointerId, y: event.clientY, height: panel.offsetHeight, limits }
    skipClick.current = false
    ;(event.target as Element).setPointerCapture(event.pointerId)
  }
  function move(event: PointerEvent<HTMLElement>) {
    const active = drag.current
    if (active?.id !== event.pointerId) return
    const delta = active.y - event.clientY
    if (Math.abs(delta) > 4) skipClick.current = true
    if (skipClick.current) setDragHeight(Math.max(active.limits[0], Math.min(active.limits[2], active.height + delta)))
  }
  function finish(event: PointerEvent<HTMLElement>) {
    const active = drag.current
    if (active?.id !== event.pointerId) return
    const delta = active.y - event.clientY
    if (event.type !== 'pointercancel' && Math.abs(delta) > 4) {
      skipClick.current = true
      const height = active.height + delta
      let nearest = active.limits.reduce((best, h, i, all) => Math.abs(h - height) < Math.abs(all[best] - height) ? i : best, 0)
      if (nearest === stops.indexOf(stop) && Math.abs(delta) > 36) nearest += Math.sign(delta)
      setStop(stops[Math.max(0, Math.min(2, nearest))])
    }
    drag.current = null
    setDragHeight(undefined)
  }
  return <div className="album-sheet" ref={sheet} data-stop={stop} data-dragging={dragHeight !== undefined || undefined}
    style={dragHeight === undefined ? undefined : { '--drag-height': dragHeight + 'px' } as CSSProperties}>
    <header className="album-heading" onPointerDown={start} onPointerMove={move} onPointerUp={finish} onPointerCancel={finish}>
      <button type="button" className="album-grip" aria-controls="album-photos" aria-expanded={stop !== 'peek'}
        aria-label={stop === 'expanded' ? 'Lower photos to show map' : 'Raise photo drawer'}
        onClick={event => {
          if (event.detail === 0 || !skipClick.current) setStop(stop === 'expanded' ? 'peek' : 'expanded')
          skipClick.current = false
        }}><span/></button>
      {heading}
    </header>
    <div className="album-collection" id="album-photos">{children}</div>
  </div>
}
