import { Geodetic } from '@takram/three-geospatial'
import {
  DynamicDrawUsage, Float32BufferAttribute, InstancedBufferGeometry, InstancedInterleavedBuffer,
  InterleavedBufferAttribute, Mesh, ShaderMaterial, Vector2, Vector3
} from 'three'

// Both the surface spill and individual lamps follow the local solar elevation.
export const cityTwilightGLSL = `
  float cityDarkness(float sunDot) {
    return 1.0 - smoothstep(-0.03489950, 0.20791169, sunDot);
  }`

function lampGeometry() {
  const geometry = new InstancedBufferGeometry()
  geometry.setAttribute('position', new Float32BufferAttribute([-1,-1,0, 1,-1,0, 1,1,0, -1,1,0], 3))
  geometry.setIndex([0,1,2, 0,2,3])
  geometry.instanceCount = 0
  return geometry
}

// Both the solid lamps and the bloom source use this geometry, phase and
// photometry. Screen filtering may change their footprint, never their location.
export const lampVertexGLSL = `
  attribute vec3 lampCenter;
  attribute vec2 lampValues;
  uniform vec3 sunDirection;
  uniform float focalLengthPx;
  uniform float lampFade;
  ${cityTwilightGLSL}

  struct Lamp { vec3 center; vec3 color; float diameter; float viewCos; };
  Lamp sampleLamp() {
    Lamp lamp;
    float intensity = lampValues.x;
    vec3 normal = normalize(lampCenter * vec3(1.0, 1.0, 1.00673950));
    vec3 viewDir = normalize(cameraPosition - lampCenter);
    lamp.viewCos = dot(viewDir, normal);
    float sunDot = dot(normal, sunDirection);
    float darkness = cityDarkness(sunDot);
    float offset = (lampValues.y - 0.5) * 0.10 * 4.0 * darkness * (1.0 - darkness);
    float scale = cityDarkness(sunDot - offset);
    // Map Sebastian's world (radius 150) to meters, enlarging diameter 3x for orbit.
    lamp.diameter = mix(3.15, 24.6, intensity) * 0.01 * (6378137.0 / 150.0) * 3.0 * scale;
    lamp.center = lampCenter + viewDir * (350.0 + 2200.0 * intensity);
    // Cap the solid core at three CSS pixels, then fade its emitting area
    // as the camera resolves the footprint. The texture carries the local glow.
    float depth = -(viewMatrix * vec4(lamp.center, 1.0)).z;
    float diameterPx = lamp.diameter * focalLengthPx / max(depth, 1.0);
    lamp.diameter *= lampFade * (3.0 / max(3.0, diameterPx)) * (1.0 - smoothstep(3.0, 16.0, diameterPx));
    lamp.color = mix(vec3(0.6431373, 0.41890523, 0.0),
                     vec3(1.0, 0.92440695, 0.6839622) * 1.75, intensity);
    return lamp;
  }`

function lampMaterial() {
  return new ShaderMaterial({
    transparent: true, depthWrite: false,
    uniforms: { groundOpacity: { value: 1 }, focalLengthPx: { value: 1 }, lampFade: { value: 0 }, sunDirection: { value: new Vector3(1, 0, 0) }, viewportPx: { value: new Vector2(1, 1) } },
    vertexShader: `
      varying vec3 lampColor;
      uniform vec2 viewportPx;
      varying vec2 offsetPx;
      varying float radiusPx;
      ${lampVertexGLSL}
      void main() {
        Lamp lamp = sampleLamp();
        if (lamp.diameter <= 0.0 || lamp.viewCos <= 0.0) {
          gl_Position = vec4(2.0, 2.0, 2.0, 1.0);
          return;
        }
        gl_Position = projectionMatrix * viewMatrix * vec4(lamp.center, 1.0);
        radiusPx = 0.25 * lamp.diameter * viewportPx.y * projectionMatrix[1][1] / gl_Position.w;
        offsetPx = position.xy * (max(radiusPx, 1.0) + 0.75);
        gl_Position.xy += 2.0 * offsetPx * gl_Position.w / viewportPx;
        lampColor = lamp.color;
      }`,
    fragmentShader: `
      uniform float groundOpacity;
      varying vec3 lampColor;
      varying vec2 offsetPx;
      varying float radiusPx;
      void main() {
        // Spread a subpixel disc over adjacent samples, preserving its emitting area.
        float r = max(radiusPx, 1.0);
        float coverage = 1.0 - smoothstep(r - 0.75, r + 0.75, length(offsetPx));
        gl_FragColor = vec4(lampColor, groundOpacity * coverage * radiusPx * radiusPx / (r*r + 0.1125));
      }`
  })
}

