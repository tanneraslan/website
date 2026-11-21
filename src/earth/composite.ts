import { BlendFunction, Effect } from 'postprocessing'
import { Uniform, Vector2 } from 'three'

export function createComposite() {
  const viewport = new Uniform(new Vector2(1, 1))
  const effect = new Effect('EarthComposite', `
    uniform vec2 viewportSize;

    void mainImage(const in vec4 inputColor, const in vec2 uv, out vec4 outputColor) {
      float disk = length((uv - 0.5) * viewportSize) / (0.425 * min(viewportSize.x, viewportSize.y));
      float luminance = max(inputColor.r, max(inputColor.g, inputColor.b));
      float alpha = max(1.0 - smoothstep(0.99, 1.0, disk), smoothstep(0.0, 0.045, luminance));
      outputColor = vec4(inputColor.rgb, alpha);
    }`, { uniforms: new Map([['viewportSize', viewport]]), blendFunction: BlendFunction.SET })
  return { effect, viewport }
}
