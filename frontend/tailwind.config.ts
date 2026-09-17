import type { Config } from "tailwindcss";

export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: ["Inter", "-apple-system", "BlinkMacSystemFont", "sans-serif"],
        mono: ["JetBrains Mono", "monospace"],
      },
      colors: {
        crimson: {
          50: "#FFF4F5",
          100: "#FBE9EC",
          200: "#F3C7CE",
          300: "#E59AA6",
          400: "#D65B6C",
          500: "#C13D50",
          600: "#AA3044",
          700: "#89162E",
          800: "#751B2A",
          900: "#591522",
          950: "#40000E",
        },
        neutral: {
          50: "#F7F8FA",
          100: "#F0F2F5",
          200: "#E6E9EE",
          300: "#D5DAE1",
          400: "#B4BCC6",
          500: "#85909E",
          600: "#647080",
          700: "#4B5563",
          800: "#343B46",
          850: "#292F39",
          900: "#20252D",
          950: "#171A20",
          1000: "#111318",
        },
        blood: {
          plt: "#C13D50",
          rbc: "#B97818",
          plasma: "#16877E",
        },
        status: {
          availableText: "#236B4A",
          availableBg: "#E6F4EC",
          openText: "#855A0B",
          openBg: "#FFF3D6",
          claimedText: "#344DA8",
          claimedBg: "#E9EDFF",
          transitText: "#175FA7",
          transitBg: "#E4F1FF",
          criticalText: "#A12737",
          criticalBg: "#FBE9EC",
        },
      },
    },
  },
  plugins: [],
} satisfies Config;
