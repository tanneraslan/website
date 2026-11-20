import { nightLightingGLSL } from './night-lighting'
import {
  LinearMipmapLinearFilter, Mesh, RepeatWrapping, ShaderMaterial, TextureLoader, Vector3,
  type BufferGeometry, type Texture
} from 'three'

export const cloudCoverageGLSL = `
  uniform sampler2D cloudMap;
  vec2 cloudUV(vec3 normal) {
    return vec2(atan(normal.y, normal.x) / 6.2831853, asin(clamp(normal.z, -1.0, 1.0)) / 3.14159265) + 0.5;
  }
  float cloudOpacity(float density) {
    return 0.72 * pow(max(density - 0.025, 0.0), 2.2);
  }`

export type CloudSource = 'loading' | 'live' | 'snapshot' | 'unavailable'

export function createClouds(geometry: BufferGeometry, sunDirection: Vector3, nightMap: { value: Texture | null }, anisotropy: number,
  invalidate: () => void, onSource: (source: CloudSource) => void) {
  const uniforms = {
    cloudMap: { value: null as Texture | null },
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
        float density = textureGrad(cloudMap, cloudUV(n),
          vec2(dot(dx, east), dot(dx, north)) / scale,
          vec2(dot(dy, east), dot(dy, north)) / scale).r;
        float sun = dot(n, sunDirection);
        float daylight = smoothstep(-0.06, 0.16, sun);
        vec3 tint = mix(vec3(1.0, 0.60, 0.35), vec3(1.0, 0.98, 0.95), daylight);
        vec3 color = vec3(0.0016, 0.0022, 0.0035) + tint *
          (0.055 * smoothstep(-0.09, 0.12, sun) + 0.90 * max(sun, 0.0));
        // Cloud coverage modulates both moonlit tops and the light returned
        // by low clouds over a city. Clear ocean receives no city contribution.
        color += nightExposure(sun) * (vec3(0.032, 0.041, 0.073) * moonIllumination(n)
          + vec3(0.16, 0.10, 0.060) * urbanHaze(nightMap, cloudUV(n)));
        gl_FragColor = vec4(color, cloudOpacity(density));
      }`
  })
  const mesh = new Mesh(geometry, material)
  mesh.renderOrder = 2
  mesh.visible = false
  const loader = new TextureLoader()
  const interval = 3 * 60 * 60 * 1000
  let enabled = true, disposed = false, pending = false, hasLive = false
  let lastAttempt = -Infinity
  let lastWidth = 0
  let refreshTimer = 0

  function updateVisibility() {
    mesh.visible = enabled && uniforms.cloudMap.value != null
    uniforms.cloudStrength.value = mesh.visible ? 1 : 0
    invalidate()
  }

  function install(texture: Texture, source: 'live' | 'snapshot') {
    if (disposed || (source === 'snapshot' && hasLive)) { texture.dispose(); return }
    texture.wrapS = RepeatWrapping
    texture.minFilter = LinearMipmapLinearFilter
    texture.anisotropy = anisotropy
    uniforms.cloudMap.value?.dispose()
    uniforms.cloudMap.value = texture
    if (source === 'live') hasLive = true
    onSource(source)
    updateVisibility()
  }

  function refresh(diameter: number) {
    const width = diameter >= 550 ? 2048 : 1024
    if (!enabled || pending || disposed || (width <= lastWidth && Date.now() - lastAttempt < interval)) return
    if (lastWidth === 0) {
      loader.load('/earth/data/clouds-snapshot.webp', texture => install(texture, 'snapshot'), undefined, () => {})
    }
    pending = true
    lastWidth = width
    lastAttempt = Date.now()
    window.clearTimeout(refreshTimer)
    refreshTimer = window.setTimeout(invalidate, interval + 100)
    loader.load(`https://clouds.matteason.co.uk/images/${width}x${width / 2}/clouds.jpg`, texture => {
      pending = false
      install(texture, 'live')
    }, undefined, () => {
      pending = false
      if (!disposed) onSource(uniforms.cloudMap.value ? 'snapshot' : 'unavailable')
    })
  }

  return {
    mesh, uniforms, refresh,
    setEnabled(value: boolean) { enabled = value; updateVisibility() },
    dispose() {
      disposed = true
      window.clearTimeout(refreshTimer)
      uniforms.cloudMap.value?.dispose()
      material.dispose()
    }
  }
}
