// A fixed gibbous-moon direction in Earth coordinates makes the lighting
// repeatable during camera transitions. All terms are scene-linear.
export const moonDirectionGLSL = 'const vec3 nightMoonDirection = vec3(-0.4891, -0.8469, 0.2079);'

export const nightLightingGLSL = `
  ${moonDirectionGLSL}
  float nightExposure(float sunDot) {
    return 1.0 - smoothstep(-0.16, 0.08, sunDot);
  }
  float moonIllumination(vec3 normal) {
    return 0.24 + 0.76 * max(dot(normal, nightMoonDirection), 0.0);
  }
  float urbanHaze(sampler2D nightMap, vec2 uv) {
    // Roughly a 300 km footprint at the equator, stable across imagery tiers.
    float mip = max(0.0, log2(float(textureSize(nightMap, 0).x) / 128.0));
    return sqrt(max(textureLod(nightMap, uv, mip).r - 0.003, 0.0));
  }
`
