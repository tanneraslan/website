import type { Metadata, Viewport } from 'next'
import { SiteFrame } from '@/components/SiteFrame'
import './globals.css'

const description = 'Tanner Aslan is a software engineer and graphics programmer studying computer science at the University of Michigan. Explore his work and an interactive Earth rendered from satellite imagery.'

export const metadata: Metadata = {
  metadataBase: new URL('https://tanneraslan.com'),
  title: { default: 'Tanner Aslan — Software Engineer', template: '%s · Tanner Aslan' },
  description,
  openGraph: { type: 'website', siteName: 'Tanner Aslan', description, images: ['/earth/social.jpg'] },
  twitter: { card: 'summary_large_image', images: ['/earth/social.jpg'] },
}
export const viewport: Viewport = { themeColor: '#030507', colorScheme: 'dark' }

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en" >
    <body><SiteFrame>{children}</SiteFrame></body>
  </html>
}
