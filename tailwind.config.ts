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
  page: "#DFDACB",
  cream: "#EFE6CE",
  card: "#F8F1DE",
  ochre: "#D3A22C",
  teal: "#7C97A3",
  brick: "#C23B22",
  olive: "#5C6B3E",
  salmon: "#E8AF9A",
  ink: "#332B22",
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