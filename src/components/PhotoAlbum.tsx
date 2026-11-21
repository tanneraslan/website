'use client'

import { Link } from '@lenso/ui/link'
import { Modal } from '@lenso/ui/modal'
import Image from 'next/image'
import { createContext, useContext, useMemo, useRef, useState, type ReactNode } from 'react'
import { PlaceLink } from './PlaceAtlas'

type Picture = { src: string, alt: string }
type OpenPicture = (image: Picture, trigger: HTMLAnchorElement) => void
const PhotoContext = createContext<OpenPicture | null>(null)

export function AlbumPhoto({ src, alt = '', width, height }: { src?: string, alt?: string, width?: number, height?: number }) {
  const open = useContext(PhotoContext)
  if (!src) return null
  const ratio = width && height ? width / height : 1
  const shape = ratio < 0.85 ? 'portrait' : ratio > 2 ? 'panorama' : ratio > 1.25 ? 'landscape' : 'square'
  return <span className="photo-tile" data-shape={shape}><Link href={src} data-photo-thumb=""
    style={{ position: 'absolute', inset: 0, display: 'block', inlineSize: '100%', blockSize: '100%' }} aria-label={`Open photo: ${alt}`}
    onClick={event => {
      if (!open || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return
      event.preventDefault()
      open({ src, alt }, event.currentTarget)
    }}>
    <Image src={src} alt={alt} fill sizes="auto, (max-width: 760px) 90vw, (max-width: 1100px) 44vw, 480px" />
  </Link></span>
}

export function PhotoAlbum({ id, city, region, period, coordinates, cover, story, children }: {
  id: string, city: string, region: string, period: string, coordinates: [number, number],
  cover: string, story?: string, children: ReactNode
}) {
  const [latitude, longitude] = coordinates
  const place = useMemo(() => ({ id, title: city, location: region, detail: '', latitude, longitude, period,
    action: 'View album', cover }), [id, city, region, latitude, longitude, period, cover])
  const [picture, setPicture] = useState<Picture | null>(null)
  const trigger = useRef<HTMLAnchorElement | null>(null)
  return <section className="photo-album" id={id} aria-labelledby={id + '-title'}>
    <h2 id={id + '-title'}>{city}</h2>
    <div className="album-meta"><span className="album-date">{period}</span><PlaceLink place={place}/>
      {story && <Link href={story}>Read the trip journal</Link>}
    </div>
    <PhotoContext.Provider value={(image, anchor) => { trigger.current = anchor; setPicture(image) }}>
      <div className="album-grid">{children}</div>
    </PhotoContext.Provider>
    <Modal open={picture != null} onOpenChange={opened => { if (!opened) setPicture(null) }}>
      <Modal.Backdrop variant="blur"/>
      <Modal.Content size="lg" placement="center" data-photo-dialog="" finalFocus={() => trigger.current}>
        <Modal.Header><Modal.Title>{picture?.alt || city}</Modal.Title><Modal.Close aria-label="Close photo"/></Modal.Header>
        <Modal.Body>{picture && <img src={picture.src} alt={picture.alt}/>}</Modal.Body>
      </Modal.Content>
    </Modal>
  </section>
}
