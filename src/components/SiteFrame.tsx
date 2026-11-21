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
import { Component, createRef, memo, startTransition, useEffect, useLayoutEffect, useOptimistic, useRef, useState, type CSSProperties, type ReactNode, type RefObject } from 'react'
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

const MobileDock = memo(function MobileDock({ path, scene }: { path: string; scene: RefObject<EarthController | null> }) {
  const router = useRouter()
  const [selectedPath, selectPath] = useOptimistic(path)
  return (
    <div className="mobile-dock" onPointerDownCapture={() => scene.current?.yieldToNavigation()}>
      <TabBar aria-label="Main navigation" layout="phone" elastic={false}>
        <TabBar.Group>{nav.map(([href, text, icon]) =>
          <TabBar.Link key={href} href={href} isCurrent={isCurrentSection(selectedPath, href)} icon={<Icon name={icon} />}
            render={<NextLink href={href} prefetch onNavigate={event => {
              event.preventDefault()
              scene.current?.yieldToNavigation()
              // Keep the release animation aimed at the tapped tab while its route loads.
              startTransition(() => {
                selectPath(href)
                router.push(href)
              })
            }}/>}>
            {text}
          </TabBar.Link>
        )}</TabBar.Group>
      </TabBar>
    </div>
  )
})

type EarthPlacement = 'home' | 'resume' | 'photos' | 'backdrop' | 'flight'
type EarthFrameProps = { placement: EarthPlacement; children: ReactNode }

// The home grid, fixed reading backdrop and sticky atlas each own their layout.
// Capture the displayed globe before React swaps those layouts, even mid-glide.
class EarthFrame extends Component<EarthFrameProps> {
  private element = createRef<HTMLDivElement>()
  private movement?: Animation

  getSnapshotBeforeUpdate(previous: EarthFrameProps) {
    if (previous.placement === this.props.placement || previous.placement === 'flight' ||
      this.props.placement === 'flight' || matchMedia('(prefers-reduced-motion: reduce)').matches) return null
    return this.element.current?.getBoundingClientRect() ?? null
  }

  componentDidUpdate(previous: EarthFrameProps, _state: unknown, from: DOMRect | null) {
    if (previous.placement === this.props.placement) return
    this.movement?.cancel()
    const node = this.element.current
    node?.removeAttribute('data-gliding')
    if (!from?.width || !node) return
    const to = node.getBoundingClientRect()
    if (!to.width) return
    node.setAttribute('data-gliding', '')
    const movement = node.animate([
      { transform: `translate(${from.left - to.left}px, ${from.top - to.top}px) scale(${from.width / to.width})` },
      { transform: 'none' },
    ], { duration: 650, easing: 'cubic-bezier(.22,.68,.18,1)' })
    this.movement = movement
    movement.onfinish = () => {
      if (this.movement === movement) node.removeAttribute('data-gliding')
    }
  }

  componentWillUnmount() { this.movement?.cancel() }

  render() { return <div className="earth-frame" ref={this.element}>{this.props.children}</div> }
}

