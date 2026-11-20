'use client'

import { Button } from '@lenso/ui/button'
import { Link } from '@lenso/ui/link'
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode, type RefObject } from 'react'
import { projectPlace, type Coordinates } from '@/earth/locations'
import type { EarthController, EarthPose } from '@/earth'
import './places.css'

export interface MapPlace extends Coordinates {
  id: string
  title: string
  location: string
  detail: string
  period: string
  action: string
  logo?: string
  cover?: string
}

interface Atlas {
  places: MapPlace[]
  selected: string | null
  register: (place: MapPlace) => () => void
  select: (id: string) => void
}

const AtlasContext = createContext<Atlas | null>(null)

export function PlaceAtlasProvider({ children }: { children: ReactNode }) {
  const [places, setPlaces] = useState<MapPlace[]>([])
  const [selection, select] = useState<string | null>(null)
  const register = useCallback((place: MapPlace) => {
    setPlaces(current => [...current.filter(other => other.id !== place.id), place])
    return () => { setPlaces(current => current.filter(other => other !== place)) }
  }, [])
  const selected = places.some(place => place.id === selection) ? selection : places[0]?.id ?? null
  const value = useMemo(() => ({ places, selected, select, register }), [places, selected, register])
  return <AtlasContext.Provider value={value}>{children}</AtlasContext.Provider>
}

// This link doubles as the map registration. The page's editorial metadata is
// the sole source for both the location link and the projected place card.
export function PlaceLink({ place }: { place: MapPlace }) {
  const atlas = useContext(AtlasContext)
  const register = atlas?.register
  useEffect(() => register?.(place), [place, register])
  return <Link href="#place-map" data-place-link="" aria-label={`Show ${place.location} on the globe`}
    onClick={() => atlas?.select(place.id)}>{place.location}</Link>
}

export function GlobePlaces({ scene, pose, live }: {
  scene: RefObject<EarthController | null>
  pose: EarthPose
  live: boolean
}) {
  const atlas = useContext(AtlasContext)
  const frame = useRef<HTMLDivElement>(null)
  const card = useRef<HTMLDivElement>(null)
  const [cardHeight, setCardHeight] = useState(96)
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 })
  const [progress, setProgress] = useState(pose === 'experience' ? 1 : 0)
  useEffect(() => {
    if (live && scene.current) return scene.current.observeOrbit(setProgress)
    setProgress(pose === 'experience' ? 1 : 0)
  }, [live, pose, scene])
  useEffect(() => {
    if (!frame.current) return
    const observer = new ResizeObserver(([entry]) => {
      setDimensions({ width: entry.contentRect.width, height: entry.contentRect.height })
    })
    observer.observe(frame.current)
    return () => observer.disconnect()
  }, [])
  const { width, height } = dimensions
  const side = Math.min(width, height)
  const pins = (atlas?.places ?? []).flatMap(place => {
    const point = projectPlace(place, progress)
    return side && point.visible ? [{ place, x: width / 2 + side * point.x, y: height / 2 + side * point.y, buttonX: 0 }] : []
  }).sort((a, b) => a.x - b.x)
  // Separate close targets (Boston and New York) while leaving the geographic
  // anchor at its true location. A small stem connects each displaced target.
  for (let i = 0; i < pins.length; i++) {
    const pin = pins[i]
    pin.buttonX = pin.x
    for (const neighbor of pins.slice(0, i)) {
      if (Math.abs(neighbor.y - pin.y) < 38) pin.buttonX = Math.max(pin.buttonX, neighbor.buttonX + 38)
    }
  }
  const active = pins.find(pin => pin.place.id === atlas?.selected)
  const cardWidth = Math.min(250, Math.max(0, width - 16))
  const cardLeft = active ? Math.max(8, Math.min(active.buttonX - cardWidth / 2, width - cardWidth - 8)) : 0
  const nearby = pins.filter(pin => pin.buttonX >= cardLeft - 20 && pin.buttonX <= cardLeft + cardWidth + 20)
  const above = Math.min(...nearby.map(pin => pin.y)) - cardHeight - 19
  const below = Math.max(...nearby.map(pin => pin.y)) + 19
  const cardTop = above >= 8 || above > height - below - cardHeight ? above : below
  useEffect(() => {
    if (!card.current) return
    const observer = new ResizeObserver(() => setCardHeight(card.current?.offsetHeight ?? 96))
    observer.observe(card.current)
    return () => observer.disconnect()
  }, [active?.place.id])
  return <div id="place-map" ref={frame} className="place-map" role="group" aria-label="Locations on Earth" tabIndex={-1}>
    {pins.map(({ place, x, y, buttonX }) => <div className="place-anchor" key={place.id} style={{ left: x, top: y }}>
      {buttonX !== x && <span className="place-stem" style={{ width: buttonX - x }}/>}
      <Button size="sm" isIconOnly variant="borderless" data-place-pin="" style={{ left: buttonX - x }}
        aria-label={`${place.title}, ${place.location}`} aria-pressed={place.id === atlas?.selected}
        onClick={() => atlas?.select(place.id)}><span className="place-pin-dot" aria-hidden="true"/></Button>
    </div>)}
    {active && <div ref={card} className="place-callout" style={{ left: cardLeft, width: cardWidth, top: cardTop }}>
      {active.place.cover && <img className="place-cover" src={active.place.cover} alt="" width={54} height={54}/>}
      <div>
        <div className="place-title-row">
          {active.place.logo && <img className="employer-mark" src={active.place.logo} alt="" width={22} height={22}/>}
          <Link href={`#${active.place.id}`} data-place-title="" style={{ color: '#f5f5f7', fontSize: '1rem', fontWeight: 650 }} aria-label={`${active.place.action}: ${active.place.title}`}>{active.place.title}</Link>
        </div>
        {active.place.detail && <span>{active.place.detail}</span>}
        <span>{active.place.location} · {active.place.period}</span>
      </div>
    </div>}
  </div>
}
