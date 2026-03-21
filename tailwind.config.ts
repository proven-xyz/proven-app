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
        display: ["var(--font-display)", "system-ui", "sans-serif"],
        body: ["var(--font-body)", "system-ui", "sans-serif"],
        mono: ["var(--font-mono)", "monospace"],
      },
      borderRadius: {
        "2xl": "16px",
        "3xl": "24px",
        "4xl": "32px",
      },
      boxShadow: {
        glow: "0 0 20px rgba(34,211,238,0.15)",
        "glow-fuch": "0 0 20px rgba(232,121,249,0.15)",
        "glow-emerald": "0 0 20px rgba(16,185,129,0.15)",
        "glow-gold": "0 0 20px rgba(251,191,36,0.15)",
        "glow-lg": "0 0 40px rgba(34,211,238,0.2)",
        "glow-fuch-lg": "0 0 40px rgba(232,121,249,0.2)",
        "glow-emerald-lg": "0 0 40px rgba(16,185,129,0.2)",
        elevated: "0 8px 32px rgba(0,0,0,0.4)",
        "elevated-lg": "0 16px 48px rgba(0,0,0,0.6)",
      },
      keyframes: {
        fadeUp: {
          from: { opacity: "0", transform: "translateY(18px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
        fadeIn: {
          from: { opacity: "0" },
          to: { opacity: "1" },
        },
        stampIn: {
          "0%": { opacity: "0", transform: "scale(2.5) rotate(-12deg)" },
          "50%": { opacity: "1", transform: "scale(0.95) rotate(-12deg)" },
          "100%": { opacity: "1", transform: "scale(1) rotate(-12deg)" },
        },
        confDrop: {
          "0%": { opacity: "1", transform: "translateY(0) rotate(0deg)" },
          "100%": {
            opacity: "0",
            transform: "translateY(100vh) rotate(600deg)",
          },
        },
        pulseGlow: {
          "0%, 100%": { boxShadow: "0 0 20px rgba(16,185,129,0.08)" },
          "50%": { boxShadow: "0 0 50px rgba(16,185,129,0.2)" },
        },
        blink: {
          "0%, 100%": { opacity: "1" },
          "50%": { opacity: "0" },
        },
        countRoll: {
          from: { opacity: "0", transform: "translateY(12px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
        shimmer: {
          "0%": { backgroundPosition: "-200% 0" },
          "100%": { backgroundPosition: "200% 0" },
        },
        float: {
          "0%, 100%": { transform: "translateY(0)" },
          "50%": { transform: "translateY(-6px)" },
        },
        "spin-slow": {
          to: { transform: "rotate(360deg)" },
        },
      },
      animation: {
        "fade-up": "fadeUp 0.5s ease-out both",
        "fade-in": "fadeIn 0.3s ease-out both",
        "stamp-in": "stampIn 0.6s ease-out both",
        "conf-drop": "confDrop 2s ease-in forwards",
        "pulse-glow": "pulseGlow 3s ease-in-out infinite",
        blink: "blink 1s step-end infinite",
        "count-roll": "countRoll 0.4s ease-out both",
        shimmer: "shimmer 2s linear infinite",
        float: "float 3s ease-in-out infinite",
        "spin-slow": "spin-slow 8s linear infinite",
      },
    },
  },
  plugins: [],
};

export default config;
