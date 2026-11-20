import type { MetadataRoute } from 'next'
import { archivePaths } from '@/content/metadata'

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const paths = ['/', '/resume', '/photos', '/earth-lab', ...await archivePaths()]
  return paths.map(path => ({ url: new URL(path, 'https://tanneraslan.com').href }))
}
