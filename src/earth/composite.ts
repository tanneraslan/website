import { BlendFunction, Effect, EffectAttribute } from 'postprocessing'
import { Uniform, Vector2, Vector4 } from 'three'

// Scene-linear Earth color is sampled before tone mapping. The text and the
// hit target stay in HTML. All bevel widths below are measured in CSS pixels.
export function createComposite() {
  const viewport = new Uniform(new Vector2(1, 1))
  const lens = new Uniform(new Vector4(0, 0, 0, 0))
  const uniforms = new Map<string, Uniform>([['viewportSize', viewport], ['lensRect', lens]])
  const effect = new Effect('EarthComposite', `
    uniform vec2 viewportSize;
    uniform vec4 lensRect;

    vec3 incidentColor(vec2 pixel) {
      vec2 coord = pixel / viewportSize;
      if (any(lessThan(coord, vec2(0.0))) || any(greaterThan(coord, vec2(1.0)))) return vec3(0.0);
      return texture2D(inputBuffer, coord).rgb;
    }

    void mainImage(const in vec4 inputColor, const in vec2 uv, out vec4 outputColor) {
      vec2 pixel = uv * viewportSize;
      vec2 halfSize = lensRect.zw * 0.5;
      vec2 local = pixel - lensRect.xy - halfSize;
      float radius = min(halfSize.x, halfSize.y);
      vec2 radial = local - clamp(local, -halfSize + radius, halfSize - radius);
      float edge = radius - length(radial);
      vec2 bentUV = uv;
      vec3 reflected = vec3(0.0);
      if (edge > 0.0 && edge < 10.0) {
        vec2 outward = radial / max(length(radial), 0.001);
        bentUV -= outward * sin(edge * 0.314159) * 6.0 / viewportSize;

        // Pull a fan of nearby scene radiance onto the curved lip. Keep some
        // peak energy so a tiny bright lamp survives an otherwise dark kernel.
        float rim = 1.0 - smoothstep(1.0, 4.5, edge);
        if (rim > 0.0) {
          vec2 tangent = vec2(-outward.y, outward.x);
          vec2 lip = pixel + edge * outward;
          vec3 total = vec3(0.0);
          vec3 peak = vec3(0.0);
          for (int band = 0; band < 3; ++band) {
            float reach = 3.5 + float(band) * 9.0 + edge * 1.5;
            for (int tap = -2; tap <= 2; ++tap) {
              vec3 sampleColor = incidentColor(lip + reach * outward + float(tap) * (1.5 + 0.19 * reach) * tangent);
              total += sampleColor;
              peak = max(peak, sampleColor);
            }
          }
          reflected = rim * (total * (0.85 / 15.0) + peak * 0.48);
        }
      }
      vec3 color = texture2D(inputBuffer, bentUV).rgb + reflected;
      float disk = length((bentUV - 0.5) * viewportSize) / (0.425 * min(viewportSize.x, viewportSize.y));
      float luminance = max(color.r, max(color.g, color.b));
      float alpha = max(1.0 - smoothstep(0.99, 1.0, disk), smoothstep(0.0, 0.045, luminance));
      outputColor = vec4(color, alpha);
    }`, { uniforms, blendFunction: BlendFunction.SET, attributes: EffectAttribute.CONVOLUTION })
  return { effect, viewport, lens }
}
