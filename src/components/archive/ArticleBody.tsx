'use client'

import type { ReactNode } from 'react'
import { Prose } from '@lenso/ui/typography'

export function ArticleBody({ children }: { children: ReactNode }) {
  return <Prose data-archive="article-body">{children}</Prose>
}
