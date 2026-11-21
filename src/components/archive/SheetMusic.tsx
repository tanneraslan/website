'use client'

import dynamic from 'next/dynamic'
import { Component, type ReactNode } from 'react'

const fallback = <p>Use the PDF download above to view the score.</p>
const Viewer = dynamic<{ file: string }>(async () => {
  if (typeof Promise.withResolvers !== 'function') return () => fallback
  return (await import('./PdfViewer')).default
}, {
  ssr: false,
  loading: () => <p role="status">Loading score…</p>,
})

// Contain import, worker and rendering failures within the optional score preview.
class ScoreBoundary extends Component<{ children: ReactNode }> {
  state = { failed: false }
  static getDerivedStateFromError() { return { failed: true } }
  render() { return this.state.failed ? fallback : this.props.children }
}

export function SheetMusic({ file }: { file: string }) {
  return <ScoreBoundary><Viewer file={file}/></ScoreBoundary>
}
