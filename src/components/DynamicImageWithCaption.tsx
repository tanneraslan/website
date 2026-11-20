import type { ReactNode } from 'react'

export default function DynamicImageWithCaption({ src, alt, caption }: { src: string; alt: string; caption: ReactNode }) {
  return <figure><img src={src} alt={alt} loading="lazy" /><figcaption>{caption}</figcaption></figure>
}
