// next.config.mjs
import nextra from 'nextra'

const withNextra = nextra({
  latex: true
})

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  turbopack: {
    rules: {
      '*.svg': {
        loaders: ['@svgr/webpack'],
        as: '*.js',
      },
    },
  },
}

export default withNextra(nextConfig)
