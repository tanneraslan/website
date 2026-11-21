'use client'

import { useId, useLayoutEffect, useMemo, useRef, useState, type CSSProperties, type ReactNode } from 'react'
import './liquid-glass.css'

const displacementScale = 64

// Red and green encode the horizontal and vertical offsets used by feDisplacementMap.
// The center magnifies gently. The curved bezel pulls in a wider strip of the scene.
function lensMap(width: number, height: number, radius: number) {
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const context = canvas.getContext('2d')
  if (!context) return undefined
  const pixels = context.createImageData(width, height)
  const zoom = Math.min(0.07, 18 / width)
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const dx = x + 0.5 - width / 2
      const dy = y + 0.5 - height / 2
      const qx = Math.abs(dx) - width / 2 + radius
      const qy = Math.abs(dy) - height / 2 + radius
      const corner = Math.hypot(Math.max(qx, 0), Math.max(qy, 0))
      const depth = radius - corner - Math.min(Math.max(qx, qy), 0)
      const nx = corner ? Math.max(qx, 0) / corner : Number(qx >= qy)
      const ny = corner ? Math.max(qy, 0) / corner : Number(qy > qx)
      const bend = 27 * Math.max(0, 1 - Math.max(0, depth) / 19) ** 2
      const i = 4 * (y * width + x)
      pixels.data[i] = 128 + (Math.sign(dx) * nx * bend - dx * zoom) * 255 / displacementScale
      pixels.data[i + 1] = 128 + (Math.sign(dy) * ny * bend - dy * zoom) * 255 / displacementScale
      pixels.data[i + 3] = 255 * Math.min(1, Math.max(0, depth + 0.5))
    }
  }
  context.putImageData(pixels, 0, 0)
  return canvas.toDataURL()
}

type LensBounds = { left: number, top: number, width: number, height: number, radius: number }

export function LiquidGlass({ children, className, style, onHeightChange, backdrop = false }: {
  children?: ReactNode, backdrop?: boolean, className: string, style?: CSSProperties, onHeightChange?: (height: number) => void
}) {
  const id = useId()
  const filterId = backdrop ? 'glass-' + id.replace(/[^a-zA-Z0-9_-]/g, '') : 'place-glass'
  const surface = useRef<HTMLDivElement>(null)
  const [bounds, setBounds] = useState<LensBounds>()
  useLayoutEffect(() => {
    const element = surface.current
    const frame = backdrop ? element : element?.closest('.earth-frame')
    if (!element || !frame) return
    const filterTarget = backdrop ? element : frame.querySelector('.globe') ?? frame
    let pending = 0
    const measure = () => {
      const box = element.getBoundingClientRect()
      const origin = filterTarget.getBoundingClientRect()
      const width = element.offsetWidth, height = element.offsetHeight
      const radius = Math.min(parseFloat(getComputedStyle(element).borderTopLeftRadius), width / 2, height / 2)
      const next = { left: box.left - origin.left, top: box.top - origin.top, width, height, radius }
      setBounds(old => old && old.left === next.left && old.top === next.top && old.width === width &&
        old.height === height && old.radius === radius ? old : next)
      onHeightChange?.(height)
    }
    const trackAnimation = () => {
      cancelAnimationFrame(pending)
      measure()
      if (frame.getAnimations({ subtree: true }).some(animation => animation.playState === 'running')) {
        pending = requestAnimationFrame(trackAnimation)
      }
    }
    const observer = new ResizeObserver(measure)
    observer.observe(element)
    if (backdrop) {
      measure()
      return () => observer.disconnect()
    }
    observer.observe(filterTarget)
    const anchorObserver = new MutationObserver(measure)
    for (let node = element.parentElement; node && node !== frame; node = node.parentElement) {
      anchorObserver.observe(node, { attributes: true, attributeFilter: ['style'] })
    }
    frame.addEventListener('animationstart', trackAnimation)
    trackAnimation()
    return () => {
      anchorObserver.disconnect()
      observer.disconnect()
      frame.removeEventListener('animationstart', trackAnimation)
      cancelAnimationFrame(pending)
    }
  }, [style?.left, style?.top, onHeightChange, backdrop])
  const materialStyle = backdrop && bounds
    ? { ...style, '--glass-refraction': `url("#${filterId}")` } as CSSProperties
    : style
  return <div aria-hidden={backdrop || undefined} ref={surface} className={'liquid-glass ' + className} style={materialStyle}>
    {bounds && <GlassLens {...bounds} id={filterId}/>}
    {children}
  </div>
}

function GlassLens({ left, top, width, height, radius, id }: LensBounds & { id: string }) {
  const map = useMemo(() => width && height ? lensMap(width, height, radius) : undefined, [width, height, radius])
  if (!map) return null
  const bounds = { x: left, y: top, width, height }
  return <svg aria-hidden="true" width="0" height="0" className="globe-glass-filter">
    <defs><filter id={id} x="0" y="0" width="100%" height="100%" colorInterpolationFilters="sRGB">
      <feImage href={map} {...bounds} preserveAspectRatio="none" result="lens"/>
      <feDisplacementMap in="SourceGraphic" in2="lens" {...bounds} scale={displacementScale}
        xChannelSelector="R" yChannelSelector="G" result="bent"/>
      <feComposite in="bent" in2="lens" operator="in" result="inside"/>
      <feComposite in="SourceGraphic" in2="lens" operator="out" result="outside"/>
      <feMerge><feMergeNode in="outside"/><feMergeNode in="inside"/></feMerge>
    </filter></defs>
  </svg>
}
