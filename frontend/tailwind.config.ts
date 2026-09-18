import type { Config } from "tailwindcss";

/**
 * Every colour below resolves to a CSS custom property defined in
 * src/styles/index.css. Nothing in this file carries a literal colour value,
 * and no component carries one either — that is the whole point of the split.
 *
 * `darkMode` is deliberately absent and every `dark:` variant has been removed
 * from the source. Tailwind's default strategy is `media`, so leaving those
 * variants in place would have half-themed the app on any machine set to dark
 * — which is worse than one theme done properly. This is a daytime product.
 */
const config: Config = {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: ["var(--font-ui)"],
        display: ["var(--font-display)"],
      },

      fontSize: {
        // A deliberate scale rather than ad-hoc sizes. UI sizes first.
        "2xs": ["0.6875rem", { lineHeight: "1rem", letterSpacing: "0.02em" }],
        xs: ["0.75rem", { lineHeight: "1.125rem" }],
        sm: ["0.8125rem", { lineHeight: "1.25rem" }],
        base: ["0.9375rem", { lineHeight: "1.5rem" }],
        lg: ["1.0625rem", { lineHeight: "1.6rem" }],
        xl: ["1.25rem", { lineHeight: "1.75rem", letterSpacing: "-0.01em" }],
        "2xl": ["1.5rem", { lineHeight: "1.95rem", letterSpacing: "-0.015em" }],
        // Display sizes — serif, tight leading, negative tracking.
        "display-sm": ["1.75rem", { lineHeight: "1.1", letterSpacing: "-0.02em" }],
        "display-md": ["2.25rem", { lineHeight: "1.06", letterSpacing: "-0.022em" }],
        "display-lg": ["3rem", { lineHeight: "1.02", letterSpacing: "-0.025em" }],
        "display-xl": ["3.75rem", { lineHeight: "1", letterSpacing: "-0.028em" }],
      },

      colors: {
        // --- Seed palette, for brand surfaces ---
        "brand-crimson": "hsl(var(--brand-crimson) / <alpha-value>)",
        "brand-oxblood": "hsl(var(--brand-oxblood) / <alpha-value>)",
        "brand-blush": "hsl(var(--brand-blush) / <alpha-value>)",
        "brand-rose": "hsl(var(--brand-rose) / <alpha-value>)",
        "brand-panel": "hsl(var(--brand-panel) / <alpha-value>)",
        "brand-panel-text": "hsl(var(--brand-panel-text) / <alpha-value>)",

        // --- Surfaces ---
        surface: "hsl(var(--surface) / <alpha-value>)",
        "surface-raised": "hsl(var(--surface-raised) / <alpha-value>)",
        "surface-sunken": "hsl(var(--surface-sunken) / <alpha-value>)",
        "surface-overlay": "hsl(var(--surface-overlay) / <alpha-value>)",

        // --- Text ---
        text: "hsl(var(--text) / <alpha-value>)",
        "text-muted": "hsl(var(--text-muted) / <alpha-value>)",
        "text-subtle": "hsl(var(--text-subtle) / <alpha-value>)",
        "text-inverse": "hsl(var(--text-inverse) / <alpha-value>)",

        // --- Structure ---
        border: "hsl(var(--border) / <alpha-value>)",
        "border-strong": "hsl(var(--border-strong) / <alpha-value>)",
        accent: "hsl(var(--accent) / <alpha-value>)",
        "accent-hover": "hsl(var(--accent-hover) / <alpha-value>)",
        "accent-soft": "hsl(var(--accent-soft) / <alpha-value>)",

        // --- Sidebar ---
        "sidebar-bg": "hsl(var(--sidebar-bg) / <alpha-value>)",
        "sidebar-text": "hsl(var(--sidebar-text) / <alpha-value>)",
        "sidebar-text-active": "hsl(var(--sidebar-text-active) / <alpha-value>)",
        "sidebar-active-bg": "hsl(var(--sidebar-active-bg) / <alpha-value>)",

        // --- Component clocks ---
        platelet: "hsl(var(--platelet) / <alpha-value>)",
        "platelet-bg": "hsl(var(--platelet-bg) / <alpha-value>)",
        rbc: "hsl(var(--rbc) / <alpha-value>)",
        "rbc-bg": "hsl(var(--rbc-bg) / <alpha-value>)",
        plasma: "hsl(var(--plasma) / <alpha-value>)",
        "plasma-bg": "hsl(var(--plasma-bg) / <alpha-value>)",

        // --- Status ---
        status: {
          open: "hsl(var(--status-open) / <alpha-value>)",
          "open-bg": "hsl(var(--status-open-bg) / <alpha-value>)",
          claimed: "hsl(var(--status-claimed) / <alpha-value>)",
          "claimed-bg": "hsl(var(--status-claimed-bg) / <alpha-value>)",
          "in-transit": "hsl(var(--status-in-transit) / <alpha-value>)",
          "in-transit-bg": "hsl(var(--status-in-transit-bg) / <alpha-value>)",
          received: "hsl(var(--status-received) / <alpha-value>)",
          "received-bg": "hsl(var(--status-received-bg) / <alpha-value>)",
          lost: "hsl(var(--status-lost) / <alpha-value>)",
          "lost-bg": "hsl(var(--status-lost-bg) / <alpha-value>)",
          expired: "hsl(var(--status-expired) / <alpha-value>)",
          "expired-bg": "hsl(var(--status-expired-bg) / <alpha-value>)",
        },

        // --- Escalation rings ---
        "ring-1": "hsl(var(--ring-1) / <alpha-value>)",
        "ring-2": "hsl(var(--ring-2) / <alpha-value>)",
        "ring-3": "hsl(var(--ring-3) / <alpha-value>)",
      },

      borderRadius: {
        // Tier B consoles sit at 12px; Tier A brand surfaces at 24px.
        lg: "0.5rem",
        xl: "0.75rem",
        "2xl": "1rem",
        "3xl": "1.5rem",
      },

      boxShadow: {
        card: "0 1px 2px 0 hsl(var(--brand-oxblood) / 0.04), 0 1px 3px 0 hsl(var(--brand-oxblood) / 0.03)",
        raised: "0 4px 16px -4px hsl(var(--brand-oxblood) / 0.10)",
        brand: "0 12px 40px -12px hsl(var(--brand-oxblood) / 0.22)",
        panel: "0 20px 60px -20px hsl(var(--brand-oxblood) / 0.45)",
      },

      keyframes: {
        "rescue-edge": {
          "0%, 100%": { opacity: "1" },
          "50%": { opacity: "0.35" },
        },
      },

      animation: {
        "rescue-edge": "rescue-edge 1.6s ease-in-out infinite",
      },
    },
  },
  plugins: [],
};

export default config;
