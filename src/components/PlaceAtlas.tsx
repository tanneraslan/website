'use client'

import { PhotoDestinationLink, PhotoFlightProvider, cloudFadeDuration, frameTravel, globeFlightDuration, mapFlightDuration, returnOrbitTail, usePhotoFlight } from './PhotoFlight'
import { Link } from '@lenso/ui/link'
import { createContext, useCallback, useContext, useEffect, useLayoutEffect, useMemo, useRef, useState, type CSSProperties, type ReactNode, type RefObject } from 'react'
import { flightCloudOpacity, globeDiameterFraction, maxOrbitZoom, orbitAngles, projectPlace, type Coordinates } from '@/earth/locations'
import type { EarthController, EarthPose } from '@/earth'
import { GlobePins, type GlobePin } from './GlobePins'
import './places.css'

export interface MapPlace extends Coordinates {
  id: string
  title: string
  location: string
  detail: string
  period: string
  action: string
  logo?: string
  href?: string
  pinImage?: string
  cover?: string
}

interface Atlas {
  places: MapPlace[]
  register: (place: MapPlace) => () => void
}

const AtlasContext = createContext<Atlas | null>(null)
const minBadgeViewCosine = Math.cos(75 * Math.PI / 180)
const fullBadgeViewCosine = Math.cos(65 * Math.PI / 180)

export function PlaceAtlasProvider({ children }: { children: ReactNode }) {
  const [places, setPlaces] = useState<MapPlace[]>([])
  const register = useCallback((place: MapPlace) => {
    setPlaces(current => [...current.filter(other => other.id !== place.id), place])
    return () => { setPlaces(current => current.filter(other => other !== place)) }
  }, [])
  const value = useMemo(() => ({ places, register }), [places, register])
  return <AtlasContext.Provider value={value}><PhotoFlightProvider>{children}</PhotoFlightProvider></AtlasContext.Provider>
}

// This link doubles as the map registration. The page's editorial metadata is
// the sole source for both the location link and the projected place card.
export function PlaceLink({ place }: { place: MapPlace }) {
  const atlas = useContext(AtlasContext)
  const register = atlas?.register
  useEffect(() => register?.(place), [place, register])
  if (place.href) return <PhotoDestinationLink place={{ ...place, href: place.href }}>
    {place.pinImage && <img src={place.pinImage} width="36" height="36" alt="" loading="lazy"/>}
    <span>{place.title}<small>{place.location}</small></span>
  </PhotoDestinationLink>
  return <Link href="#place-map" data-place-link="" aria-label={`Show ${place.location} on the globe`}
    onClick={event => {
      if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return
      const pin = document.getElementById(`job-pin-${place.id}`)
      if (pin) {
        event.preventDefault()
        pin.focus()
      }
    }}>{place.location}</Link>
}

