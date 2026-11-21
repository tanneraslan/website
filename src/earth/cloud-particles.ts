import {
  AddEquation, BufferAttribute, CustomBlending, HalfFloatType, InstancedBufferAttribute, InstancedBufferGeometry,
  Mesh, NearestFilter, NoBlending, OneFactor, OrthographicCamera, PlaneGeometry,
  Scene, ShaderMaterial, WebGLRenderTarget, type Texture, type WebGLRenderer
} from 'three'

export const particleSide = 768
const particleCount = particleSide * particleSide
const lifetime = 24
const windSpeedup = 240
const radiusInSpacings = 1.7
const fadeFraction = 0.08

// A Fibonacci sphere gives each particle approximately the same area, including at the poles.
export const particleSeedGLSL = `
  const float pi = 3.14159265;
  const int side = ${particleSide};
  vec2 seedUV(int id) {
    float longitude = float(uint(id) * 2654435769u) / 4294967296.0;
    float z = 2.0 * (float(id) + 0.5) / float(side * side) - 1.0;
    return vec2(longitude, asin(z) / pi + 0.5);
  }`

export function createCloudParticles() {
  const targets = Array.from({ length: 2 }, () => new WebGLRenderTarget(particleSide, particleSide, {
    type: HalfFloatType, depthBuffer: false, minFilter: NearestFilter, magFilter: NearestFilter
  }))
  const step = new ShaderMaterial({
    blending: NoBlending, depthTest: false, depthWrite: false,
    uniforms: {
      particles: { value: targets[0].texture }, wind: { value: null as Texture | null },
      elapsed: { value: 0 }, initialize: { value: true }
    },
    vertexShader: 'void main() { gl_Position = vec4(position.xy, 0.0, 1.0); }',
    fragmentShader: `
      ${particleSeedGLSL}
      uniform sampler2D particles, wind;
      uniform float elapsed;
      uniform bool initialize;
      void main() {
        ivec2 cell = ivec2(gl_FragCoord.xy);
        int id = cell.y * side + cell.x;
        if (initialize) {
          uint hash = uint(id) * 747796405u + 2891336453u;
          hash = ((hash >> ((hash >> 28u) + 4u)) ^ hash) * 277803737u;
          float phase = float(hash ^ (hash >> 22u)) / 4294967296.0;
          gl_FragColor = vec4(0.0, 0.0, phase * ${lifetime}.0, 1.0);
          return;
        }
        vec3 state = texelFetch(particles, cell, 0).xyz;
        float age = mod(state.z + elapsed, ${lifetime}.0);
        vec2 offset = age < elapsed ? vec2(0.0) : state.xy;
        vec2 pos = seedUV(id) + offset;
        vec2 velocity = mix(vec2(-21.32, -21.57), vec2(26.8, 21.42), textureLod(wind, pos, 0.0).rg);
        float c = cos((pos.y - 0.5) * pi);
        float distance = min(elapsed, age) * ${windSpeedup}.0 / 6371000.0;
        offset += velocity * distance * smoothstep(0.0, 0.20, c) / vec2(2.0*pi*max(c, 0.20), pi);
        gl_FragColor = vec4(offset, age, 1.0);
      }`
  })
  const quad = new PlaneGeometry(2, 2)
  const simulation = new Scene()
  simulation.add(new Mesh(quad, step))

  // Each instance is one independent soft particle. A wrapped copy covers the date line.
  const geometry = new InstancedBufferGeometry()
  geometry.setAttribute('position', new BufferAttribute(new Float32Array([
    -1,-1,0, 1,-1,0, 1,1,0, -1,1,0
  ]), 3))
  geometry.setIndex([0,1,2, 0,2,3])
  // Only seeds that can reach the seam need a second longitude copy. The
  // wind integration clamps cos(latitude) to 0.2 and GFS east wind to 26.8 m/s.
  const drift = 26.8 * windSpeedup * lifetime / (6371000 * 0.2)
  const radius = radiusInSpacings * Math.sqrt(4 * Math.PI / particleCount)
  const seamMargin = (drift + Math.asin(Math.sin(radius) / 0.15)) / (2 * Math.PI)
  const copies: number[] = []
  for (let id = 0; id < particleCount; id++) {
    const longitude = (Math.imul(id, 2654435769) >>> 0) / 4294967296
    const z = 2 * (id + 0.5) / particleCount - 1
    if (Math.min(longitude, 1 - longitude) < seamMargin || Math.abs(z) > 0.98) copies.push(id)
  }
  const ids = new Float32Array(particleCount + copies.length)
  for (let id = 0; id < particleCount; id++) ids[id] = id
  copies.forEach((id, index) => { ids[particleCount + index] = -1 - id })
  geometry.setAttribute('particleId', new InstancedBufferAttribute(ids, 1))
  geometry.instanceCount = ids.length
  const sprites = new ShaderMaterial({
    transparent: true, blending: CustomBlending, blendEquation: AddEquation,
    blendSrc: OneFactor, blendDst: OneFactor, depthTest: false, depthWrite: false,
    uniforms: { particles: { value: targets[0].texture }, mass: { value: null as Texture | null } },
    vertexShader: `
      ${particleSeedGLSL}
      uniform sampler2D particles, mass;
      attribute float particleId;
      varying vec2 local;
      flat varying vec3 center;
      flat varying vec3 emission;
      varying vec2 angles;
      const float radius = ${radiusInSpacings} * sqrt(4.0 * pi / float(side * side));
      void main() {
        bool wrapped = particleId < 0.0;
        int id = int(wrapped ? -1.0 - particleId : particleId);
        ivec2 cell = ivec2(id % side, id / side);
        vec3 seed = texelFetch(mass, cell, 0).rgb;
        if (seed.r < 0.015) { gl_Position = vec4(2.0, 2.0, 0.0, 1.0); return; }
        vec3 state = texelFetch(particles, cell, 0).xyz;
        vec2 uv = seedUV(id) + state.xy;
        uv.x = fract(uv.x);
        float latitude = (uv.y - 0.5) * pi;
        float c = cos(latitude);
        float longitude = uv.x * 2.0*pi;
        float halfWidth = c <= sin(radius) ? 0.5 : asin(sin(radius)/c) / (2.0*pi);
        float phase = state.z / ${lifetime}.0;
        float fade = smoothstep(0.0, ${fadeFraction}, phase) * smoothstep(0.0, ${fadeFraction}, 1.0 - phase);
        // Normalize the integrated radial kernel and the average lifetime fade.
        // Carry the source density and its east/north gradient with the particle.
        // Reconstructing a slope inside the footprint retains narrow cloud edges.
        vec2 gradient = (seed.gb * 2.0 - 1.0) * ${radiusInSpacings};
        gradient *= min(1.0, min(seed.r, 1.0-seed.r) / max(length(gradient), 0.0001));
        emission = vec3(seed.r, gradient) * fade * ${3 / (Math.PI * radiusInSpacings ** 2 * (1 - fadeFraction))};
        if (wrapped && min(uv.x, 1.0-uv.x) >= halfWidth) {
          gl_Position = vec4(2.0, 2.0, 0.0, 1.0);
          return;
        }
        center = vec3(c*cos(longitude), c*sin(longitude), sin(latitude));
        local = position.xy;
        vec2 dest = uv + position.xy * vec2(halfWidth, radius/pi);
        angles = vec2(dest.x * 2.0*pi, (dest.y - 0.5)*pi);
        if (wrapped) dest.x += uv.x < 0.5 ? 1.0 : -1.0;
        gl_Position = vec4(dest * 2.0 - 1.0, 0.0, 1.0);
      }`,
    fragmentShader: `
      varying vec2 local, angles;
      flat varying vec3 center;
      flat varying vec3 emission;
      void main() {
        vec2 offset = local;
        float r2 = dot(offset, offset);
        // Near a pole evaluate distance on the sphere, where longitude lines converge.
        if (abs(center.z) > 0.94) {
          float c = cos(angles.y);
          vec3 delta = vec3(c*cos(angles.x), c*sin(angles.x), sin(angles.y)) - center;
          vec3 east = normalize(vec3(-center.y, center.x, 0.0));
          offset = vec2(dot(delta, east), dot(delta, cross(center, east))) * ${1 / radius};
          r2 = dot(delta, delta) * ${particleCount / (4 * Math.PI * radiusInSpacings ** 2)};
        }
        float kernel = max(1.0 - r2, 0.0);
        gl_FragColor = vec4(max(0.0, emission.x + dot(emission.yz, offset)) * kernel * kernel, 0.0, 0.0, 1.0);
      }`
  })
  const mesh = new Mesh(geometry, sprites)
  mesh.frustumCulled = false
  const scene = new Scene()
  scene.add(mesh)
  const camera = new OrthographicCamera()
  let active = 0
  let lastSeconds = -1
  return {
    render(renderer: WebGLRenderer, wind: Texture, mass: Texture, output: WebGLRenderTarget, seconds: number) {
      if (seconds !== lastSeconds) {
        const u = step.uniforms
        u.particles.value = targets[active].texture
        u.wind.value = wind
        u.initialize.value = lastSeconds < 0
        u.elapsed.value = seconds - Math.max(lastSeconds, 0)
        active = 1 - active
        renderer.setRenderTarget(targets[active])
        renderer.render(simulation, camera)
        lastSeconds = seconds
      }
      sprites.uniforms.particles.value = targets[active].texture
      sprites.uniforms.mass.value = mass
      renderer.setRenderTarget(output)
      // EffectComposer disables automatic clearing. Each frame needs fresh optical density.
      if (!renderer.autoClear || !renderer.autoClearColor) renderer.clear(true, false, false)
      renderer.render(scene, camera)
    },
    dispose() {
      targets.forEach(target => target.dispose())
      sprites.dispose()
      step.dispose()
      quad.dispose()
      geometry.dispose()
    }
  }
}
