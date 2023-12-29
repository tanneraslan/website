const { join } = require("path");
import { radixThemePreset } from "radix-themes-tw";
const { createPlugin } = require("windy-radix-palette");
const colors = createPlugin();

console.log("radixThemePreset", radixThemePreset);
/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    join(__dirname, "./src/**/*.{js,ts,jsx,tsx,mdx}"),

    join(__dirname, "./src/**/*.{js,jsx,ts,tsx,md,mdx}"),
  ],
  theme: {
    darkMode: "class",
    extend: {
      fontFamily: {
        sans: ["var(--font-sans)"],
        mono: ["var(--font-mono)"],
      },
      ...radixThemePreset.theme,
    },
  },
  plugins: [radixThemePreset],
};
