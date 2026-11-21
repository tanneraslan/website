import { BlendFunction, Effect } from 'postprocessing'
import { Uniform, Vector2, Vector3 } from 'three'

export function createComposite() {
  const viewport = new Uniform(new Vector2(1, 1))
  const disk = new Uniform(new Vector3(0, 0, 1))
  const mapUnderlay = new Uniform(0)
  const effect = new Effect('EarthComposite', `
    uniform float mapUnderlay;
    uniform vec2 viewportSize;
    uniform vec3 projectedDisk;

    void mainImage(const in vec4 inputColor, const in vec2 uv, out vec4 outputColor) {
      float disk = length(uv * viewportSize - projectedDisk.xy) / projectedDisk.z;
      float luminance = max(inputColor.r, max(inputColor.g, inputColor.b));
      float alpha = max(1.0 - smoothstep(0.99, 1.0, disk), smoothstep(0.0, 0.045, luminance));
      // RenderPass has already blended clouds over the fading ground. The
      // DOM compositor expects straight colour from this transparent canvas.
      if (mapUnderlay > 0.0) {
        outputColor = vec4(inputColor.rgb / max(inputColor.a, 0.0001), inputColor.a);
      } else {
        outputColor = vec4(inputColor.rgb, alpha);
      }
    }`, { uniforms: new Map<string, Uniform>([['mapUnderlay', mapUnderlay], ['viewportSize', viewport], ['projectedDisk', disk]]), blendFunction: BlendFunction.SET })
  return { effect, viewport, disk, mapUnderlay }
}
