"use client";
import { useState, useEffect, useRef } from "react";
import { Document, Page, pdfjs } from "react-pdf";

pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

interface PdfViewerProps {
  file: string;
}

export default function PdfViewer({ file }: PdfViewerProps) {
  const [numPages, setNumPages] = useState<number | null>(null);
  const [pdfPageWidth, setPdfPageWidth] = useState<number>(300);
  const [activePageIndex, setActivePageIndex] = useState(0);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  function onDocumentLoadSuccess({ numPages }: { numPages: number }) {
    setNumPages(numPages);
  }

  useEffect(() => {
    function updateWidth() {
      const windowWidth = window.innerWidth;
      const gap = 16;
      const padding = 32;

      if (windowWidth < 768) {
        setPdfPageWidth(windowWidth - padding);
      } else {
        setPdfPageWidth((windowWidth - padding - gap) / 2);
      }
    }

    updateWidth();
    window.addEventListener('resize', updateWidth);
    return () => window.removeEventListener('resize', updateWidth);
  }, []);

  const handleScroll = () => {
    if (!scrollContainerRef.current) return;
    const { scrollLeft } = scrollContainerRef.current;

    const singleItemWidth = pdfPageWidth + 16;
    const index = Math.round(scrollLeft / singleItemWidth);

    const safeIndex = Math.min(Math.max(0, index), (numPages || 1) - 1);
    setActivePageIndex(safeIndex);
  };

  const scrollToPage = (index: number) => {
    if (!scrollContainerRef.current) return;

    const container = scrollContainerRef.current.querySelector('.react-pdf__Document');
    if (container && container.children[index]) {
        container.children[index].scrollIntoView({
            behavior: 'smooth',
            block: 'nearest',
            inline: 'start'
        });
    }
  };

  return (
    <>
      <div
        ref={scrollContainerRef}
        onScroll={handleScroll}
        className="w-full overflow-x-auto overflow-y-hidden flex p-4 scroll-px-4 snap-x snap-mandatory scroll-smooth"
      >
        <Document
          file={file}
          onLoadSuccess={onDocumentLoadSuccess}
          className="flex flex-row gap-4 h-full w-max"
          loading={
             <div className="flex gap-4">
                <div className="w-[300px] h-[500px] bg-gray-3 animate-pulse rounded-md" />
                <div className="w-[300px] h-[500px] bg-gray-3 animate-pulse rounded-md hidden md:block" />
             </div>
          }
        >
          {numPages && Array.from(new Array(numPages), (el, index) => (
            <div
              key={`page_${index + 1}`}
              className="shadow-lg h-full snap-start shrink-0"
            >
                <Page
                  pageNumber={index + 1}
                  width={pdfPageWidth}
                  renderTextLayer={false}
                  renderAnnotationLayer={false}
                  className="border border-gray-3"
                />
            </div>
          ))}
        </Document>
      </div>

      {numPages && numPages > 0 && (
        <div className="flex justify-center gap-2 mt-4 flex-wrap px-4">
          {Array.from(new Array(numPages)).map((_, i) => (
            <button
              key={i}
              onClick={() => scrollToPage(i)}
              className={`w-2 h-2 rounded-full transition-all duration-300 ${
                i === activePageIndex
                  ? "bg-gray-12 w-4"
                  : "bg-gray-8 hover:bg-gray-10"
              }`}
              aria-label={`Go to page ${i + 1}`}
            />
          ))}
        </div>
      )}
    </>
  );
}