interface LightBin {
  direction: Vector3
  start: number
  end: number
  visible: boolean
}

class CityPointLayer extends Mesh<InstancedBufferGeometry, ShaderMaterial> {
  private readonly towardCamera = new Vector3()
  private readonly visibleData: InstancedInterleavedBuffer

  constructor(private readonly records: Float32Array, private readonly bins: LightBin[]) {
    super(lampGeometry(), lampMaterial())
    this.name = 'Geographical Adventures city lights'
    this.frustumCulled = false
    this.renderOrder = 1
    this.visibleData = new InstancedInterleavedBuffer(new Float32Array(records.length), 5, 1)
    this.visibleData.setUsage(DynamicDrawUsage)
    this.geometry.setAttribute('lampCenter', new InterleavedBufferAttribute(this.visibleData, 3, 0))
    this.geometry.setAttribute('lampValues', new InterleavedBufferAttribute(this.visibleData, 2, 3))
  }

  updateView(cameraPosition: Vector3, sunDirection: Vector3, focalLengthPx: number, width: number, height: number) {
    this.material.uniforms.viewportPx.value.set(width, height)
    this.material.uniforms.focalLengthPx.value = focalLengthPx
    this.material.uniforms.sunDirection.value.copy(sunDirection)
    this.towardCamera.copy(cameraPosition).normalize()
    // A 15-degree bin has angular radius below 11 degrees. Include a margin
    // on both sides of the terminator/horizon; the shader tests each lamp.
    const margin = 0.22
    const horizon = 6356752.3 / cameraPosition.length() - margin
    let changed = false
    for (const bin of this.bins) {
      const visible = bin.direction.dot(this.towardCamera) >= horizon &&
        bin.direction.dot(sunDirection) <= 0.208 + margin
      if (visible !== bin.visible) changed = true
      bin.visible = visible
    }
    if (!changed) return
    let offset = 0
    for (const bin of this.bins) {
      if (!bin.visible) continue
      this.visibleData.array.set(this.records.subarray(bin.start, bin.end), offset)
      offset += bin.end - bin.start
    }
    this.geometry.instanceCount = offset / 5
    this.visibleData.clearUpdateRanges()
    if (offset > 0) {
      this.visibleData.addUpdateRange(0, offset)
      this.visibleData.needsUpdate = true
    }
  }
}

export async function loadCityPoints(signal: AbortSignal) {
  const response = await fetch('/earth/data/city-points.bin', { signal })
  if (!response.ok) throw new Error(`City lights returned HTTP ${response.status}.`)
  const buffer = await response.arrayBuffer()
  signal.throwIfAborted()
  const header = new DataView(buffer)
  if (header.byteLength < 12 || header.getUint32(0) !== 0x4c495431) {
    throw new Error('Unrecognized city light asset.')
  }
  const count = header.getUint32(4, true)
  const groupCount = header.getUint32(8, true)
  const recordsOffset = 12 + groupCount * 8
  if (recordsOffset + count * 20 !== buffer.byteLength) throw new Error('Incomplete city light asset.')
  const records = new Float32Array(buffer, recordsOffset)
  const bins: LightBin[] = []
  let end = 0
  for (let group = 0; group < groupCount; group++) {
    const cell = header.getUint32(12 + group * 8, true)
    const length = header.getUint32(16 + group * 8, true)
    const lon = ((cell % 24 + 0.5) * 15 - 180) * Math.PI / 180
    const lat = ((Math.floor(cell / 24) + 0.5) * 15 - 90) * Math.PI / 180
    const start = end
    end += length * 5
    bins.push({ start, end, visible: false, direction: new Vector3(
      Math.cos(lat) * Math.cos(lon), Math.cos(lat) * Math.sin(lon), Math.sin(lat)
    ) })
  }
  if (end !== records.length) throw new Error('Invalid city light group lengths.')

  const geodetic = new Geodetic()
  const point = new Vector3()
  for (let offset = 0; offset < records.length; offset += 5) {
    if (offset > 0 && offset % (8192 * 5) === 0) {
      await new Promise(resolve => setTimeout(resolve, 0))
      signal.throwIfAborted()
    }
    // The source encodes its normalized elevation in radii 150..153. Map
    // that terrain relief to 0..8,849 m above the Earth ellipsoid.
    const height = (records[offset + 2] - 150) * (8849 / 3)
    geodetic.set(records[offset], records[offset + 1], height).toECEF(point)
    point.toArray(records, offset)
  }
  return new CityPointLayer(records, bins)
}
