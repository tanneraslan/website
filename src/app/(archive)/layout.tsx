import type { ReactNode } from 'react'
import 'katex/dist/katex.min.css'
import './archive.css'

export default function ArchiveLayout({ children }: { children: ReactNode }) {
  return <div className="archive-page">{children}</div>
}
