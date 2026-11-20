import { AerialPerspectiveEffect, PrecomputedTexturesLoader } from '@takram/three-atmosphere'
import { Ellipsoid } from '@takram/three-geospatial'
import {
  EffectComposer, EffectPass, RenderPass, ToneMappingEffect, ToneMappingMode
} from 'postprocessing'
import {
  HalfFloatType, MathUtils, Mesh, PerspectiveCamera, RepeatWrapping, Scene,
  SRGBColorSpace, Texture, TextureLoader, Vector3, WebGLRenderer
} from 'three'
import { createComposite } from './composite'
import { createEllipsoid, createPins, createSurface } from './surface'

export type EarthPose = 'crescent' | 'experience'
export interface EarthOptions {
  initialPose: EarthPose
  onReady: () => void
  onError: () => void
  glassBounds?: () => DOMRect | null
}
export interface EarthController {
  setPose: (pose: EarthPose) => void
  setSunOffset: (degrees: number) => void
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
  let detailStarted = false
  let detailReadyAt = Infinity
  let frame = 0
  let ready = false
  let disposed = false
  let width = 0
  let height = 0

  function dispose() {
    if (disposed) return
    disposed = true
    cancelAnimationFrame(frame)
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
      const dpr = Math.min(window.devicePixelRatio || 1, 1.75, 1500 / Math.max(w, h))
      if (w !== width || h !== height || dpr !== renderer.getPixelRatio()) {
        width = w
        height = h
        renderer.setPixelRatio(dpr)
        composer.setSize(w, h, false)
        camera.aspect = w / h
        // tan(angular radius) projected onto a centered perspective plane.
        const tangent = radius / Math.sqrt(cameraDistance ** 2 - radius ** 2)
        camera.fov = 2 * MathUtils.radToDeg(Math.atan(tangent / (0.85 * Math.min(1, camera.aspect))))
        camera.updateProjectionMatrix()
        pins.material.uniforms.pixelRatio.value = dpr
        composite.viewport.value.set(w, h)
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
      const detailFade = reducedMotion.matches && detailReadyAt !== Infinity
        ? 1 : MathUtils.clamp((time - detailReadyAt) / 400, 0, 1)
      surface.uniforms.detailMix.value = progress * detailFade
      pins.visible = progress > 0.48
      pins.material.uniforms.strength.value = MathUtils.smoothstep(progress, 0.48, 0.88)
      const glass = options.glassBounds?.()
      if (glass) {
        const bounds = canvas.getBoundingClientRect()
        composite.lens.value.set(glass.left - bounds.left, bounds.bottom - glass.bottom, glass.width, glass.height)
      } else {
        composite.lens.value.set(0, 0, 0, 0)
      }
      composer.render()
      if (!canvas.dataset.earthReady) {
        canvas.dataset.earthReady = 'true'
        options.onReady()
      }
      if ((startProgress !== targetProgress && t < 1) || (detailReadyAt !== Infinity && detailFade < 1)) invalidate()
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

  function loadMap(name: string, color = false, global = true): Promise<Texture> {
    return new Promise((resolve, reject) => {
      const texture = textureLoader.load('/earth/data/' + name + '.webp', resolve, undefined, reject)
      if (global) texture.wrapS = RepeatWrapping
      if (color) texture.colorSpace = SRGBColorSpace
      textures.add(texture)
    })
  }

  function refine() {
    if (detailStarted || !ready || pose !== 'experience') return
    detailStarted = true
    Promise.all([loadMap('north-america-day', true, false), loadMap('north-america-relief', false, false)])
      .then(([day, relief]) => {
        if (disposed) return
        surface.uniforms.detailDay.value = day
        surface.uniforms.detailRelief.value = relief
        detailReadyAt = performance.now()
        invalidate()
      }).catch(() => {
        // The global textures cover the same geography if a detail request fails.
        detailStarted = false
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
      surface.uniforms.day.value = surface.uniforms.detailDay.value = day
      surface.uniforms.relief.value = surface.uniforms.detailRelief.value = relief
      surface.uniforms.night.value = night
      ready = true
      invalidate()
      refine()
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
      refine()
    },
    setSunOffset(degrees) {
      if (!Number.isFinite(degrees) || disposed) return
      sunOffset = MathUtils.clamp(degrees, -30, 30)
      invalidate()
    },
    dispose
  }
}