function Globe({ pose, photoPage, scene, sky, orbitViewport, onState, realSunlight }: {
  realSunlight: boolean
  pose: EarthPose
  photoPage: 'index' | 'album' | null
  scene: RefObject<EarthController | null>
  sky: RefObject<HTMLCanvasElement | null>
  orbitViewport: RefObject<HTMLDivElement | null>
  onState: (state: SceneState) => void
}) {
  const surface = useRef<HTMLDivElement>(null)
  const latestPose = useRef(pose)
  const previousPhotoPage = useRef(photoPage)
  const departureOrbit = useRef<ReturnType<EarthController['getOrbitCamera']> | undefined>(undefined)
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
  useLayoutEffect(() => {
    const previous = previousPhotoPage.current
    if (previous === 'index' && photoPage === 'album') departureOrbit.current = scene.current?.getOrbitCamera()
    if (!photoPage) departureOrbit.current = undefined
    // The return flight starts over the album, before the Photos index mounts.
    // History navigation and reduced motion can go straight to the index.
    const returning = previous === 'album' && pose === 'experience' &&
      (photoPage === 'index' || (photoPage === 'album' && latestPose.current === 'backdrop'))
    scene.current?.setPose(pose, returning ? departureOrbit.current : undefined)
    previousPhotoPage.current = photoPage
    latestPose.current = pose
  }, [pose, photoPage, scene])
  useEffect(() => {
    const parent = surface.current
    const backdrop = sky.current
    const viewport = orbitViewport.current
    if (!parent || !backdrop || !viewport) return
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
          orbitViewport: viewport,
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
    // Let the destination and its poster paint before creating a WebGL context.
    let timer = 0
    const frame = requestAnimationFrame(() => { timer = window.setTimeout(start, 0) })
    return () => {
      stopped = true
      cancelAnimationFrame(frame)
      window.clearTimeout(timer)
      scene.current = null
      controller?.dispose()
      canvas.remove()
    }
  }, [scene, sky, orbitViewport, onState])
  // Keep the poster underneath the canvas through its opacity transition.
  const description = live ? 'Earth' : pose === 'crescent' ? 'Earth at night, with city lights and a sunlit crescent' : 'Side-lit Earth centered on North America'
  return <div className="globe" role="img" aria-label={description}>
    {(!live || !hidePoster) && <img className="planet-poster" src={`/earth/points-${pose === 'backdrop' ? 'experience' : pose}.webp`} alt="" fetchPriority="high" width="1024" height="1024" />}
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
  const observatory = useRef<HTMLElement>(null)
  const headerSlot = useRef<HTMLDivElement>(null)
  const [floating, setFloating] = useState(false)
  useEffect(() => {
    const home = path === '/'
    const target = home ? observatory.current : headerSlot.current
    if (!target) return
    const top = home ? 64 : 0
    const album = path.startsWith('/photos/')
    const observer = new IntersectionObserver(([entry]) => {
      const desktopAlbum = album && matchMedia('(min-width: 900px)').matches
      setFloating(desktopAlbum ? entry.boundingClientRect.top < 0 : !entry.isIntersecting && entry.boundingClientRect.bottom <= top)
    }, { rootMargin: `-${top}px 0px 0px 0px`, threshold: album ? [0, 1] : 0 })
    observer.observe(target)
    return () => { observer.disconnect(); setFloating(false) }
  }, [path])
  const scene = useRef<EarthController | null>(null)
  const sky = useRef<HTMLCanvasElement>(null)
  const orbitViewport = useRef<HTMLDivElement>(null)
  const isPhotos = path === '/photos'
  const isResume = path === '/resume'
  const [state, setState] = useState<SceneState>('loading')
  const hasMap = isResume || isPhotos
  const hasEarth = hasMap || path === '/'
  const mapPhase = flight && path.startsWith('/photos/') && (path === flight.origin || path === flight.href)
    ? path === flight.origin ? 'departing' : flight.revealAt === null ? 'covered' : 'arriving'
    : undefined
  const placement: EarthPlacement = (flight && (isPhotos || mapPhase)) ? 'flight'
    : isPhotos ? 'photos' : isResume ? 'resume' : path === '/' ? 'home' : 'backdrop'
  const backdrop = placement === 'backdrop'
  const pose = backdrop ? 'backdrop' : path === '/' ? 'crescent' : 'experience'
  return <div className={`site ${isResume ? 'resume atlas' : isPhotos ? 'photos atlas' : path === '/' ? 'home' : 'reading'}`}>
    <canvas ref={sky} className="star-sky" aria-hidden="true"/>
    <a className="skip-link" href="#content">Skip to content</a>
    <div className="masthead-slot" ref={headerSlot}>
    <header className="masthead" data-floating={floating || undefined}>
      {floating && <LiquidGlass decorative className="masthead-glass"/>}
      <SiteLink href="/" aria-label="Tanner Aslan home" data-kind="brand"><Mark/><span>Tanner Aslan</span></SiteLink>
      <nav aria-label="Main navigation">{nav.map(([href, text]) =>
        <SiteLink key={href} href={href} aria-current={isCurrentSection(path, href) ? 'page' : undefined}>{text}</SiteLink>
      )}</nav>
    </header>
    </div>
    <MobileDock path={path} scene={scene}/>
    <main id="content" className="composition">
      <div className="page-copy">{children}</div>
      <section ref={observatory} data-earth-backdrop={backdrop || undefined} className="observatory" aria-label="Earth viewer"
        data-map-clouds={mapPhase} aria-hidden={backdrop || mapPhase ? true : undefined}
        style={mapPhase ? { '--cloud-fade-duration': cloudFadeDuration + 'ms', '--cloud-fade-delay': (frameTravel + 50) + 'ms' } as CSSProperties : undefined}>
        <div ref={orbitViewport} className="canvas-host orbit-viewport" aria-hidden="true"/>
        <EarthFrame placement={placement}>
          {isPhotos && <FlightClouds/>}
          <Globe pose={pose} photoPage={isPhotos ? 'index' : path.startsWith('/photos/') ? 'album' : null}
            scene={scene} sky={sky} orbitViewport={orbitViewport} onState={setState} realSunlight={realSunlight}/>
          {state === 'live' && hasEarth && !flight && <OrbitControl scene={scene}/>}
          {path === '/' && <HomeLocation scene={scene} live={state === 'live'}/>}
          {(hasMap || mapPhase) && <GlobePlaces key={isResume ? 'resume' : 'photos'} overMap={Boolean(mapPhase)} scene={scene} pose={pose} live={state === 'live'} />}
        </EarthFrame>
        {path === '/' && state !== 'poster' && <div className="sunlight-setting">
          <LiquidGlass decorative className="sunlight-glass"/>
          <Switch data-sunlight-switch="" size="sm" style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}
            checked={realSunlight} disabled={state !== 'live'} onCheckedChange={changeSunlight}>
            <Switch.Content data-sunlight-label=""><Icon name="sun"/>Live sunlight</Switch.Content>
            <Switch.Control><Switch.Thumb/></Switch.Control>
          </Switch>
        </div>}
      </section>
    </main>
    {!isPhotos && <Footer credits={<Credits/>}/>}
  </div>
}
