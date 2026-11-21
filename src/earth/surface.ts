import type { EarthAtmosphere } from './atmosphere'
import { bumpGLSL } from './bump'
import { oceanGLSL } from './ocean'
import { Geodetic } from '@takram/three-geospatial'
import { nightLightingGLSL } from './night-lighting'
import { cityTwilightGLSL } from './city-points'
import {
  ShaderMaterial, SphereGeometry, Vector3
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

export function createSurface(atmosphere: EarthAtmosphere) {
  return new ShaderMaterial({
    defines: Object.fromEntries(atmosphere.defines),
    uniforms: {
      ...Object.fromEntries([...atmosphere.uniforms].filter(([key]) =>
        key === 'ATMOSPHERE' || key.endsWith('_texture') || key.endsWith('_TO_LUMINANCE'))),
      day: { value: null }, night: { value: null }, elevation: { value: null },
      dayCube: { value: null }, cubeMix: { value: 0 },
      bathymetry: { value: null }, waterNormal: { value: null }, oceanSeconds: { value: 0 },
      sunDirection: { value: new Vector3() }
    },
    vertexShader: `
      varying vec3 surfacePosition;
      void main() {
        surfacePosition = position;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }`,
    fragmentShader: `
      uniform sampler2D day, night, elevation;
      uniform samplerCube dayCube;
      uniform float cubeMix;
      uniform vec3 sunDirection;
      varying vec3 surfacePosition;
      ${cityTwilightGLSL}
      ${nightLightingGLSL}
      ${oceanGLSL}
      ${bumpGLSL}
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
        float oceanMask = textureGrad(elevation, geoUV, uvDx, uvDy).b;
        BumpStencil stencil = bumpStencil(normal, east, north, float(textureSize(elevation, 0).x));
        vec3 terrainNormal = normal;
        if (oceanMask < 1.0) {
          vec4 heights = bumpSamples(elevation, stencil, uvDx, uvDy);
          terrainNormal = bumpNormal(normal, east, north, stencil, heights * (1.0 - oceanMask));
        }
        // Preserve bright sea ice in the satellite imagery. The ocean mask
        // supplies fractional coastal coverage and the DEM supplies depth.
        float openWater = oceanMask * (1.0 - smoothstep(0.16, 0.48, min(color.r,min(color.g,color.b))));
        float solarElevation = dot(normal, sunDirection);
        float diffuse = max(0.0, dot(terrainNormal, sunDirection));
        vec3 radiance = color * (0.016 + 1.5 * diffuse * diffuse);

        vec3 view = normalize(cameraPosition - surfacePosition);
        // Fixed geographic footprints across base/refined night maps. Blend the
        // two coarse levels to soften cities into the surrounding terrain.
        float urbanMip = log2(float(textureSize(night, 0).x) / 512.0);
        float urban = textureLod(night, geoUV, urbanMip).r;
        float outskirts = textureLod(night, geoUV, urbanMip + 1.0).r;
        float spill = pow(max(mix(urban, outskirts, 0.55) - 0.002, 0.0), 0.68);
        float localDusk = 0.024 * sin(17.0 * normal.x + 8.0 * normal.z)
          * cos(23.0 * normal.y - 5.0 * normal.z);
        float darkness = cityDarkness(solarElevation + localDusk);
        float groundValue = dot(color, vec3(0.2126, 0.7152, 0.0722));
        float nightWeight = nightExposure(solarElevation);
        float landReflectance = 0.012 + 0.070 * sqrt(groundValue);
        float moon = moonIllumination(terrainNormal) * mix(landReflectance, 0.004, oceanMask);
        float airPath = 1.0 - max(dot(normal, view), 0.0);
        vec3 air = vec3(0.0025, 0.0037, 0.0090) * (1.0 + 0.6 * airPath);
        vec3 cityAir = vec3(0.052, 0.036, 0.026) * urbanHaze(night, geoUV) * (1.0 + airPath);
        radiance += nightWeight * (moon * vec3(0.51, 0.65, 1.12) + air + cityAir);

        float nightRelief = pow(max(dot(normal, terrainNormal), 0.0), 3.0);
        float groundGlow = spill * (0.30 + pow(groundValue, 0.67))
          * nightRelief * (1.0 - oceanMask);
        radiance += darkness * groundGlow * vec3(1.35, 0.64, 0.22);
        if (openWater > 0.001) {
          float encoded = textureGrad(bathymetry, geoUV, uvDx, uvDy).r;
          vec3 wave = waterSurface(surfacePosition / 6378137.0, normal);
          vec3 waterLight = lightOcean(normal, wave, view, sunDirection, 11000.0 * encoded * encoded);
          radiance = mix(radiance, waterLight, openWater);
        }
        gl_FragColor = vec4(radiance, 1.0);
      }`
  })
}
