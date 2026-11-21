'use client'

import { Link } from '@lenso/ui/link'
import { Modal } from '@lenso/ui/modal'
import { Select } from '@lenso/ui/select'
import Image from 'next/image'
import { createContext, useCallback, useContext, useLayoutEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react'
import { AlbumMap, type MappedPicture, type PhotoSpot } from './AlbumMap'
import type { Coordinates } from '@/earth/locations'
import { landmarks } from '@/content/albums/landmarks'

type Picture = MappedPicture & { location?: string }
type OpenPicture = (image: Picture, trigger: HTMLAnchorElement) => void
const PhotoContext = createContext<OpenPicture | null>(null)

export function AlbumPhoto({ src, alt = '', title, width, height, 'data-preview': preview, ...gps }: {
  src?: string, alt?: string, title?: string, width?: number, height?: number
  'data-latitude'?: number, 'data-longitude'?: number, 'data-preview'?: string
}) {
  const open = useContext(PhotoContext)
  if (!src) return null
  const ratio = width && height ? width / height : 1
  const point = title && landmarks[title] || (gps['data-latitude'] != null && gps['data-longitude'] != null
    ? { latitude: Number(gps['data-latitude']), longitude: Number(gps['data-longitude']) } : undefined)
  const name = title || (point ? alt || 'Photo location' : undefined)
  const locationKey = point && (title && landmarks[title] ? title : [point.latitude.toFixed(5), point.longitude.toFixed(5)].join(','))
  return <span className="photo-tile" data-location={name} data-location-key={locationKey} data-latitude={point?.latitude} data-longitude={point?.longitude}
    data-ratio={ratio} style={{ '--ratio': ratio } as CSSProperties}><Link href={src} data-photo-thumb=""
    style={{ position: 'absolute', inset: 0, display: 'block', inlineSize: '100%', blockSize: '100%' }} aria-label={`Open photo: ${alt}`}
    onClick={event => {
      if (!open || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return
      event.preventDefault()
      open({ src, alt, location: name }, event.currentTarget)
    }}>
    <Image src={src} alt={alt} fill loading="lazy" placeholder={preview ? 'blur' : 'empty'} blurDataURL={preview}
      sizes="auto, (max-width: 760px) 90vw, (max-width: 1100px) 44vw, 460px" />
  </Link></span>
}

// Choose row breaks together so a sparse final row cannot enlarge one portrait.
function arrangeRows(tiles: HTMLElement[], width: number, gap: number) {
  if (!width) return
  const targetHeight = Math.min(260, Math.max(135, width / 4))
  const ratios = tiles.map(tile => Number(tile.dataset.ratio))
  const cost = Array<number>(tiles.length + 1).fill(Infinity)
  const next = Array<number>(tiles.length)
  cost[tiles.length] = 0
  for (let start = tiles.length - 1; start >= 0; start--) {
    let sum = 0
    for (let end = start; end < tiles.length; end++) {
      sum += ratios[end]
      const height = (width - (end - start) * gap) / sum
      if (height <= 0) break
      const score = Math.log(height / targetHeight) ** 2 + cost[end + 1]
      if (score < cost[start]) {
        cost[start] = score
        next[start] = end + 1
      }
    }
  }
  for (let start = 0; start < tiles.length; start = next[start]) {
    const end = next[start]
    const available = width - (end - start - 1) * gap
    const height = available / ratios.slice(start, end).reduce((a, b) => a + b, 0)
    for (let i = start; i < end; i++) {
      // Round down for wrapping. Flex growth distributes the fractional remainder.
      tiles[i].style.flexBasis = Math.floor(height * ratios[i]) + 'px'
    }
  }
}

export function PhotoAlbum({ city, heading, children }: { city: Coordinates & { id: string, title: string }, heading: ReactNode, children: ReactNode }) {
  const [spots, setSpots] = useState<PhotoSpot[] | null>(null)
  const [selected, setSelected] = useState('')
  const [picture, setPicture] = useState<Picture | null>(null)
  const trigger = useRef<HTMLAnchorElement | null>(null)
  const grid = useRef<HTMLDivElement>(null)
  useLayoutEffect(() => {
    const groups = new Map<string, PhotoSpot>()
    for (const tile of grid.current?.querySelectorAll<HTMLElement>('.photo-tile[data-latitude][data-longitude]') ?? []) {
      const { location: name, locationKey: key, latitude, longitude } = tile.dataset
      const src = tile.querySelector('a')?.getAttribute('href')
      if (!name || !key || !src) continue
      const image = { src, alt: tile.querySelector('img')?.alt || name }
      const group = groups.get(key)
      if (group) group.pictures.push(image)
      else groups.set(key, { key, name, latitude: Number(latitude), longitude: Number(longitude), pictures: [image] })
    }
    setSpots([...groups.values()])
  }, [children])
  useLayoutEffect(() => {
    const element = grid.current
    if (!element) return
    const tiles = Array.from(element.querySelectorAll<HTMLElement>('.photo-tile')).filter(tile => {
      tile.hidden = !!selected && tile.dataset.locationKey !== selected
      return !tile.hidden
    })
    const gap = parseFloat(getComputedStyle(element).columnGap)
    let lastWidth = 0
    const layout = (width: number) => {
      if (width !== lastWidth) arrangeRows(tiles, width, gap)
      lastWidth = width
    }
    layout(element.getBoundingClientRect().width)
    const observer = new ResizeObserver(([entry]) => layout(entry.contentRect.width))
    observer.observe(element)
    return () => observer.disconnect()
  }, [children, selected])
  const open = useCallback<OpenPicture>((image, anchor) => { trigger.current = anchor; setPicture(image) }, [])
  const point = picture?.location ? landmarks[picture.location] : undefined
  const locations = [
    { value: '', label: 'All photos' },
    ...(spots ?? []).map(spot => ({ value: spot.key, label: `${spot.name} (${spot.pictures.length})` })),
  ]
  return <div className="photo-album">
    <header className="album-heading">{heading}</header>
    {spots && <AlbumMap city={city} spots={spots} selected={selected} onSelect={setSelected} onOpen={open}/>}
    <div className="album-collection">
      {spots && spots.length > 0 && <div className="album-location-filter">
        <div className="album-location-picker">
          <Select.Root items={locations} value={selected} onValueChange={value => setSelected(value ?? '')}>
            <Select.Label>Location</Select.Label>
            <Select.Trigger><Select.Value/><Select.Indicator/></Select.Trigger>
            <Select.Content>
              <Select.List>
                {locations.map(({ value, label }) => <Select.Item key={value} value={value}>
                  <Select.ItemIndicator/><Select.ItemText>{label}</Select.ItemText>
                </Select.Item>)}
              </Select.List>
            </Select.Content>
          </Select.Root>
        </div>
        {selected && <button className="album-location-reset" type="button" onClick={() => setSelected('')}>Show all photos</button>}
      </div>}
      <PhotoContext.Provider value={open}>
        <div className="album-grid" ref={grid}>{children}</div>
      </PhotoContext.Provider>
    </div>
    <Modal open={picture != null} onOpenChange={opened => { if (!opened) setPicture(null) }}>
      <Modal.Backdrop variant="blur"/>
      <Modal.Content size="lg" placement="center" data-photo-dialog="" finalFocus={() => trigger.current}>
        <Modal.Header><Modal.Title>{picture?.alt || city.title}</Modal.Title><Modal.Close aria-label="Close photo"/></Modal.Header>
        <Modal.Body>{picture && <img src={picture.src} alt={picture.alt}/>}
          {picture?.location && <p className="photo-location" data-latitude={point?.latitude} data-longitude={point?.longitude}>
            {picture.location}
          </p>}
        </Modal.Body>
      </Modal.Content>
    </Modal>
  </div>
}
