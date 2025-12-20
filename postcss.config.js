// postcss.config.js
module.exports = {
  plugins: {
    'postcss-import': {
      path: ["node_modules"], // Forces it to check the root node_modules
    },
    'tailwindcss/nesting': {},
    'tailwindcss': {},
    'autoprefixer': {},
  },
}
