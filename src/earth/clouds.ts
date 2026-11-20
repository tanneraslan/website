import { nightLightingGLSL } from './night-lighting'
import {
  DataTexture, LinearMipmapLinearFilter, Mesh, RedFormat, RepeatWrapping, ShaderMaterial, TextureLoader, Vector3,
  type BufferGeometry, type Texture
} from 'three'

export const cloudCoverageGLSL = `
  uniform sampler2D cloudMap, previousCloudMap;
  uniform float cloudBlend;
  vec2 cloudUV(vec3 normal) {
    return vec2(atan(normal.y, normal.x) / 6.2831853, asin(clamp(normal.z, -1.0, 1.0)) / 3.14159265) + 0.5;
  }
  float cloudOpacity(float density) {
    return 0.72 * pow(max(density - 0.025, 0.0), 2.2);
  }
  float nightCloudOpacity(float opacity) {
    // A bright direct lamp loses contrast faster than the softly lit cloud.
    return 1.0 - pow(1.0 - opacity, 2.15);
  }`

export type CloudSource = 'loading' | 'live' | 'snapshot' | 'unavailable'

export function createClouds(geometry: BufferGeometry, sunDirection: Vector3, nightMap: { value: Texture | null }, anisotropy: number,
  invalidate: () => void, onSource: (source: CloudSource) => void) {
  const clearSky = new DataTexture(new Uint8Array([0]), 1, 1, RedFormat)
  clearSky.needsUpdate = true
  const uniforms = {
    cloudMap: { value: clearSky as Texture }, previousCloudMap: { value: clearSky as Texture },
    cloudBlend: { value: 1 },
    cloudStrength: { value: 0 },
    sunDirection: { value: sunDirection }, nightMap
  }
  const material = new ShaderMaterial({
    transparent: true, depthWrite: false, depthTest: false, uniforms,
    vertexShader: `
      varying vec3 shellPosition;
      void main() {
        vec3 normal = normalize(position * vec3(1.0, 1.0, 1.0067395));
        shellPosition = position + normal * 8500.0;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(shellPosition, 1.0);
      }`,
    fragmentShader: `
      uniform vec3 sunDirection;
      uniform sampler2D nightMap;
      varying vec3 shellPosition;
      ${cloudCoverageGLSL}
      ${nightLightingGLSL}
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
        if (cloudBlend < 1.0) {
          float previous = textureGrad(previousCloudMap, uv, uvDx, uvDy).r;
          density = mix(previous, density, cloudBlend);
        }
        float sun = dot(n, sunDirection);
        float daylight = smoothstep(-0.06, 0.16, sun);
        vec3 tint = mix(vec3(1.0, 0.60, 0.35), vec3(1.0, 0.98, 0.95), daylight);
        vec3 color = vec3(0.0016, 0.0022, 0.0035) + tint *
          (0.055 * smoothstep(-0.09, 0.12, sun) + 0.90 * max(sun, 0.0));
        // Cloud coverage modulates both moonlit tops and the light returned
        // by low clouds over a city. Clear ocean receives no city contribution.
        float darkness = nightExposure(sun);
        float coverage = cloudOpacity(density);
        color += darkness * (vec3(0.032, 0.041, 0.073) * moonIllumination(n)
          + vec3(0.16, 0.10, 0.060) * urbanHaze(nightMap, cloudUV(n)));
        if (darkness * coverage > 0.0) {
          // Sample a wider geographic footprint for thicker clouds. The same
          // satellite emission field illuminates the cloud deck in both panes.
          float baseLod = log2(float(textureSize(nightMap, 0).x) / 2048.0);
          float blurLod = max(baseLod + 0.8 + 3.0 * coverage, 0.0);
          float flux = textureLod(nightMap, cloudUV(n), blurLod).r;
          color += vec3(0.75, 0.47, 0.22) * flux * darkness;
        }
        gl_FragColor = vec4(color, mix(coverage, nightCloudOpacity(coverage), darkness));
      }`
  })
  const mesh = new Mesh(geometry, material)
  mesh.renderOrder = 2
  mesh.visible = false
  const loader = new TextureLoader()
  const interval = 3 * 60 * 60 * 1000
  let enabled = true, disposed = false, pending = false
  let transitionStart = 0
  let lastAttempt = -Infinity
  let refreshTimer = 0

  function updateVisibility() {
    mesh.visible = enabled && uniforms.cloudMap.value !== clearSky
    uniforms.cloudStrength.value = mesh.visible ? 1 : 0
    invalidate()
  }

  function install(texture: Texture, source: 'live' | 'snapshot') {
    if (disposed) { texture.dispose(); return }
    texture.wrapS = RepeatWrapping
    texture.minFilter = LinearMipmapLinearFilter
    texture.anisotropy = anisotropy
    uniforms.previousCloudMap.value = uniforms.cloudMap.value
    uniforms.cloudMap.value = texture
    uniforms.cloudBlend.value = source === 'snapshot' ? 1 : 0
    transitionStart = performance.now()
    onSource(source)
    updateVisibility()
  }

  async function loadSnapshot() {
    try {
      install(await loader.loadAsync('/earth/data/clouds-snapshot.webp'), 'snapshot')
    } catch {
      // The Earth still works when this optional local asset fails.
      if (!disposed) onSource('unavailable')
    }
  }

  function advance(time: number) {
    if (uniforms.cloudBlend.value >= 1) return
    const t = Math.max(0, Math.min(1, (time - transitionStart) / 750))
    uniforms.cloudBlend.value = t * t * (3 - 2 * t)
    if (t < 1) {
      invalidate()
    } else {
      if (uniforms.previousCloudMap.value !== clearSky) uniforms.previousCloudMap.value.dispose()
      uniforms.previousCloudMap.value = clearSky
    }
  }

  function refresh() {
    if (!enabled || pending || disposed || Date.now() - lastAttempt < interval) return
    pending = true
    lastAttempt = Date.now()
    window.clearTimeout(refreshTimer)
    refreshTimer = window.setTimeout(invalidate, interval + 100)
    loader.load('https://clouds.matteason.co.uk/images/2048x1024/clouds.jpg', texture => {
      pending = false
      install(texture, 'live')
    }, undefined, () => {
      pending = false
      if (!disposed) onSource(uniforms.cloudMap.value !== clearSky ? 'snapshot' : 'unavailable')
    })
  }

  return {
    mesh, uniforms, loadSnapshot, advance, refresh,
    setEnabled(value: boolean) { enabled = value; updateVisibility() },
    dispose() {
      disposed = true
      window.clearTimeout(refreshTimer)
      new Set([clearSky, uniforms.previousCloudMap.value, uniforms.cloudMap.value]).forEach(texture => texture.dispose())
      material.dispose()
    }
  }
}
