import { Geodetic } from '@takram/three-geospatial'
import { cityTwilightGLSL } from './city-points'
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
      dayCube: { value: null }, cubeMix: { value: 0 },
      textureCores: { value: 1 }, sunDirection: { value: new Vector3() }
    },
    vertexShader: `
      varying vec3 surfacePosition;
      void main() {
        surfacePosition = position;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }`,
    fragmentShader: `
      uniform sampler2D day, night, relief;
      uniform samplerCube dayCube;
      uniform float cubeMix, textureCores;
      uniform vec3 sunDirection;
      varying vec3 surfacePosition;
      ${cityTwilightGLSL}
      void main() {
        // Geodetic normal = normalized position divided by squared ellipsoid radii.
        vec3 normal = normalize(surfacePosition * vec3(1.0, 1.0, 1.0067394967));
        float cosLat = max(length(normal.xy), 0.00001);
        vec3 east = vec3(-normal.y, normal.x, 0.0) / cosLat;
        vec3 north = cross(normal, east);
        vec2 geoUV = vec2(atan(normal.y, normal.x) / 6.2831853, asin(clamp(normal.z, -1.0, 1.0)) / 3.14159265) + 0.5;

        // Differentiate the continuous direction, so the dateline cannot select
        // a globe-wide mip. Longitude covers less ground towards either pole.
        vec3 dx = dFdx(normal), dy = dFdy(normal);
        vec2 scales = vec2(6.2831853 * cosLat, 3.14159265);
        vec2 uvDx = vec2(dot(dx, east), dot(dx, north)) / scales;
        vec2 uvDy = vec2(dot(dy, east), dot(dy, north)) / scales;
        vec3 color = textureGrad(day, geoUV, uvDx, uvDy).rgb;
        if (cubeMix > 0.0) color = mix(color, texture(dayCube, normal).rgb, cubeMix);
        vec3 material = textureGrad(relief, geoUV, uvDx, uvDy).rgb;
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
        float lights = textureGrad(night, geoUV, uvDx, uvDy).r;
        float spill = textureGrad(night, geoUV, uvDx * 8.0, uvDy * 8.0).r;
        float localDusk = 0.024 * sin(17.0 * normal.x + 8.0 * normal.z)
          * cos(23.0 * normal.y - 5.0 * normal.z);
        float darkness = cityDarkness(solarElevation + localDusk);
        float core = smoothstep(0.5, 0.98, lights);
        vec3 lampColor = mix(vec3(1.0, 0.52, 0.17), vec3(1.25, 1.03, 0.75), core);
        float groundValue = dot(color, vec3(0.2126, 0.7152, 0.0722));
        float groundGlow = spill * (0.045 + 0.12 * sqrt(groundValue)) * (1.0 - material.b);
        radiance += darkness * (textureCores * 1.35 * lights * lampColor + groundGlow * vec3(1.0, 0.37, 0.10));
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
