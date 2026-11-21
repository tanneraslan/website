'use client'

import { Button } from '@lenso/ui/button'
import { useId, useLayoutEffect, useRef, type ReactNode } from 'react'
import { Icon } from './Icon'
import { usePhotoFlight } from './PhotoFlight'

export function PhotoLocations({ children }: { children: ReactNode }) {
  const id = useId()
  const panel = useRef<HTMLDivElement>(null)
  const flying = Boolean(usePhotoFlight()?.flight)
  useLayoutEffect(() => {
    if (flying && panel.current?.matches(':popover-open')) panel.current.hidePopover()
  }, [flying])

  return <div className="photo-index">
    <h1 className="sr-photo-heading">Photos</h1>
    <Button data-locations-trigger="" disabled={flying} popoverTarget={id} aria-haspopup="dialog"
      style={{ backgroundColor: '#27282d', color: 'var(--ink)', minHeight: 44 }} icon={<Icon name="pin"/>}>Browse locations</Button>
    <div ref={panel} id={id} popover="auto" role="dialog" aria-labelledby={id + '-title'} className="locations-panel">
      <header>
        <h2 id={id + '-title'}>Locations</h2>
        <Button aria-label="Close locations" popoverTarget={id} popoverTargetAction="hide"
          style={{ backgroundColor: '#35363b', color: 'var(--ink)', minHeight: 44 }} autoFocus>Close</Button>
      </header>
      <nav aria-label="Photo albums" onClick={event => {
        if (!event.metaKey && !event.ctrlKey && !event.shiftKey && !event.altKey &&
          event.target instanceof Element && event.target.closest('a[href]')) panel.current?.hidePopover()
      }}>{children}</nav>
    </div>
  </div>
}
