import createMDX from '@next/mdx'

const withMDX = createMDX({
  options: {
    remarkPlugins: ['remark-frontmatter', 'remark-math', 'remark-gfm'],
    rehypePlugins: ['rehype-katex'],
  },
})

export default withMDX({
  transpilePackages: ['@lenso/tokens'],
})
