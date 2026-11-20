'use client'

import { useEffect, useRef } from 'react'
import { Card } from '@lenso/ui/card'
import type WaveSurfer from 'wavesurfer.js'

export function AudioPlayer({ audio, title }: { audio: string; title: string }) {
  const media = useRef<HTMLAudioElement>(null)
  const waveform = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const player = media.current
    const container = waveform.current
    if (!player || !container) return
    let disposed = false
    let wave: WaveSurfer | undefined
    void import('wavesurfer.js').then(({ default: Wave }) => {
      if (disposed) return
      wave = Wave.create({
        container, media: player, height: 58, normalize: true,
        barWidth: 2, barGap: 2, barRadius: 2,
        waveColor: '#85858c', progressColor: '#dedee3', cursorColor: '#aaaab3',
      })
    }).catch(() => { /* The native player also works without the waveform. */ })
    return () => { disposed = true; wave?.destroy() }
  }, [audio])

  return <Card data-archive="audio-player">
    <div ref={waveform} aria-hidden="true" />
    <audio ref={media} src={audio} controls preload="metadata" aria-label={'Listen to ' + title} />
  </Card>
}
