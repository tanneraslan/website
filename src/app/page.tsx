import type { Metadata } from 'next'
import Link from 'next/link'
import { Icon } from '@/components/Icon'

export const metadata: Metadata = { alternates: { canonical: '/' } }

export default function Home() {
  return <section className="intro">
    <p className="eyebrow"><span className="rule" />Software engineer</p>
    <h1>Tanner <br/>Aslan<span className="accent">.</span></h1>
    <p className="lede">I build real-time graphics, simulations, and software for the web.</p>
    <div className="actions">
      <Link className="primary-link" href="/resume">View résumé <Icon name="arrow"/></Link>
      <a className="text-link" href="https://github.com/tanneraslan">GitHub <Icon name="external"/></a>
    </div>
  </section>
}
