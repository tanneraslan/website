import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Earth lab',
  description: 'Compare satellite night lights with Sebastian Lague’s instanced city lights under a synchronized moving sun.',
  alternates: { canonical: '/earth-lab' },
}

export default function EarthLab() {
  return <section className="lab-intro">
    <h1>Earth lab</h1>
    <p className="lede">Compare NASA’s night map with Sebastian Lague’s instanced city lights under a moving sun.</p>
  </section>
}
