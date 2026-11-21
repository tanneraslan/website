import { moonDirectionGLSL } from './night-lighting'
import { AerialPerspectiveEffect } from '@takram/three-atmosphere'
import { Uniform, type Camera } from 'three'

export const airColorGLSL = `
// The wide limb makes the LUT's violet band conspicuous. Adjust only
// scattered sunlight, retaining its linear luminance and the warm sunset.
vec3 gradeAir(vec3 light, float alignment) {
  light = max(light, vec3(0.0));
  float peak = max(0.00001, max(light.r, light.b));
  float violet = smoothstep(0.025, 0.35, (light.b - light.g) / peak)
    * smoothstep(0.65, 0.98, light.b / peak);
  vec3 blue = vec3(min(light.r, 0.54 * light.b + 0.19 * light.g),
    max(light.g, 0.46 * light.b + 0.25 * light.r), light.b);
  const vec3 luma = vec3(0.2126, 0.7152, 0.0722);
  blue *= dot(light, luma) / max(dot(blue, luma), 0.000001);
  return mix(light, blue, violet * mix(0.70, 1.0, smoothstep(0.0, 0.85, alignment)));
}
`

const wideScale = 10

export class EarthAtmosphere extends AerialPerspectiveEffect {
  constructor(camera: Camera) {
    super(camera, { sky: true, ground: false, sun: false, moon: false, sunLight: false, skyLight: false })
    this.uniforms.set('limbScale', new Uniform(wideScale))

    // Takram's tables encode the physical Earth. For sky pixels only, move the
    // ray's tangent altitude into that range. A ray grazing the surface stays
    // fixed, and the original lookup supplies the colors throughout the sweep.
    const source = this.getFragmentShader()
    const skyCall = /outputColor\.rgb = getSkyRadiance\(\s*vCameraPosition,([^)]+)\);/
    const airSum = 'radiance = radiance + inscatter;'
    if (!skyCall.test(source) || !source.includes(airSum)) throw new Error('Unrecognized atmospheric shader')
    const alignment = 'dot(normalize(vCameraPosition), sunDirection)'
    const gradedSource = source.replace(skyCall,
      `vec3 skyOrigin = scaledSkyOrigin(vCameraPosition, rayDirection, ATMOSPHERE.bottom_radius);
       outputColor.rgb = gradeAir(getSkyRadiance(skyOrigin,$1), ${alignment});
       vec3 tangent = skyOrigin - rayDirection * dot(skyOrigin, rayDirection);
       float radius = length(tangent);
       if (radius <= ATMOSPHERE.top_radius) {
         vec3 up = tangent / max(radius, 1.0);
         float dusk = 1.0 - smoothstep(-0.20, 0.04, dot(up, sunDirection));
         if (dusk > 0.0 && dot(up, nightMoonDirection) > -0.12) {
           vec3 transmission;
           vec3 lunar = GetSkyRadiance(skyOrigin, rayDirection, 0.0, nightMoonDirection, transmission);
           outputColor.rgb += dusk * 0.036 * gradeAir(lunar, 1.0);
         }
       }`)
      .replace(airSum, `
        float horizon = 1.0 - smoothstep(0.0, 0.32,
          dot(normalize(positionECEF), normalize(vCameraPosition - positionECEF)));
        radiance += mix(inscatter, gradeAir(inscatter, ${alignment}), horizon);`)
    this.setFragmentShader(`
      ${moonDirectionGLSL}
      uniform float limbScale;
      ${airColorGLSL}
      vec3 scaledSkyOrigin(vec3 origin, vec3 direction, float groundRadius) {
        vec3 tangent = origin - direction * dot(origin, direction);
        float radius = length(tangent);
        float altitude = max(radius - groundRadius, 0.0);
        return origin - tangent * (altitude / max(radius, 1.0)) * (1.0 - 1.0 / limbScale);
      }
    ` + gradedSource)
  }
}
