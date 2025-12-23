"use client";

import dynamic from "next/dynamic";
import WaveformPlayer from "./WaveformPlayer";

// pdf library requires DOMMatrix API, so disable it on server
const PdfViewer = dynamic(() => import("./PdfViewer"), {
  ssr: false,
  loading: () => <div className="h-[500px] w-full bg-gray-2 animate-pulse rounded-lg" />
});

interface MusicFrontMatter {
  title: string;
  date: string;
  genre?: string | string[];
  instruments?: string | string[];
  audio: string;
  sheetMusic?: string;
}

export default function MusicLayout({
  frontMatter,
  children
}: {
  frontMatter: MusicFrontMatter;
  children: React.ReactNode;
}) {
  const genres = Array.isArray(frontMatter.genre) ? frontMatter.genre : [frontMatter.genre].filter(Boolean);
  const instruments = Array.isArray(frontMatter.instruments) ? frontMatter.instruments : [frontMatter.instruments].filter(Boolean);

  return (
    <div className="mt-8 w-full">
      <div className="max-w-3xl mx-auto px-6">
        <h1 className="text-4xl font-bold tracking-tight mb-2">{frontMatter.title}</h1>
        <WaveformPlayer audioSrc={frontMatter.audio} />
        <div className="prose dark:prose-invert mb-12">
          {children}
        </div>
      </div>

      {frontMatter.sheetMusic && (
        <div className="w-full py-8 mt-12">
          <div className="max-w-3xl mx-auto px-6 flex justify-between items-end mb-4">
            <h2 className="text-xl font-bold">Sheet Music</h2>
            <a
              href={frontMatter.sheetMusic}
              download
              className="text-sm text-blue-500 hover:underline"
            >
              Download PDF
            </a>
          </div>

          <PdfViewer file={frontMatter.sheetMusic} />

        </div>
      )}
    </div>
  );
}
