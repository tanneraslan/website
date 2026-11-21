import {
  NearestFilter, Mesh, NoBlending, OrthographicCamera, PlaneGeometry, RedFormat, RepeatWrapping, Scene,
  ShaderMaterial, LinearMipmapLinearFilter, WebGLRenderTarget, type Texture, type WebGLRenderer
} from 'three'

import { createCloudParticles, particleSeedGLSL, particleSide } from './cloud-particles'

export function createCloudFlow(anisotropy: number) {
  const target = new WebGLRenderTarget(1, 1, {
    format: RedFormat, depthBuffer: false, generateMipmaps: true,
    minFilter: LinearMipmapLinearFilter, wrapS: RepeatWrapping
  })
  target.texture.anisotropy = anisotropy
  const particles = createCloudParticles()
  const mass = new WebGLRenderTarget(particleSide, particleSide, {
    format: RedFormat, depthBuffer: false, minFilter: NearestFilter, magFilter: NearestFilter
  })
  const material = new ShaderMaterial({
    blending: NoBlending, depthTest: false, depthWrite: false,
    uniforms: {
      source: { value: null as Texture | null },
      previous: { value: null as Texture | null }, change: { value: 1 }
    },
    vertexShader: `
      void main() { gl_Position = vec4(position.xy, 0.0, 1.0); }`,
    fragmentShader: `
      uniform sampler2D source, previous;
      uniform float change;
      ${particleSeedGLSL}
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
      float emission(sampler2D image, vec2 uv) {
        // Average the map over a particle spacing to avoid undersampling narrow cloud bands.
        float spacing = sqrt(4.0*pi) / float(side);
        float latitude = (uv.y - 0.5) * pi;
        return textureGrad(image, uv, vec2(spacing/(2.0*pi*max(cos(latitude), 0.1)), 0.0),
          vec2(0.0, spacing/pi)).r;
      }
      void main() {
        ivec2 cell = ivec2(gl_FragCoord.xy);
        vec2 uv = seedUV(cell.y * side + cell.x);
        float cap = 1.0 - smoothstep(0.125, 0.16, min(uv.y, 1.0-uv.y));
        float density = emission(source, uv);
        if (change < 1.0) density = mix(emission(previous, uv), density, change);
        if (cap > 0.0) {
          // The provider mirrors these latitudes. Spherical detail has no
          // longitude singularity and gives the unobserved caps a soft fill.
          vec2 angles = (uv - 0.5) * vec2(2.0*pi, pi);
          vec3 p = 10.0 * vec3(cos(angles.y)*cos(angles.x), cos(angles.y)*sin(angles.x), sin(angles.y));
          p += 1.6 * vec3(noise3(p), noise3(p+14.1), noise3(p+37.6));
          float clouds = 0.57*noise3(p*1.8) + 0.29*noise3(p*4.1) + 0.14*noise3(p*10.5);
          density = mix(density, smoothstep(0.22, 0.77, clouds), cap);
        }
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
      const u = material.uniforms
      const lastTarget = renderer.getRenderTarget()
      try {
        target.setSize(width, width / 2)
        // One scalar per emitter. Only the particle sprites draw into the coverage map.
        if (u.source.value !== source || u.previous.value !== previous || u.change.value !== blend) {
          u.source.value = source
          u.previous.value = previous
          u.change.value = blend
          renderer.setRenderTarget(mass)
          renderer.render(scene, camera)
        }
        particles.render(renderer, wind, mass.texture, target, seconds)
      } finally {
        renderer.setRenderTarget(lastTarget)
      }
    },
    dispose() { particles.dispose(); mass.dispose(); target.dispose(); geometry.dispose(); material.dispose() }
  }
}
