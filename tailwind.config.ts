import type { Config } from "tailwindcss";

/**
 * Design tokens.
 *  - Palette: warm "paper" neutrals, deep teal brand, amber reserved for "shared".
 *  - Type: Fraunces (display serif) for identity + document headings, Inter for UI.
 *  - Spacing: Tailwind's 4px scale; components use 2/3/4/6/8 steps only.
 */
const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: ['"Inter Variable"', "ui-sans-serif", "system-ui", "sans-serif"],
        display: ['"Fraunces Variable"', "ui-serif", "Georgia", "serif"],
      },
      colors: {
        paper: { DEFAULT: "#f7f5f0", deep: "#ece8de" },
        line: { DEFAULT: "#e6e1d6", strong: "#d3cdbd" },
        ink: {
          DEFAULT: "#1b1c20",
          soft: "#45464e",
          muted: "#6d6e79",
          faint: "#9a9ba6",
        },
        brand: {
          50: "#eef7f5",
          100: "#d6ebe6",
          200: "#add7cf",
          300: "#7dbcb1",
          400: "#4c9e92",
          500: "#2f8176",
          600: "#236758",
          700: "#1d5248",
          800: "#19423b",
          900: "#12302b",
          950: "#0b1f1c",
        },
      },
      boxShadow: {
        card: "0 1px 0 rgba(27,28,32,0.04), 0 1px 3px rgba(27,28,32,0.06)",
        lift: "0 1px 0 rgba(27,28,32,0.04), 0 8px 24px -6px rgba(27,28,32,0.14)",
        sheet: "0 1px 2px rgba(27,28,32,0.06), 0 12px 40px -12px rgba(27,28,32,0.18)",
        pop: "0 24px 60px -12px rgba(18,48,43,0.35)",
      },
      borderRadius: { xl: "0.875rem", "2xl": "1.125rem" },
      keyframes: {
        fadeIn: { from: { opacity: "0" }, to: { opacity: "1" } },
        popIn: {
          from: { opacity: "0", transform: "translateY(8px) scale(0.98)" },
          to: { opacity: "1", transform: "none" },
        },
        float: {
          "0%,100%": { transform: "translateY(0)" },
          "50%": { transform: "translateY(-6px)" },
        },
      },
      animation: {
        "fade-in": "fadeIn 150ms ease-out",
        "pop-in": "popIn 180ms cubic-bezier(0.16,1,0.3,1)",
        float: "float 6s ease-in-out infinite",
      },
    },
  },
  plugins: [],
};
export default config;
