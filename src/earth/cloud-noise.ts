// Noise and coverage from "2D Clouds" (https://www.shadertoy.com/view/4tdSWr).
// The caller supplies aspect-correct plane coordinates and composites the
// original sky/cloud mix factor over terrain with the planet's lighting.
export const cloudNoiseGLSL = `
  const mat2 cloudOctave = mat2(1.6, 1.2, -1.2, 1.6);
  vec2 cloudHash(vec2 p) {
    p = vec2(dot(p, vec2(127.1, 311.7)), dot(p, vec2(269.5, 183.3)));
    return -1.0 + 2.0 * fract(sin(p) * 43758.5453123);
  }
  float cloudNoise(vec2 p) {
    const float K1 = 0.366025404;
    const float K2 = 0.211324865;
    vec2 i = floor(p + (p.x + p.y) * K1);
    vec2 a = p - i + (i.x + i.y) * K2;
    vec2 o = a.x > a.y ? vec2(1.0, 0.0) : vec2(0.0, 1.0);
    vec2 b = a - o + K2;
    vec2 c = a - 1.0 + 2.0 * K2;
    vec3 h = max(0.5 - vec3(dot(a,a), dot(b,b), dot(c,c)), 0.0);
    vec3 n = h*h*h*h * vec3(dot(a, cloudHash(i)), dot(b, cloudHash(i + o)), dot(c, cloudHash(i + 1.0)));
    return dot(n, vec3(70.0));
  }
  float cloudFbm(vec2 n) {
    float total = 0.0, amplitude = 0.1;
    for (int i = 0; i < 7; ++i) {
      total += cloudNoise(n) * amplitude;
      n = cloudOctave * n;
      amplitude *= 0.4;
    }
    return total;
  }

  // x is the original blend factor, y its broad relief for sunlight, z the cloud colour term.
  vec3 referenceCloud(vec2 uv, float seconds) {
    const float cloudscale = 1.1, speed = 0.03;
    float time = seconds * speed;
    float q = cloudFbm(uv * cloudscale * 0.5);

    vec2 p = uv * cloudscale;
    p -= q - time;
    float r = 0.0, broadR = 0.0, weight = 0.8;
    for (int i = 0; i < 8; ++i) {
      r += abs(weight * cloudNoise(p));
      if (i == 1) broadR = r;
      p = cloudOctave * p + time;
      weight *= 0.7;
    }

    p = uv * cloudscale;
    p -= q - time;
    float f = 0.0, broadF = 0.0;
    weight = 0.7;
    for (int i = 0; i < 8; ++i) {
      f += weight * cloudNoise(p);
      if (i == 1) broadF = f;
      p = cloudOctave * p + time;
      weight *= 0.6;
    }
    f *= r + f;

    time = seconds * speed * 2.0;
    p = uv * cloudscale * 2.0;
    p -= q - time;
    float c = 0.0;
    weight = 0.4;
    for (int i = 0; i < 7; ++i) {
      c += weight * cloudNoise(p);
      p = cloudOctave * p + time;
      weight *= 0.6;
    }

    time = seconds * speed * 3.0;
    p = uv * cloudscale * 3.0;
    p -= q - time;
    float c1 = 0.0;
    weight = 0.4;
    for (int i = 0; i < 7; ++i) {
      c1 += abs(weight * cloudNoise(p));
      p = cloudOctave * p + time;
      weight *= 0.6;
    }
    c += c1;
    return vec3(clamp((0.2 + 8.0 * f * r) + c, 0.0, 1.0), broadF * (broadR + broadF), clamp(0.5 + 0.3 * c, 0.0, 1.0));
  }`
