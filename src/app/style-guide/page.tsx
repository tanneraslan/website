import type { Metadata } from 'next'
import { SiteLink } from '@/components/SiteLink'
import './guide.css'

export const metadata: Metadata = { title: 'Style guide', robots: { index: false, follow: false } }

export default function Guide() {
  return <article className="guide">
    <h1>Style guide</h1>
    <p className="lede">The visual language for Tanner’s portfolio.</p>
    <section><h2>Type</h2>
      <p>Use Inter throughout. Set titles in sentence case with tight spacing. Keep body text comfortably spaced and use the secondary text color for dates, locations, and captions.</p>
      <div className="type-sample"><strong>San Francisco</strong><span>Photo journal</span><small>May 2025</small></div>
    </section>
    <section><h2>Color</h2>
      <p>Use neutral surfaces for navigation and reading. Blue identifies links, focus, and selection. Reserve red for destructive actions.</p>
      <div className="swatches">{['Page','Surface','Text','Link'].map(t => <span key={t} data-swatch={t}>{t}</span>)}</div>
    </section>
    <section><h2>Controls and glass</h2>
      <p>Use Lenso components for navigation and controls. On mobile, use the floating glass tab bar and keep its labels legible over imagery.</p>
    </section>
    <section><h2>Content</h2>
      <p>The MDX files in <code>src/content</code> hold the biography, resume, photos, posts, and scores. Each album or experience owns the location used by its globe pin.</p>
      <SiteLink href="https://ui.lenso.dev/en/docs/react/components/">Lenso component reference</SiteLink>
    </section>
  </article>
}
