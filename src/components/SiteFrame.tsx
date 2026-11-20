'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEffect, useRef, useState, type ReactNode, type RefObject } from 'react'
import type { EarthPose, createEarth } from '@/earth'
import { Icon } from './Icon'

const nav = [['/', 'Overview'], ['/resume', 'Résumé'], ['/earth-lab', 'Earth lab']] as const
type EarthController = Awaited<ReturnType<typeof createEarth>>

function Mark() {
  return <svg className="mark" aria-hidden="true" viewBox="0 0 44 44" fill="none">
    <circle cx="22" cy="22" r="12.3" stroke="currentColor" strokeWidth="1.7"/>
    <ellipse cx="22" cy="22" rx="20.3" ry="6.7" transform="rotate(-36 22 22)" stroke="currentColor" strokeWidth="1.7"/>
    <circle cx="36.7" cy="8" r="2.5" fill="var(--ember)"/>
  </svg>
}

function Stars() {
  // Repeatable placement keeps the server and client sky identical.
  let seed = 179
  const sample = () => ((seed = (seed * 16807) % 2147483647) / 2147483647)
  return <div className="stars" aria-hidden="true">{Array.from({ length: 108 }, (_, i) =>
    <i key={i} style={{ left: `${sample() * 100}%`, top: `${sample() * 100}%`, opacity: 0.12 + 0.45 * sample(), width: i % 11 ? 1 : 2, height: i % 11 ? 1 : 2 }} />
  )}</div>
}

function Globe({ pose, offset, glass, onState }: { pose: EarthPose, offset: number, glass: RefObject<HTMLDivElement | null>, onState: (state: 'loading'|'live'|'poster') => void }) {
  const surface = useRef<HTMLDivElement>(null)
  const scene = useRef<EarthController | null>(null)
  const latest = useRef({ pose, offset })
  const [live, setLive] = useState(false)
  useEffect(() => {
    latest.current = { pose, offset }
    scene.current?.setPose(pose)
    scene.current?.setSunOffset(offset)
  }, [pose, offset])
  useEffect(() => {
    const parent = surface.current
    if (!parent) return
    let stopped = false
    let controller: EarthController | undefined
    const canvas = document.createElement('canvas')
    parent.appendChild(canvas)
    const fail = () => {
      if (!stopped) { setLive(false); onState('poster') }
    }
    const start = async () => {
      try {
        const { createEarth } = await import('@/earth')
        if (stopped) return
        controller = await createEarth(canvas, {
          initialPose: latest.current.pose,
          glassBounds: () => glass.current?.getBoundingClientRect() ?? null,
          onReady: () => { if (!stopped) { setLive(true); onState('live') } },
          onError: fail,
        })
        if (stopped) { controller.dispose(); return }
        scene.current = controller
        controller.setPose(latest.current.pose)
        controller.setSunOffset(latest.current.offset)
      } catch { fail() }
    }
    const frame = requestAnimationFrame(() => { void start() })
    return () => {
      stopped = true
      cancelAnimationFrame(frame)
      scene.current = null
      controller?.dispose()
      canvas.remove()
    }
  }, [glass, onState])
  // Leave the opening poster underneath until all shaders and base maps have rendered.
  return <div className="globe" role="img" aria-label={pose === 'crescent' ? 'Earth at night, with city lights and a sunlit crescent' : 'Side-lit Earth centered on North America'}>
    {!live && <img className="planet-poster" src={`/earth/${pose}.webp`} alt="" fetchPriority="high" width="1024" height="1024" />}
    <div className="canvas-host" ref={surface} style={{ opacity: live ? 1 : 0 }} />
  </div>
}

function Credits() {
  return <details className="credits">
    <summary><Icon name="info"/> Imagery credits</summary>
    <div className="credits-card">
      <strong>Earth imagery</strong>
      <a href="https://science.nasa.gov/earth/earth-observatory/blue-marble-next-generation/base-map/">Day surface · NASA Blue Marble <Icon name="external"/></a>
      <a href="https://science.nasa.gov/earth/earth-observatory/earth-at-night/maps/">City lights · NASA Black Marble <Icon name="external"/></a>
      <a href="https://www.ncei.noaa.gov/products/etopo-global-relief-model">Elevation · NOAA ETOPO <Icon name="external"/></a>
      <a href="/earth/data/credits.txt">Full source credits <Icon name="arrow"/></a>
    </div>
  </details>
}

export function SiteFrame({ children }: { children: ReactNode }) {
  const path = usePathname()
  const glass = useRef<HTMLDivElement>(null)
  const isResume = path === '/resume'
  const isLab = path === '/earth-lab'
  const [selection, setSelection] = useState<{ path: string, pose: EarthPose } | null>(null)
  const [adjustment, setAdjustment] = useState<{ path: string, degrees: number } | null>(null)
  const [state, setState] = useState<'loading'|'live'|'poster'>('loading')
  const pose = selection?.path === path ? selection.pose : isResume ? 'experience' : 'crescent'
  const offset = adjustment?.path === path ? adjustment.degrees : 0
  if (!nav.some(([href]) => href === path)) return <main>{children}</main>
  return <div className={`site ${isResume ? 'resume' : isLab ? 'lab' : 'home'}`}>
    <Stars/>
    <a className="skip-link" href="#content">Skip to content</a>
    <header className="masthead">
      <Link href="/" aria-label="Tanner Aslan home" className="brand"><Mark/><span>Tanner Aslan</span></Link>
      <nav aria-label="Main navigation">{nav.map(([href, text]) =>
        <Link key={href} href={href} aria-current={path === href ? 'page' : undefined}>{text}</Link>)}</nav>
      <a className="contact" href="mailto:contact@tanneraslan.com">Contact <Icon name="external"/></a>
    </header>
    <main id="content" className="composition">
      <div className="page-copy">{children}</div>
      <section className="observatory" aria-label="Earth viewer">
        <Globe pose={pose} offset={offset} glass={glass} onState={setState}/>
        <div className="viewer-controls">
          <div ref={glass} className="glass-pod" data-live={state === 'live'} role="group" aria-label="Earth lighting">
            <button type="button" aria-pressed={pose === 'crescent'} onClick={() => setSelection({ path, pose: 'crescent' })}><Icon name="moon"/>Crescent</button>
            <button type="button" aria-pressed={pose === 'experience'} onClick={() => setSelection({ path, pose: 'experience' })}><Icon name="sun"/>Daylight</button>
          </div>
          {isLab && <label className="sun-control"><span>Sun angle</span><input type="range" min="-30" max="30" step="1" value={offset} disabled={state !== 'live'} onChange={e => setAdjustment({ path, degrees: Number(e.target.value) })}/><output>{offset}°</output></label>}
          {isLab && state === 'poster' && <small role="status">Still imagery · live lighting unavailable</small>}
        </div>
      </section>
    </main>
    <footer className="footer"><span className="location"><Icon name="pin"/>Ann Arbor, Michigan</span><Credits/></footer>
    <svg className="filter-bank" aria-hidden="true" focusable="false"><defs>
      <filter id="glass-edge" x="0%" y="0%" width="100%" height="100%" colorInterpolationFilters="sRGB">
        <feImage href="/glass-edge.png" width="100%" height="100%" preserveAspectRatio="none" result="lens"/>
        <feDisplacementMap in="SourceGraphic" in2="lens" scale="15" xChannelSelector="R" yChannelSelector="G"/>
      </filter>
    </defs></svg>
  </div>
}
