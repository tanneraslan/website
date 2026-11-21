// Julien Sulpis's textured Earth uses finite differences of a terrain/cloud
// height field. Sample along the WGS84 tangent plane in the mesh renderer.
export const bumpGLSL = `
  vec2 bumpUV(vec3 n) {
    return vec2(atan(n.y, n.x) / 6.2831853, asin(clamp(n.z, -1.0, 1.0)) / 3.14159265) + 0.5;
  }

  struct BumpStencil {
    vec2 west, east, south, north;
    float diameter;
  };

  BumpStencil bumpStencil(vec3 n, vec3 east, vec3 north, float mapWidth) {
    // Keep the finite difference at least one source texel across and widen
    // it where the visible footprint grows on smaller screens or at the limb.
    float pixel = max(length(dFdx(n)), length(dFdy(n)));
    float stepAngle = max(6.2831853 / mapWidth, clamp(pixel, 0.0015, 0.015));
    return BumpStencil(bumpUV(normalize(n - stepAngle * east)), bumpUV(normalize(n + stepAngle * east)),
      bumpUV(normalize(n - stepAngle * north)), bumpUV(normalize(n + stepAngle * north)), 2.0 * stepAngle);
  }

  vec4 bumpSamples(sampler2D field, BumpStencil s, vec2 dx, vec2 dy) {
    return vec4(textureGrad(field, s.west, dx, dy).r, textureGrad(field, s.east, dx, dy).r,
      textureGrad(field, s.south, dx, dy).r, textureGrad(field, s.north, dx, dy).r);
  }

  vec3 bumpNormal(vec3 n, vec3 east, vec3 north, BumpStencil s, vec4 heights, float heightScale) {
    return normalize(n - (heightScale / s.diameter) *
      (east * (heights.y - heights.x) + north * (heights.w - heights.z)));
  }`
