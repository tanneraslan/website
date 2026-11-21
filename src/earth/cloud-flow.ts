import {
  Mesh, NoBlending, OrthographicCamera, PlaneGeometry, RedFormat, RepeatWrapping, Scene,
  ShaderMaterial, LinearMipmapLinearFilter, WebGLRenderTarget, type Texture, type WebGLRenderer
} from 'three'

// Backtrace air parcels on the sphere into the satellite image. Two staggered
// phases keep the weather systems recognizable without a visible reset.
export function createCloudFlow(anisotropy: number) {
  const target = new WebGLRenderTarget(1, 1, {
    format: RedFormat, depthBuffer: false, generateMipmaps: true,
    minFilter: LinearMipmapLinearFilter, wrapS: RepeatWrapping
  })
  target.texture.anisotropy = anisotropy
  const material = new ShaderMaterial({
    blending: NoBlending, depthTest: false, depthWrite: false,
    uniforms: {
      wind: { value: null as Texture | null }, source: { value: null as Texture | null },
      previous: { value: null as Texture | null }, change: { value: 1 }, seconds: { value: 0 }
    },
    vertexShader: `
      varying vec2 coord;
      void main() { coord = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }`,
    fragmentShader: `
      uniform sampler2D wind, source, previous;
      uniform float seconds, change;
      varying vec2 coord;
      const float pi = 3.14159265;
      float hash(vec3 p) {
        p = fract(p * 0.1031);
        p += dot(p, p.yzx + 33.33);
        return fract((p.x + p.y) * p.z);
      }
      float noise3(vec3 p) {
        vec3 i = floor(p), f = fract(p);
        f *= f * (3.0 - 2.0 * f);
        vec4 a = vec4(hash(i), hash(i+vec3(0,1,0)), hash(i+vec3(0,0,1)), hash(i+vec3(0,1,1)));
        i.x += 1.0;
        vec4 b = vec4(hash(i), hash(i+vec3(0,1,0)), hash(i+vec3(0,0,1)), hash(i+vec3(0,1,1)));
        vec4 x = mix(a, b, f.x);
        return mix(mix(x.x,x.y,f.y), mix(x.z,x.w,f.y), f.z);
      }
      float sampleParcel(vec3 direction) {
        vec2 uv = vec2(atan(direction.y, direction.x)/(2.0*pi), asin(clamp(direction.z,-1.0,1.0))/pi) + 0.5;
        float cap = 1.0 - smoothstep(0.125, 0.16, min(uv.y, 1.0-uv.y));
        float density = textureLod(source, uv, 0.0).r;
        if (change < 1.0) density = mix(textureLod(previous, uv, 0.0).r, density, change);
        if (cap > 0.0) {
          // The provider mirrors these latitudes. Spherical detail has no
          // longitude singularity and gives the unobserved caps a soft fill.
          vec3 p = direction * 10.0;
          p += 1.6 * vec3(noise3(p), noise3(p+14.1), noise3(p+37.6));
          float clouds = 0.57*noise3(p*1.8) + 0.29*noise3(p*4.1) + 0.14*noise3(p*10.5);
          density = mix(density, smoothstep(0.22, 0.77, clouds), cap);
        }
        return density;
      }
      void main() {
        vec2 angles = (coord - 0.5) * vec2(2.0*pi, pi);
        vec3 east = vec3(-sin(angles.x), cos(angles.x), 0.0);
        vec3 pos = vec3(cos(angles.y)*east.y, -cos(angles.y)*east.x, sin(angles.y));
        vec3 north = cross(pos,east);
        vec2 velocity = mix(vec2(-21.32,-21.57), vec2(26.8,21.42), texture2D(wind,coord).rg);
        // The packed GFS components are east/north in metres per second.
        vec3 drift = (east*velocity.x + north*velocity.y) * (600.0*32.0/6371000.0);
        drift *= smoothstep(0.0, 0.07, cos(angles.y));
        float t = seconds / 32.0;
        float a = fract(t + 0.5) - 0.5, b = fract(t) - 0.5;
        float weight = 2.0*abs(a);
        float density = sampleParcel(normalize(pos - a*drift));
        if (weight > 0.0) density = mix(density, sampleParcel(normalize(pos - b*drift)), weight);
        gl_FragColor = vec4(density, 0.0, 0.0, 1.0);
      }`
  })
  const geometry = new PlaneGeometry(2, 2)
  const scene = new Scene()
  scene.add(new Mesh(geometry, material))
  const camera = new OrthographicCamera()
  return {
    texture: target.texture,
    render(renderer: WebGLRenderer, wind: Texture, source: Texture, previous: Texture, blend: number, seconds: number) {
      const width = renderer.domElement.width < 900 ? 1024 : 2048
      target.setSize(width, width / 2)
      const u = material.uniforms
      u.wind.value = wind
      u.source.value = source
      u.previous.value = previous
      u.change.value = blend
      u.seconds.value = seconds
      const lastTarget = renderer.getRenderTarget()
      renderer.setRenderTarget(target)
      renderer.render(scene, camera)
      renderer.setRenderTarget(lastTarget)
    },
    dispose() { target.dispose(); geometry.dispose(); material.dispose() }
  }
}
