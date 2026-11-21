import {
  HalfFloatType, Mesh, NearestFilter, NoBlending, OrthographicCamera, PlaneGeometry,
  RepeatWrapping, Scene, ShaderMaterial, WebGLRenderTarget, type Texture, type WebGLRenderer
} from 'three'

// One texel stores the longitude/latitude offsets of two independently aged particles.
const columns = 128
const rows = 65
const lifetime = 32
const grid = `vec2(${columns}.0, ${rows}.0)`
const margin = columns / 8

export function createCloudParticles() {
  const targets = Array.from({ length: 2 }, () => new WebGLRenderTarget(columns, rows, {
    type: HalfFloatType, depthBuffer: false, minFilter: NearestFilter, magFilter: NearestFilter,
    wrapS: RepeatWrapping
  }))
  const step = new ShaderMaterial({
    blending: NoBlending, depthTest: false, depthWrite: false,
    uniforms: {
      particles: { value: targets[0].texture }, wind: { value: null as Texture | null },
      elapsed: { value: 0 }, age: { value: [0, 0] }, initialize: { value: true }
    },
    vertexShader: 'void main() { gl_Position = vec4(position.xy, 0.0, 1.0); }',
    fragmentShader: `
      uniform sampler2D particles, wind;
      uniform float elapsed;
      uniform vec2 age;
      uniform bool initialize;
      const vec2 grid = ${grid};
      vec2 advance(vec2 origin, vec2 offset, float particleAge) {
        // A particle whose lifetime just wrapped respawns at its satellite-map coordinate.
        if (particleAge < elapsed) offset = vec2(0.0);
        vec2 pos = origin + offset;
        float latitude = (pos.y - 0.5) * 3.14159265;
        vec2 velocity = mix(vec2(-21.32, -21.57), vec2(26.8, 21.42), textureLod(wind, pos, 0.0).rg);
        // Accelerate GFS east/north m/s for globe-scale motion. Pin the polar vertices.
        float c = cos(latitude);
        float distance = min(elapsed, particleAge) * 600.0 / 6371000.0;
        vec2 delta = distance * velocity / vec2(6.2831853 * max(c, 0.20), 3.14159265);
        return offset + delta * smoothstep(0.0, 0.20, c);
      }
      void main() {
        if (initialize) { gl_FragColor = vec4(0.0); return; }
        ivec2 cell = ivec2(gl_FragCoord.xy);
        vec2 origin = vec2(cell) / vec2(grid.x, grid.y - 1.0);
        vec4 state = texelFetch(particles, cell, 0);
        gl_FragColor = vec4(advance(origin, state.xy, age.x), advance(origin, state.zw, age.y));
      }`
  })
  const quad = new PlaneGeometry(2, 2)
  const simulation = new Scene()
  simulation.add(new Mesh(quad, step))

  // Adjacent particles carry a patch of the cloud image between them. A strip
  // repeated beyond either map edge lets those patches cross the date line.
  const patch = new PlaneGeometry(2, 2, columns + 2 * margin, rows - 1)
  const layers = [false, true].map(second => new ShaderMaterial({
    transparent: second, depthTest: false, depthWrite: false,
    uniforms: { particles: { value: targets[0].texture }, density: { value: null as Texture | null }, weight: { value: 1 } },
    vertexShader: `
      uniform sampler2D particles;
      varying vec2 sourceUV;
      const vec2 grid = ${grid};
      void main() {
        sourceUV = vec2(uv.x * ${1 + 2 * margin / columns} - ${margin / columns}, uv.y);
        vec2 cell = sourceUV * vec2(grid.x, grid.y - 1.0);
        vec2 offset = textureLod(particles, (cell + 0.5) / grid, 0.0).${second ? 'zw' : 'xy'};
        gl_Position = vec4(2.0 * (sourceUV + offset) - 1.0, 0.0, 1.0);
      }`,
    fragmentShader: `
      uniform sampler2D density;
      uniform float weight;
      varying vec2 sourceUV;
      void main() { gl_FragColor = vec4(texture2D(density, sourceUV).r, 0.0, 0.0, weight); }`
  }))
  const patches = new Scene()
  layers.forEach((material, i) => {
    const mesh = new Mesh(patch, material)
    mesh.renderOrder = i
    mesh.frustumCulled = false
    patches.add(mesh)
  })
  const camera = new OrthographicCamera()
  let active = 0
  let lastSeconds = -1
  return {
    render(renderer: WebGLRenderer, wind: Texture, density: Texture, output: WebGLRenderTarget, seconds: number) {
      const phase = seconds % lifetime
      if (seconds !== lastSeconds) {
        const u = step.uniforms
        u.particles.value = targets[active].texture
        u.wind.value = wind
        u.initialize.value = lastSeconds < 0
        u.elapsed.value = seconds - Math.max(lastSeconds, 0)
        u.age.value[0] = phase
        u.age.value[1] = (phase + lifetime / 2) % lifetime
        active = 1 - active
        renderer.setRenderTarget(targets[active])
        renderer.render(simulation, camera)
        lastSeconds = seconds
      }
      layers.forEach(material => {
        material.uniforms.particles.value = targets[active].texture
        material.uniforms.density.value = density
      })
      // Each cohort reaches zero opacity exactly when it respawns.
      layers[1].uniforms.weight.value = 0.5 + 0.5 * Math.cos(phase * 2 * Math.PI / lifetime)
      renderer.setRenderTarget(output)
      renderer.render(patches, camera)
    },
    dispose() {
      targets.forEach(target => target.dispose())
      layers.forEach(material => material.dispose())
      step.dispose()
      quad.dispose()
      patch.dispose()
    }
  }
}
