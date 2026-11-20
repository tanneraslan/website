import type { MetadataRoute } from 'next'
export default function sitemap(): MetadataRoute.Sitemap {
  return ['/', '/resume', '/earth-lab'].map(path => ({ url: new URL(path, 'https://tanneraslan.com').href }))
}
