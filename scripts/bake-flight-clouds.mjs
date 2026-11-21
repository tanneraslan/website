// Bake the optical depth and light of two cloud banks. The globe shader and
// the route overlay read the same atlas, including its feathered silhouettes.
import sharp from 'sharp'
import { fileURLToPath } from 'node:url'

const width = 640
const height = 448
const atlas = Buffer.alloc(width * height * 2 * 4)
const grid = new Float32Array(64 ** 3)
let seed = 18721
for (let i = 0; i < grid.length; i++) {
  seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0
  grid[i] = seed / 0xffffffff
}
const mix = (a, b, t) => a + (b - a) * t
const smooth = t => t * t * (3 - 2 * t)
const clamp = t => Math.min(1, Math.max(0, t))
function noise(x, y, z) {
  const i = Math.floor(x), j = Math.floor(y), k = Math.floor(z)
  const u = smooth(x - i), v = smooth(y - j), w = smooth(z - k)
  const at = (a, b, c) => grid[(a & 63) + (b & 63) * 64 + (c & 63) * 4096]
  const plane = c => mix(mix(at(i,j,c), at(i+1,j,c), u), mix(at(i,j+1,c), at(i+1,j+1,c), u), v)
  return mix(plane(k), plane(k + 1), w) - .5
}
function shape(x, y, z) {
  return noise(x,y,z) + .52 * noise(2.1*x+3,2.1*y,2.1*z) +
    .25 * noise(4.3*x,4.3*y+7,4.3*z) + .12 * noise(9*x,9*y,9*z)
}
for (let bank = 0; bank < 2; bank++) {
  for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) {
    const u = x / (width - 1), v = y / (height - 1)
    const nx = u * 5.3 + bank * 27, ny = v * 4 + 9
    const front = .70 + .36 * noise(1.3, v * 4, bank * 8)
    let alpha = 0, light = 0
    // Integrate front to back. An offset density sample approximates sunlight
    // entering the bank from the upper left.
    for (let i = 0; i < 32 && alpha < .997; i++) {
      const z = 1 - i / 31
      const cloud = shape(nx, ny, z * 3.1)
      const density = (front - u) * 1.9 + cloud - 1.95 * (z - .36) ** 2
      if (density <= 0) continue
      const opacity = (1 - alpha) * (1 - Math.exp(-density * 1.45))
      const shade = shape(nx - .28, ny - .34, z * 3.1 + .35)
      light += opacity * clamp(.17 + z * .54 + (cloud - shade) * .88)
      alpha += opacity
    }
    const tone = light / Math.max(alpha, .001)
    const offset = 4 * (x + (y + bank * height) * width)
    atlas[offset] = mix(59, 190, tone)
    atlas[offset+1] = mix(73, 197, tone)
    atlas[offset+2] = mix(89, 201, tone)
    atlas[offset+3] = 255 * Math.max(alpha, 1 - smooth(clamp((u - .54) / .16))) * smooth(clamp((1 - u) / .06))
  }
}
const output = new URL('../public/earth/data/flight-banks.webp', import.meta.url)
await sharp(atlas, { raw: { width, height: height * 2, channels: 4 } })
  .webp({ quality: 88, alphaQuality: 92 }).toFile(fileURLToPath(output))
