import { notFound } from 'next/navigation'
import { albums } from '@/content/albums'
import { PhotoAlbum, AlbumPhoto } from '@/components/PhotoAlbum'
import { PhotoDestinationLink } from '@/components/PhotoFlight'
import { SiteLink } from '@/components/SiteLink'

type Props = { params: Promise<{ area: string }> }

async function getAlbum({ params }: Props) {
  const { area } = await params
  return albums.find(album => album.id === area) ?? notFound()
}

export function generateStaticParams() {
  return albums.map(({ id }) => ({ area: id }))
}

export async function generateMetadata(props: Props) {
  const album = await getAlbum(props)
  return { title: album.title + ' · Photos', alternates: { canonical: '/photos/' + album.id } }
}

export default async function AreaGallery(props: Props) {
  const { id, title, pinImage, latitude, longitude, location, period, story, photos: Photos } = await getAlbum(props)
  return <article className="area-gallery">
    <PhotoAlbum key={id} city={{ id, title, latitude, longitude }} heading={<>
      <PhotoDestinationLink place={{ latitude, longitude, href: '/photos' }} data-kind="all-places">All locations</PhotoDestinationLink>
      <h1 className="album-title"><img src={pinImage} alt="" width="64" height="64"/><span>{title}</span></h1>
      <div className="album-meta"><span>{location} · {period}</span>
        {story && <SiteLink href={story}>Read the trip journal</SiteLink>}
      </div>
    </>}><Photos components={{ img: AlbumPhoto }}/></PhotoAlbum>
  </article>
}
