import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // Primary — coral (Airbnb-inspired, Arranxos tone)
        coral: {
          50: "#FFF1F1",
          100: "#FFE1E2",
          200: "#FFC7C9",
          300: "#FFA3A6",
          400: "#FF7A7E",
          500: "#FF5A5F",
          600: "#E0484D",
          700: "#B8383D",
          800: "#8E2B2F",
          900: "#6B1F22",
        },
        // Trust / success — teal (verified, agreed, paid)
        teal: {
          50: "#EEF7F5",
          100: "#D6EDE7",
          200: "#AFDBD0",
          300: "#80C5B4",
          400: "#53AE97",
          500: "#2F9279",
          600: "#1F745F",
          700: "#195C4B",
          800: "#13463A",
          900: "#0D3028",
        },
        // Warm neutrals — sand
        sand: {
          50: "#FAF9F7",
          100: "#F4F2EE",
          200: "#E8E4DC",
          300: "#D9D2C5",
          400: "#B8AD99",
          500: "#8F8371",
          600: "#6B6250",
        },
        // Text — ink
        ink: {
          100: "#E9E7E2",
          200: "#C9C5BB",
          300: "#A39E92",
          400: "#716B5E",
          500: "#4E493F",
          600: "#353127",
          700: "#26231C",
          800: "#1A1814",
          900: "#0F0E0B",
        },
        // States
        amber: {
          50: "#FEF5E7",
          100: "#FCE9CC",
          500: "#D48A2B",
          600: "#A86C1E",
          700: "#7E5115",
        },
        rose: {
          50: "#FCEEEE",
          100: "#F7D5D5",
          500: "#C44B4B",
          600: "#A63A3A",
          700: "#852B2B",
        },
        sky: {
          50: "#EEF4FB",
          100: "#D6E4F3",
          500: "#3D7CC9",
          600: "#2C61A5",
          700: "#224B80",
        },
        violet: {
          50: "#F3F0FB",
          100: "#E2DAF4",
          500: "#6F57C3",
          600: "#5842A5",
          700: "#443280",
        },
      },
      fontFamily: {
        sans: [
          "Inter",
          "DM Sans",
          "-apple-system",
          "system-ui",
          "Helvetica Neue",
          "sans-serif",
        ],
      },
      fontSize: {
        "2xs": ["11px", { lineHeight: "14px" }],
      },
      boxShadow: {
        card: "0 1px 2px rgba(15,14,11,0.04), 0 1px 3px rgba(15,14,11,0.06)",
        cardHover:
          "0 2px 4px rgba(15,14,11,0.06), 0 8px 24px rgba(15,14,11,0.08)",
        coral: "0 2px 10px rgba(255,90,95,0.28)",
        soft: "0 8px 32px rgba(15,14,11,0.06)",
      },
      borderRadius: {
        "4xl": "2rem",
      },
      screens: {
        xs: "375px",
      },
      keyframes: {
        pulse2: {
          "0%, 100%": { opacity: "1", transform: "scale(1)" },
          "50%": { opacity: "0.85", transform: "scale(0.97)" },
        },
        slideUp: {
          from: { transform: "translateY(100%)" },
          to: { transform: "translateY(0)" },
        },
      },
      animation: {
        pulse2: "pulse2 1.8s ease-in-out infinite",
        slideUp: "slideUp 0.25s ease-out",
      },
    },
  },
  plugins: [],
};

export default config;
