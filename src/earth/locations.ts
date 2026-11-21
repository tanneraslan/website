export interface Coordinates {
  latitude: number
  longitude: number
}

export const cameraDistanceInRadii = 4
export const globeDiameterFraction = 0.85
export const maxOrbitZoom = 6
// Match the globe camera's terminal ground resolution to an integer Web
// Mercator tile zoom, using CSS pixels for both renderers.
export function flightLandingView(latitude: number, frameHeight: number) {
  const equator = 6378137
  const eccentricitySquared = 0.00669437999014
  const lat = latitude * Math.PI / 180
  const sin = Math.sin(lat), cos = Math.cos(lat)
  const primeVertical = equator / Math.sqrt(1 - eccentricitySquared * sin * sin)
  const groundRadius = primeVertical * Math.hypot(cos, (1 - eccentricitySquared) * sin)
  const focal = frameHeight * globeDiameterFraction * Math.sqrt(cameraDistanceInRadii ** 2 - 1) / 2
  const zoomZero = 2 * Math.PI * primeVertical * cos / 256
  const zoom = Math.max(3, Math.min(14, Math.round(Math.log2(focal * zoomZero / 115000))))
  const altitude = focal * zoomZero / 2 ** zoom
  return { zoom, altitude, groundRadius, distance: groundRadius + altitude }
}

// Work in zoom stops so a short tile wait can extend the approach without
// changing its clock or cutting to the map's initial scale.
export function inboundZoom(landing: ReturnType<typeof flightLandingView>, elapsed: number) {
  const t = Math.max(elapsed, 0) / 340
  const remaining = (1 + t) * Math.exp(-t)
  const orbitAltitude = 6378137 * cameraDistanceInRadii - landing.groundRadius
  return landing.zoom - remaining * Math.log2(orbitAltitude / landing.altitude)
}

export interface FlightMapView extends Coordinates {
  zoom: number
  sampledAt: number
  zoomRate: number // zoom levels per millisecond
}

// Distance to the farthest corner accounts for both aspect ratio and the
// off-center globe at takeoff. Leave some limb outside the frame before fading.
export function flightCloudOpacity(radiusPx: number, cx: number, cy: number, width: number, height: number, progress: number) {
  const farCorner = Math.hypot(Math.max(cx, width - cx), Math.max(cy, height - cy))
  const smooth = (t: number) => {
    const x = Math.max(0, Math.min(1, t))
    return x * x * (3 - 2 * x)
  }
  return smooth((radiusPx / farCorner - 1.22) / 0.40) * smooth((progress - 0.42) / 0.42)
}

const radians = Math.PI / 180

export function orbitAngles(progress: number) {
  return { latitude: (28 + 12 * progress) * radians, longitude: (-88 - 10 * progress) * radians }
}
export type OrbitAngles = ReturnType<typeof orbitAngles>
export type OrbitView = OrbitAngles & { zoom: number }

// Perspective projection in WGS84 equatorial radii, shared by the live overlay
// and static poster. The geodetic normal gives the exact ellipsoid horizon.
export function projectPlace(place: Coordinates, view: OrbitAngles & { zoom?: number }) {
  const latitude = place.latitude * radians
  const delta = place.longitude * radians - view.longitude
  const sinLat = Math.sin(latitude), cosLat = Math.cos(latitude)
  const sinView = Math.sin(view.latitude), cosView = Math.cos(view.latitude)
  const eccentricitySquared = 6.6943799901413165e-3
  const curvature = 1 / Math.sqrt(1 - eccentricitySquared * sinLat * sinLat)
  const radial = curvature * cosLat * Math.cos(delta)
  const z = curvature * (1 - eccentricitySquared) * sinLat
  const depth = cameraDistanceInRadii - (radial * cosView + z * sinView)
  const normalTowardCamera = cosLat * Math.cos(delta) * cosView + sinLat * sinView
  const east = curvature * cosLat * Math.sin(delta)
  const down = radial * sinView - z * cosView
  // Dot the surface normal with the unit vector from the city to the camera.
  // On this ellipsoid, normal · surfacePosition is 1 / curvature.
  const viewCosine = (cameraDistanceInRadii * normalTowardCamera - 1 / curvature) / Math.hypot(east, down, depth)
  const scale = (view.zoom ?? 1) * globeDiameterFraction * 0.5 * Math.sqrt(cameraDistanceInRadii ** 2 - 1) / depth
  return { x: east * scale, y: down * scale, visible: viewCosine > 0, viewCosine }
}
