'use client'

import { Switch } from '@lenso/ui/switch'
import { OrbitControl } from './OrbitControl'
import { Disclosure } from '@lenso/ui/disclosure'
import NextLink from 'next/link'
import { TabBar } from '@lenso/ui/tab-bar'
import { ThemeScope } from '@lenso/ui'
import { SiteLink } from './SiteLink'
import { GlobePlaces, PlaceAtlasProvider } from './PlaceAtlas'
import { usePathname, useRouter } from 'next/navigation'
import { startTransition, useEffect, useOptimistic, useRef, useState, type CSSProperties, type ReactNode, type RefObject } from 'react'
import type { EarthPose, EarthController } from '@/earth'
import { LiquidGlass } from './LiquidGlass'
import { cloudFadeDuration, frameTravel, FlightClouds, usePhotoFlight } from './PhotoFlight'
import { Icon } from './Icon'
import { Footer } from './Footer'
import { orbitAngles, projectPlace } from '@/earth/locations'

const nav = [
  ['/', 'Overview', 'home'], ['/resume', 'Resume', 'briefcase'], ['/posts', 'Blog', 'book'],
  ['/photos', 'Photos', 'photos'], ['/music', 'Music', 'music'],
] as const

function isCurrentSection(path: string, href: string) {
  return path === href || (href !== '/' && path.startsWith(href + '/')) || (href === '/posts' && path.startsWith('/tags/'))
}
type SceneState = 'loading' | 'live' | 'poster'

function Mark() {
  return <img className="mark" src="/logos/headshot.png" width="32" height="32" alt="" />
}

function Globe({ pose, scene, sky, onState, realSunlight }: {
  realSunlight: boolean
  pose: EarthPose
  scene: RefObject<EarthController | null>
  sky: RefObject<HTMLCanvasElement | null>
  onState: (state: SceneState) => void
}) {
  const surface = useRef<HTMLDivElement>(null)
  const latestPose = useRef(pose)
  const latestSunlight = useRef(realSunlight)
  useEffect(() => {
    latestSunlight.current = realSunlight
    scene.current?.setRealSunlight(realSunlight)
  }, [realSunlight, scene])
  const [live, setLive] = useState(false)
  const [hidePoster, setHidePoster] = useState(false)
  useEffect(() => {
    if (!live) { setHidePoster(false); return }
    const timeout = setTimeout(() => setHidePoster(true), 240)
    return () => clearTimeout(timeout)
  }, [live])
  useEffect(() => {
    latestPose.current = pose
    scene.current?.setPose(pose)
  }, [pose, scene])
  useEffect(() => {
    const parent = surface.current
    const backdrop = sky.current
    if (!parent || !backdrop) return
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
          initialPose: latestPose.current,
          sky: backdrop,
          onReady: () => { if (!stopped) onState('live') },
          onPresent: () => { if (!stopped) setLive(true) },
          onError: fail,
        })
        if (stopped) { controller.dispose(); return }
        scene.current = controller
        controller.setRealSunlight(latestSunlight.current)
        controller.setPose(latestPose.current)
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
  }, [scene, sky, onState])
  // Keep the poster underneath the canvas through its opacity transition.
  const description = live ? 'Earth' : pose === 'crescent' ? 'Earth at night, with city lights and a sunlit crescent' : 'Side-lit Earth centered on North America'
  return <div className="globe" role="img" aria-label={description}>
    {(!live || !hidePoster) && <img className="planet-poster" src={`/earth/points-${pose}.webp`} alt="" fetchPriority="high" width="1024" height="1024" />}
    <div className="canvas-host" ref={surface} style={{ opacity: live ? 1 : 0 }} />
  </div>
}

function HomeLocation({ scene, live }: { scene: RefObject<EarthController | null>, live: boolean }) {
  const [view, setView] = useState(() => orbitAngles(0))
  useEffect(() => {
    if (live && scene.current) return scene.current.observeOrbit(setView)
    setView(orbitAngles(0))
  }, [live, scene])
  const point = projectPlace({ latitude: 42.2808, longitude: -83.7430 }, view)
  if (!point.visible) return null
  return <div className="home-location" style={{ left: (50 + point.x * 100) + '%', top: (50 + point.y * 100) + '%' }}>
    <div className="home-location-badge">
      <div className="home-location-portrait">
        <img src="/ann-arbor-avatar.webp" width="56" height="56" alt="" />
      </div>
      <LiquidGlass className="home-location-label">Currently in Ann Arbor</LiquidGlass>
    </div>
  </div>
}

function Credits() {
  return <Disclosure.Root data-kind="credits">
    <Disclosure.Trigger><Icon name="info"/> Imagery credits</Disclosure.Trigger>
    <Disclosure.Content><div className="credits-card">
      <SiteLink href="https://science.nasa.gov/earth/earth-observatory/blue-marble-next-generation/base-map/">Day surface · NASA Blue Marble</SiteLink>
      <SiteLink href="https://science.nasa.gov/earth/earth-observatory/earth-at-night/maps/">City lights · NASA Black Marble</SiteLink>
      <SiteLink href="https://www.ncei.noaa.gov/products/etopo-global-relief-model">Elevation · NOAA ETOPO</SiteLink>
      <SiteLink href="https://github.com/jsulpis/realtime-planet-shader/blob/main/src/pages/earth.astro">Cloud coverage · NASA Blue Marble</SiteLink>
      <SiteLink href="https://github.com/SebLague/Geographical-Adventures">City points · Sebastian Lague</SiteLink>
      <SiteLink href="/earth/data/credits.txt">Full source credits</SiteLink>
    </div></Disclosure.Content>
  </Disclosure.Root>
}

