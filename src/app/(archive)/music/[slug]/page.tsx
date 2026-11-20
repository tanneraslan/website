import { ArticleBody } from '@/components/archive/ArticleBody'
import { notFound } from 'next/navigation'
import { entries } from '@/content/metadata'
import { SiteLink } from '@/components/SiteLink'
import { AudioPlayer } from '@/components/archive/AudioPlayer'

type Props = { params: Promise<{ slug: string }> }
export const dynamicParams = false
export async function generateStaticParams() {
  return (await entries('music')).map(({ slug }) => ({ slug }))
}
async function getPiece(slug: string) {
  return (await entries('music')).find(piece => piece.slug === slug) ?? notFound()
}
export async function generateMetadata({ params }: Props) {
  const piece = await getPiece((await params).slug)
  return { title: piece.title, description: piece.description, alternates: { canonical: '/music/' + piece.slug } }
}

export default async function Composition({ params }: Props) {
  const piece = await getPiece((await params).slug)
  const { default: Body } = await import(`@/content/music/${piece.slug}.mdx`)
  return <article>
    <header className="article-heading"><SiteLink href="/music">Music</SiteLink>
      <h1>{piece.title}</h1><p>{[piece.instruments?.join(', '), piece.date.slice(0, 4)].filter(Boolean).join(' · ')}</p>
    </header>
    {piece.audio && <AudioPlayer audio={piece.audio} title={piece.title} />}
    <ArticleBody><Body /></ArticleBody>
    {piece.sheetMusic && <section className="score">
      <h2>Sheet music</h2><SiteLink href={piece.sheetMusic} download>Download score (PDF)</SiteLink>
      <object data={piece.sheetMusic} type="application/pdf" aria-label={piece.title + ' sheet music'}>
        <SiteLink href={piece.sheetMusic}>Open sheet music</SiteLink>
      </object>
    </section>}
  </article>
}
