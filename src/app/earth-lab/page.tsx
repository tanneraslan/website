import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Earth lab',
  description: 'Compare satellite night lights with Sebastian Lague’s instanced city lights under a synchronized moving sun.',
  alternates: { canonical: '/earth-lab' },
}

export default function EarthLab() {
  return <section className="lab-intro">
    <p className="eyebrow"><span className="rule"/>Earth lab</p>
    <h1>City lights<span className="accent">.</span></h1>
    <p className="lede">Sweep the sun across NASA’s night map and Sebastian Lague’s instanced lights.</p>
  </section>
}
