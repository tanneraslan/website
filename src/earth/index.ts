import { PrecomputedTexturesLoader } from '@takram/three-atmosphere'
import { Ellipsoid } from '@takram/three-geospatial'
import {
  EffectComposer, EffectPass, RenderPass, ToneMappingEffect, ToneMappingMode
} from 'postprocessing'
import {
  CubeTextureLoader, HalfFloatType, LinearFilter, LinearMipmapLinearFilter,
  MathUtils, Mesh, PerspectiveCamera, RepeatWrapping, Scene,
  SRGBColorSpace, Texture, TextureLoader, Vector3, WebGLRenderer
} from 'three'
import { EarthAtmosphere } from './atmosphere'
import { createClouds } from './clouds'
import { CityBloomPass } from './city-bloom'
import { createComposite } from './composite'
import { cameraDistanceInRadii, globeDiameterFraction, orbitAngles } from './locations'
import { createEllipsoid, createSurface } from './surface'
import { loadCityPoints } from './city-points'

export type EarthPose = 'crescent' | 'experience'
export interface EarthOptions {
  initialPose: EarthPose
  onReady: () => void
  onError: () => void
}
export interface EarthController {
  observeOrbit: (listener: (progress: number) => void) => () => void
  setPose: (pose: EarthPose) => void
  dispose: () => void
}

