import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: ["Inter", "ui-sans-serif", "system-ui", "sans-serif"],
      },
      colors: {
        // Design tokens — all values reference CSS custom properties defined in index.css
        surface: "hsl(var(--surface) / <alpha-value>)",
        "surface-raised": "hsl(var(--surface-raised) / <alpha-value>)",
        "surface-overlay": "hsl(var(--surface-overlay) / <alpha-value>)",
        border: "hsl(var(--border) / <alpha-value>)",
        text: "hsl(var(--text) / <alpha-value>)",
        "text-muted": "hsl(var(--text-muted) / <alpha-value>)",
        accent: "hsl(var(--accent) / <alpha-value>)",
        "accent-hover": "hsl(var(--accent-hover) / <alpha-value>)",

        // Component clock colours
        platelet: "hsl(var(--platelet) / <alpha-value>)",
        "platelet-bg": "hsl(var(--platelet-bg) / <alpha-value>)",
        rbc: "hsl(var(--rbc) / <alpha-value>)",
        "rbc-bg": "hsl(var(--rbc-bg) / <alpha-value>)",
        plasma: "hsl(var(--plasma) / <alpha-value>)",
        "plasma-bg": "hsl(var(--plasma-bg) / <alpha-value>)",

        // Status colours
        status: {
          open: "hsl(var(--status-open) / <alpha-value>)",
          claimed: "hsl(var(--status-claimed) / <alpha-value>)",
          "in-transit": "hsl(var(--status-in-transit) / <alpha-value>)",
          received: "hsl(var(--status-received) / <alpha-value>)",
          lost: "hsl(var(--status-lost) / <alpha-value>)",
          expired: "hsl(var(--status-expired) / <alpha-value>)",
        },
      },
      borderRadius: {
        xl: "0.75rem",
        "2xl": "1rem",
      },
      boxShadow: {
        card: "0 1px 4px 0 hsl(var(--border) / 0.8)",
      },
    },
  },
  plugins: [],
};

export default config;
