import { AerialPerspectiveEffect } from '@takram/three-atmosphere'
import { Uniform, type Camera } from 'three'

const wideScale = 6

export class EarthAtmosphere extends AerialPerspectiveEffect {
  private readonly limbScale = new Uniform(wideScale)

  setWide(enabled: boolean) { this.limbScale.value = enabled ? wideScale : 1 }

  constructor(camera: Camera) {
    super(camera, { sky: true, ground: false, sun: false, moon: false, sunLight: false, skyLight: false })
    this.uniforms.set('limbScale', this.limbScale)

    // Takram's tables encode the physical Earth. For sky pixels only, move the
    // ray's tangent altitude into that range. A ray grazing the surface stays
    // fixed, and the original lookup supplies the colors throughout the sweep.
    const source = this.getFragmentShader()
    const skyCall = /outputColor\.rgb = getSkyRadiance\(\s*vCameraPosition,/
    if (!skyCall.test(source)) throw new Error('Unrecognized atmospheric sky shader')
    this.setFragmentShader(`
      uniform float limbScale;
      vec3 scaledSkyOrigin(vec3 origin, vec3 direction, float groundRadius) {
        vec3 tangent = origin - direction * dot(origin, direction);
        float radius = length(tangent);
        float altitude = max(radius - groundRadius, 0.0);
        return origin - tangent * (altitude / max(radius, 1.0)) * (1.0 - 1.0 / limbScale);
      }
    ` + source.replace(skyCall,
      'outputColor.rgb = getSkyRadiance(scaledSkyOrigin(vCameraPosition, rayDirection, ATMOSPHERE.bottom_radius),'))
  }
}
