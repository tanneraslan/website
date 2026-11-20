import { BlendFunction, Effect, EffectAttribute } from 'postprocessing'
import { Uniform, Vector2, Vector4 } from 'three'

// Sample the completed Earth frame under the pill. Its real label and hit area
// remain in the DOM. Coordinates are CSS pixels, measured from canvas bottom-left.
export function createComposite() {
  const viewport = new Uniform(new Vector2(1, 1))
  const lens = new Uniform(new Vector4(0, 0, 0, 0))
  const uniforms = new Map<string, Uniform>([['viewportSize', viewport], ['lensRect', lens]])
  const effect = new Effect('EarthComposite', `
    uniform vec2 viewportSize;
    uniform vec4 lensRect;
    void mainImage(const in vec4 inputColor, const in vec2 uv, out vec4 outputColor) {
      vec2 pixel = uv * viewportSize;
      vec2 halfSize = lensRect.zw * 0.5;
      vec2 local = pixel - lensRect.xy - halfSize;
      float radius = min(halfSize.x, halfSize.y);
      vec2 normal = local - clamp(local, -halfSize + radius, halfSize - radius);
      float edge = radius - length(normal);
      vec2 bentUV = uv;
      if (edge > 0.0 && edge < 10.0) {
        bentUV -= normal / max(length(normal), 1.0) * sin(edge * 0.314159) * 4.0 / viewportSize;
      }
      vec3 color = texture2D(inputBuffer, bentUV).rgb;
      float disk = length((bentUV - 0.5) * viewportSize) / (0.425 * min(viewportSize.x, viewportSize.y));
      float luminance = max(color.r, max(color.g, color.b));
      float alpha = max(1.0 - smoothstep(0.99, 1.0, disk), smoothstep(0.0, 0.001, luminance));
      outputColor = vec4(color, alpha);
    }`, { uniforms, blendFunction: BlendFunction.SET, attributes: EffectAttribute.CONVOLUTION })
  return { effect, viewport, lens }
}
