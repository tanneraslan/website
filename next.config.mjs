// next.config.mjs
import nextra from 'nextra'

const withNextra = nextra({
  latex: true
})

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  typescript: {
    ignoreBuildErrors: true,
  },
  turbopack: {
    rules: {
      '*.svg': {
        loaders: ['@svgr/webpack'],
        as: '*.js',
      },
    },
  },
  // `next dev` runs with --webpack, so the turbopack rule above does not apply
  // there. Without this, SVG imports resolve to a static image object instead
  // of a component and every `<Home />`-style usage crashes at render.
  webpack(config) {
    const assetRule = config.module.rules.find((rule) =>
      rule.test?.test?.('.svg')
    )

    if (assetRule) {
      assetRule.exclude = /\.svg$/i
    }

    config.module.rules.push({
      test: /\.svg$/i,
      issuer: /\.[jt]sx?$/,
      use: ['@svgr/webpack'],
    })

    return config
  },
}

export default withNextra(nextConfig)