export function GlobePlaces({ scene, pose, live, overMap }: {
  scene: RefObject<EarthController | null>
  pose: EarthPose
  live: boolean
  overMap: boolean
}) {
  const atlas = useContext(AtlasContext)
  const trip = usePhotoFlight()
  const flight = trip?.flight
  const arrive = trip?.arrive
  const mapCamera = trip?.mapCamera
  const frame = useRef<HTMLDivElement>(null)
  const returning = flight?.href === '/photos'
  useLayoutEffect(() => {
    if (overMap || !returning || flight?.revealAt !== null) return
    // A cold WebGL context can take longer than the flight. The geographic
    // poster follows the same clock until the first live frame is available.
    let active = true
    const poster = frame.current?.parentElement?.querySelector<HTMLImageElement>('.planet-poster')
    const ready = () => { if (active) arrive?.('/photos') }
    if (live || !poster) ready()
    else void poster.decode().then(ready, ready)
    return () => { active = false }
  }, [overMap, returning, flight?.revealAt, live, arrive])
  useLayoutEffect(() => {
    if (!flight || !frame.current) return
    // Count back to orbit on the same clock across the album route change.
    const start = returning ? flight.startedAt + mapFlightDuration + returnOrbitTail - globeFlightDuration : flight.startedAt
    const controller = live ? scene.current : null
    const earth = frame.current.parentElement
    if (!earth) return
    const onCloudOpacity = (opacity: number, shaderReady = false) => {
      earth.style.setProperty('--globe-cloud-opacity', String(opacity))
      earth.toggleAttribute('data-live-clouds', shaderReady)
    }
    const mapReveal = overMap && (returning || flight.revealAt !== null) ? {
      start: returning ? flight.startedAt + frameTravel + 50 : flight.revealAt!,
      duration: cloudFadeDuration, returning,
    } : undefined
    controller?.flyToPlace(flight, { start, duration: globeFlightDuration, returning, releaseMapAt: flight.startedAt + mapFlightDuration - 80, mapCamera, mapReveal, onCloudOpacity })
    const point = projectPlace(flight, orbitAngles(1))
    const poster = earth.querySelector<HTMLElement>('.planet-poster')
    const fallback = poster?.animate([
      { transform: 'scale(1)' },
      { transform: `scale(15) translate(${-point.x * 100}%, ${-point.y * 100}%)` },
    ], { duration: globeFlightDuration, direction: returning ? 'reverse' : 'normal', fill: 'both', easing: 'ease-in-out' })
    if (fallback) fallback.currentTime = Math.max(0, performance.now() - start)
    let raf = 0
    if (!controller && poster) {
      const update = () => {
        const rect = poster.getBoundingClientRect()
        const elapsed = Math.min(1, Math.max(0, (performance.now() - start) / globeFlightDuration))
        onCloudOpacity(flightCloudOpacity(rect.width * globeDiameterFraction / 2, rect.left + rect.width / 2,
          rect.top + rect.height / 2, document.documentElement.clientWidth, window.innerHeight, returning ? 1 - elapsed : elapsed))
        if (elapsed < 1) raf = requestAnimationFrame(update)
      }
      update()
    }
    return () => {
      cancelAnimationFrame(raf)
      controller?.flyToPlace(null)
      fallback?.cancel()
      earth.style.removeProperty('--globe-cloud-opacity')
      earth.removeAttribute('data-live-clouds')
    }
  }, [flight, overMap, returning, live, scene, mapCamera])
  const [dimensions, setDimensions] = useState({ width: 0, height: 0, side: 0 })
  const [view, setView] = useState(() => orbitAngles(pose === 'experience' ? 1 : 0))
  useEffect(() => {
    if (live && scene.current) return scene.current.observeOrbit(setView)
    setView(orbitAngles(pose === 'experience' ? 1 : 0))
  }, [live, pose, scene])
  useEffect(() => {
    const map = frame.current
    const earth = map?.closest<HTMLElement>('.earth-frame')
    if (!map || !earth) return
    const observer = new ResizeObserver(() => {
      setDimensions({ width: map.clientWidth, height: map.clientHeight, side: Math.min(earth.clientWidth, earth.clientHeight) })
    })
    observer.observe(map)
    observer.observe(earth)
    return () => observer.disconnect()
  }, [])
  const { width, height, side } = dimensions
  const places = atlas?.places
  const pins = useMemo(() => {
    const visible: GlobePin[] = []
    for (const place of places ?? []) {
      const point = projectPlace(place, view)
      if (!side || !point.visible) continue
      const x = width / 2 + side * point.x, y = height / 2 + side * point.y
      if (x < 0 || y < 0 || x > width || y > height) continue
      if (place.href) {
        const t = Math.max(0, Math.min(1, (point.viewCosine - minBadgeViewCosine) / (fullBadgeViewCosine - minBadgeViewCosine)))
        visible.push({ place, x, y, reveal: t * t * (3 - 2 * t) })
      } else visible.push({ place, x, y, reveal: 1 })
    }
    return visible
  }, [places, view, side, width, height])
  return <div id="place-map" ref={frame} className="place-map" style={{ '--orbit-extent': maxOrbitZoom } as CSSProperties}
    data-flying={flight ? true : undefined} role="group" aria-label="Locations on Earth" tabIndex={-1}>
    <GlobePins pins={pins} width={width} height={height}/>
  </div>
}
