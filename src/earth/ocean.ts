import { atmosphereLightingGLSL } from './atmosphere'

// The engine's two scrolling normal layers, reoriented on the three axes.
export const oceanGLSL = `
  ${atmosphereLightingGLSL}
  uniform sampler2D waterNormal, bathymetry;
  uniform float oceanSeconds, oceanDetail;
  vec3 reorientWave(vec3 base, vec3 wave) {
    vec3 t = base + vec3(0.0, 0.0, 1.0);
    return t * dot(t, wave * vec3(-1.0,-1.0,1.0)) / t.z - wave * vec3(-1.0,-1.0,1.0);
  }
  vec3 waveLayer(vec3 p, vec3 n, vec2 offset) {
    vec3 w = pow(abs(n), vec3(4.0));
    w /= dot(w, vec3(1.0));
    vec3 x = reorientWave(vec3(n.zy,abs(n.x)), texture2D(waterNormal,p.zy+offset).xyz*2.0-1.0);
    vec3 y = reorientWave(vec3(n.xz,abs(n.y)), texture2D(waterNormal,p.xz+offset).xyz*2.0-1.0);
    vec3 z = reorientWave(vec3(n.xy,abs(n.z)), texture2D(waterNormal,p.xy+offset).xyz*2.0-1.0);
    x.z *= sign(n.x); y.z *= sign(n.y); z.z *= sign(n.z);
    return normalize(w.x*x.zyx + w.y*y.xzy + w.z*z);
  }
  vec3 waterSurface(vec3 p, vec3 n) {
    vec3 first = waveLayer(p*2.8, n, oceanSeconds*0.022*vec2(1.0,0.8));
    vec3 waves = first;
    vec2 drift = oceanSeconds*0.031*vec2(-0.8,-0.3);
    if (oceanDetail < 1.0) waves = waveLayer(p*6.1, first, drift);
    if (oceanDetail > 0.0) {
      // Crossfade fixed world-space frequencies so crests stay put during zoom.
      vec3 ripples = waveLayer(p*36.6, normalize(mix(n, first, 0.18)), drift);
      waves = mix(waves, ripples, oceanDetail);
    }
    return normalize(mix(n, waves, 0.35));
  }

  // Port of SphereOcean.applyLighting. Adjust normal strength in the local
  // tangent plane, since the vertical axis changes around an ellipsoid.
  vec3 lightOcean(vec3 up, vec3 n, vec3 view, vec3 sun, float depthMetres, float nearbyLand, vec3 imageColor) {
    vec3 tangentNormal = n - up * dot(n, up);
    vec3 fresnelNormal = normalize(up * dot(n, up) + 1.35 * tangentNormal);
    float viewCos = clamp(dot(view, fresnelNormal), 0.0, 1.0);
    float reflectionWeight = 0.4 * mix(0.6, 1.0, pow(1.0 - viewCos, 6.0));
    vec3 reflected = reflect(-view, n);
    // A sub-horizon wave facet sees the local horizon. Sample the LUT at
    // sea level in its spherical coordinates (lengths in kilometres).
    vec3 skyRay = normalize(reflected + up * max(0.0, 0.002 - dot(reflected, up)));
    float radius = ATMOSPHERE.bottom_radius + 0.002;
    vec3 origin = up * radius;
    vec3 transmission;
    vec3 sky = gradeAir(GetSkyRadiance(origin, skyRay, 0.0, sun, transmission), dot(view, sun));
    float dusk = 1.0 - smoothstep(-0.20, 0.04, dot(up, sun));
    if (dusk > 0.0 && dot(up, nightMoonDirection) > -0.12) {
      sky += 0.036 * dusk * gradeAir(GetSkyRadiance(origin, skyRay, 0.0, nightMoonDirection, transmission), 1.0);
    }

    vec3 sunlight = GetTransmittanceToSun(ATMOSPHERE, transmittance_texture, radius, dot(up, sun));
    float alignment = max(dot(reflected, sun), 0.0);
    // Keep the solar edge independent of neighboring land fragments.
    float disk = smoothstep(0.994, 0.996, alignment);
    // Match the reflected solar disk to the exposure of the Earth compositor.
    vec3 environment = sky + 0.08 * sunlight * (1000.0 * disk + 100.0 * pow(alignment, 200.0));
    vec3 halfway = normalize(sun + view);
    float incidence = max(dot(n, sun), 0.0);
    float specularWeight = mix(0.6, 1.0, pow(1.0 - clamp(dot(view, halfway), 0.0, 1.0), 5.0));
    vec3 specular = sunlight * incidence * pow(max(dot(n, halfway), 0.0), 72.0) * specularWeight;
    vec3 surfaceLight = reflectionWeight * (environment + sunlight * 15.0 * pow(alignment, 1500.0)) + specular;

    // Bathymetry supplies the engine's shallow/deep blend in Earth metres.
    float deep = 1.0 - exp(-depthMetres / 650.0);
    vec3 bodyColor = mix(vec3(0.011, 0.047, 0.057), vec3(0.001, 0.005, 0.008), deep);
    vec3 bodyLight = bodyColor * (0.012 + sunlight * incidence);
    // The day image resolves banks and channels more finely than the depth map.
    // Use its blue-green reflectance to reveal the sunlit bottom in clear shallows.
    float shelf = 1.0 - smoothstep(20.0, 450.0, depthMetres);
    float blueGreen = min(imageColor.g, imageColor.b) - 0.85 * imageColor.r;
    float clearWater = smoothstep(0.003, 0.07, blueGreen);
    vec3 bankColor = min(vec3(0.10, 0.80, 0.72),
      vec3(0.012, 0.14, 0.19) + imageColor * vec3(0.16, 1.9, 1.45));
    bodyLight += shelf * clearWater * bankColor * sunlight * max(dot(up, sun), 0.0);
    vec3 water = surfaceLight + bodyLight;
    if (nearbyLand > 0.0) {
      float shoal = 1.0 - smoothstep(12.0, 300.0, depthMetres);
      float shore = oceanDetail * smoothstep(0.02, 0.42, nearbyLand);
      float crest = sin(nearbyLand * 19.0 - oceanSeconds * 1.4 + 9.0 * dot(tangentNormal, sun));
      float foam = shore * mix(0.25, 0.8, shoal) * smoothstep(-0.65, 0.7, crest);
      vec3 incident = vec3(0.003, 0.005, 0.009) + sunlight * max(dot(up, sun), 0.0);
      water += shore * shoal * vec3(0.015, 0.12, 0.11) * incident;
      water = mix(water, vec3(0.78, 0.88, 0.86) * incident, foam);
    }
    return water;
  }
`
