import { entries, postTags, type Entry } from '@/content/metadata'
import { SiteLink } from '@/components/SiteLink'
import Image from 'next/image'

export const formatDate = (date: string) => new Intl.DateTimeFormat('en-US', {
  month: 'long', day: 'numeric', year: 'numeric', timeZone: 'UTC',
}).format(new Date(date + 'T00:00:00Z'))

export async function PostList({ posts }: { posts?: Entry[] }) {
  const items = posts ?? await entries('posts')
  return <ul className="post-list">{items.map(post => <li key={post.slug}>
    <SiteLink data-archive="post-item" href={'/posts/' + post.slug}>
      {post.image && <Image src={post.previewImage ?? post.image} alt="" width={176} height={121}
        sizes="(max-width: 489px) 88px, (max-width: 978px) 18vw, 176px"/>}
      <div><time dateTime={post.date}>{formatDate(post.date)}</time><h2>{post.title}</h2><p>{post.description}</p></div>
    </SiteLink>
    <div className="article-tags">{postTags(post).map(tag =>
      <SiteLink key={tag} href={'/tags/' + encodeURIComponent(tag)}>{tag}</SiteLink>)}</div>
  </li>)}</ul>
}

export async function MusicList() {
  const pieces = await entries('music')
  return <ul className="music-list">{pieces.map(piece => <li key={piece.slug}>
    <SiteLink data-archive="music-item" href={'/music/' + piece.slug}>
      <span><strong>{piece.title}</strong>
        {piece.description && <span>{piece.description}</span>}
        {piece.genre?.length ? <small>{piece.genre.join(' · ')}</small> : null}
      </span>
      <time dateTime={piece.date}>{piece.date.slice(0, 4)}</time>
    </SiteLink>
  </li>)}</ul>
}
