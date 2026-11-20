'use client'

import { useState } from 'react'
import type { EarthPose } from '@/earth'
import { EarthLighting } from '@/components/EarthLighting'
import { SiteLink } from '@/components/SiteLink'

export function MaterialSample() {
  const [pose, setPose] = useState<EarthPose>('crescent')
  return <div className="sample-frame" style={{ backgroundImage: `url(/earth/${pose}.webp)` }}>
    <EarthLighting pose={pose} onChange={setPose} />
    <SiteLink href="/earth-lab">Open live material in Earth lab</SiteLink>
  </div>
}
