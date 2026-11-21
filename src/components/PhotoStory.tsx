import { useLayoutEffect, useRef } from 'react'
import type { MappedPicture } from './AlbumMap'

export type AlbumPicture = MappedPicture & { location?: string }

export function PhotoStory({ city, picture, index, total, navigate, onClose }: {
  city: string, picture: AlbumPicture, index: number, total: number, navigate: (delta: number) => void, onClose: () => void
}) {
  const dialog = useRef<HTMLDialogElement>(null)
  const press = useRef<{ x: number, y: number, id: number } | null>(null)
  useLayoutEffect(() => {
    const el = dialog.current!
    el.showModal()
    return () => el.close()
  }, [])

  return <dialog ref={dialog} className="album-story" aria-label={city + ' photo viewer'}
    onCancel={event => { event.preventDefault(); onClose() }}
    onKeyDown={event => {
      if (event.key === 'ArrowRight' || event.key === 'ArrowLeft') {
        event.preventDefault()
        navigate(event.key === 'ArrowRight' ? 1 : -1)
      }
    }}>
    <div className="story-top">
      <div className="story-track" aria-hidden="true"><span style={{ width: ((index + 1) / total * 100) + '%' }}/></div>
      <div className="story-heading"><strong>{city}</strong><span aria-live="polite">{index + 1} / {total}</span>
        <button type="button" onClick={onClose} aria-label="Close photo">×</button>
      </div>
    </div>
    <div className="story-frame" onPointerDown={event => {
      if (!event.isPrimary || event.button !== 0) return
      press.current = { x: event.clientX, y: event.clientY, id: event.pointerId }
      event.currentTarget.setPointerCapture(event.pointerId)
    }} onPointerCancel={() => { press.current = null }} onPointerUp={event => {
      const start = press.current
      press.current = null
      if (!start || start.id !== event.pointerId) return
      const dx = event.clientX - start.x, dy = event.clientY - start.y
      if (Math.abs(dx) > 32 && Math.abs(dx) > Math.abs(dy)) navigate(dx < 0 ? 1 : -1)
      else if (Math.abs(dx) < 10 && Math.abs(dy) < 10) {
        const rect = event.currentTarget.getBoundingClientRect()
        navigate(event.clientX - rect.left < rect.width / 2 ? -1 : 1)
      }
    }}>
      <img key={picture.src} src={picture.src} alt={picture.alt} draggable={false}/>
    </div>
    <div className="story-footer">
      <div className="story-caption">{picture.location && <strong>{picture.location}</strong>}
        {picture.alt && <span>{picture.alt}</span>}
      </div>
      <div className="story-arrows">
        <button type="button" aria-label="Previous photo" disabled={index === 0} onClick={() => navigate(-1)}>‹</button>
        <button type="button" aria-label="Next photo" disabled={index === total - 1} onClick={() => navigate(1)}>›</button>
      </div>
    </div>
  </dialog>
}
