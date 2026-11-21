import { getSunDirectionECEF, PrecomputedTexturesLoader } from '@takram/three-atmosphere'
import { Ellipsoid } from '@takram/three-geospatial'
import {
  EffectComposer, EffectPass, RenderPass, ToneMappingEffect, ToneMappingMode
} from 'postprocessing'
import {
  CubeTextureLoader, HalfFloatType, LinearFilter, LinearMipmapLinearFilter,
  MathUtils, Mesh, PerspectiveCamera, Quaternion, RepeatWrapping, Scene,
  SRGBColorSpace, Texture, TextureLoader, Vector2, Vector3, WebGLRenderer
} from 'three'
import { EarthAtmosphere } from './atmosphere'
import { createClouds } from './clouds'
import { CityBloomPass } from './city-bloom'
import { createComposite } from './composite'
import { cameraDistanceInRadii, globeDiameterFraction, flightCloudOpacity, flightLandingView, inboundZoom, maxOrbitZoom, orbitAngles, type FlightMapView, type Coordinates, type OrbitView } from './locations'
import { createEllipsoid, createSurface } from './surface'
import { loadCityPoints } from './city-points'
import { createStars } from './stars'

export type EarthPose = 'crescent' | 'experience'
export interface EarthOptions {
  initialPose: EarthPose
  sky: HTMLCanvasElement
  onReady: () => void
  onPresent: () => void
  onError: () => void
}
type CameraFlight = { start: number, duration: number, returning: boolean, releaseMapAt: number,
  mapCamera?: { current: FlightMapView | null },
  mapReveal?: { start: number, duration: number, returning: boolean }, onCloudOpacity: (opacity: number, shaderReady: boolean) => void }

export interface EarthController {
  flyToPlace: (place: Coordinates | null, timing?: CameraFlight) => void
  yieldToNavigation: () => void
  observeOrbit: (listener: (view: OrbitView) => void) => () => void
  setRealSunlight: (enabled: boolean) => void
  zoomBy: (factor: number, focus?: { x: number; y: number }, continuePinch?: boolean) => boolean
  rotateBy: (longitude: number, latitude: number) => void
  coast: (longitudeSpeed: number, latitudeSpeed: number) => void
  stopCoasting: () => void
  setPose: (pose: EarthPose) => void
  dispose: () => void
}

const radius = Ellipsoid.WGS84.radii.x
const cameraDistance = cameraDistanceInRadii * radius
const northPole = new Vector3(0, 0, 1)
const orbitTime = 1400
const coastDecaySeconds = 0.32
const maxLatitude = Math.PI / 2 - 0.001

