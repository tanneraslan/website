'use client'

import { Disclosure } from '@lenso/ui/disclosure'
import { EarthLighting } from './EarthLighting'
import NextLink from 'next/link'
import { TabBar } from '@lenso/ui/tab-bar'
import { Switch } from '@lenso/ui/switch'
import { ThemeScope } from '@lenso/ui'
import { SiteLink } from './SiteLink'
import { GlobePlaces, PlaceAtlasProvider } from './PlaceAtlas'
import { usePathname } from 'next/navigation'
import { useEffect, useRef, useState, type ReactNode, type RefObject } from 'react'
import type { EarthPose, EarthController } from '@/earth'
import type { CloudSource } from '@/earth/clouds'
import { SunSweep } from './SunSweep'
import { Icon } from './Icon'

const nav = [
  ['/', 'Overview', 'home'], ['/resume', 'Résumé', 'briefcase'], ['/posts', 'Blog', 'book'],
  ['/photos', 'Photos', 'photos'], ['/music', 'Music', 'music'], ['/earth-lab', 'Earth lab', 'globe'],
] as const

function isCurrentSection(path: string, href: string) {
  return path === href || (href !== '/' && path.startsWith(href + '/')) || (href === '/posts' && path.startsWith('/tags/'))
}
type SceneState = 'loading' | 'live' | 'poster'
type ComparisonState = 'loading' | 'ready' | 'error'

