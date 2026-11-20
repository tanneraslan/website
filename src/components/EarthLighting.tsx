'use client'

import { SegmentedControl } from '@lenso/ui/segmented-control'
import type { Ref } from 'react'
import type { EarthPose } from '@/earth'
import { Icon } from './Icon'

export function EarthLighting({ pose, onChange, live = false, glassRef }: {
  pose: EarthPose, onChange: (pose: EarthPose) => void, live?: boolean, glassRef?: Ref<HTMLDivElement>
}) {
  return <div ref={glassRef} className="glass-pod" data-live={live}>
    <SegmentedControl aria-label="Earth lighting" glass={false} elastic={false}
      items={[{ value: 'crescent', label: <><Icon name="moon"/>Crescent</> }, { value: 'experience', label: <><Icon name="sun"/>Daylight</> }]}
      value={pose} onValueChange={value => onChange(value === 'experience' ? 'experience' : 'crescent')} />
  </div>
}
