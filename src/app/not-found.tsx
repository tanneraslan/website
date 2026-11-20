import { SiteLink } from '@/components/SiteLink'

export default function NotFound() {
  return <section className="missing"><h1>Page not found</h1><p><SiteLink href="/">Return to the overview</SiteLink></p></section>
}
