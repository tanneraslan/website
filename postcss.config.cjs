const { plugins } = require('./babel.config.json')

module.exports = {
  plugins: {
    '@stylexjs/postcss-plugin': {
      include: ['./src/**/*.{js,jsx,ts,tsx}', './node_modules/@lenso/tokens/dist/**/*.js'],
      babelConfig: {
        babelrc: false,
        configFile: false,
        parserOpts: { plugins: ['typescript', 'jsx'] },
        plugins,
      },
    },
  },
}
