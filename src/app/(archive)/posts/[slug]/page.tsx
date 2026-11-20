import { ArticleBody } from '@/components/archive/ArticleBody'
import { notFound } from 'next/navigation'
import { entries, postTags } from '@/content/metadata'
import { SiteLink } from '@/components/SiteLink'
import { formatDate } from '@/components/archive/ArchiveList'

type Props = { params: Promise<{ slug: string }> }
export const dynamicParams = false
export async function generateStaticParams() {
  return (await entries('posts')).map(({ slug }) => ({ slug }))
}
async function getPost(slug: string) {
  return (await entries('posts')).find(post => post.slug === slug) ?? notFound()
}
export async function generateMetadata({ params }: Props) {
  const post = await getPost((await params).slug)
  return { title: post.title, description: post.description, alternates: { canonical: '/posts/' + post.slug },
    openGraph: { type: 'article', title: post.title, description: post.description, images: post.image ? [post.image] : [], publishedTime: post.date } }
}

export default async function Post({ params }: Props) {
  const post = await getPost((await params).slug)
  const { default: Body } = await import(`@/content/posts/${post.slug}.mdx`)
  return <article>
    <header className="article-heading"><SiteLink href="/posts">Posts</SiteLink>
      <h1>{post.title}</h1><time dateTime={post.date}>{formatDate(post.date)}</time>
      <div className="article-tags" aria-label="Topics">{postTags(post).map(tag =>
        <SiteLink key={tag} href={'/tags/' + encodeURIComponent(tag)}>{tag}</SiteLink>)}</div>
    </header>
    <ArticleBody><Body /></ArticleBody>
  </article>
}
