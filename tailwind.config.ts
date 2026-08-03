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
        commons: {
          cream: "#EDE3C8",
          ochre: "#D3A22C",
          teal: "#4A8B8C",
          brick: "#B5432F",
          olive: "#5C6B3E",
          salmon: "#E0917A",
          ink: "#332B22",
          card: "#F7F0DC",
        },
      },
      fontFamily: {
        display: ["var(--font-display)"],
        body: ["var(--font-body)"],
        mono: ["var(--font-mono)"],
      },
    },
  },
  plugins: [],
};

export default config;