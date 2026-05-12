import type { Config } from "tailwindcss";
import tailwindcssAnimate from "tailwindcss-animate";

const config: Config = {
  darkMode: ["class"],
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./remotion/**/*.{js,ts,jsx,tsx,mdx}"
  ],
  theme: {
    extend: {
      colors: {
        ink: "#101322",
        muted: "#667085",
        brand: {
          50: "#f4efff",
          100: "#ece2ff",
          500: "#6d35f5",
          600: "#5c2de0",
          700: "#4a22bf"
        },
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))"
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))"
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))"
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))"
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))"
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))"
        }
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)"
      },
      boxShadow: {
        panel: "0 18px 60px rgba(16, 24, 40, 0.08)",
        float: "0 4px 24px -4px rgba(15, 23, 42, 0.07), 0 2px 8px -4px rgba(15, 23, 42, 0.05)",
        menu: "0 12px 40px -8px rgba(15, 23, 42, 0.12), 0 4px 16px -4px rgba(15, 23, 42, 0.08)",
        insetHighlight: "inset 0 1px 0 rgba(255, 255, 255, 0.65)"
      },
      keyframes: {
        "accordion-down": {
          from: { height: "0" },
          to: { height: "var(--radix-accordion-content-height)" }
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: "0" }
        },
        shimmer: {
          "0%, 90%, 100%": { "background-position": "calc(-100% - var(--shimmer-width)) 0" },
          "30%, 60%": { "background-position": "calc(100% + var(--shimmer-width)) 0" }
        },
        "shimmer-slide": {
          to: { transform: "translate(calc(100cqw - 100%), 0)" }
        },
        "spin-around": {
          "0%": { transform: "translateZ(0) rotate(0)" },
          "15%, 35%": { transform: "translateZ(0) rotate(90deg)" },
          "65%, 85%": { transform: "translateZ(0) rotate(270deg)" },
          "100%": { transform: "translateZ(0) rotate(360deg)" }
        },
        "border-beam": {
          "100%": { "offset-distance": "100%" }
        },
        gradient: {
          to: { backgroundPosition: "var(--bg-size, 300%) 0" }
        },
        rainbow: {
          "0%": { "background-position": "0%" },
          "100%": { "background-position": "200%" }
        }
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
        shimmer: "shimmer 8s infinite",
        "shimmer-slide": "shimmer-slide var(--speed) ease-in-out infinite alternate",
        "spin-around": "spin-around calc(var(--speed) * 2) infinite linear",
        "border-beam": "border-beam calc(var(--duration)*1s) infinite linear",
        gradient: "gradient 8s linear infinite",
        rainbow: "rainbow var(--speed, 2s) infinite linear"
      }
    }
  },
  plugins: [tailwindcssAnimate]
};

export default config;
