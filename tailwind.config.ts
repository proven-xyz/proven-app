import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./lib/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        pv: {
          bg: "#09090B",
          surface: "#18181B",
          surface2: "#27272A",
          border: "#3F3F46",
          text: "#FAFAFA",
          muted: "#A1A1AA",
          cyan: "#22D3EE",
          fuch: "#E879F9",
          emerald: "#10B981",
          gold: "#FBBF24",
          danger: "#EF4444",
        },
      },
      fontFamily: {
        display: ['"Space Grotesk"', "system-ui", "sans-serif"],
        body: ['"Inter"', "system-ui", "sans-serif"],
        mono: ['"Space Mono"', "monospace"],
      },
    },
  },
  plugins: [],
};

export default config;
