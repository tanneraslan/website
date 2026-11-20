import type { MDXComponents } from 'mdx/types'
import { SiteLink } from '@/components/SiteLink'

const components: MDXComponents = {
  a: ({ href = '', ...props }) => <SiteLink href={href} {...props} />,
  img: props => <img loading="lazy" {...props} />,
}

export function useMDXComponents(): MDXComponents {
  return components
}
