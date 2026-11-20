'use client'

import { useEffect, useRef, useState, type ReactNode } from 'react'
import { SegmentedControl } from '@lenso/ui/segmented-control'
import { Card } from '@lenso/ui/card'
import { Button } from '@lenso/ui/button'
import type { Canvas } from 'glsl-canvas-js/dist/esm/glsl'

function ShaderCanvas({ fragment }: { fragment: string }) {
  const ref = useRef<HTMLCanvasElement>(null)
  const [failed, setFailed] = useState(false)
  useEffect(() => {
    const element = ref.current
    if (!element) return
    let disposed = false
    let renderer: Canvas | undefined
    void import('glsl-canvas-js/dist/esm/glsl').then(({ Canvas }) => {
      if (disposed) return
      renderer = new Canvas(element, { fragmentString: fragment, onError: () => { if (!disposed) setFailed(true) } })
    }).catch(() => { if (!disposed) setFailed(true) })
    return () => { disposed = true; renderer?.destroy() }
  }, [fragment])
  return failed ? <p role="status">Shader preview unavailable.</p> : <canvas ref={ref} aria-label="Interactive GLSL shader preview" />
}

const choices = [{ value: 'code', label: 'Code' }, { value: 'preview', label: 'Preview' }]

export default function ShaderBlock({ children, fullShader, maxHeight = 300 }: { children: ReactNode; fullShader: string; maxHeight?: number }) {
  const [view, setView] = useState('code')
  const [expanded, setExpanded] = useState(false)
  const [overflow, setOverflow] = useState(false)
  const code = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const node = code.current
    if (!node) return
    const observer = new ResizeObserver(() => setOverflow(node.scrollHeight > maxHeight))
    observer.observe(node)
    return () => observer.disconnect()
  }, [view, maxHeight])
  return <Card data-archive="shader-example">
    <SegmentedControl items={choices} value={view} onValueChange={value => { if (value) setView(value) }} aria-label="Shader example" />
    {view === 'preview' ? <ShaderCanvas fragment={fullShader} /> :
      <><div ref={code} style={{ maxHeight: expanded ? undefined : maxHeight, overflow: 'hidden' }}>{children}</div>
        {overflow && <Button variant="bordered" aria-expanded={expanded} onClick={() => setExpanded(!expanded)}>
          {expanded ? 'Collapse code' : 'Show full code'}
        </Button>}</>}
  </Card>
}
