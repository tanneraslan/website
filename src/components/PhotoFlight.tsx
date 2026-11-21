'use client'

import { warmFlightImagery } from '@/earth/flight-imagery'
import NextLink from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { createContext, useCallback, useContext, useEffect, useLayoutEffect, useRef, useState, type ComponentProps, type CSSProperties, type ReactNode } from 'react'
import type { Coordinates, FlightMapView } from '@/earth/locations'

type Destination = Coordinates & { href: string }
type Flight = Destination & { origin: string, startedAt: number, revealAt: number | null, takeoff?: FlightMapView }
export const globeFlightDuration = 1750
// Mount the destination and request its tiles during the globe descent.
const albumRouteAt = 920
const earliestSatelliteAt = 1120
export const cloudFadeDuration = 680
export const frameTravel = 720
export const mapFlightDuration = frameTravel + cloudFadeDuration + 70
export const returnOrbitTail = 1180
const durationFor = (path: string) => path === '/photos' ? globeFlightDuration : mapFlightDuration
const FlightContext = createContext<{
  flight: Flight | null
  mapCamera: { current: FlightMapView | null }
  depart: (place: Destination, takeoff?: FlightMapView) => void
  rememberAlbum: (href: string, place: Coordinates) => void
  arrive: (href: string) => void
} | null>(null)
export const usePhotoFlight = () => useContext(FlightContext)

export function PhotoFlightProvider({ children }: { children: ReactNode }) {
  const [flight, setFlight] = useState<Flight | null>(null)
  const path = usePathname()
  const router = useRouter()
  const mapCamera = useRef<FlightMapView | null>(null)
  const albums = useRef(new Map<string, Coordinates>())
  const rememberAlbum = useCallback((href: string, place: Coordinates) => { albums.current.set(href, place) }, [])
  const previousPath = useRef(path)
  useLayoutEffect(() => {
    const origin = previousPath.current
    previousPath.current = path
    if (origin === path) return
    const city = path === '/photos' ? albums.current.get(origin) : origin === '/photos' ? albums.current.get(path) : null
    const motion = !matchMedia('(prefers-reduced-motion: reduce)').matches
    const startedAt = performance.now()
    // For browser history the route has already changed. Animate only the
    // incoming scene, without adding another entry to the history stack.
    setFlight(current => current?.href === path ? current : city && motion
      ? { ...city, origin, href: path, startedAt: startedAt - (path === '/photos' ? mapFlightDuration : albumRouteAt), revealAt: null } : null)
  }, [path])
  const depart = useCallback((place: Destination, takeoff?: FlightMapView) => {
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) {
      router.push(place.href)
      return
    }
    const frame = document.querySelector('.photos .earth-frame')
    if (frame) warmFlightImagery(place, frame.getBoundingClientRect().height)
    router.prefetch(place.href)
    setFlight({ ...place, origin: path, startedAt: performance.now(), revealAt: null, takeoff })
  }, [path, router])
  const arrive = useCallback((href: string) => {
    const now = performance.now()
    setFlight(f => f?.href === href && f.revealAt === null ? { ...f, revealAt: f.origin === '/photos' ? Math.max(now, f.startedAt + earliestSatelliteAt) : now } : f)
  }, [])
  useEffect(() => {
    if (!flight) return
    let timer: ReturnType<typeof setTimeout>
    if (path === flight.origin) {
      timer = setTimeout(() => router.push(flight.href), Math.max(0, (path === '/photos' ? albumRouteAt : durationFor(path)) - (performance.now() - flight.startedAt)))
    } else if (path === flight.href) {
      timer = flight.revealAt === null
        ? setTimeout(() => arrive(path), 2400)
        : setTimeout(() => setFlight(null), Math.max(0, (path === '/photos' ? flight.startedAt + mapFlightDuration + returnOrbitTail : flight.revealAt + durationFor(path)) - performance.now()))
    } else {
      setFlight(null)
    }
    return () => clearTimeout(timer)
  }, [path, flight, router, arrive])
  useEffect(() => {
    if (!flight || path !== flight.origin) return
    const cancel = (e: KeyboardEvent) => { if (e.key === 'Escape') setFlight(null) }
    window.addEventListener('keydown', cancel)
    return () => window.removeEventListener('keydown', cancel)
  }, [flight, path])
  return <FlightContext.Provider value={{ flight, mapCamera, arrive, depart, rememberAlbum }}>
    {children}
  </FlightContext.Provider>
}

export function FlightClouds() {
  const flight = usePhotoFlight()?.flight
  const path = usePathname()
  if (!flight) return null
  return <div key={flight.startedAt} aria-hidden="true" className="flight-clouds"
    style={{ '--cloud-fade-duration': cloudFadeDuration + 'ms',
      '--cloud-fade-delay': (durationFor(flight.origin) - cloudFadeDuration - 20) + 'ms' } as CSSProperties}
    data-direction={flight.href === '/photos' ? 'out' : 'in'}
    data-phase={flight.revealAt !== null ? 'arriving' : path === flight.href ? 'covered' : 'departing'}/>
}

export function PhotoDestinationLink({ place, ...props }: Omit<ComponentProps<typeof NextLink>, 'href'> & { place: Destination }) {
  const trip = usePhotoFlight()
  const path = usePathname()
  const rememberAlbum = trip?.rememberAlbum
  const { href, latitude, longitude } = place
  useEffect(() => {
    rememberAlbum?.(href === '/photos' ? path : href, { latitude, longitude })
  }, [path, href, latitude, longitude, rememberAlbum])
  return <NextLink prefetch={false} {...props} href={place.href} onNavigate={event => {
    if (!trip || matchMedia('(prefers-reduced-motion: reduce)').matches) return
    event.preventDefault()
    if (!trip.flight || trip.flight.revealAt !== null) trip.depart(place)
  }}/>
}
