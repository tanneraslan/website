'use client'

import { useEffect, useLayoutEffect, useRef, useState, type CSSProperties } from 'react'
import { createPortal } from 'react-dom'
import { LiquidGlass } from './LiquidGlass'
import type { AlbumMapEngine } from './album-map-engine'
import { flightLandingView, inboundZoom, type Coordinates } from '@/earth/locations'
import { cloudFadeDuration, frameTravel, mapFlightDuration, FlightClouds, usePhotoFlight } from './PhotoFlight'
import 'ol/ol.css'
import './album-map.css'

export type MappedPicture = { src: string, alt: string }

export interface PhotoSpot extends Coordinates {
  key: string
  name: string
  pictures: MappedPicture[]
}

type City = Coordinates & { id: string, title: string }
export function AlbumMap({ city, spots, selected, onSelect, onOpen }: {
  city: City, spots: PhotoSpot[], selected: string, onSelect: (key: string) => void
  onOpen: (picture: MappedPicture & { location: string }, anchor: HTMLAnchorElement) => void
}) {
  const host = useRef<HTMLDivElement>(null)
  const slot = useRef<HTMLElement>(null)
  const trip = usePhotoFlight()
  const href = '/photos/' + city.id
  const mapCamera = trip?.mapCamera
  const flight = trip?.flight
  const departing = flight?.origin === href
  const landing = flight?.href === href
  const arrive = trip?.arrive
  const depart = trip?.depart
  const inFlight = Boolean(departing || landing)
  useLayoutEffect(() => {
    const frame = slot.current
    if (!frame || !inFlight) return
    // The slot stays in the layout while its clipped map surface flies. Scroll
    // and resize can change the resting frame during the cloud reveal.
    function measure() {
      if (!frame) return
      const rect = frame.getBoundingClientRect()
      frame.style.setProperty('--rest-inset', [
        rect.top, document.documentElement.clientWidth - rect.right,
        window.innerHeight - rect.bottom, rect.left,
      ].map(n => n + 'px').join(' '))
    }
    measure()
    const observer = new ResizeObserver(measure)
    observer.observe(frame)
    window.addEventListener('resize', measure)
    window.addEventListener('scroll', measure, { passive: true })
    return () => {
      observer.disconnect()
      window.removeEventListener('resize', measure)
      window.removeEventListener('scroll', measure)
    }
  }, [inFlight])
  const [engine, setEngine] = useState<AlbumMapEngine | null>(null)
  const spot = spots.find(item => item.key === selected)
  const beforeDeparture = useRef<{ center: number[], zoom: number } | null>(null)
  const [failed, setFailed] = useState(false)
  const [showMapTilerLogo, setShowMapTilerLogo] = useState(false)
  const { id, title, latitude, longitude } = city
  useEffect(() => {
    const el = host.current, frame = slot.current
    if (!el || !frame) return
    let disposed = false
    let instance: AlbumMapEngine | undefined
    setFailed(false)
    setEngine(null)
    void import('./album-map-engine').then(({ createAlbumMap }) => {
      if (disposed) return
      instance = createAlbumMap(el, frame, { id, title, latitude, longitude }, spots, onSelect,
        () => arrive?.(href), setFailed, setShowMapTilerLogo)
      setEngine(instance)
    }).catch(() => { if (!disposed) { setFailed(true); arrive?.(href) } })
    return () => { disposed = true; instance?.dispose() }
  }, [id, title, latitude, longitude, spots, href, arrive, onSelect])

  useEffect(() => {
    if (!engine || !depart || inFlight) return
    const { view } = engine
    let lastZoom = view.getZoom()!
    let sampledAt = performance.now(), rate = 0, returning = false
    const finish = (zoom: number) => {
      // Fractional wheel steps can settle just above the two-level boundary.
      if (returning || !Number.isFinite(zoom) || zoom > Math.max(view.getMinZoom(), engine.overviewZoom - 2) + 0.01) return
      returning = true
      const [lng, lat] = engine.toLonLat(view.getCenter()!)
      const now = performance.now()
      depart({ latitude, longitude, href: '/photos' }, { latitude: lat, longitude: lng, zoom, sampledAt: now,
        zoomRate: Math.min(0, rate) * Math.exp(-Math.max(0, now - sampledAt - 50) / 150) })
    }
    const sample = () => {
      const now = performance.now(), zoom = view.getZoom()!
      if (zoom === lastZoom) return
      const elapsed = now - sampledAt
      const speed = (zoom - lastZoom) / Math.max(8, Math.min(120, elapsed))
      rate = elapsed <= 160 && Math.sign(speed) === Math.sign(rate) ? rate * 0.35 + speed * 0.65 : speed
      lastZoom = zoom
      sampledAt = now
      if (speed < 0) finish(zoom)
    }
    // At the map's minimum zoom another outward wheel step has no resolution event.
    const wheel = (event: WheelEvent) => { if (event.deltaY > 0) finish(view.getZoom()!) }
    const viewport = engine.map.getViewport()
    view.on('change:resolution', sample)
    viewport?.addEventListener('wheel', wheel, { passive: true })
    return () => {
      view.un('change:resolution', sample)
      viewport?.removeEventListener('wheel', wheel)
    }
  }, [engine, depart, inFlight, latitude, longitude])

  // Take over the globe's current scale, then feed each animated map pose
  // back to WebGL so both layers keep moving while the clouds clear.
  const startedAt = flight?.startedAt
  const takeoff = flight?.takeoff
  useLayoutEffect(() => {
    if (!engine) return
    const { view, map } = engine
    const sync = () => {
      if (!mapCamera) return
      const [lng, lat] = engine.toLonLat(view.getCenter()!)
      const zoom = view.getZoom()!, sampledAt = performance.now()
      const previous = mapCamera.current
      if (previous?.zoom === zoom && previous.latitude === lat && previous.longitude === lng) return
      const dt = previous ? sampledAt - previous.sampledAt : 0
      const zoomRate = previous && dt >= 3 ? (zoom - previous.zoom) / dt : previous?.zoomRate ?? 0
      mapCamera.current = { latitude: lat, longitude: lng, zoom, sampledAt, zoomRate }
    }
    if (departing && startedAt != null) {
      const frame = document.querySelector('.observatory[data-map-clouds] .earth-frame')
      if (!frame) return
      view.cancelAnimations()
      beforeDeparture.current ??= { center: view.getCenter()!, zoom: view.getZoom()! }
      map.on('postrender', sync)
      if (takeoff && mapCamera) {
        mapCamera.current = takeoff
        const landing = flightLandingView(takeoff.latitude, frame.getBoundingClientRect().height)
        const endZoom = Math.max(view.getMinZoom(), Math.min(landing.zoom - 2, takeoff.zoom - 1))
        const distance = endZoom - takeoff.zoom
        // Match the gesture velocity at entry and retain outward speed for the globe handoff.
        // Limit the initial tangent so a fast wheel flick cannot overshoot and reverse.
        const tangent = Math.max(3 * distance, Math.min(0, takeoff.zoomRate * mapFlightDuration))
        let raf = 0
        const advance = (now: number) => {
          const t = Math.min(1, (now - startedAt) / mapFlightDuration)
          const zoom = takeoff.zoom + t * distance + (tangent - distance) * t * (1 - t) ** 2
          view.setZoom(zoom)
          if (t < 1) raf = requestAnimationFrame(advance)
        }
        view.setCenter(engine.fromLonLat([takeoff.longitude, takeoff.latitude]))
        raf = requestAnimationFrame(advance)
        return () => {
          cancelAnimationFrame(raf)
          map.un('postrender', sync)
          mapCamera.current = null
        }
      }
      sync()
      const align = () => {
        const { zoom } = flightLandingView(latitude, frame.getBoundingClientRect().height)
        // Aim beyond the handoff so the map still has outward velocity
        // when the globe takes over.
        const duration = Math.max(0.1, (startedAt + mapFlightDuration + 520 - performance.now()) / 1000)
        engine.focus(engine.fromLonLat([longitude, latitude]), Math.min(zoom - 2, view.getZoom()! - 1), duration * 1000)
      }
      align()
      window.addEventListener('resize', align)
      return () => {
        map.un('postrender', sync)
        if (mapCamera) mapCamera.current = null
        window.removeEventListener('resize', align)
      }
    }
    if (beforeDeparture.current) {
      const { center, zoom } = beforeDeparture.current
      beforeDeparture.current = null
      view.cancelAnimations()
      view.setCenter(center)
      view.setZoom(zoom)
    }
    if (!landing || startedAt == null || !mapCamera) return
    const frame = document.querySelector('.observatory[data-map-clouds] .earth-frame')
    if (!frame) return
    const entry = flightLandingView(latitude, frame.getBoundingClientRect().height)
    view.setCenter(engine.fromLonLat([longitude, latitude]))
    view.setZoom(inboundZoom(entry, performance.now() - startedAt))
    map.on('postrender', sync)
    sync()
    engine.overview(cloudFadeDuration + frameTravel + 450)
    return () => {
      map.un('postrender', sync)
      mapCamera.current = null
    }
  }, [departing, landing, startedAt, takeoff, latitude, longitude, engine, mapCamera])

  const lastSelection = useRef('')
  useEffect(() => {
    if (!engine) return
    engine.select(selected)
    if (spot) engine.focus(engine.fromLonLat([spot.longitude, spot.latitude]), Math.max(engine.view.getZoom()!, engine.photoDetailZoom), 650)
    else if (lastSelection.current) engine.overview(650)
    lastSelection.current = selected
  }, [engine, selected, spot])
  return <section ref={slot} className="album-map" style={{ '--frame-travel': frameTravel + 'ms', '--settle-delay': cloudFadeDuration + 'ms' } as CSSProperties} data-flight={departing ? 'departing' : landing ? (flight.revealAt === null ? 'covered' : 'arriving') : undefined} aria-label={title + ' photo map'}>
    <div className="album-map-viewport">
      <div className="album-map-canvas" inert={inFlight || undefined} ref={host} tabIndex={0} aria-label={'Map of ' + title}/>
      <FlightClouds/>
      {showMapTilerLogo && <a className="maptiler-credit" href="https://www.maptiler.com/"><img src="https://api.maptiler.com/resources/logo.svg" width="90" alt="MapTiler"/></a>}
    </div>
    {spot && engine && createPortal(<div className="spot-preview">
      <LiquidGlass decorative className="spot-preview-glass"/>
      <strong>{spot.name}</strong>
      <div className="spot-preview-strip">{spot.pictures.map((picture, i) =>
        <a key={picture.src + i} href={picture.src} aria-label={'Open ' + picture.alt} onClick={event => {
          if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return
          event.preventDefault()
          onOpen({ ...picture, location: spot.name }, event.currentTarget)
        }}><img alt={picture.alt} src={'/_next/image?url=' + encodeURIComponent(picture.src) + '&w=128&q=75'}/></a>)}</div>
    </div>, engine.popupHost)}
    {failed && <p className="map-status" role="status">Detailed map imagery is unavailable.</p>}
  </section>
}
