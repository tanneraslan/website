export interface Coordinates {
  latitude: number
  longitude: number
}

export const cameraDistanceInRadii = 4
export const globeDiameterFraction = 0.85
const radians = Math.PI / 180

export function orbitAngles(progress: number) {
  return { latitude: (28 + 12 * progress) * radians, longitude: (-88 - 10 * progress) * radians }
}

// Perspective projection in WGS84 equatorial radii, shared by the live overlay
// and static poster. The geodetic normal gives the exact ellipsoid horizon.
export function projectPlace(place: Coordinates, progress: number) {
  const view = orbitAngles(progress)
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
  const visible = cameraDistanceInRadii * normalTowardCamera > 1 / curvature
  const scale = globeDiameterFraction * 0.5 * Math.sqrt(cameraDistanceInRadii ** 2 - 1) / depth
  return { x: curvature * cosLat * Math.sin(delta) * scale, y: (radial * sinView - z * cosView) * scale, visible }
}
