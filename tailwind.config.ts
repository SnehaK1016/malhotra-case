import type { Config } from "tailwindcss";
const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        paper: "#ECE8E1",
        bone: "#F5F2EC",
        stone: "#CBC6BC",
        sand: "#B6A585",
        graphite: "#2B2B2E",
        ink: "#18181A",
        wine: "#6E1F2B",
        slate: "#667482",
      },
      fontFamily: {
        serif: ["var(--font-serif)", "Georgia", "serif"],
        sans: ["var(--font-sans)", "system-ui", "sans-serif"],
        mono: ["var(--font-mono)", "ui-monospace", "monospace"],
        hand: ["var(--font-hand)", "cursive"],
      },
    },
  },
  plugins: [],
};
export default config;
