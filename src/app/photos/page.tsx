import type { Metadata } from 'next'
import { albums } from '@/content/albums'
import { PhotoLocations } from '@/components/PhotoLocations'
import { PlaceLink } from '@/components/PlaceAtlas'

export const metadata: Metadata = {
  title: 'Photos', description: 'Explore Tanner Aslan’s travel photography by location.',
  alternates: { canonical: '/photos' },
}
export default function Photos() {
  return <PhotoLocations>
    {albums.toSorted((a, b) => a.title.localeCompare(b.title, 'en')).map(({ id, title, location, period, latitude, longitude, pinImage }) =>
      <PlaceLink key={id} place={{ id, title, location, period, latitude, longitude, pinImage,
        href: '/photos/' + id, detail: '', action: 'View album' }}/>)}
  </PhotoLocations>
}