const radius = Ellipsoid.WGS84.radii.x
const cameraDistance = cameraDistanceInRadii * radius
const northPole = new Vector3(0, 0, 1)
const orbitTime = 1400

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
  const camera = new PerspectiveCamera(35, 1, radius, radius * 8)
  camera.up.copy(northPole)
  const scene = new Scene()
  const atmosphere = new EarthAtmosphere(camera)
  const surface = createSurface(atmosphere)
  const globe = new Mesh(createEllipsoid(), surface)
  scene.add(globe)
  const composite = createComposite()
  const composer = new EffectComposer(renderer, { frameBufferType: HalfFloatType })
  composer.addPass(new RenderPass(scene, camera))
  composer.addPass(new EffectPass(camera, atmosphere))
  composer.addPass(new EffectPass(camera, composite.effect, new ToneMappingEffect({ mode: ToneMappingMode.ACES_FILMIC })))

  const textures = new Set<Texture>()
  const textureLoader = new TextureLoader()
  const anisotropy = Math.min(16, renderer.capabilities.getMaxAnisotropy())
  const clouds = createClouds(globe.geometry, surface.uniforms.sunDirection.value, surface.uniforms.night, anisotropy, invalidate)
  scene.add(clouds.mesh)
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)')
  const east = new Vector3()
  const north = new Vector3()
  const towardCamera = new Vector3()
  const sunLocal = new Vector3()
  const crescentSun = new Vector3(0.52, 0.16, -0.84).normalize()
  const experienceSun = new Vector3(0.81, 0.34, 0.48).normalize()
  let pose = options.initialPose
  let progress = pose === 'experience' ? 1 : 0
  const orbitListeners = new Set<(progress: number) => void>()
  let startProgress = progress
  let targetProgress = progress
  let transitionStart = 0
  let points: Awaited<ReturnType<typeof loadCityPoints>> | null = null
  const pointRequest = new AbortController()
  let cubeRequested = 0
  let cubeLoaded = 0
  let cubeReadyAt = Infinity
  let highMapsRequested = false
  let refineTimer = 0
  let frame = 0
  let wind: Texture
  let motionSeconds = 0
  let lastDraw = 0
  let animationTimer = 0
  let inView = true
  let ready = false
  let disposed = false
  let width = 0
  let height = 0

  function dispose() {
    if (disposed) return
    disposed = true
    cancelAnimationFrame(frame)
    window.clearTimeout(refineTimer)
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

  function draw(time: number) {
    frame = 0
    if (disposed || document.hidden || !inView || !ready) { lastDraw = 0; return }
    try {
      const w = canvas.clientWidth
      const h = canvas.clientHeight
      if (!w || !h) return
      const dpr = Math.min(window.devicePixelRatio || 1, 1.75, 1500 / Math.max(w, h),
        maxViewport[0] / w, maxViewport[1] / h)
      if (w !== width || h !== height || dpr !== renderer.getPixelRatio()) {
        width = w
        height = h
        renderer.setPixelRatio(dpr)
        composer.setSize(w, h, false)
        camera.aspect = w / h
        // tan(angular radius) projected onto a centered perspective plane.
        const tangent = radius / Math.sqrt(cameraDistance ** 2 - radius ** 2)
        camera.fov = 2 * MathUtils.radToDeg(Math.atan(tangent / (globeDiameterFraction * Math.min(1, camera.aspect))))
        camera.updateProjectionMatrix()
        composite.viewport.value.set(w, h)
        scheduleRefinement()
      }
      const t = reducedMotion.matches ? 1 : MathUtils.clamp((time - transitionStart) / orbitTime, 0, 1)
      const previousProgress = progress
      progress = MathUtils.lerp(startProgress, targetProgress, t * t * (3 - 2 * t))
      if (progress !== previousProgress) orbitListeners.forEach(listener => listener(progress))
      const { latitude: lat, longitude: lon } = orbitAngles(progress)
      towardCamera.set(Math.cos(lat)*Math.cos(lon), Math.cos(lat)*Math.sin(lon), Math.sin(lat))
      east.crossVectors(northPole, towardCamera).normalize()
      north.crossVectors(towardCamera, east)
      camera.position.copy(towardCamera).multiplyScalar(cameraDistance)
      camera.lookAt(0, 0, 0)

      sunLocal.lerpVectors(crescentSun, experienceSun, progress).normalize()
      atmosphere.sunDirection.copy(east).multiplyScalar(sunLocal.x)
        .addScaledVector(north, sunLocal.y).addScaledVector(towardCamera, sunLocal.z)
      surface.uniforms.sunDirection.value.copy(atmosphere.sunDirection)
      points?.updateView(camera.position, atmosphere.sunDirection)
      surface.uniforms.cubeMix.value = reducedMotion.matches && cubeReadyAt !== Infinity
        ? 1 : MathUtils.clamp((time - cubeReadyAt) / 300, 0, 1)
      if (!reducedMotion.matches && lastDraw) motionSeconds += Math.min(0.1, (time - lastDraw) / 1000)
      lastDraw = time
      surface.uniforms.oceanSeconds.value = motionSeconds
      clouds.advance(renderer, wind, time, motionSeconds)
      composer.render()
      if (!canvas.dataset.earthReady) {
        canvas.dataset.earthReady = 'true'
        options.onReady()
      }
      clouds.refresh()
      if ((startProgress !== targetProgress && t < 1) || (cubeReadyAt !== Infinity && surface.uniforms.cubeMix.value < 1)) invalidate()
      window.clearTimeout(animationTimer)
      if (!reducedMotion.matches) animationTimer = window.setTimeout(invalidate, 1000 / 30)
    } catch (error) {
      console.error('Earth rendering failed.', error)
      fail()
    }
  }

  function invalidate() {
    if (frame === 0 && ready && !disposed && !document.hidden) frame = requestAnimationFrame(draw)
  }
  const visibility = new IntersectionObserver(([entry]) => {
    inView = entry.isIntersecting
    lastDraw = 0
    if (inView) invalidate()
    else window.clearTimeout(animationTimer)
  })
  visibility.observe(canvas)
  const resize = new ResizeObserver(invalidate)
  resize.observe(canvas)
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
    if (disposed || !ready) return
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
        if (cubeReadyAt === Infinity) cubeReadyAt = performance.now()
        replaceTexture('dayCube', texture)
      }, undefined, () => {
        cube.dispose()
        textures.delete(cube)
      })
      cube.flipY = false
      configureTexture(cube, true)
    }
    if (diameter >= 690 && !highMapsRequested && renderer.capabilities.maxTextureSize >= 4096) {
      highMapsRequested = true
      for (const name of ['night', 'relief']) {
        loadMap(name + '-detail').then(texture => {
          if (!disposed) replaceTexture(name, texture)
        }).catch(() => { /* Keep the base map if this optional refinement fails. */ })
      }
    }
  }

  function scheduleRefinement() {
    window.clearTimeout(refineTimer)
    // Give the browser a paint with the base textures before optional requests.
    refineTimer = window.setTimeout(refineTextures, 120)
  }

  const cityPoints = loadCityPoints(pointRequest.signal).then(mesh => {
    if (disposed) {
      mesh.geometry.dispose()
      mesh.material.dispose()
      return
    }
    points = mesh
    scene.add(mesh)
  })

  const atmosphereTextures = new Promise<void>((resolve, reject) => {
    const loader = new PrecomputedTexturesLoader({ type: HalfFloatType, higherOrderScattering: false })
    const tables = loader.load('/earth/atmosphere', () => resolve(), undefined, reject)
    for (const texture of Object.values(tables)) if (texture) textures.add(texture)
    Object.assign(atmosphere, tables)
  })
  Promise.all([
    loadMap('day', true), loadMap('night'), loadMap('relief'), loadMap('bathymetry'),
    loadMap('water-normal'), loadMap('wind'), atmosphereTextures, clouds.loadSnapshot(), cityPoints
  ]).then(([day, night, relief, bathymetry, waterNormal, windField]) => {
    if (disposed) return
    waterNormal.wrapT = RepeatWrapping
    surface.uniforms.waterNormal.value = waterNormal
    surface.uniforms.bathymetry.value = bathymetry
    wind = windField
    surface.uniforms.day.value = day
    surface.uniforms.relief.value = relief
    surface.uniforms.night.value = night
    if (points && atmosphere.transmittanceTexture) {
      composer.addPass(new CityBloomPass(camera, points, atmosphere.transmittanceTexture, clouds.uniforms), 2)
    }
    ready = true
    invalidate()
  }).catch(error => {
    if (!disposed) console.warn('Earth rendering assets could not be loaded.', error)
    fail()
  })

  return {
    observeOrbit(listener) {
      orbitListeners.add(listener)
      listener(progress)
      return () => { orbitListeners.delete(listener) }
    },
    setPose(next) {
      if (disposed) return
      if (next !== pose) {
        pose = next
        startProgress = progress
        targetProgress = pose === 'experience' ? 1 : 0
        transitionStart = performance.now()
        invalidate()
      }
    },
    dispose
  }
}
