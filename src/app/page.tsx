import type { Metadata } from 'next'
import Image from 'next/image'
import { readFrontmatter } from '@/content/metadata'
import About from '@/content/index.mdx'
import { SiteLink } from '@/components/SiteLink'

export const metadata: Metadata = { alternates: { canonical: '/' } }

export default async function Home() {
  const {title, intro, featuredPhoto: photo} = await readFrontmatter<{
    title: string, intro: string, featuredPhoto: { src: string, alt: string, caption: string }
  }>('index.mdx')
  return <>
    <section className="intro">
      <h1>{title}</h1>
      <p className="lede">{intro}</p>
      <div className="actions">
        <SiteLink href="/resume" data-kind="primary">View resume</SiteLink>
        <SiteLink href="/posts">Read the blog</SiteLink>
      </div>
    </section>
    <section className="home-story">
      <div className="biography"><About /></div>
      <figure className="home-photo">
        <SiteLink href="/photos" aria-label="Explore Tanner’s photo albums">
          <Image src={photo.src} alt={photo.alt} sizes="(max-width: 760px) 90vw, 380px" width={480} height={600} />
        </SiteLink>
        <figcaption><span>{photo.caption}</span><SiteLink href="/photos">All photos</SiteLink></figcaption>
      </figure>
    </section>
  </>
}
