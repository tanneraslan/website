import {
  NearestFilter, Mesh, NoBlending, OrthographicCamera, PlaneGeometry, RedFormat, RGBAFormat, RepeatWrapping, Scene,
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
    format: RGBAFormat, depthBuffer: false, minFilter: NearestFilter, magFilter: NearestFilter
  })
  const material = new ShaderMaterial({
    blending: NoBlending, depthTest: false, depthWrite: false,
    uniforms: {
      source: { value: null as Texture | null }
    },
    vertexShader: `
      void main() { gl_Position = vec4(position.xy, 0.0, 1.0); }`,
    fragmentShader: `
      uniform sampler2D source;
      ${particleSeedGLSL}
      void main() {
        ivec2 cell = ivec2(gl_FragCoord.xy);
        vec2 uv = seedUV(cell.y * side + cell.x);
        float spacing = sqrt(4.0*pi) / float(side);
        float latitude = (uv.y - 0.5) * pi;
        vec2 east = vec2(spacing / (2.0*pi*max(cos(latitude), 0.01)), 0.0);
        vec2 north = vec2(0.0, spacing/pi);
        float density = textureGrad(source, uv, east, north).r;
        vec2 gradient = vec2(
          textureGrad(source, uv + 0.5*east, east, north).r - textureGrad(source, uv - 0.5*east, east, north).r,
          textureGrad(source, uv + 0.5*north, east, north).r - textureGrad(source, uv - 0.5*north, east, north).r
        );
        gl_FragColor = vec4(density, 0.5 + 0.5*gradient, 1.0);
      }`
  })
  const geometry = new PlaneGeometry(2, 2)
  const scene = new Scene()
  scene.add(new Mesh(geometry, material))
  const camera = new OrthographicCamera()
  return {
    texture: target.texture,
    render(renderer: WebGLRenderer, wind: Texture, source: Texture, seconds: number) {
      const width = renderer.domElement.width < 900 ? 1024 : 2048
      const u = material.uniforms
      const lastTarget = renderer.getRenderTarget()
      try {
        target.setSize(width, width / 2)
        // Cache each emitter’s density and tangent gradient once per source map.
        if (u.source.value !== source) {
          u.source.value = source
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
