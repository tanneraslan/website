import { Geodetic } from '@takram/three-geospatial'
import {
  BufferGeometry, Float32BufferAttribute, MathUtils, Points, ShaderMaterial,
  SphereGeometry, Vector3
} from 'three'

// Geometry UVs, satellite imagery, markers and the atmosphere share WGS84 ECEF.
export function createEllipsoid() {
  const geometry = new SphereGeometry(1, 192, 96)
  const positions = geometry.getAttribute('position')
  const uvs = geometry.getAttribute('uv')
  const geodetic = new Geodetic()
  const position = new Vector3()
  for (let i = 0; i < positions.count; i++) {
    geodetic.set((uvs.getX(i) - 0.5) * 2 * Math.PI, (uvs.getY(i) - 0.5) * Math.PI, 0)
    geodetic.toECEF(position)
    positions.setXYZ(i, position.x, position.y, position.z)
  }
  geometry.computeBoundingSphere()
  return geometry
}

export function createSurface() {
  return new ShaderMaterial({
    uniforms: {
      day: { value: null }, night: { value: null }, relief: { value: null },
      detailDay: { value: null }, detailRelief: { value: null },
      detailMix: { value: 0 }, sunDirection: { value: new Vector3() }
    },
    vertexShader: `
      varying vec2 geoUV;
      varying vec3 surfacePosition;
      void main() {
        geoUV = uv;
        surfacePosition = position;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }`,
    fragmentShader: `
      uniform sampler2D day, night, relief, detailDay, detailRelief;
      uniform float detailMix;
      uniform vec3 sunDirection;
      varying vec2 geoUV;
      varying vec3 surfacePosition;
      void main() {
        vec2 lonLat = (geoUV - 0.5) * vec2(360.0, 180.0);
        vec2 regionUV = (lonLat - vec2(-140.0, 15.0)) / vec2(90.0, 55.0);
        vec2 edge = min(regionUV, 1.0 - regionUV);
        float detail = detailMix * smoothstep(0.0, 0.035, min(edge.x, edge.y));
        vec3 color = texture2D(day, geoUV).rgb;
        vec3 material = texture2D(relief, geoUV).rgb;
        if (detail > 0.0) {
          color = mix(color, texture2D(detailDay, regionUV).rgb, detail);
          material = mix(material, texture2D(detailRelief, regionUV).rgb, detail);
        }

        vec2 angles = radians(lonLat);
        vec3 normal = vec3(cos(angles.y)*cos(angles.x), cos(angles.y)*sin(angles.x), sin(angles.y));
        vec3 east = vec3(-sin(angles.x), cos(angles.x), 0.0);
        vec3 north = cross(normal, east);
        vec2 slope = (2.0 * material.rg - 1.0) * (1.0 - material.b);
        vec3 terrainNormal = normalize(east * slope.x + north * slope.y +
          normal * sqrt(max(0.001, 1.0 - dot(slope, slope))));
        float solarElevation = dot(normal, sunDirection);
        float diffuse = max(0.0, dot(terrainNormal, sunDirection));
        vec3 radiance = color * (0.016 + 1.5 * diffuse);

        vec3 view = normalize(cameraPosition - surfacePosition);
        vec3 halfway = normalize(sunDirection + view);
        float fresnel = 0.022 + 0.978 * pow(1.0 - max(0.0, dot(view, halfway)), 5.0);
        float glint = pow(max(0.0, dot(normal, halfway)), 95.0) * fresnel;
        radiance += vec3(1.0, 0.87, 0.68) * glint * material.b * 9.0 *
          smoothstep(0.0, 0.08, solarElevation);

        // The coarse mip carries the light spilled onto the ground. The sharp
        // channel preserves distinct neighborhoods and the cores of large cities.
        float lights = texture2D(night, geoUV).r;
        float spill = texture2D(night, geoUV, 3.0).r;
        float localDusk = 0.024 * sin(17.0 * normal.x + 8.0 * normal.z)
          * cos(23.0 * normal.y - 5.0 * normal.z);
        float darkness = 1.0 - smoothstep(-0.18, 0.02, solarElevation + localDusk);
        float core = smoothstep(0.5, 0.98, lights);
        vec3 lampColor = mix(vec3(1.0, 0.52, 0.17), vec3(1.25, 1.03, 0.75), core);
        float groundValue = dot(color, vec3(0.2126, 0.7152, 0.0722));
        float groundGlow = spill * (0.045 + 0.12 * sqrt(groundValue)) * (1.0 - material.b);
        radiance += darkness * (1.35 * lights * lampColor + groundGlow * vec3(1.0, 0.37, 0.10));
        gl_FragColor = vec4(radiance, 1.0);
      }`
  })
}

const cities = [
  [-71.0589, 42.3601], [-83.7430, 42.2808],
  [-74.0060, 40.7128], [-123.1207, 49.2827]
]

export function createPins() {
  const coordinates = cities.flatMap(([lon, lat]) =>
    new Geodetic(MathUtils.degToRad(lon), MathUtils.degToRad(lat), 3000).toECEF().toArray()
  )
  const geometry = new BufferGeometry()
  geometry.setAttribute('position', new Float32BufferAttribute(coordinates, 3))
  return new Points(geometry, new ShaderMaterial({
    transparent: true,
    depthWrite: false,
    uniforms: { strength: { value: 0 }, pixelRatio: { value: 1 } },
    vertexShader: `
      uniform float pixelRatio;
      void main() {
        gl_PointSize = 9.0 * pixelRatio;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }`,
    fragmentShader: `
      uniform float strength;
      void main() {
        float radius = length(gl_PointCoord - 0.5) * 2.0;
        float center = 1.0 - smoothstep(0.23, 0.42, radius);
        float ring = smoothstep(0.55, 0.7, radius) * (1.0 - smoothstep(0.75, 1.0, radius));
        gl_FragColor = vec4(vec3(0.70, 1.6, 1.9), strength * max(center, 0.8*ring));
      }`
  }))
}
