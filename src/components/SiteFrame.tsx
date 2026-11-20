'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEffect, useRef, useState, type ReactNode, type RefObject } from 'react'
import type { EarthPose, EarthController } from '@/earth'
import type { CloudSource } from '@/earth/clouds'
import { SunSweep } from './SunSweep'
import { Icon } from './Icon'

const nav = [['/', 'Overview'], ['/resume', 'Résumé'], ['/earth-lab', 'Earth lab']] as const
type SceneState = 'loading' | 'live' | 'poster'
type ComparisonState = 'loading' | 'ready' | 'error'

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

function Globe({ pose, compare, glass, scene, onState, onComparisonState, onCloudSource }: {
  pose: EarthPose
  compare: boolean
  glass: RefObject<HTMLDivElement | null>
  scene: RefObject<EarthController | null>
  onCloudSource: (value: CloudSource) => void
  onState: (state: SceneState) => void
  onComparisonState: (state: ComparisonState) => void
}) {
  const surface = useRef<HTMLDivElement>(null)
  const latest = useRef({ pose, compare })
  const [live, setLive] = useState(false)
  const [pointsReady, setPointsReady] = useState(false)
  useEffect(() => {
    latest.current = { pose, compare }
    scene.current?.setPose(pose)
    scene.current?.setCompare(compare)
  }, [pose, compare, scene])
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
          onError: fail, onCloudSource,
          onComparisonState: status => {
            if (stopped) return
            setPointsReady(status === 'ready')
            onComparisonState(status)
          },
        })
        if (stopped) { controller.dispose(); return }
        scene.current = controller
        controller.setPose(latest.current.pose)
        controller.setCompare(latest.current.compare)
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
  }, [glass, scene, onState, onComparisonState, onCloudSource])
  // Leave the opening poster underneath until all shaders and base maps have rendered.
  const description = compare ? 'Two Earths under the same sun, with satellite city lights on the left and instanced lights on the right'
    : pose === 'crescent' ? 'Earth at night, with city lights and a sunlit crescent' : 'Side-lit Earth centered on North America'
  return <div className="globe" role="img" aria-label={description}>
    {!live && <img className="planet-poster" src={`/earth/${pose}.webp`} alt="" fetchPriority="high" width="1024" height="1024" />}
    <div className="canvas-host" ref={surface} style={{ opacity: live ? 1 : 0 }} />
    {compare && (!live || !pointsReady) && <img className="planet-poster points-poster" src={`/earth/points-${pose}.webp`} alt="" width="1024" height="1024" />}
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
      <a href="https://github.com/matteason/live-cloud-maps">Clouds · Matt Eason <Icon name="external"/></a>
      <span>Contains modified EUMETSAT data</span>
      <a href="https://github.com/SebLague/Geographical-Adventures">City points · Sebastian Lague <Icon name="external"/></a>
      <a href="/earth/data/credits.txt">Full source credits <Icon name="arrow"/></a>
    </div>
  </details>
}

export function SiteFrame({ children }: { children: ReactNode }) {
  const path = usePathname()
  const glass = useRef<HTMLDivElement>(null)
  const scene = useRef<EarthController | null>(null)
  const isResume = path === '/resume'
  const isLab = path === '/earth-lab'
  const [selection, setSelection] = useState<{ path: string, pose: EarthPose } | null>(null)
  const [state, setState] = useState<SceneState>('loading')
  const [comparison, setComparison] = useState<ComparisonState>('loading')
  const [groundGlow, setGroundGlow] = useState(true)
  const [clouds, setClouds] = useState(true)
  const [cloudSource, setCloudSource] = useState<CloudSource>('loading')
  const [wideAtmosphere, setWideAtmosphere] = useState(true)
  const [pointBloom, setPointBloom] = useState(true)
  useEffect(() => {
    scene.current?.setClouds(!isLab || clouds)
    scene.current?.setWideAtmosphere(!isLab || wideAtmosphere)
    scene.current?.setGroundGlow(!isLab || groundGlow)
    scene.current?.setCityBloom(!isLab || pointBloom)
  }, [isLab, groundGlow, pointBloom, wideAtmosphere, clouds, state, comparison])
  const pose = selection?.path === path ? selection.pose : isResume ? 'experience' : 'crescent'
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
      <section className="observatory" aria-label={isLab ? 'City light comparison' : 'Earth viewer'}>
        <div className="earth-frame">
          <Globe pose={pose} compare={isLab} glass={glass} scene={scene} onState={setState} onComparisonState={setComparison} onCloudSource={setCloudSource}/>
        </div>
        {isLab && <div className="view-labels"><span>Satellite texture</span><span>Instanced lights</span></div>}
        <div className="viewer-controls">
          <div ref={glass} className="glass-pod" data-live={state === 'live'} role="group" aria-label="Earth lighting">
            <button type="button" aria-pressed={pose === 'crescent'} onClick={() => setSelection({ path, pose: 'crescent' })}><Icon name="moon"/>Crescent</button>
            <button type="button" aria-pressed={pose === 'experience'} onClick={() => setSelection({ path, pose: 'experience' })}><Icon name="sun"/>Daylight</button>
          </div>
          {isLab && <SunSweep key={pose} scene={scene} enabled={state === 'live' && comparison === 'ready'}/>}
          {isLab && <div className="lighting-layers" role="group" aria-label="Rendering effects">
            <label><input type="checkbox" checked={groundGlow} disabled={state !== 'live' || comparison !== 'ready'}
              onChange={event => setGroundGlow(event.target.checked)}/> Terrain glow</label>
            <label><input type="checkbox" checked={pointBloom} disabled={state !== 'live' || comparison !== 'ready'}
              onChange={event => setPointBloom(event.target.checked)}/> Point bloom</label>
            <label><input type="checkbox" checked={wideAtmosphere} disabled={state !== 'live' || comparison !== 'ready'}
              onChange={event => setWideAtmosphere(event.target.checked)}/> Wide atmosphere</label>
            <label><input type="checkbox" checked={clouds} disabled={state !== 'live'}
              onChange={event => setClouds(event.target.checked)}/> Clouds</label>
          </div>}
          {isLab && clouds && state === 'live' && (cloudSource === 'snapshot' || cloudSource === 'unavailable') &&
            <small role="status">{cloudSource === 'snapshot' ? 'Clouds · cached map' : 'Cloud map unavailable'}</small>}
          {isLab && (state === 'poster' || comparison === 'error') && <small role="status">
            {state === 'poster' ? 'Still imagery · live lighting unavailable' : 'Point data unavailable · showing a still comparison'}
          </small>}

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
