'use client'

import NextLink from 'next/link'
import { Link } from '@lenso/ui/link'
import type { ComponentProps } from 'react'

type Props = Omit<ComponentProps<typeof Link>, 'href' | 'render'> & { href: string }

export function SiteLink({ href, ...props }: Props) {
  return <Link {...props} href={href} render={href.startsWith('/') ? <NextLink href={href} /> : undefined} />
}
