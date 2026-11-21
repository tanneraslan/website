import { bumpGLSL } from './bump'
import { createCloudFlow } from './cloud-flow'
import { nightLightingGLSL } from './night-lighting'
import {
  LinearMipmapLinearFilter, Mesh, RepeatWrapping, ShaderMaterial, TextureLoader, Vector3,
  type BufferGeometry, type Texture, type WebGLRenderer
} from 'three'

export const cloudCoverageGLSL = `
  uniform sampler2D cloudMap;
  vec2 cloudUV(vec3 normal) {
    return vec2(atan(normal.y, normal.x) / 6.2831853, asin(clamp(normal.z, -1.0, 1.0)) / 3.14159265) + 0.5;
  }
  float cloudOpacity(float density) {
    // Earth preset: cloud amount 0.5, threshold 0.5, transition width 0.25.
    return density * smoothstep(0.25, 0.5, density);
  }
  float nightCloudOpacity(float opacity) {
    // A bright direct lamp loses contrast faster than the softly lit cloud.
    return 1.0 - pow(1.0 - opacity, 2.15);
  }`

export function createClouds(geometry: BufferGeometry, sunDirection: Vector3, nightMap: { value: Texture | null },
  elevation: { value: Texture | null }, anisotropy: number) {
  const flow = createCloudFlow(anisotropy)
  const uniforms = {
    cloudMap: { value: flow.texture },
    cloudStrength: { value: 0 },
    sunDirection: { value: sunDirection }, nightMap, elevation
  }
  const material = new ShaderMaterial({
    transparent: true, depthWrite: false, depthTest: true, uniforms,
    vertexShader: `
      varying vec3 shellPosition;
      void main() {
        vec3 normal = normalize(position * vec3(1.0, 1.0, 1.0067395));
        shellPosition = position + normal * 8500.0;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(shellPosition, 1.0);
      }`,
    fragmentShader: `
      uniform vec3 sunDirection;
      uniform sampler2D nightMap, elevation;
      varying vec3 shellPosition;
      ${cloudCoverageGLSL}
      ${nightLightingGLSL}
      ${bumpGLSL}
      void main() {
        vec3 n = normalize(shellPosition * vec3(1.0, 1.0, 1.0067395));
        vec3 east = vec3(-n.y, n.x, 0.0) / max(length(n.xy), 0.00001);
        vec3 north = cross(n, east);
        vec3 dx = dFdx(n), dy = dFdy(n);
        vec2 scale = vec2(6.2831853 * max(length(n.xy), 0.00001), 3.14159265);
        vec2 uv = cloudUV(n);
        vec2 uvDx = vec2(dot(dx, east), dot(dx, north)) / scale;
        vec2 uvDy = vec2(dot(dy, east), dot(dy, north)) / scale;
        float density = textureGrad(cloudMap, uv, uvDx, uvDy).r;
        float width = float(textureSize(cloudMap, 0).x);
        BumpStencil stencil = bumpStencil(n, east, north, width);
        if (density <= 0.25) discard;
        vec4 land = bumpSamples(elevation, stencil, uvDx, uvDy);
        vec4 clouds = smoothstep(vec4(-0.5), vec4(2.0), bumpSamples(cloudMap, stencil, uvDx, uvDy));
        vec3 top = bumpNormal(n, east, north, stencil, mix(land, max(land, clouds), 0.75), 0.005);
        float sunlight = max(dot(top, sunDirection), 0.0);
        float sun = dot(n, sunDirection);
        float daylight = smoothstep(-0.06, 0.16, sun);
        vec3 tint = mix(vec3(1.0, 0.60, 0.35), vec3(1.0, 0.98, 0.95), daylight);
        vec3 color = vec3(0.0016, 0.0022, 0.0035) + tint *
          (0.055 * smoothstep(-0.09, 0.12, sun) + 1.35 * sunlight * sunlight);
        // Cloud coverage modulates both moonlit tops and the light returned
        // by low clouds over a city. Clear ocean receives no city contribution.
        float darkness = nightExposure(sun);
        float coverage = cloudOpacity(density);
        color += darkness * (vec3(0.032, 0.041, 0.073) * moonIllumination(top)
          + vec3(0.16, 0.10, 0.060) * urbanHaze(nightMap, cloudUV(n)));
        if (darkness * coverage > 0.0) {
          // Sample a wider geographic footprint for thicker clouds. The same
          // satellite emission field illuminates the cloud deck.
          float baseLod = log2(float(textureSize(nightMap, 0).x) / 2048.0);
          float blurLod = max(baseLod + 0.8 + 3.0 * coverage, 0.0);
          float flux = textureLod(nightMap, cloudUV(n), blurLod).r;
          color += vec3(0.75, 0.47, 0.22) * flux * darkness;
        }
        gl_FragColor = vec4(color, coverage);
      }`
  })
  const mesh = new Mesh(geometry, material)
  mesh.renderOrder = 2
  mesh.visible = false
  let source: Texture | null = null
  let disposed = false
  let lastRender = -Infinity
  let lastSeconds = -1
  let lastWidth = 0

  async function loadCoverage() {
    try {
      const texture = await new TextureLoader().loadAsync('/earth/data/cloud-coverage.jpg')
      if (disposed) { texture.dispose(); return }
      texture.wrapS = RepeatWrapping
      texture.minFilter = LinearMipmapLinearFilter
      texture.anisotropy = anisotropy
      source = texture
      mesh.visible = true
      uniforms.cloudStrength.value = 1
    } catch {
      // Keep the surface and city lights available if the optional cloud map fails.
    }
  }

  function advance(renderer: WebGLRenderer, wind: Texture, time: number, seconds: number) {
    const width = renderer.domElement.width
    if (!source || (width === lastWidth && (seconds === lastSeconds || time - lastRender < 125))) return
    flow.render(renderer, wind, source, seconds)
    lastSeconds = seconds
    lastRender = time
    lastWidth = width
  }

  return {
    mesh, uniforms, loadCoverage, advance,
    dispose() {
      disposed = true
      source?.dispose()
      flow.dispose()
      material.dispose()
    }
  }
}