function Mark() {
  return <svg className="mark" aria-hidden="true" viewBox="0 0 44 44" fill="none">
    <circle cx="22" cy="22" r="12.3" stroke="currentColor" strokeWidth="1.7"/>
    <ellipse cx="22" cy="22" rx="20.3" ry="6.7" transform="rotate(-36 22 22)" stroke="currentColor" strokeWidth="1.7"/>
    <circle cx="36.7" cy="8" r="2.5" fill="currentColor"/>
  </svg>
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
  const [hidePoster, setHidePoster] = useState(false)
  const [hidePointPoster, setHidePointPoster] = useState(false)
  useEffect(() => {
    if (!live) { setHidePoster(false); return }
    const timeout = setTimeout(() => setHidePoster(true), 240)
    return () => clearTimeout(timeout)
  }, [live])
  useEffect(() => {
    if (!live || !pointsReady || !compare) { setHidePointPoster(false); return }
    const timeout = setTimeout(() => setHidePointPoster(true), 240)
    return () => clearTimeout(timeout)
  }, [live, pointsReady, compare])
  useEffect(() => {
    latest.current = { pose, compare }
    scene.current?.setPose(pose)
    scene.current?.setCompare(compare)
  }, [pose, compare, scene])
  useEffect(() => {
    const parent = surface.current
    if (!parent) return
    onState('loading')
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
    {(!live || !hidePoster) && <img className="planet-poster" src={`/earth/${pose}.webp`} alt="" fetchPriority="high" width="1024" height="1024" />}
    <div className="canvas-host" ref={surface} style={{ opacity: live ? 1 : 0 }} />
    {compare && (!live || !pointsReady || !hidePointPoster) && <img className="planet-poster points-poster" data-fade={live && pointsReady} src={`/earth/points-${pose}.webp`} alt="" width="1024" height="1024" />}
  </div>
}

function Credits() {
  return <Disclosure.Root data-kind="credits">
    <Disclosure.Trigger><Icon name="info"/> Imagery credits</Disclosure.Trigger>
    <Disclosure.Content><div className="credits-card">
      <SiteLink href="https://science.nasa.gov/earth/earth-observatory/blue-marble-next-generation/base-map/">Day surface · NASA Blue Marble</SiteLink>
      <SiteLink href="https://science.nasa.gov/earth/earth-observatory/earth-at-night/maps/">City lights · NASA Black Marble</SiteLink>
      <SiteLink href="https://www.ncei.noaa.gov/products/etopo-global-relief-model">Elevation · NOAA ETOPO</SiteLink>
      <SiteLink href="https://github.com/matteason/live-cloud-maps">Clouds · Matt Eason</SiteLink>
      <span>Contains modified EUMETSAT data</span>
      <SiteLink href="https://github.com/SebLague/Geographical-Adventures">City points · Sebastian Lague</SiteLink>
      <SiteLink href="/earth/data/credits.txt">Full source credits</SiteLink>
    </div></Disclosure.Content>
  </Disclosure.Root>
}

export function SiteFrame({ children }: { children: ReactNode }) {
  const path = usePathname()
  const glass = useRef<HTMLDivElement>(null)
  const scene = useRef<EarthController | null>(null)
  const isPhotos = path === '/photos'
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
  const hasMap = isResume || isPhotos
  const hasEarth = hasMap || isLab || path === '/'
  const pose = selection?.path === path ? selection.pose : hasMap ? 'experience' : 'crescent'
  return <ThemeScope theme="dark"><PlaceAtlasProvider><div className={`site ${isResume ? 'resume atlas' : isPhotos ? 'photos atlas' : isLab ? 'lab' : path === '/' ? 'home' : 'reading'}`}>
    <a className="skip-link" href="#content">Skip to content</a>
    <header className="masthead">
      <SiteLink href="/" aria-label="Tanner Aslan home" data-kind="brand"><Mark/><span>Tanner Aslan</span></SiteLink>
      <nav aria-label="Main navigation">{nav.map(([href, text]) =>
        <SiteLink key={href} href={href} aria-current={isCurrentSection(path, href) ? 'page' : undefined}>{text}</SiteLink>
      )}</nav>
    </header>
    <div className="mobile-dock">
      <TabBar aria-label="Main navigation" layout="phone">
        <TabBar.Group>{nav.map(([href, text, icon]) =>
          <TabBar.Link key={href} href={href} render={<NextLink href={href} />} isCurrent={isCurrentSection(path, href)} icon={<Icon name={icon} />}>
            {text}
          </TabBar.Link>
        )}</TabBar.Group>
      </TabBar>
    </div>
    <main id="content" className="composition">
      <div className="page-copy">{children}</div>
      {hasEarth && <section className="observatory" aria-label={isLab ? 'City light comparison' : 'Earth viewer'}>
        <div className="earth-frame">
          <Globe pose={pose} compare={isLab} glass={glass} scene={scene} onState={setState} onComparisonState={setComparison} onCloudSource={setCloudSource}/>
          {hasMap && <GlobePlaces scene={scene} pose={pose} live={state === 'live'} />}
        </div>
        {isLab && <div className="view-labels"><span>Satellite texture</span><span>Instanced lights</span></div>}
        <div className="viewer-controls">
          <EarthLighting glassRef={glass} live={state === 'live'} pose={pose} onChange={pose => setSelection({ path, pose })}/>
          {isLab && <SunSweep key={pose} scene={scene} enabled={state === 'live' && comparison === 'ready'}/>}
          {isLab && <div className="lighting-layers" role="group" aria-label="Rendering effects">
            {([
              ['Terrain glow', groundGlow, setGroundGlow], ['Point bloom', pointBloom, setPointBloom],
              ['Wide atmosphere', wideAtmosphere, setWideAtmosphere], ['Clouds', clouds, setClouds],
            ] as const).map(([label, checked, setChecked]) =>
              <Switch.Root key={label} size="sm" checked={checked} aria-label={label}
                disabled={state !== 'live' || (label !== 'Clouds' && comparison !== 'ready')}
                onCheckedChange={setChecked}>
                <Switch.Control><Switch.Thumb /></Switch.Control><Switch.Content>{label}</Switch.Content>
              </Switch.Root>)}
          </div>}
          {isLab && clouds && state === 'live' && (cloudSource === 'snapshot' || cloudSource === 'unavailable') &&
            <small role="status">{cloudSource === 'snapshot' ? 'Clouds · cached map' : 'Cloud map unavailable'}</small>}
          {isLab && (state === 'poster' || comparison === 'error') && <small role="status">
            {state === 'poster' ? 'Still imagery · live lighting unavailable' : 'Point data unavailable · showing a still comparison'}
          </small>}

        </div>
      </section>}
    </main>
    <footer className="footer">
      <span>Ann Arbor, Michigan</span>
      <div><SiteLink href="mailto:contact@tanneraslan.com">Email</SiteLink><SiteLink href="https://github.com/tanneraslan">GitHub</SiteLink>{hasEarth && <Credits/>}</div>
    </footer>
  </div></PlaceAtlasProvider></ThemeScope>
}
