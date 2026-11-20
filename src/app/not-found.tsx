import Link from 'next/link'
export default function NotFound() {
  return <section className="missing"><p>404</p><h1>Page not found.</h1><Link href="/">Return to Tanner’s homepage</Link></section>
}
