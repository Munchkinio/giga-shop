import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        canvas: "#F4F1EB",
        surface: "#FFFDF9",
        ink: {
          50: "#F5F4F7",
          100: "#E8E6ED",
          200: "#D4D0DC",
          300: "#B0A9BA",
          400: "#8A8194",
          500: "#6B6278",
          600: "#524A5E",
          700: "#3D3649",
          800: "#2A2535",
          900: "#1A1625",
        },
        brand: {
          50: "#F5F3FF",
          100: "#EDE9FE",
          200: "#DDD6FE",
          300: "#C4B5FD",
          400: "#A78BFA",
          500: "#8B5CF6",
          600: "#7C3AED",
          700: "#6D28D9",
          800: "#5B21B6",
          900: "#4C1D95",
        },
        accent: {
          400: "#FB923C",
          500: "#F97316",
          600: "#EA580C",
        },
      },
      fontFamily: {
        display: ["var(--font-outfit)", "system-ui", "sans-serif"],
        sans: ["var(--font-jakarta)", "system-ui", "sans-serif"],
      },
      borderRadius: {
        "2xl": "1rem",
        "3xl": "1.25rem",
      },
      boxShadow: {
        card: "0 4px 24px -6px rgba(26, 22, 37, 0.1)",
        "card-hover": "0 12px 40px -8px rgba(109, 40, 217, 0.18)",
        glow: "0 0 0 1px rgba(124, 58, 237, 0.15), 0 8px 32px -8px rgba(124, 58, 237, 0.35)",
        inner: "inset 0 1px 2px rgba(26, 22, 37, 0.06)",
      },
      backgroundImage: {
        "mesh-gradient":
          "radial-gradient(ellipse 80% 60% at 10% -10%, rgba(167, 139, 250, 0.22), transparent 55%), radial-gradient(ellipse 70% 50% at 90% 0%, rgba(251, 146, 60, 0.14), transparent 50%), radial-gradient(ellipse 60% 40% at 50% 100%, rgba(124, 58, 237, 0.08), transparent 55%)",
      },
    },
  },
  plugins: [],
};

export default config;
