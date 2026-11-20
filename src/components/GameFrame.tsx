'use client'

import { useRef, useState } from 'react'
import { Button } from '@lenso/ui/button'
import { Card } from '@lenso/ui/card'

export default function GameFrame({ src, title, height = '450px' }: { src: string; title: string; height?: string; width?: string }) {
  const frame = useRef<HTMLIFrameElement>(null)
  const [playing, setPlaying] = useState(false)
  return <Card data-archive="demo-frame">
    {playing ? <>
      <iframe ref={frame} title={title} src={src} style={{ height }} allowFullScreen onLoad={() => frame.current?.focus()} />
      <Button variant="bordered" onClick={() => { void frame.current?.requestFullscreen?.() }}>Fullscreen</Button>
    </> : <Button variant="bordered" onClick={() => setPlaying(true)}>Load {title}</Button>}
  </Card>
}
