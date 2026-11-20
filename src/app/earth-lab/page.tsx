import type { Metadata } from 'next'
export const metadata: Metadata = {
  title: 'Earth lab',
  description: 'An interactive Earth study by Tanner Aslan using NASA day and night imagery, NOAA terrain data, and atmospheric scattering.',
  alternates: { canonical: '/earth-lab' },
}
export default function EarthLab() {
  return <section className="lab-intro">
    <p className="eyebrow"><span className="rule"/>Graphics study</p>
    <h1>Earth lab<span className="accent">.</span></h1>
    <p className="lede">Move the sun across Earth to see the atmosphere, ocean, and city lights respond.</p>
  </section>
}
