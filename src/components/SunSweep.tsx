'use client'

import { useEffect, useRef, useState, type RefObject } from 'react'
import type { EarthController } from '@/earth'

export function SunSweep({ scene, enabled }: {
  scene: RefObject<EarthController | null>
  enabled: boolean
}) {
  const angle = useRef(0)
  const [degrees, setDegrees] = useState(0)
  const [playing, setPlaying] = useState(false)

  function applyAngle(value: number) {
    angle.current = value
    scene.current?.setSunOffset(value)
    setDegrees(Math.round(value))
  }

  useEffect(() => {
    if (!enabled || !playing) return
    let frame = 0
    let previous = 0
    function tick(time: number) {
      const delta = previous ? Math.min(time - previous, 64) : 0
      previous = time
      let next = angle.current + delta * 0.012
      if (next > 180) next -= 360
      angle.current = next
      scene.current?.setSunOffset(next)
      setDegrees(Math.round(next))
      frame = requestAnimationFrame(tick)
    }
    frame = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frame)
  }, [enabled, playing, scene])

  useEffect(() => {
    scene.current?.setSunOffset(0)
    return () => { scene.current?.setSunOffset(0) }
  }, [scene])

  return <div className="sweep">
    <label className="sun-control">
      <span>Sun angle</span>
      <input type="range" min="-180" max="180" step="1" value={degrees} disabled={!enabled}
        onChange={event => { setPlaying(false); applyAngle(Number(event.target.value)) }}/>
      <output>{degrees}°</output>
    </label>
    <button className="sweep-button" type="button" disabled={!enabled}
      onClick={() => setPlaying(!playing)}>
      <svg width="14" height="14" aria-hidden="true" viewBox="0 0 16 16" fill="currentColor">
        {playing && enabled ? <path d="M3 2h3v12H3zm7 0h3v12h-3z"/> : <path d="M4 2.2 13 8l-9 5.8z"/>}
      </svg>
      {playing && enabled ? 'Pause sweep' : 'Play sweep'}
    </button>
  </div>
}
