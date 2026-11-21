'use client'

import { useLayoutEffect, useRef, useState } from 'react'
import { Button } from '@lenso/ui/button'
import { Icon } from './Icon'
import { LiquidGlass } from './LiquidGlass'
import { PhotoDestinationLink } from './PhotoFlight'
import { animatePins, newPinBody } from './pin-layout'
import type { MapPlace } from './PlaceAtlas'

export interface GlobePin {
  place: MapPlace
  x: number
  y: number
  reveal: number
}

const collisionPadding = 11
const cardInset = 8
type CardBounds = { left: number; right: number; top: number; bottom: number }

export function GlobePins({ pins, width, height, selected, onSelect }: {
  pins: GlobePin[]; width: number; height: number; selected?: string | null; onSelect?: (id: string) => void
}) {
  const [cardBounds, setCardBounds] = useState<CardBounds | null>(null)
  const [cardHeight, setCardHeight] = useState(96)
  const [hovered, setHovered] = useState<string | null>(null)
  const [focused, setFocused] = useState<string | null>(null)
  const layer = useRef<HTMLDivElement>(null)
  const bodies = useRef(new Map<string, ReturnType<typeof newPinBody>>())
  const lastStep = useRef(0)
  const [positions, setPositions] = useState<Record<string, { dx: number; dy: number; reveal: number }>>({})

  useLayoutEffect(() => {
    const root = layer.current
    if (!root || !pins.length) return
    const badges = pins.filter(pin => pin.reveal > 0)
    const active = new Map(badges.map(({ place }) => [place.id, bodies.current.get(place.id) ?? newPinBody()]))
    bodies.current = active
    if (!badges.length) return
    const nodes = badges.map(pin => ({
      pin, body: active.get(pin.place.id)!, radius: pin.place.href ? 22 : 24, centerY: 0,
    }))
    const publish = () => setPositions(Object.fromEntries(nodes.map(({ pin, body }) =>
      [pin.place.id, { dx: body.shownX, dy: body.shownY, reveal: body.reveal }])))
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)')
    let stop: () => void = () => {}
    const settle = () => {
      stop()
      // Use the rendered artwork so collision circles follow the responsive pin sizes.
      for (const node of nodes) {
        const anchor = root.querySelector<HTMLElement>(`[data-globe-pin-id="${CSS.escape(node.pin.place.id)}"]`)
        const badge = anchor?.querySelector<HTMLElement>('.landmark-badge')
        const image = badge?.querySelector('img')
        if (!image?.offsetHeight || !anchor || !badge) continue
        node.centerY = badge.getBoundingClientRect().top - anchor.getBoundingClientRect().top + image.offsetTop + image.offsetHeight / 2
        node.radius = Math.max(22, image.offsetHeight / 2 + collisionPadding)
      }
      stop = animatePins(nodes, width, height, lastStep, publish)
    }
    const observer = new ResizeObserver(settle)
    root.querySelectorAll('img').forEach(image => observer.observe(image))
    reduced.addEventListener('change', settle)
    settle()
    return () => {
      observer.disconnect()
      reduced.removeEventListener('change', settle)
      stop()
    }
  }, [pins, width, height])

  const placed = pins.map(pin => {
    if (pin.reveal === 0) return { ...pin, left: pin.x, top: pin.y, size: 0 }
    const { dx, dy, reveal: size } = positions[pin.place.id] ?? { dx: 0, dy: 0, reveal: 0 }
    return { ...pin, left: pin.x + dx, top: pin.y + dy, size }
  }).sort((a, b) => a.top - b.top)

  const active = placed.find(pin => !pin.place.href && pin.place.id === selected)
  const hasActiveCard = Boolean(active)
  useLayoutEffect(() => {
    if (!hasActiveCard) return
    const map = layer.current?.closest<HTMLElement>('.place-map')
    const frame = map?.closest<HTMLElement>('.earth-frame')
    if (!map || !frame) return
    const site = frame.closest('.site')
    const header = site?.querySelector<HTMLElement>('.masthead')
    const dock = site?.querySelector<HTMLElement>('.mobile-dock')
    const viewport = window.visualViewport
    const measure = () => {
      const rect = map.getBoundingClientRect()
      const viewportLeft = viewport?.offsetLeft ?? 0
      const viewportTop = viewport?.offsetTop ?? 0
      const viewportRight = viewportLeft + (viewport?.width ?? document.documentElement.clientWidth)
      const viewportBottom = viewportTop + (viewport?.height ?? window.innerHeight)
      // Reserve the header’s resting position during its slide-in animation.
      const navBottom = header?.offsetHeight && header.hasAttribute('data-floating')
        ? header.offsetTop + header.offsetHeight : header?.getBoundingClientRect().bottom ?? 0
      const tabs = dock?.getBoundingClientRect()
      // The map extends beyond the globe for zooming. Convert the usable
      // viewport into the same local coordinates as its projected pins.
      const left = Math.max(rect.left, viewportLeft) - rect.left
      const right = Math.min(rect.right, viewportRight) - rect.left
      const top = Math.max(rect.top, viewportTop, navBottom) - rect.top
      const bottom = Math.min(rect.bottom, viewportBottom, tabs?.height ? tabs.top : Infinity) - rect.top
      setCardBounds(old => old?.left === left && old.right === right && old.top === top && old.bottom === bottom
        ? old : { left, right, top, bottom })
    }
    const resize = new ResizeObserver(measure)
    for (const element of [map, frame, header, dock]) if (element) resize.observe(element)
    const mutation = new MutationObserver(measure)
    mutation.observe(frame, { attributes: true, attributeFilter: ['style'] })
    if (header) mutation.observe(header, { attributes: true, attributeFilter: ['data-floating'] })
    window.addEventListener('scroll', measure, { passive: true })
    window.addEventListener('resize', measure)
    viewport?.addEventListener('resize', measure)
    viewport?.addEventListener('scroll', measure)
    measure()
    return () => {
      resize.disconnect()
      mutation.disconnect()
      window.removeEventListener('scroll', measure)
      window.removeEventListener('resize', measure)
      viewport?.removeEventListener('resize', measure)
      viewport?.removeEventListener('scroll', measure)
    }
  }, [hasActiveCard])

  let cardStyle
  // Test the geographic origin before applying the card's edge padding.
  if (active && cardBounds &&
    active.x >= cardBounds.left && active.x < cardBounds.right &&
    active.y >= cardBounds.top && active.y < cardBounds.bottom) {
    const left = cardBounds.left + cardInset, right = cardBounds.right - cardInset
    const top = cardBounds.top + cardInset, bottom = cardBounds.bottom - cardInset
    const width = Math.min(296, right - left)
    const maxHeight = bottom - top
    if (width > 0 && maxHeight > 0) {
      const x = Math.max(left, Math.min(active.left - width / 2, right - width))
      const nearby = placed.filter(pin => pin.left >= x - 20 && pin.left <= x + width + 20)
      const height = Math.min(cardHeight, maxHeight)
      const above = Math.min(active.top, ...nearby.map(pin => pin.top)) - 19 - height
      const below = Math.max(active.top, ...nearby.map(pin => pin.top)) + 19
      let preferred = above
      if (above < top) {
        preferred = below
        if (below + height > bottom) {
          const moreRoomAbove = active.top - top >= bottom - active.top
          preferred = moreRoomAbove ? active.top - 19 - height : active.top + 19
        }
      }
      cardStyle = { left: x, top: Math.max(top, Math.min(preferred, bottom - height)), width, maxHeight }
    }
  }
  return <div ref={layer}>
    <svg className="album-leaders" aria-hidden="true">
      {placed.filter(pin => pin.size > 0).map(({ place, x, y, left, top, size }) =>
        <line key={place.id} x1={x} y1={y} x2={left} y2={top} opacity={size}/>)}
      {placed.map(({ place, x, y, size }) => place.href
        ? <circle key={place.id} className="city-location-dot" cx={x} cy={y} r="4.25"/>
        : <circle key={place.id} cx={x} cy={y} r="2" opacity={size}/>)}
    </svg>
    {placed.map(({ place, x, y, left, top, reveal, size }) => <div className="place-anchor" data-globe-pin-id={place.id} data-album-id={place.href ? place.id : undefined} key={place.id} style={{ left, top }}>
      {place.href ? <PhotoDestinationLink place={{ ...place, href: place.href }} className="album-pin" data-place-pin="" aria-label={`View ${place.title} photos`}
        onPointerEnter={event => { if (event.pointerType !== 'touch') setHovered(place.id) }}
        onPointerLeave={() => setHovered(null)}
        onFocus={event => { if (event.currentTarget.matches(':focus-visible')) setFocused(place.id) }}
        onBlur={() => setFocused(null)}>
        {reveal > 0 && place.pinImage && <div className="landmark-badge"><div className="landmark-art" style={{ transform: `scale(${size})`, opacity: size >= .99 ? 1 : size }}>
          <img src={place.pinImage} alt="" width="192" height="167"/>
        </div></div>}
        {Math.hypot(left - x, top - y) > 5 && <span className="place-pin-dot" style={{ opacity: size }}/>}
        {reveal > 0 && (hovered ?? focused) === place.id &&
          <LiquidGlass className="home-location-label pin-label">{place.title}</LiquidGlass>}
      </PhotoDestinationLink> : <Button size="sm" isIconOnly variant="borderless" data-place-pin=""
        aria-label={`${place.title}, ${place.location}`} aria-pressed={place.id === selected}
        onClick={() => onSelect?.(place.id)}><span className="place-pin-dot" aria-hidden="true"/></Button>}
    </div>)}
    {active && cardStyle && <LiquidGlass onHeightChange={setCardHeight} className="place-callout" style={cardStyle}>
      <a className="experience-link" href={`#${active.place.id}`} aria-label={`${active.place.action}: ${active.place.title}, ${active.place.location}`}>
        <span className="experience-city"><Icon name="pin"/>{active.place.location}<Icon name="arrow"/></span>
        <span className="experience-body">
          {active.place.logo && <img className="experience-logo" src={active.place.logo} alt="" width="36" height="36"/>}
          <span className="experience-text">
            <strong>{active.place.title}</strong>
            {active.place.detail && <span>{active.place.detail}</span>}
            <small>{active.place.period}</small>
          </span>
        </span>
      </a>
    </LiquidGlass>}
  </div>
}
