import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        arc: {
          purple: "#6E56CF",
          violet: "#8B6CF2",
          blue: "#2775CA",
          ink: "#07070b",
          panel: "#0f0f17",
        },
      },
      fontFamily: {
        sans: ["var(--font-sans)", "system-ui", "sans-serif"],
        mono: ["var(--font-mono)", "ui-monospace", "monospace"],
      },
      backgroundImage: {
        "arc-radial":
          "radial-gradient(circle at 20% 0%, rgba(110,86,207,0.35), transparent 55%), radial-gradient(circle at 85% 15%, rgba(39,117,202,0.25), transparent 50%)",
        "arc-grid":
          "linear-gradient(rgba(255,255,255,0.045) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.045) 1px, transparent 1px)",
        "arc-gradient": "linear-gradient(135deg, #6E56CF 0%, #8B6CF2 45%, #2775CA 100%)",
      },
      boxShadow: {
        glow: "0 0 40px -8px rgba(139,108,242,0.55)",
        "glow-sm": "0 0 20px -6px rgba(139,108,242,0.5)",
        card: "0 1px 0 0 rgba(255,255,255,0.06) inset, 0 20px 40px -24px rgba(0,0,0,0.6)",
      },
      animation: {
        "fade-up": "fade-up 0.6s ease-out both",
        float: "float 6s ease-in-out infinite",
        "pulse-slow": "pulse-slow 3s ease-in-out infinite",
      },
      keyframes: {
        "fade-up": {
          "0%": { opacity: "0", transform: "translateY(12px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        float: {
          "0%, 100%": { transform: "translateY(0px)" },
          "50%": { transform: "translateY(-10px)" },
        },
        "pulse-slow": {
          "0%, 100%": { opacity: "0.6" },
          "50%": { opacity: "1" },
        },
      },
    },
  },
  plugins: [],
};
export default config;
