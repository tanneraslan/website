// The engine's two scrolling normal layers, reoriented on the three axes.
export const oceanGLSL = `
  uniform sampler2D waterNormal, bathymetry;
  uniform float oceanSeconds;
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
    vec3 waves = waveLayer(p*6.1, first, oceanSeconds*0.031*vec2(-0.8,-0.3));
    return normalize(mix(n, waves, 0.46));
  }
`
