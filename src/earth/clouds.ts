import { atmosphereLightingGLSL, atmosphereLightingUniforms, type EarthAtmosphere } from './atmosphere'
import { cloudNoiseGLSL } from './cloud-noise'
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
  float flightDeck(vec3 normal, vec3 target, float coverage) {
    float local = 1.0 - smoothstep(0.035, 0.10, length(normal - target));
    return coverage * mix(local, 1.0, smoothstep(0.88, 1.0, coverage));
  }
  uniform float cloudSeconds;
  ${cloudNoiseGLSL}
  vec2 flightCloudUV(vec3 n, vec3 target) {
    vec3 east = length(target.xy) > 0.00001 ? normalize(vec3(-target.y, target.x, 0.0)) : vec3(0.0, 1.0, 0.0);
    vec3 north = cross(target, east);
    vec3 offset = n - target;
    // One reference image height spans 100 km on the local tangent plane.
    return vec2(0.75, 0.5) + vec2(dot(offset, east), dot(offset, north)) * (6371000.0 / 100000.0);
  }
  float nightCloudOpacity(float opacity) {
    // A bright direct lamp loses contrast faster than the softly lit cloud.
    return 1.0 - pow(1.0 - opacity, 2.15);
  }`

const shellHeightMeters = 8500

export function createClouds(geometry: BufferGeometry, atmosphere: EarthAtmosphere, sunDirection: Vector3,
  nightMap: { value: Texture | null }, detailMix: { value: number }, anisotropy: number) {
  const flow = createCloudFlow(anisotropy)
  const uniforms = {
    ...atmosphereLightingUniforms(atmosphere),
    cloudMap: { value: flow.texture },
    cloudStrength: { value: 0 },
    cloudSeconds: { value: 0 }, flightTarget: { value: new Vector3() },
    flightCoverage: { value: 0 },
    sunDirection: { value: sunDirection }, nightMap, detailMix
  }
  const material = new ShaderMaterial({
    defines: Object.fromEntries(atmosphere.defines),
    transparent: true, depthWrite: false, depthTest: true, uniforms,
    vertexShader: `
      varying vec3 shellPosition;
      void main() {
        vec3 normal = normalize(position * vec3(1.0, 1.0, 1.0067395));
        shellPosition = position + normal * ${shellHeightMeters.toFixed(1)};
        gl_Position = projectionMatrix * modelViewMatrix * vec4(shellPosition, 1.0);
      }`,
    fragmentShader: `
      uniform vec3 flightTarget;
      uniform float flightCoverage;
      uniform float detailMix, cloudStrength;
      uniform vec3 sunDirection;
      uniform sampler2D nightMap;
      varying vec3 shellPosition;
      ${atmosphereLightingGLSL}
      ${cloudCoverageGLSL}
      ${nightLightingGLSL}
      ${bumpGLSL}
      // Convert the screen derivatives of the height field (meters) into its
      // world-space tangent gradient. This follows the warped cloud banks
      // without additional noise samples, including near the poles.
      vec3 heightGradient(vec3 up, vec3 dx, vec3 dy, float height) {
        vec3 acrossX = cross(dy, up), acrossY = cross(up, dx);
        float area = dot(dx, acrossX);
        return (dFdx(height) * acrossX + dFdy(height) * acrossY)
          * sign(area) / max(abs(area), 0.0001);
      }

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
        float close = 1.0 - smoothstep(350000.0, 1600000.0, distance(cameraPosition, shellPosition));
        float deck = flightDeck(n, flightTarget, flightCoverage);
        vec3 dpdx = dFdx(shellPosition), dpdy = dFdy(shellPosition);
        float detail = close * deck;
        vec3 field = vec3(0.0);
        if (detail > 0.0) field = referenceCloud(flightCloudUV(n, flightTarget), cloudSeconds);
        float coverage = mix(cloudOpacity(density), field.x, detail);
        vec3 fineSlope = heightGradient(n, dpdx, dpdy, field.y * detail * 270.0);
        if (coverage < 0.001) discard;
        vec4 cloudHeights = bumpSamples(cloudMap, stencil, uvDx, uvDy);
        vec3 coarseTop = bumpNormal(n, east, north, stencil, cloudHeights, 0.0035 * (1.0 - detail));
        vec3 top = normalize(coarseTop / max(dot(coarseTop, n), 0.001) - fineSlope);
        float sun = dot(n, sunDirection);
        vec3 color = vec3(0.025 + 0.75 * max(dot(top, sunDirection), 0.0));
        if (detailMix > 0.0) {
          vec3 sky;
          vec3 origin = n * (ATMOSPHERE.bottom_radius + ${(shellHeightMeters / 1000).toFixed(1)});
          vec3 beam = GetSunAndSkyScalarIrradiance(origin, sunDirection, sky);
          vec3 direct = 0.74 * beam * max(dot(top, sunDirection), 0.0);
          // Convert the library's scalar sky integral back to irradiance on
          // the tilted top. Some sunlight scatters back out of the cloud body.
          sky = 1.8 * gradeAir(sky / (2.0 * PI), sun) * (0.5 + 0.5 * dot(n, top))
            + 0.24 * beam * max(sun, 0.0);
          color = mix(color, (sky + direct) * mix(1.0, field.z, detail), detailMix);
        }
        // Cloud coverage modulates both moonlit tops and the light returned
        // by low clouds over a city. Clear ocean receives no city contribution.
        float darkness = nightExposure(sun);
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
        gl_FragColor = vec4(color, coverage * cloudStrength);
      }`
  })
  const mesh = new Mesh(geometry, material)
  mesh.renderOrder = 2
  mesh.visible = false
  let source: Texture | null = null
  let disposed = false
  let lastRender = -Infinity
  let lastSeconds = -1
  let previousFrameSeconds = 0
  let flowSeconds = 0
  let lastWidth = 0

  async function loadCoverage() {
    try {
      const texture = await new TextureLoader().loadAsync('/earth/data/cloud-coverage.jpg')
      if (disposed) { texture.dispose(); return false }
      texture.wrapS = RepeatWrapping
      texture.minFilter = LinearMipmapLinearFilter
      texture.anisotropy = anisotropy
      source = texture
      return true
    } catch {
      // Keep the surface and city lights available if the optional cloud map fails.
      return false
    }
  }

  function advance(renderer: WebGLRenderer, wind: Texture, time: number, seconds: number, moving: boolean) {
    uniforms.cloudSeconds.value = seconds
    const width = renderer.domElement.width
    // Keep the existing coverage through a gesture. The flight shader still animates its fine detail.
    if (!moving) flowSeconds += seconds - previousFrameSeconds
    previousFrameSeconds = seconds
    if (moving && lastSeconds >= 0) return
    if (!source || (width === lastWidth && (flowSeconds === lastSeconds || time - lastRender < 125))) return
    flow.render(renderer, wind, source, flowSeconds)
    lastSeconds = flowSeconds
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
