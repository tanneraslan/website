'use client'

import { useEffect, useRef, useState } from 'react'
import { Document, Page, pdfjs } from 'react-pdf'

pdfjs.GlobalWorkerOptions.workerSrc = new URL('pdfjs-dist/build/pdf.worker.min.mjs', import.meta.url).toString()

const pageGap = 16

export default function PdfViewer({ file }: { file: string }) {
  const viewport = useRef<HTMLDivElement>(null)
  const [width, setWidth] = useState(0)
  const [pageCount, setPageCount] = useState(0)
  const [activePage, setActivePage] = useState(0)

  useEffect(() => {
    const element = viewport.current
    if (!element) return
    const observer = new ResizeObserver(() => setWidth(element.clientWidth))
    observer.observe(element)
    return () => observer.disconnect()
  }, [])

  const columns = width >= 720 && pageCount > 1 ? 2 : 1
  const pageWidth = (width - (columns - 1) * pageGap) / columns
  const positions = Math.max(0, pageCount - columns + 1)
  const step = pageWidth + pageGap

  return <div className="score-reader">
    <div ref={viewport} className="score-scroll" role="region" aria-label="Sheet music pages" tabIndex={0}
      onScroll={event => setActivePage(Math.round(event.currentTarget.scrollLeft / step))}>
      <Document file={file} onLoadSuccess={pdf => setPageCount(pdf.numPages)}
        loading={<p role="status">Loading score…</p>} error={<p>The score preview couldn’t load. You can still download the PDF above.</p>}>
        {width > 0 && Array.from({ length: pageCount }, (_, i) =>
          <Page key={i} pageNumber={i + 1} width={pageWidth} renderTextLayer={false} renderAnnotationLayer={false}
            devicePixelRatio={Math.min(window.devicePixelRatio, 2)} />)}
      </Document>
    </div>
    {positions > 1 && <div className="score-dots" role="group" aria-label="Score navigation">
      {Array.from({ length: positions }, (_, i) => <button key={i} type="button"
        aria-label={columns === 1 ? `Go to page ${i + 1}` : `Go to pages ${i + 1}–${i + 2}`}
        aria-current={i === Math.min(activePage, positions - 1) ? 'page' : undefined}
        onClick={() => viewport.current?.scrollTo({ left: i * step })}/>)}
    </div>}
  </div>
}
