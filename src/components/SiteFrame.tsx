'use client'

import { Disclosure } from '@lenso/ui/disclosure'
import NextLink from 'next/link'
import { TabBar } from '@lenso/ui/tab-bar'
import { ThemeScope } from '@lenso/ui'
import { SiteLink } from './SiteLink'
import { GlobePlaces, PlaceAtlasProvider } from './PlaceAtlas'
import { usePathname } from 'next/navigation'
import { useEffect, useRef, useState, type ReactNode, type RefObject } from 'react'
import type { EarthPose, EarthController } from '@/earth'
import { Icon } from './Icon'

const nav = [
  ['/', 'Overview', 'ta'], ['/resume', 'Resume', 'briefcase'], ['/posts', 'Blog', 'book'],
  ['/photos', 'Photos', 'photos'], ['/music', 'Music', 'music'],
] as const

function isCurrentSection(path: string, href: string) {
  return path === href || (href !== '/' && path.startsWith(href + '/')) || (href === '/posts' && path.startsWith('/tags/'))
}
type SceneState = 'loading' | 'live' | 'poster'

function Mark() {
  return <span className="mark" aria-hidden="true" />
}

function Globe({ pose, scene, onState }: {
  pose: EarthPose
  scene: RefObject<EarthController | null>
  onState: (state: SceneState) => void
}) {
  const surface = useRef<HTMLDivElement>(null)
  const latestPose = useRef(pose)
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
          initialPose: latestPose.current,
          onReady: () => { if (!stopped) { setLive(true); onState('live') } },
          onError: fail,
        })
        if (stopped) { controller.dispose(); return }
        scene.current = controller
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
  }, [scene, onState])
  // Leave the opening poster underneath until all shaders and base maps have rendered.
  const description = pose === 'crescent' ? 'Earth at night, with city lights and a sunlit crescent' : 'Side-lit Earth centered on North America'
  return <div className="globe" role="img" aria-label={description}>
    {(!live || !hidePoster) && <img className="planet-poster" src={`/earth/points-${pose}.webp`} alt="" fetchPriority="high" width="1024" height="1024" />}
    <div className="canvas-host" ref={surface} style={{ opacity: live ? 1 : 0 }} />
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
  const path = usePathname()
  const scene = useRef<EarthController | null>(null)
  const isPhotos = path === '/photos'
  const isResume = path === '/resume'
  const [state, setState] = useState<SceneState>('loading')
  const hasMap = isResume || isPhotos
  const hasEarth = hasMap || path === '/'
  const pose = hasMap ? 'experience' : 'crescent'
  return <ThemeScope theme="dark"><PlaceAtlasProvider><div className={`site ${isResume ? 'resume atlas' : isPhotos ? 'photos atlas' : path === '/' ? 'home' : 'reading'}`}>
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
          <TabBar.Link key={href} href={href} render={<NextLink href={href} />} isCurrent={isCurrentSection(path, href)} icon={icon === 'ta' ? <Mark/> : <Icon name={icon} />}>
            {text}
          </TabBar.Link>
        )}</TabBar.Group>
      </TabBar>
    </div>
    <main id="content" className="composition">
      <div className="page-copy">{children}</div>
      {hasEarth && <section className="observatory" aria-label="Earth viewer">
        <div className="earth-frame">
          <Globe pose={pose} scene={scene} onState={setState}/>
          {hasMap && <GlobePlaces scene={scene} pose={pose} live={state === 'live'} />}
        </div>
      </section>}
    </main>
    <footer className="footer">
      <span>Ann Arbor, Michigan</span>
      <div><SiteLink href="mailto:contact@tanneraslan.com">Email</SiteLink><SiteLink href="https://github.com/tanneraslan">GitHub</SiteLink>{hasEarth && <Credits/>}</div>
    </footer>
  </div></PlaceAtlasProvider></ThemeScope>
}
