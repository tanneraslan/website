import { MipmapBlurPass, Pass } from 'postprocessing'
import {
  CustomBlending, Float32BufferAttribute, HalfFloatType, InstancedBufferGeometry,
  Mesh, OneFactor, Scene, ShaderMaterial, Vector2, WebGLRenderTarget, ZeroFactor,
  type Camera, type Texture, type WebGLRenderer
} from 'three'
import { cloudCoverageGLSL, type createClouds } from './clouds'
import { lampVertexGLSL, type loadCityPoints } from './city-points'

type Lamps = Awaited<ReturnType<typeof loadCityPoints>>

// Add in linear HDR and preserve the destination alpha. The final pass handles
// the sky's transparency and the single display/tone-map conversion.
const additive = {
  transparent: true, depthTest: false, depthWrite: false, blending: CustomBlending,
  blendSrc: OneFactor, blendDst: OneFactor, blendSrcAlpha: ZeroFactor, blendDstAlpha: OneFactor
} as const

export class CityBloomPass extends Pass {
  private readonly emission = new WebGLRenderTarget(1, 1, { type: HalfFloatType, depthBuffer: false })
  private readonly bloomBlur = new MipmapBlurPass()
  private readonly lampScene = new Scene()
  private readonly splats: Mesh<InstancedBufferGeometry, ShaderMaterial>

  constructor(private readonly orbitCamera: Camera, private readonly lamps: Lamps, transmittance: Texture,
    clouds: ReturnType<typeof createClouds>['uniforms']) {
    super('CityLampBloom')
    this.needsSwap = false
    this.bloomBlur.levels = 3
    this.bloomBlur.radius = 0.38
    const geometry = new InstancedBufferGeometry()
    geometry.setAttribute('position', new Float32BufferAttribute([-1,-1,0, 1,-1,0, 1,1,0, -1,1,0], 3))
    geometry.setIndex([0,1,2, 0,2,3])
    // Reuse the compacted visible-light buffer, including its GPU allocation.
    for (const name of ['lampCenter', 'lampValues']) {
      geometry.setAttribute(name, lamps.geometry.getAttribute(name))
    }
    this.splats = new Mesh(geometry, new ShaderMaterial({
      ...additive,
      uniforms: {
        sunDirection: lamps.material.uniforms.sunDirection,
        sourceSize: { value: new Vector2() },
        air: { value: transmittance },
        cloudMap: clouds.cloudMap, cloudStrength: clouds.cloudStrength
      },
      vertexShader: `
        uniform vec2 sourceSize;
        uniform float cloudStrength;
        ${cloudCoverageGLSL}
        uniform sampler2D air;
        varying vec2 footprint;
        varying vec3 energy;
        ${lampVertexGLSL}
        // Bruneton ground-to-space lookup at the lamp's altitude and viewing
        // zenith. The orbit camera is always above the upper atmosphere.
        vec3 transmission(float viewCos) {
          const float bottom = 6360.0, top = 6420.0;
          vec3 normal = normalize(lampCenter * vec3(1.0, 1.0, 1.00673950));
          vec3 radii = vec3(6378.137, 6378.137, 6356.7523);
          vec3 ground = radii * radii * normal / length(radii * normal);
          float r = bottom + max(dot(lampCenter * 0.001 - ground, normal), 0.0);
          float horizon = sqrt((top-bottom) * (top+bottom));
          float rho = sqrt(max(0.0, (r-bottom) * (r+bottom)));
          float d = (top-r) * (top+r) / (sqrt(r*r*viewCos*viewCos + (top-r)*(top+r)) + r*viewCos);
          vec2 uv = vec2((d - (top-r)) / (rho + horizon - (top-r)), rho / horizon);
          vec2 size = vec2(textureSize(air, 0));
          return textureLod(air, (0.5 + clamp(uv, 0.0, 1.0) * (size-1.0)) / size, 0.0).rgb;
        }
        void main() {
          Lamp lamp = sampleLamp();
          if (lamp.diameter <= 0.0 || lamp.viewCos <= 0.0) {
            gl_Position = vec4(2.0, 2.0, 2.0, 1.0);
            return;
          }
          vec4 clip = projectionMatrix * viewMatrix * vec4(lamp.center, 1.0);
          float radiusPx = lamp.diameter * 0.25 * sourceSize.y * projectionMatrix[1][1] / clip.w;
          // Conserve projected area while filtering lights smaller than a pixel.
          // The Gaussian integral is 2*pi*sigma²; the lamp disc area is pi*r².
          float sigma = max(0.72, radiusPx * 0.5);
          energy = lamp.color * transmission(lamp.viewCos) * (0.5 * radiusPx*radiusPx / (sigma*sigma));
          if (cloudStrength > 0.0) {
            vec3 view = normalize(cameraPosition - lampCenter);
            vec3 shell = lampCenter + view * (8500.0 / max(lamp.viewCos, 0.08));
            vec3 normal = normalize(shell * vec3(1.0, 1.0, 1.0067395));
            energy *= 1.0 - cloudOpacity(textureLod(cloudMap, cloudUV(normal), 0.0).r);
          }
          footprint = position.xy * 3.0;
          clip.xy += footprint * (2.0 * sigma / sourceSize) * clip.w;
          gl_Position = clip;
        }`,
      fragmentShader: `
        varying vec2 footprint;
        varying vec3 energy;
        void main() {
          gl_FragColor = vec4(energy * exp(-0.5 * dot(footprint, footprint)), 0.0);
        }`
    }))
    this.splats.frustumCulled = false
    this.lampScene.add(this.splats)
    this.fullscreenMaterial = new ShaderMaterial({
      ...additive,
      uniforms: { core: { value: this.emission.texture }, halo: { value: this.bloomBlur.texture } },
      vertexShader: `varying vec2 sampleUV;
        void main() { sampleUV = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }`,
      fragmentShader: `uniform sampler2D core, halo; varying vec2 sampleUV;
        void main() {
          vec3 glow = 0.060 * texture2D(core, sampleUV).rgb + 0.115 * texture2D(halo, sampleUV).rgb;
          // Compress the brightest clusters to retain distinct urban cores.
          glow *= vec3(1.0, 0.76, 0.55) / (1.0 + 4.0 * max(glow.r, max(glow.g, glow.b)));
          gl_FragColor = vec4(glow, 0.0);
        }`
    })
  }

  override initialize(renderer: WebGLRenderer) {
    this.bloomBlur.initialize(renderer, true, HalfFloatType)
  }

  override render(renderer: WebGLRenderer, input: WebGLRenderTarget) {
    const count = this.lamps.geometry.instanceCount
    if (count === 0) return
    this.splats.geometry.instanceCount = count
    const w = Math.max(8, Math.round(input.width / 2))
    const h = Math.max(8, Math.round(input.height / 2))
    if (w !== this.emission.width || h !== this.emission.height) {
      this.emission.setSize(w, h)
      this.bloomBlur.setSize(w, h)
      this.splats.material.uniforms.sourceSize.value.set(w, h)
    }
    renderer.setRenderTarget(this.emission)
    renderer.clear(true, false, false)
    renderer.render(this.lampScene, this.orbitCamera)
    this.bloomBlur.render(renderer, this.emission, null)
    // Add to the existing atmosphere result in-place, without reading it.
    renderer.setRenderTarget(input)
    renderer.render(this.scene, this.camera)
  }

  override dispose() {
    this.splats.geometry.dispose()
    this.splats.material.dispose()
    this.emission.dispose()
    this.bloomBlur.dispose()
    this.fullscreenMaterial.dispose()
  }
}
