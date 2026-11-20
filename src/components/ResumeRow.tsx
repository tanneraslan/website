'use client'

import { Link } from '@lenso/ui/link'
import { useMemo } from 'react'
import { PlaceLink } from './PlaceAtlas'

interface RowProps {
  name: string
  period: string
  id?: string
  role?: string
  location?: string
  coordinates?: [number, number]
  tools?: string
  href?: string
  links?: { label: string, href: string }[]
}

export default function ResumeRow({ name, period, id, role, location, coordinates, tools, href, links }: RowProps) {
  const latitude = coordinates?.[0], longitude = coordinates?.[1]
  const place = useMemo(() => id && location && latitude != null && longitude != null
    ? { id, location, title: name, detail: role ?? '', latitude, longitude, period, action: 'Read experience' }
    : null, [id, location, name, role, latitude, longitude, period])
  return <header id={id} className="resume-entry">
    <h3>{href ? <Link href={href}>{name}</Link> : name}</h3>
    {role && <p>{role}</p>}
    <p className="resume-meta">{place ? <PlaceLink place={place}/> : location}{location && ' · '}{period}</p>
    {tools && <p className="resume-meta">{tools}</p>}
    {links?.map(link => <Link key={link.href} href={link.href}>{link.label}</Link>)}
  </header>
}