export async function createEarth(canvas: HTMLCanvasElement, options: EarthOptions): Promise<EarthController> {
  const renderer = new WebGLRenderer({ canvas, alpha: true, premultipliedAlpha: false })
  if (!renderer.extensions.has('EXT_color_buffer_float')) {
    renderer.dispose()
    throw new Error('The atmosphere needs floating-point render targets.')
  }
  const gl = renderer.getContext()
  const maxViewport = gl.getParameter(gl.MAX_VIEWPORT_DIMS) as Int32Array
  renderer.setClearColor(0, 0)
  renderer.debug.onShaderError = (gl, program, vertex, fragment) => {
    throw new Error([gl.getProgramInfoLog(program), gl.getShaderInfoLog(vertex), gl.getShaderInfoLog(fragment)].join('\n'))
  }
  // The postprocessing depth reconstruction and the scene share one clip range
  // for the whole flight, including the closest approach about 115 km above the surface.
  const camera = new PerspectiveCamera(35, 1, radius * 0.006, radius * 8)
  camera.up.copy(northPole)
  const scene = new Scene()
  const sky = options.sky
  const drawStars = createStars(sky)
  const atmosphere = new EarthAtmosphere(camera)
  const surface = createSurface(atmosphere)
  const globe = new Mesh(createEllipsoid(), surface)
  scene.add(globe)
  const composite = createComposite()
  const composer = new EffectComposer(renderer, { frameBufferType: HalfFloatType })
  composer.addPass(new RenderPass(scene, camera))
  const atmospherePass = new EffectPass(camera, atmosphere)
  atmospherePass.enabled = false
  composer.addPass(atmospherePass)
  composer.addPass(new EffectPass(camera, composite.effect, new ToneMappingEffect({ mode: ToneMappingMode.ACES_FILMIC })))

  const textures = new Set<Texture>()
  const textureLoader = new TextureLoader()
  const anisotropy = Math.min(16, renderer.capabilities.getMaxAnisotropy())
  const clouds = createClouds(globe.geometry, atmosphere, surface.uniforms.sunDirection.value, surface.uniforms.night, surface.uniforms.detailMix, anisotropy)
  scene.add(clouds.mesh)
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)')
  const mobile = matchMedia('(max-width: 760px), (pointer: coarse)')
  const east = new Vector3()
  const north = new Vector3()
  const towardCamera = new Vector3()
  let realSunlight = false
  let solarMinute = -1
  const targetSun = new Vector3()
  const startSun = new Vector3()
  const sunArc = new Quaternion()
  const sunRotation = new Quaternion()
  let sunSweepStart: number | null = null
  const sunSweepDuration = 1300
  const sunLocal = new Vector3()
  const crescentSun = new Vector3(0.52, 0.16, -0.84).normalize()
  const experienceSun = new Vector3(0.81, 0.34, 0.48).normalize()
  const host = canvas.parentElement
  const globeFrame = host?.closest<HTMLElement>('.earth-frame')
  let flight: (CameraFlight & { place: Coordinates }) | null = null
  let takeoff: { flightStart: number, view: FlightMapView } | null = null
  let pose = options.initialPose
  let progress = pose === 'experience' ? 1 : 0
  let view = orbitAngles(progress)
  let renderExtent = 1
  let zoom = 1
  let targetZoom = 1
  let zoomVelocity = 0
  // All three points use frame widths relative to the original globe center.
  const zoomAnchor = new Vector2()
  const zoomFocus = new Vector2()
  const zoomPan = new Vector2()
  let startView = view
  let endView = view
  let coastStartedAt: number | null = null
  const orbitListeners = new Set<(view: OrbitView) => void>()
  let startProgress = progress
  let targetProgress = progress
  let transitionStart = 0
  let points: Awaited<ReturnType<typeof loadCityPoints>> | null = null
  let lighting: ReturnType<PrecomputedTexturesLoader['load']> | undefined
  let lightingAt = Infinity
  let lampsAt = Infinity
  let cloudsAt = Infinity
  let detailsSettled = false
  let presentationRequested = false
  let presented = false
  let bloomInstalled = false
  let inputUntil = 0
  let wasMoving = false
  const pointRequest = new AbortController()
  let cubeRequested = 0
  let cubeLoaded = 0
  let cubeReadyAt = Infinity
  const pendingTextures = new Map<string, Texture>()
  let highMapsRequested = false
  let refineTimer = 0
  let frame = 0
  let wind: Texture | undefined
  let motionSeconds = 0
  let lastDraw = 0
  let animationTimer = 0
  let navigationTimer = 0
  let inView = true
  let ready = false
  let disposed = false
  let width = 0
  let height = 0

  function dispose() {
    if (disposed) return
    disposed = true
    globeFrame?.style.removeProperty('--orbit-extent')
    globeFrame?.style.removeProperty('--orbit-pan-x')
    globeFrame?.style.removeProperty('--orbit-pan-y')
    cancelAnimationFrame(frame)
    window.clearTimeout(refineTimer)
    window.clearTimeout(navigationTimer)
    pointRequest.abort()
    if (points) {
      scene.remove(points)
      points.geometry.dispose()
      points.material.dispose()
    }
    clouds.dispose()
    window.clearTimeout(animationTimer)
    visibility.disconnect()
    resize.disconnect()
    window.removeEventListener('scroll', invalidate)
    window.removeEventListener('resize', invalidate)
    sky.hidden = true
    document.removeEventListener('visibilitychange', invalidate)
    canvas.removeEventListener('webglcontextlost', fail)
    reducedMotion.removeEventListener('change', invalidate)
    composer.dispose()
    globe.geometry.dispose()
    surface.dispose()
    orbitListeners.clear()
    textures.forEach(texture => texture.dispose())
    renderer.dispose()
  }

  function fail() {
    if (disposed) return
    dispose()
    options.onError()
  }

  function stopCoasting() {
    if (coastStartedAt === null) return
    coastStartedAt = null
    startView = endView = view
  }

  function movingOnMobile(time: number) {
    return mobile.matches && (flight !== null || time < inputUntil || zoom !== targetZoom ||
      zoomVelocity !== 0 || coastStartedAt !== null ||
      (!reducedMotion.matches && startProgress !== targetProgress && time < transitionStart + orbitTime))
  }

  function draw(time: number) {
    frame = 0
    if (disposed || document.hidden || !inView || !ready) { lastDraw = 0; return }
    try {
      // Keep the same sampling grid at both ends of the zoom spring.
      const extent = flight ? 1 : maxOrbitZoom
      if (extent !== renderExtent) {
        renderExtent = extent
        globeFrame?.style.setProperty('--orbit-extent', String(extent))
      }
      const w = canvas.clientWidth
      const h = canvas.clientHeight
      if (!w || !h) return
      const moving = movingOnMobile(time)
      if (wasMoving && !moving) scheduleRefinement()
      wasMoving = moving
      const pixelBudget = mobile.matches ? (flight ? 680 : 1200) : 1500
      const dpr = Math.min(window.devicePixelRatio || 1, 1.75, pixelBudget / Math.max(w, h),
        maxViewport[0] / w, maxViewport[1] / h)
      if (w !== width || h !== height || dpr !== renderer.getPixelRatio()) {
        width = w
        height = h
        renderer.setPixelRatio(dpr)
        composer.setSize(w, h, false)
        camera.aspect = w / h
        // tan(angular radius) projected onto a centered perspective plane.
        const tangent = radius / Math.sqrt(cameraDistance ** 2 - radius ** 2)
        camera.fov = 2 * MathUtils.radToDeg(Math.atan(tangent * renderExtent / (globeDiameterFraction * Math.min(1, camera.aspect))))
        camera.updateProjectionMatrix()
        composite.viewport.value.set(w, h)
        composite.disk.value.set(w / 2, h / 2, globeDiameterFraction * Math.min(w, h) / 2)
        scheduleRefinement()
      }
      const t = reducedMotion.matches ? 1 : MathUtils.clamp((time - transitionStart) / orbitTime, 0, 1)
      const blend = t * t * (3 - 2 * t)
      progress = MathUtils.lerp(startProgress, targetProgress, blend)
      if (reducedMotion.matches) stopCoasting()
      let orbitBlend = blend
      if (coastStartedAt !== null) {
        const elapsed = Math.max(0, time - coastStartedAt) / 1000
        orbitBlend = 1 - Math.exp(-elapsed / coastDecaySeconds)
        if (orbitBlend > 0.998) {
          coastStartedAt = null
          startView = endView
        }
      }
      const nextView = orbitBlend === 1 || startView === endView ? endView : {
        latitude: MathUtils.lerp(startView.latitude, endView.latitude, orbitBlend),
        longitude: MathUtils.lerp(startView.longitude, endView.longitude, orbitBlend),
      }
      const previousZoom = zoom
      if (zoom !== targetZoom || zoomVelocity !== 0) {
        // Exact critically damped spring update, with velocity in scale units per second.
        const dt = Math.min(0.1, Math.max(0, time - lastDraw) / 1000)
        const offset = zoom - targetZoom
        const slope = zoomVelocity + 15 * offset
        const decay = Math.exp(-15 * dt)
        zoom = MathUtils.clamp(targetZoom + (offset + slope * dt) * decay, 1, maxOrbitZoom)
        zoomVelocity = (zoomVelocity - 15 * slope * dt) * decay
        if (reducedMotion.matches || (Math.abs(zoom - targetZoom) < 0.0005 && Math.abs(zoomVelocity) < 0.01)) {
          zoom = targetZoom
          zoomVelocity = 0
        }
      }
      if (!flight) {
        // Keep the same projected surface point under the gesture throughout
        // the spring. At minimum zoom the globe returns to its original framing.
        const lastX = zoomPan.x, lastY = zoomPan.y
        zoomPan.copy(zoomFocus).addScaledVector(zoomAnchor, -zoom)
          .clampLength(0, (zoom - 1) * globeDiameterFraction / 2)
        if (zoomPan.x !== lastX || zoomPan.y !== lastY) {
          globeFrame?.style.setProperty('--orbit-pan-x', zoomPan.x * 100 + '%')
          globeFrame?.style.setProperty('--orbit-pan-y', zoomPan.y * 100 + '%')
        }
        if (camera.zoom !== zoom) {
          camera.zoom = zoom
          camera.updateProjectionMatrix()
        }
        composite.disk.value.z = globeDiameterFraction * Math.min(w, h) * zoom / (2 * renderExtent)
      }
      if (view !== nextView || zoom !== previousZoom) {
        view = nextView
        orbitListeners.forEach(listener => listener({ ...view, zoom }))
      }
      if (realSunlight) {
        const now = Date.now()
        const minute = Math.floor(now / 60000)
        if (minute !== solarMinute) {
          getSunDirectionECEF(now, targetSun)
          solarMinute = minute
        }
      } else {
        // Keep the sun fixed in world space while the user orbits.
        const lightView = orbitAngles(progress)
        towardCamera.set(Math.cos(lightView.latitude)*Math.cos(lightView.longitude),
          Math.cos(lightView.latitude)*Math.sin(lightView.longitude), Math.sin(lightView.latitude))
        east.crossVectors(northPole, towardCamera).normalize()
        north.crossVectors(towardCamera, east)

        sunLocal.lerpVectors(crescentSun, experienceSun, progress).normalize()
        targetSun.copy(east).multiplyScalar(sunLocal.x)
          .addScaledVector(north, sunLocal.y).addScaledVector(towardCamera, sunLocal.z)
      }
      if (sunSweepStart !== null && !reducedMotion.matches && time < sunSweepStart + sunSweepDuration) {
        const fraction = MathUtils.smoothstep(time, sunSweepStart, sunSweepStart + sunSweepDuration)
        sunArc.setFromUnitVectors(startSun, targetSun)
        sunRotation.identity().slerp(sunArc, fraction)
        atmosphere.sunDirection.copy(startSun).applyQuaternion(sunRotation)
      } else {
        sunSweepStart = null
        atmosphere.sunDirection.copy(targetSun)
      }
      surface.uniforms.sunDirection.value.copy(atmosphere.sunDirection)
      if (!moving) {
        for (const [slot, texture] of pendingTextures) {
          if (slot === 'dayCube' && cubeReadyAt === Infinity) cubeReadyAt = time
          replaceTexture(slot, texture)
        }
        pendingTextures.clear()
        if (lighting && !atmospherePass.enabled) {
          Object.assign(atmosphere, lighting)
          atmospherePass.enabled = true
          lightingAt = presented ? time : -Infinity
        }
        if (points && lampsAt === Infinity) {
          scene.add(points)
          lampsAt = presented ? time : -Infinity
        }
        if (!bloomInstalled && points && atmospherePass.enabled && atmosphere.transmittanceTexture) {
          composer.addPass(new CityBloomPass(camera, points, atmosphere.transmittanceTexture, clouds.uniforms), 2)
          bloomInstalled = true
        }
      }
      const fadeIn = (start: number) => start === Infinity ? 0 : reducedMotion.matches ? 1 : MathUtils.smoothstep(time - start, 0, 450)
      atmosphere.blendMode.opacity.value = surface.uniforms.detailMix.value = fadeIn(lightingAt)
      if (wind && cloudsAt === Infinity) cloudsAt = presented ? time : -Infinity
      clouds.uniforms.cloudStrength.value = fadeIn(cloudsAt)
      if (points) points.material.uniforms.lampFade.value = fadeIn(lampsAt)
      const { latitude: lat, longitude: lon } = view
      towardCamera.set(Math.cos(lat)*Math.cos(lon), Math.cos(lat)*Math.sin(lon), Math.sin(lat))
      let distance = cameraDistance
      let cloudOpacity = 0
      let mapReveal = 0
      if (flight) {
        const zoomAtOrbit = zoom
        const elapsed = time - flight.start
        const orbitTime = flight.returning ? flight.duration - elapsed : elapsed
        const progressIn = MathUtils.clamp(orbitTime / flight.duration, 0, 1)
        const liveMap = flight.mapCamera?.current
        if (flight.returning && liveMap && (time < flight.releaseMapAt || takeoff?.flightStart !== flight.start)) {
          takeoff = { flightStart: flight.start, view: liveMap }
        }
        const departure = flight.returning && takeoff?.flightStart === flight.start ? takeoff.view : null
        const target = departure ?? liveMap ?? flight.place
        const targetLon = MathUtils.degToRad(target.longitude)
        const dLon = Math.atan2(Math.sin(targetLon - lon), Math.cos(targetLon - lon))
        const targetLat = Math.atan(0.99330562 * Math.tan(MathUtils.degToRad(target.latitude)))
        const aim = MathUtils.smoothstep(progressIn, 0, 0.53)
        const a = MathUtils.lerp(lat, targetLat, aim)
        const b = lon + aim * dLon
        towardCamera.set(Math.cos(a)*Math.cos(b), Math.cos(a)*Math.sin(b), Math.sin(a))
        const rect = globeFrame?.getBoundingClientRect()
        if (rect && rect.width > 0 && rect.height > 0) {
          // Extend the original square frustum across the viewport. Its
          // geographic center and apparent size stay fixed at takeoff.
          const landing = flightLandingView(flight.place.latitude, rect.height)
          let zoom = liveMap?.zoom ?? inboundZoom(landing, orbitTime)
          if (departure) {
            // A Hermite segment leaves the album map with its last scale and
            // velocity, and reaches the resting globe with zero velocity.
            const span = Math.max(1, flight.start + flight.duration - departure.sampledAt)
            const u = MathUtils.clamp((time - departure.sampledAt) / span, 0, 1)
            const orbitZoom = inboundZoom(landing, 0)
            const tangent = MathUtils.clamp(departure.zoomRate * span, Math.min(0, 3 * (orbitZoom - departure.zoom)), 0)
            zoom = MathUtils.lerp(departure.zoom, orbitZoom, u * u * (3 - 2 * u)) + tangent * u * (1 - u) ** 2
          }
          const altitude = landing.altitude * 2 ** (landing.zoom - zoom)
          // Continue optically once the near plane approaches the cloud shell.
          const cameraAltitude = Math.max(altitude, 80000)
          distance = landing.groundRadius + cameraAltitude
          camera.zoom = MathUtils.lerp(zoomAtOrbit, 1, aim)
          const opticalZoom = cameraAltitude / altitude
          const tangent = radius / (opticalZoom * Math.sqrt(cameraDistance ** 2 - radius ** 2))
          camera.fov = 2 * MathUtils.radToDeg(Math.atan(tangent / globeDiameterFraction))
          const left = MathUtils.lerp(rect.left + zoomPan.x * rect.width, (w - rect.width) / 2, aim)
          const top = MathUtils.lerp(rect.top + zoomPan.y * rect.width, (h - rect.height) / 2, aim)
          camera.setViewOffset(rect.width, rect.height, -left, -top, w, h)
          const magnification = Math.sqrt((cameraDistance ** 2 - radius ** 2) / (distance ** 2 - radius ** 2))
          composite.disk.value.set(left + rect.width / 2, h - top - rect.height / 2,
            globeDiameterFraction * rect.height / 2 * magnification * opticalZoom * camera.zoom)
          // An inscribed sphere gives a conservative silhouette for the WGS84
          // ellipsoid, even as the camera approaches its surface.
          const polar = Ellipsoid.WGS84.radii.z
          const focal = rect.height * globeDiameterFraction * camera.zoom / (2 * tangent)
          const surfaceRadius = focal * polar / Math.sqrt(distance ** 2 - polar ** 2)
          cloudOpacity = flightCloudOpacity(surfaceRadius, left + rect.width / 2, top + rect.height / 2, w, h, progressIn)
          clouds.uniforms.flightCoverage.value = cloudOpacity
          if (flight.mapReveal) {
            const { start, duration, returning } = flight.mapReveal
            const reveal = MathUtils.clamp((time - start) / duration, 0, 1)
            mapReveal = returning ? 1 - reveal : cloudOpacity * reveal
          }
        }
      }
      const groundOpacity = 1 - MathUtils.smoothstep(mapReveal, 0, 0.48)
      surface.uniforms.groundOpacity.value = groundOpacity
      if (points) points.material.uniforms.groundOpacity.value = groundOpacity
      // Fade the cloud-only canvas after the ground has become transparent.
      // Its RGB and alpha stay paired even at the first faint wisps.
      canvas.style.opacity = mapReveal > 0.48 ? String(1 - MathUtils.smoothstep(mapReveal, 0.48, 1)) : ''
      composite.mapUnderlay.value = mapReveal
      camera.position.copy(towardCamera).multiplyScalar(distance)
      camera.lookAt(0, 0, 0)
      points?.updateView(camera.position, atmosphere.sunDirection, h * camera.projectionMatrix.elements[5] / 2, canvas.width, canvas.height)
      surface.uniforms.cubeMix.value = reducedMotion.matches && cubeReadyAt !== Infinity
        ? 1 : MathUtils.clamp((time - cubeReadyAt) / 300, 0, 1)
      if (!reducedMotion.matches && lastDraw) motionSeconds += Math.min(0.1, (time - lastDraw) / 1000)
      lastDraw = time
      surface.uniforms.oceanSeconds.value = motionSeconds
      clouds.mesh.visible = !!wind && clouds.uniforms.cloudStrength.value > 0
      if (wind) clouds.advance(renderer, wind, time, motionSeconds, moving)
      composer.render()
      sky.hidden = mapReveal >= 1
      if (!sky.hidden && drawStars) {
        sky.style.opacity = mapReveal > 0 ? String(1 - mapReveal) : ''
        drawStars(camera, canvas)
      }
      flight?.onCloudOpacity(cloudOpacity, clouds.mesh.visible)
      if (!canvas.dataset.earthReady) {
        canvas.dataset.earthReady = 'true'
        options.onReady()
        void loadDetails()
      }
      // The controls can use the first frame immediately. At rest, crossfade
      // directly from the poster to the fully lit frame, including its clouds.
      if (!presented && (presentationRequested || detailsSettled)) {
        presented = true
        options.onPresent()
      }
      if (flight || time < inputUntil || sunSweepStart !== null || zoom !== targetZoom || zoomVelocity !== 0 || coastStartedAt !== null || (startProgress !== targetProgress && t < 1) || (cubeReadyAt !== Infinity && surface.uniforms.cubeMix.value < 1)) invalidate()
      window.clearTimeout(animationTimer)
      if (!reducedMotion.matches) animationTimer = window.setTimeout(invalidate, 1000 / 30)
      else if (realSunlight) animationTimer = window.setTimeout(invalidate, 60000 - Date.now() % 60000)
    } catch (error) {
      console.error('Earth rendering failed.', error)
      fail()
    }
  }

  function invalidate() {
    if (frame === 0 && !navigationTimer && ready && !disposed && !document.hidden) frame = requestAnimationFrame(draw)
  }
  const visibility = new IntersectionObserver(([entry]) => {
    inView = entry.isIntersecting
    lastDraw = 0
    if (inView) invalidate()
    else {
      sky.hidden = true
      window.clearTimeout(animationTimer)
    }
  })
  visibility.observe(canvas)
  const resize = new ResizeObserver(invalidate)
  resize.observe(canvas)
  window.addEventListener('scroll', invalidate, { passive: true })
  window.addEventListener('resize', invalidate)
  delete canvas.dataset.earthReady
  canvas.addEventListener('webglcontextlost', fail)
  reducedMotion.addEventListener('change', invalidate)
  document.addEventListener('visibilitychange', invalidate)

  function configureTexture(texture: Texture, color: boolean) {
    texture.minFilter = LinearMipmapLinearFilter
    texture.magFilter = LinearFilter
    texture.generateMipmaps = true
    texture.anisotropy = anisotropy
    if (color) texture.colorSpace = SRGBColorSpace
    textures.add(texture)
  }

  function loadMap(name: string, color = false): Promise<Texture> {
    return new Promise((resolve, reject) => {
      const texture = textureLoader.load('/earth/data/' + name + '.webp', resolve, undefined, reject)
      texture.wrapS = RepeatWrapping
      configureTexture(texture, color)
    })
  }

  function replaceTexture(slot: string, texture: Texture) {
    const previous = surface.uniforms[slot].value as Texture | null
    surface.uniforms[slot].value = texture
    if (previous) {
      previous.dispose()
      textures.delete(previous)
    }
    invalidate()
  }

  function refineTextures() {
    if (disposed || !ready || movingOnMobile(performance.now())) return
    const diameter = 0.85 * Math.min(width, height) * renderer.getPixelRatio()
    const tier = diameter >= 690 ? 2048 : 1024
    if (tier > cubeRequested && renderer.capabilities.maxCubemapSize >= tier) {
      cubeRequested = tier
      const stem = tier === 2048 ? 'day-' : 'day-1k-'
      const urls = ['px', 'nx', 'py', 'ny', 'pz', 'nz'].map(face => '/earth/data/' + stem + face + '.webp')
      const cube = new CubeTextureLoader().load(urls, texture => {
        // A resize may have requested a sharper set in the meantime.
        if (disposed || tier < cubeLoaded) {
          texture.dispose()
          textures.delete(texture)
          return
        }
        cubeLoaded = tier
        const pending = pendingTextures.get('dayCube')
        if (pending) { pending.dispose(); textures.delete(pending) }
        pendingTextures.set('dayCube', texture)
        invalidate()
      }, undefined, () => {
        cube.dispose()
        textures.delete(cube)
      })
      cube.flipY = false
      configureTexture(cube, true)
    }
    if (diameter >= 690 && !highMapsRequested && renderer.capabilities.maxTextureSize >= 4096) {
      highMapsRequested = true
      for (const name of ['night', 'elevation']) {
        loadMap(name + '-detail').then(texture => {
          if (!disposed) { pendingTextures.set(name, texture); invalidate() }
        }).catch(() => { /* Keep the base map if this optional refinement fails. */ })
      }
    }
  }

  function scheduleRefinement() {
    window.clearTimeout(refineTimer)
    // Give the browser a paint with the base textures before optional requests.
    refineTimer = window.setTimeout(refineTextures, 120)
  }

  async function loadDetails() {
    const failed = (error: unknown) => {
      if (!disposed) console.warn('Optional Earth detail could not be loaded.', error)
    }
    const cloudDetail = Promise.all([loadMap('wind'), clouds.loadCoverage()]).then(([field, coverage]) => {
      if (!disposed && coverage) { wind = field; invalidate() }
    }).catch(failed)
    const tablesReady = new Promise<ReturnType<PrecomputedTexturesLoader['load']>>((resolve, reject) => {
      const loader = new PrecomputedTexturesLoader({ type: HalfFloatType, higherOrderScattering: false })
      const tables = loader.load('/earth/atmosphere', () => resolve(tables), undefined, reject)
      for (const texture of Object.values(tables)) if (texture) textures.add(texture)
    })
    const lightDetail = Promise.all([loadMap('elevation'), loadMap('bathymetry'), loadMap('water-normal'), tablesReady])
      .then(([elevation, bathymetry, waterNormal, tables]) => {
        if (disposed) return
        waterNormal.wrapT = RepeatWrapping
        surface.uniforms.waterNormal.value = waterNormal
        surface.uniforms.bathymetry.value = bathymetry
        if (!surface.uniforms.elevation.value) surface.uniforms.elevation.value = elevation
        lighting = tables
        invalidate()
      }).catch(failed)
    const cityDetail = loadCityPoints(pointRequest.signal).then(mesh => {
      if (disposed) { mesh.geometry.dispose(); mesh.material.dispose(); return }
      points = mesh
      invalidate()
    }).catch(failed)
    await Promise.all([cloudDetail, lightDetail, cityDetail])
    detailsSettled = true
    invalidate()
  }

  Promise.all([loadMap('day', true), loadMap('night')]).then(([day, night]) => {
    if (disposed) return
    surface.uniforms.day.value = day
    surface.uniforms.night.value = night
    ready = true
    invalidate()
  }).catch(error => {
    if (!disposed) console.warn('Earth rendering assets could not be loaded.', error)
    fail()
  })

  return {
    flyToPlace(place, timing) {
      if (place && timing) presentationRequested = true
      stopCoasting()
      targetZoom = zoom
      zoomVelocity = 0
      flight = place && timing ? { ...timing, place } : null
      if (place) {
        const lat = MathUtils.degToRad(place.latitude), lon = MathUtils.degToRad(place.longitude)
        clouds.uniforms.flightTarget.value.set(Math.cos(lat) * Math.cos(lon), Math.cos(lat) * Math.sin(lon), Math.sin(lat))
      }
      clouds.uniforms.flightCoverage.value = 0
      host?.classList.toggle('flight-viewport', Boolean(flight))
      if (!flight) camera.clearViewOffset()
      width = 0
      invalidate()
    },
    yieldToNavigation() {
      // Keep the last frame on screen while the dock and destination paint.
      // Resume even when a press is canceled or stays on the current tab.
      cancelAnimationFrame(frame)
      frame = 0
      window.clearTimeout(animationTimer)
      window.clearTimeout(navigationTimer)
      navigationTimer = window.setTimeout(() => {
        navigationTimer = 0
        if (inView) invalidate()
      }, 150)
    },
    observeOrbit(listener) {
      orbitListeners.add(listener)
      listener({ ...view, zoom })
      return () => { orbitListeners.delete(listener) }
    },
    setRealSunlight(enabled) {
      if (realSunlight === enabled) return
      // Retarget from the last rendered direction, even midway through a sweep.
      if (canvas.dataset.earthReady) presentationRequested = true
      startSun.copy(atmosphere.sunDirection)
      sunSweepStart = canvas.dataset.earthReady && !reducedMotion.matches ? performance.now() : null
      realSunlight = enabled
      solarMinute = -1
      invalidate()
    },
    zoomBy(factor, focus, continuePinch = false) {
      if (disposed || flight || !Number.isFinite(factor) || factor <= 0) return false
      zoomFocus.set(focus?.x ?? 0, focus?.y ?? 0)
      if (!continuePinch) zoomAnchor.copy(zoomFocus).sub(zoomPan).divideScalar(zoom)
      const next = MathUtils.clamp(targetZoom * factor, 1, maxOrbitZoom)
      const changed = next !== targetZoom
      if (changed) presentationRequested = true
      if (changed && mobile.matches) inputUntil = performance.now() + 220
      targetZoom = next
      invalidate()
      return changed
    },
    rotateBy(longitude, latitude) {
      if (disposed || flight) return
      presentationRequested = true
      if (mobile.matches) inputUntil = performance.now() + 220
      stopCoasting()
      const from = startView === endView ? endView : view
      const lon = from.longitude + longitude
      startView = endView = {
        longitude: Math.atan2(Math.sin(lon), Math.cos(lon)),
        latitude: MathUtils.clamp(from.latitude + latitude, -maxLatitude, maxLatitude),
      }
      invalidate()
    },
    coast(longitudeSpeed, latitudeSpeed) {
      if (disposed || flight || reducedMotion.matches) return
      const speed = Math.hypot(longitudeSpeed, latitudeSpeed)
      if (speed < 0.035) return
      // Integrating exponentially decaying angular velocity gives this total travel.
      const travel = coastDecaySeconds * Math.min(1, 4.5 / speed)
      startView = startView === endView ? endView : view
      endView = {
        longitude: startView.longitude + longitudeSpeed * travel,
        latitude: MathUtils.clamp(startView.latitude + latitudeSpeed * travel, -maxLatitude, maxLatitude),
      }
      coastStartedAt = performance.now()
      invalidate()
    },
    stopCoasting,
    setPose(next) {
      if (disposed) return
      if (next !== pose) {
        presentationRequested = true
        stopCoasting()
        targetZoom = 1
        pose = next
        startProgress = progress
        targetProgress = pose === 'experience' ? 1 : 0
        endView = orbitAngles(targetProgress)
        const delta = view.longitude - endView.longitude
        startView = { latitude: view.latitude, longitude: endView.longitude + Math.atan2(Math.sin(delta), Math.cos(delta)) }
        transitionStart = performance.now()
        invalidate()
      }
    },
    dispose
  }
}
