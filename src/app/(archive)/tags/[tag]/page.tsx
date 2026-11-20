import { notFound } from 'next/navigation'
import { entries, postTags } from '@/content/metadata'
import { PostList } from '@/components/archive/ArchiveList'
import { SiteLink } from '@/components/SiteLink'

type Props = { params: Promise<{ tag: string }> }
export const dynamicParams = false
export async function generateStaticParams() {
  return Array.from(new Set((await entries('posts')).flatMap(postTags)), tag => ({ tag }))
}
export async function generateMetadata({ params }: Props) {
  const { tag } = await params
  return { title: 'Posts about ' + tag, alternates: { canonical: '/tags/' + encodeURIComponent(tag) } }
}
export default async function TagPage({ params }: Props) {
  const { tag } = await params
  const posts = (await entries('posts')).filter(post => postTags(post).includes(tag))
  if (!posts.length) notFound()
  return <><SiteLink href="/posts">Posts</SiteLink><h1>Posts about {tag}</h1><PostList posts={posts} /></>
}
