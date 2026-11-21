'use client'

import { useId, useLayoutEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react'
import './liquid-glass.css'

const displacementScale = 64
const lensMaps = new Map<string, string>()
const opaqueGlass = '(prefers-reduced-transparency: reduce), (prefers-contrast: more), (forced-colors: active)'

// Red and green encode the horizontal and vertical offsets used by feDisplacementMap.
// The center magnifies gently. The curved bezel pulls in a wider strip of the scene.
function lensMap(width: number, height: number, radius: number) {
  // Offsets are smooth and expressed in CSS pixels. Keep at most one texel
  // per CSS pixel, with a 512 KiB RGBA budget even for a wide desktop bar.
  const density = Math.min(1, Math.sqrt((128 * 1024) / (width * height)))
  const canvas = document.createElement('canvas')
  canvas.width = Math.max(1, Math.floor(width * density))
  canvas.height = Math.max(1, Math.floor(height * density))
  const context = canvas.getContext('2d')
  if (!context) return undefined
  const pixels = context.createImageData(canvas.width, canvas.height)
  const stepX = width / canvas.width, stepY = height / canvas.height
  const zoom = Math.min(0.07, 18 / width)
  for (let y = 0; y < canvas.height; y++) {
    for (let x = 0; x < canvas.width; x++) {
      const dx = (x + 0.5) * stepX - width / 2
      const dy = (y + 0.5) * stepY - height / 2
      const qx = Math.abs(dx) - width / 2 + radius
      const qy = Math.abs(dy) - height / 2 + radius
      const corner = Math.hypot(Math.max(qx, 0), Math.max(qy, 0))
      const depth = radius - corner - Math.min(Math.max(qx, qy), 0)
      const nx = corner ? Math.max(qx, 0) / corner : Number(qx >= qy)
      const ny = corner ? Math.max(qy, 0) / corner : Number(qy > qx)
      const bend = 27 * Math.max(0, 1 - Math.max(0, depth) / 19) ** 2
      const i = 4 * (y * canvas.width + x)
      pixels.data[i] = 128 + (Math.sign(dx) * nx * bend - dx * zoom) * 255 / displacementScale
      pixels.data[i + 1] = 128 + (Math.sign(dy) * ny * bend - dy * zoom) * 255 / displacementScale
      pixels.data[i + 3] = 255 * Math.min(1, Math.max(0, depth + 0.5))
    }
  }
  context.putImageData(pixels, 0, 0)
  return canvas.toDataURL()
}

type Lens = { width: number; height: number; map: string }

export function LiquidGlass({ children, className, style, onHeightChange, decorative = false }: {
  children?: ReactNode, decorative?: boolean, className: string, style?: CSSProperties, onHeightChange?: (height: number) => void
}) {
  const filterId = 'glass-' + useId().replace(/[^a-zA-Z0-9_-]/g, '')
  const surface = useRef<HTMLDivElement>(null)
  const [lens, setLens] = useState<Lens>()
  useLayoutEffect(() => {
    const element = surface.current
    if (!element) return

    // Match Lenso's native SVG backdrop path. WebKit and Gecko keep the CSS blur.
    const nativeRefraction = /Chrom(?:e|ium)\//.test(navigator.userAgent)
    if (!nativeRefraction && !onHeightChange) return
    const opaque = matchMedia(opaqueGlass)
    let nearby = false
    let pending = 0
    const prepare = () => {
      window.clearTimeout(pending)
      if (!nativeRefraction || opaque.matches || !nearby) {
        setLens(undefined)
        return
      }
      const width = element.offsetWidth, height = element.offsetHeight
      if (!width || !height) { setLens(undefined); return }
      const radius = Math.min(parseFloat(getComputedStyle(element).borderTopLeftRadius), width / 2, height / 2)
      // Only size affects this local field. Scrolling and orbiting move the lens
      // with its element without reading globe coordinates or rebuilding the map.
      pending = window.setTimeout(() => {
        const key = width + ':' + height + ':' + radius
        let map = lensMaps.get(key)
        if (!map) {
          map = lensMap(width, height, radius)
          if (!map) return
          if (lensMaps.size >= 12) lensMaps.delete(lensMaps.keys().next().value!)
          lensMaps.set(key, map)
        }
        setLens({ width, height, map })
      }, 0)
    }
    const resize = new ResizeObserver(() => {
      onHeightChange?.(element.offsetHeight)
      prepare()
    })
    resize.observe(element, { box: 'border-box' })
    if (!nativeRefraction) return () => resize.disconnect()
    const visibility = new IntersectionObserver(([entry]) => {
      nearby = entry.isIntersecting
      prepare()
    }, { rootMargin: '128px' })
    visibility.observe(element)
    opaque.addEventListener('change', prepare)
    return () => {
      window.clearTimeout(pending)
      visibility.disconnect()
      resize.disconnect()
      opaque.removeEventListener('change', prepare)
    }
  }, [onHeightChange])
  const materialStyle = lens ? { ...style, '--glass-refraction': `url("#${filterId}")` } as CSSProperties : style
  return <div aria-hidden={decorative || undefined} ref={surface} className={'liquid-glass ' + className} style={materialStyle}>
    {lens && <svg aria-hidden="true" width="0" height="0" className="globe-glass-filter">
      <defs><filter id={filterId} filterUnits="userSpaceOnUse" x="0" y="0" width={lens.width} height={lens.height} colorInterpolationFilters="sRGB">
        <feImage href={lens.map} x="0" y="0" width={lens.width} height={lens.height} preserveAspectRatio="none" result="offsets"/>
        <feDisplacementMap in="SourceGraphic" in2="offsets" scale={displacementScale} xChannelSelector="R" yChannelSelector="G"/>
      </filter></defs>
    </svg>}
    {children}
  </div>
}
