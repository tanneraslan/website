const { join } = require("path");
import { radixThemePreset } from "radix-themes-tw";

/** @type {import('tailwindcss').Config} */
module.exports = {
  // FIX: darkMode must be at the top level, not inside theme!
  darkMode: "class",

  content: [
    join(__dirname, "./src/**/*.{js,ts,jsx,tsx,mdx}"),
    join(__dirname, "./src/**/*.{js,jsx,ts,tsx,md,mdx}"),
  ],
  plugins: [
    radixThemePreset,
    require('@tailwindcss/typography'),
  ],
  theme: {
    // REMOVE darkMode from here
    extend: {
      typography: {
        DEFAULT: {
          css: {
            p: {
              marginTop: '1.25em',
              marginBottom: '1.25em',
              lineHeight: '1.75',
            },
            h1: {
              marginBottom: '1rem',
              marginTop: '2rem',
            },
            img: {
              marginTop: '2rem',
              marginBottom: '2rem',
            },
          },
        },
      },
      fontFamily: {
        sans: ["var(--font-sans)"],
        mono: ["var(--font-mono)"],
      },
      ...radixThemePreset.theme,
    },
  },
};