export function SiteFrame({ children }: { children: ReactNode }) {
  return <ThemeScope theme="dark"><PlaceAtlasProvider><FrameContents>{children}</FrameContents></PlaceAtlasProvider></ThemeScope>
}

const sunlightKey = 'earth.realSunlight'

function FrameContents({ children }: { children: ReactNode }) {
  const [realSunlight, setRealSunlight] = useState(false)
  useEffect(() => {
    try { setRealSunlight(localStorage.getItem(sunlightKey) === 'true') } catch { /* Storage may be disabled. */ }
    const sync = (event: StorageEvent) => {
      if (event.key === sunlightKey || event.key === null) setRealSunlight(event.newValue === 'true')
    }
    window.addEventListener('storage', sync)
    return () => window.removeEventListener('storage', sync)
  }, [])
  const changeSunlight = (enabled: boolean) => {
    setRealSunlight(enabled)
    try { localStorage.setItem(sunlightKey, String(enabled)) } catch { /* Keep the choice for this visit. */ }
  }
  const flight = usePhotoFlight()?.flight
  const path = usePathname()
  const router = useRouter()
  const [mobilePath, setMobilePath] = useOptimistic(path)
  const observatory = useRef<HTMLElement>(null)
  const headerSlot = useRef<HTMLDivElement>(null)
  const [floating, setFloating] = useState(false)
  useEffect(() => {
    const home = path === '/'
    const target = home ? observatory.current : headerSlot.current
    if (!target) return
    const top = home ? 64 : 0
    const observer = new IntersectionObserver(([entry]) => {
      setFloating(!entry.isIntersecting && entry.boundingClientRect.bottom <= top)
    }, { rootMargin: `-${top}px 0px 0px 0px` })
    observer.observe(target)
    return () => { observer.disconnect(); setFloating(false) }
  }, [path])
  const scene = useRef<EarthController | null>(null)
  const sky = useRef<HTMLCanvasElement>(null)
  const isPhotos = path === '/photos'
  const isResume = path === '/resume'
  const [state, setState] = useState<SceneState>('loading')
  const hasMap = isResume || isPhotos
  const hasEarth = hasMap || path === '/'
  // Preserve the WebGL context, particle field and cloud material across the
  // route change. Release them once the satellite reveal has finished.
  const mapPhase = flight && path.startsWith('/photos/') && (path === flight.origin || path === flight.href)
    ? path === flight.origin ? 'departing' : flight.revealAt === null ? 'covered' : 'arriving'
    : undefined
  const pose = hasMap || mapPhase ? 'experience' : 'crescent'
  return <div className={`site ${isResume ? 'resume atlas' : isPhotos ? 'photos atlas' : path === '/' ? 'home' : 'reading'}`}>
    {(hasEarth || mapPhase) && <canvas ref={sky} className="star-sky" aria-hidden="true"/>}
    <a className="skip-link" href="#content">Skip to content</a>
    <div className="masthead-slot" ref={headerSlot}>
    <header className="masthead" data-floating={floating || undefined}>
      {floating && <LiquidGlass backdrop className="masthead-glass"/>}
      <SiteLink href="/" aria-label="Tanner Aslan home" data-kind="brand"><Mark/><span>Tanner Aslan</span></SiteLink>
      <nav aria-label="Main navigation">{nav.map(([href, text]) =>
        <SiteLink key={href} href={href} aria-current={isCurrentSection(path, href) ? 'page' : undefined}>{text}</SiteLink>
      )}</nav>
    </header>
    </div>
    <div className="mobile-dock">
      <TabBar aria-label="Main navigation" layout="phone">
        <TabBar.Group>{nav.map(([href, text, icon]) =>
          <TabBar.Link key={href} href={href} isCurrent={isCurrentSection(mobilePath, href)} icon={<Icon name={icon} />}
            render={<NextLink href={href} onNavigate={event => {
              event.preventDefault()
              startTransition(() => {
                setMobilePath(href)
                router.push(href)
              })
            }}/>}>
            {text}
          </TabBar.Link>
        )}</TabBar.Group>
      </TabBar>
    </div>
    <main id="content" className="composition">
      <div className="page-copy">{children}</div>
      {(hasEarth || mapPhase) && <section ref={observatory} className="observatory" aria-label="Earth viewer"
        data-map-clouds={mapPhase} aria-hidden={mapPhase ? true : undefined}
        style={mapPhase ? { '--cloud-fade-duration': cloudFadeDuration + 'ms', '--cloud-fade-delay': (frameTravel + 50) + 'ms' } as CSSProperties : undefined}>
        <div className="earth-frame">
          {isPhotos && <FlightClouds/>}
          <Globe pose={pose} scene={scene} sky={sky} onState={setState} realSunlight={realSunlight}/>
          {state === 'live' && hasEarth && !flight && <OrbitControl scene={scene}/>}
          {path === '/' && <HomeLocation scene={scene} live={state === 'live'}/>}
          {(hasMap || mapPhase) && <GlobePlaces overMap={Boolean(mapPhase)} scene={scene} pose={pose} live={state === 'live'} />}
        </div>
        {path === '/' && state !== 'poster' && <div className="sunlight-setting">
          <LiquidGlass backdrop className="sunlight-glass"/>
          <Switch data-sunlight-switch="" size="sm" style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}
            checked={realSunlight} disabled={state !== 'live'} onCheckedChange={changeSunlight}>
            <Switch.Content data-sunlight-label=""><Icon name="sun"/>Live sunlight</Switch.Content>
            <Switch.Control><Switch.Thumb/></Switch.Control>
          </Switch>
        </div>}
      </section>}
    </main>
    <Footer credits={hasEarth && <Credits/>}/>
  </div>
}
