import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Default Commons palette — individual neighborhoods can override
        // an accent color via the `neighborhoods.accent_color` column.
        commons: {
          DEFAULT: "#2F5D50",
          light: "#4E7C6D",
          dark: "#1E3D34",
        },
      },
    },
  },
  plugins: [],
};

export default config;
