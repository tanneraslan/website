import { AerialPerspectiveEffect, PrecomputedTexturesLoader } from '@takram/three-atmosphere'
import { Ellipsoid } from '@takram/three-geospatial'
import {
  EffectComposer, EffectPass, RenderPass, ToneMappingEffect, ToneMappingMode
} from 'postprocessing'
import {
  CubeTextureLoader, HalfFloatType, LinearFilter, LinearMipmapLinearFilter,
  MathUtils, Mesh, PerspectiveCamera, RepeatWrapping, Scene,
  SRGBColorSpace, Texture, TextureLoader, Vector3, WebGLRenderer
} from 'three'
import { createComposite } from './composite'
import { createEllipsoid, createPins, createSurface } from './surface'
import { loadCityPoints } from './city-points'

export type EarthPose = 'crescent' | 'experience'
export interface EarthOptions {
  initialPose: EarthPose
  onReady: () => void
  onError: () => void
  onComparisonState?: (state: 'loading' | 'ready' | 'error') => void
  glassBounds?: () => DOMRect | null
}
export interface EarthController {
  setPose: (pose: EarthPose) => void
  setSunOffset: (degrees: number) => void
  setCompare: (enabled: boolean) => void
  dispose: () => void
}

const radius = Ellipsoid.WGS84.radii.x
const cameraDistance = 4 * radius
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
  const surface = createSurface()
  const globe = new Mesh(createEllipsoid(), surface)
  const pins = createPins()
  scene.add(globe, pins)
  const atmosphere = new AerialPerspectiveEffect(camera, {
    sky: true, ground: false, sun: false, moon: false, sunLight: false, skyLight: false
  })
  const composite = createComposite()
  const composer = new EffectComposer(renderer, { frameBufferType: HalfFloatType })
  composer.addPass(new RenderPass(scene, camera))
  composer.addPass(new EffectPass(camera, atmosphere))
  composer.addPass(new EffectPass(camera, composite.effect, new ToneMappingEffect({ mode: ToneMappingMode.ACES_FILMIC })))

  const textures = new Set<Texture>()
  const textureLoader = new TextureLoader()
  const anisotropy = Math.min(16, renderer.capabilities.getMaxAnisotropy())
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)')
  const east = new Vector3()
  const north = new Vector3()
  const towardCamera = new Vector3()
  const sunLocal = new Vector3()
  const crescentSun = new Vector3(0.52, 0.16, -0.84).normalize()
  const experienceSun = new Vector3(0.81, 0.34, 0.48).normalize()
  const localY = new Vector3(0, 1, 0)
  let pose = options.initialPose
  let progress = pose === 'experience' ? 1 : 0
  let startProgress = progress
  let targetProgress = progress
  let transitionStart = 0
  let sunOffset = 0
  let compare = false
  let points: Awaited<ReturnType<typeof loadCityPoints>> | null = null
  let pointRequest: AbortController | null = null
  let comparisonReady = false
  let paneWidth = 0
  let cubeRequested = 0
  let cubeLoaded = 0
  let cubeReadyAt = Infinity
  let highMapsRequested = false
  let refineTimer = 0
  let frame = 0
  let ready = false
  let disposed = false
  let width = 0
  let height = 0

  function dispose() {
    if (disposed) return
    disposed = true
    cancelAnimationFrame(frame)
    window.clearTimeout(refineTimer)
    releasePoints()
    resize.disconnect()
    document.removeEventListener('visibilitychange', invalidate)
    document.removeEventListener('scroll', invalidate, true)
    canvas.removeEventListener('webglcontextlost', fail)
    reducedMotion.removeEventListener('change', invalidate)
    composer.dispose()
    globe.geometry.dispose()
    surface.dispose()
    pins.geometry.dispose()
    pins.material.dispose()
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
    if (disposed || document.hidden || !ready) return
    try {
      const w = canvas.clientWidth
      const h = canvas.clientHeight
      if (!w || !h) return
      const pane = compare ? w * 0.5 : w
      const dpr = Math.min(window.devicePixelRatio || 1, 1.75, 1500 / Math.max(pane, h),
        maxViewport[0] / w, maxViewport[1] / h)
      if (w !== width || h !== height || pane !== paneWidth || dpr !== renderer.getPixelRatio()) {
        width = w
        height = h
        paneWidth = pane
        renderer.setPixelRatio(dpr)
        // All offscreen passes render a complete pane. Only the final pass is
        // scissored into the shared wide default framebuffer.
        composer.setSize(pane, h, false)
        renderer.setSize(w, h, false)
        camera.aspect = pane / h
        // tan(angular radius) projected onto a centered perspective plane.
        const tangent = radius / Math.sqrt(cameraDistance ** 2 - radius ** 2)
        camera.fov = 2 * MathUtils.radToDeg(Math.atan(tangent / (0.85 * Math.min(1, camera.aspect))))
        camera.updateProjectionMatrix()
        pins.material.uniforms.pixelRatio.value = dpr
        composite.viewport.value.set(pane, h)
        scheduleRefinement()
      }
      const t = reducedMotion.matches ? 1 : MathUtils.clamp((time - transitionStart) / orbitTime, 0, 1)
      progress = MathUtils.lerp(startProgress, targetProgress, t * t * (3 - 2 * t))
      const lat = MathUtils.degToRad(MathUtils.lerp(28, 40, progress))
      const lon = MathUtils.degToRad(MathUtils.lerp(-88, -98, progress))
      towardCamera.set(Math.cos(lat)*Math.cos(lon), Math.cos(lat)*Math.sin(lon), Math.sin(lat))
      east.crossVectors(northPole, towardCamera).normalize()
      north.crossVectors(towardCamera, east)
      camera.position.copy(towardCamera).multiplyScalar(cameraDistance)
      camera.lookAt(0, 0, 0)

      sunLocal.lerpVectors(crescentSun, experienceSun, progress).normalize()
      sunLocal.applyAxisAngle(localY, -MathUtils.degToRad(sunOffset))
      atmosphere.sunDirection.copy(east).multiplyScalar(sunLocal.x)
        .addScaledVector(north, sunLocal.y).addScaledVector(towardCamera, sunLocal.z)
      surface.uniforms.sunDirection.value.copy(atmosphere.sunDirection)
      points?.updateView(camera.position, atmosphere.sunDirection)
      surface.uniforms.cubeMix.value = reducedMotion.matches && cubeReadyAt !== Infinity
        ? 1 : MathUtils.clamp((time - cubeReadyAt) / 300, 0, 1)
      pins.visible = progress > 0.48
      pins.material.uniforms.strength.value = MathUtils.smoothstep(progress, 0.48, 0.88)
      const glass = options.glassBounds?.()
      const bounds = glass ? canvas.getBoundingClientRect() : null
      renderer.setScissorTest(compare)
      const paneCount = compare ? 2 : 1
      for (let i = 0; i < paneCount; i++) {
        // Integer drawing-buffer edges keep adjacent panes gap-free at fractional DPR.
        const left = Math.floor(canvas.width * i / paneCount)
        const right = Math.floor(canvas.width * (i + 1) / paneCount)
        const x = left / dpr
        const screenWidth = (right - left + 0.0001) / dpr
        renderer.setViewport(x + 0.0001 / dpr, 0, screenWidth, h)
        renderer.setScissor(x + 0.0001 / dpr, 0, screenWidth, h)
        if (glass && bounds) composite.lens.value.set(glass.left - bounds.left - x, bounds.bottom - glass.bottom, glass.width, glass.height)
        else composite.lens.value.set(0, 0, 0, 0)
        surface.uniforms.textureCores.value = i === 0 ? 1 : 0
        if (points) points.visible = i === 1
        composer.render()
      }
      if (compare && points && !comparisonReady) {
        comparisonReady = true
        options.onComparisonState?.('ready')
      }
      if (!canvas.dataset.earthReady) {
        canvas.dataset.earthReady = 'true'
        options.onReady()
      }
      if ((startProgress !== targetProgress && t < 1) || (cubeReadyAt !== Infinity && surface.uniforms.cubeMix.value < 1)) invalidate()
    } catch (error) {
      console.error('Earth rendering failed.', error)
      fail()
    }
  }

  function invalidate() {
    if (frame === 0 && ready && !disposed && !document.hidden) frame = requestAnimationFrame(draw)
  }
  const resize = new ResizeObserver(invalidate)
  resize.observe(canvas)
  delete canvas.dataset.earthReady
  canvas.addEventListener('webglcontextlost', fail)
  reducedMotion.addEventListener('change', invalidate)
  document.addEventListener('visibilitychange', invalidate)
  if (options.glassBounds) document.addEventListener('scroll', invalidate, { passive: true, capture: true })

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
    const diameter = 0.85 * Math.min(paneWidth, height) * renderer.getPixelRatio()
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

  function releasePoints() {
    pointRequest?.abort()
    pointRequest = null
    if (points) {
      scene.remove(points)
      points.geometry.dispose()
      points.material.dispose()
      points = null
    }
    comparisonReady = false
  }

  function requestPoints() {
    if (pointRequest || !compare || !ready) return
    const request = new AbortController()
    pointRequest = request
    options.onComparisonState?.('loading')
    loadCityPoints(request.signal).then(mesh => {
      if (disposed || request.signal.aborted) {
        mesh.geometry.dispose()
        mesh.material.dispose()
        return
      }
      points = mesh
      scene.add(mesh)
      invalidate()
    }).catch(error => {
      if (request.signal.aborted || disposed) return
      console.warn('The instanced city lights could not be loaded.', error)
      options.onComparisonState?.('error')
    })
  }

  const atmosphereTextures = new Promise<void>((resolve, reject) => {
    const loader = new PrecomputedTexturesLoader({ type: HalfFloatType, higherOrderScattering: false })
    const tables = loader.load('/earth/atmosphere', () => resolve(), undefined, reject)
    for (const texture of Object.values(tables)) if (texture) textures.add(texture)
    Object.assign(atmosphere, tables)
  })
  Promise.all([loadMap('day', true), loadMap('night'), loadMap('relief'), atmosphereTextures])
    .then(([day, night, relief]) => {
      if (disposed) return
      surface.uniforms.day.value = day
      surface.uniforms.relief.value = relief
      surface.uniforms.night.value = night
      ready = true
      invalidate()
      requestPoints()
    }).catch(error => {
      if (!disposed) console.warn('Earth textures could not be loaded.', error)
      fail()
    })

  return {
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
    setCompare(enabled) {
      if (disposed || enabled === compare) return
      compare = enabled
      if (enabled) requestPoints()
      else releasePoints()
      invalidate()
    },
    setSunOffset(degrees) {
      if (!Number.isFinite(degrees) || disposed) return
      sunOffset = MathUtils.clamp(degrees, -180, 180)
      invalidate()
    },
    dispose
  }
}
