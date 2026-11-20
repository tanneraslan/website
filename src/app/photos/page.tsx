import type { Metadata } from 'next'
import Content from '@/content/photos.mdx'
import { AlbumPhoto } from '@/components/PhotoAlbum'

export const metadata: Metadata = {
  title: 'Photos', description: 'Photo albums from San Francisco, New York City and Vancouver by Tanner Aslan.',
  alternates: { canonical: '/photos' },
}
export default function Photos() {
  return <article className="photo-document"><Content components={{ img: AlbumPhoto }}/></article>
}
