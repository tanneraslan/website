import { fileURLToPath } from 'node:url'
import createMDX from '@next/mdx'

const withMDX = createMDX({
  options: {
    remarkPlugins: ['remark-frontmatter', 'remark-math', 'remark-gfm', fileURLToPath(new URL('./scripts/album-image-sizes.mjs', import.meta.url))],
    rehypePlugins: ['rehype-katex'],
  },
})

export default withMDX({
  transpilePackages: ['@lenso/tokens'],
})
