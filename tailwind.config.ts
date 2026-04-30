import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: ["class"],
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        success: {
          DEFAULT: "hsl(var(--success))",
          foreground: "hsl(var(--success-foreground))",
        },
        warning: {
          DEFAULT: "hsl(var(--warning))",
          foreground: "hsl(var(--warning-foreground))",
        },
        brand: {
          DEFAULT: "hsl(var(--brand))",
          foreground: "hsl(var(--brand-foreground))",
        },
      },
      borderRadius: {
        none: "0px",
        sm: "var(--r-sm)",
        DEFAULT: "var(--r-md)",
        md: "var(--r-md)",
        lg: "var(--r-lg)",
        xl: "var(--r-xl)",
        "2xl": "24px",
        "3xl": "28px",
        full: "9999px",
      },
      fontSize: {
        xs: ["12px", { lineHeight: "16px", letterSpacing: "0" }],
        sm: ["13px", { lineHeight: "20px", letterSpacing: "-0.005em" }],
        base: ["14px", { lineHeight: "22px", letterSpacing: "-0.005em" }],
        md: ["15px", { lineHeight: "24px", letterSpacing: "-0.01em" }],
        lg: ["17px", { lineHeight: "26px", letterSpacing: "-0.011em" }],
        xl: ["20px", { lineHeight: "28px", letterSpacing: "-0.014em" }],
        "2xl": ["24px", { lineHeight: "30px", letterSpacing: "-0.02em" }],
        "3xl": ["30px", { lineHeight: "36px", letterSpacing: "-0.022em" }],
        "4xl": ["36px", { lineHeight: "42px", letterSpacing: "-0.024em" }],
        "5xl": ["48px", { lineHeight: "52px", letterSpacing: "-0.026em" }],
      },
      boxShadow: {
        soft: "var(--shadow-1)",
        pop: "var(--shadow-2)",
        sm: "var(--shadow-1)",
        DEFAULT: "var(--shadow-1)",
        md: "var(--shadow-2)",
        lg: "var(--shadow-2)",
      },
      transitionDuration: {
        DEFAULT: "120ms",
        "1": "120ms",
        "2": "200ms",
        "3": "320ms",
      },
      transitionTimingFunction: {
        DEFAULT: "cubic-bezier(0.16, 1, 0.3, 1)",
        out: "cubic-bezier(0.16, 1, 0.3, 1)",
        spring: "cubic-bezier(0.16, 1, 0.3, 1)",
        "in-out": "cubic-bezier(0.4, 0, 0.2, 1)",
      },
      keyframes: {
        "accordion-down": {
          from: { height: "0" },
          to: { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: "0" },
        },
        "fade-in": {
          from: { opacity: "0", transform: "translateY(2px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
        "fade-in-soft": {
          from: { opacity: "0" },
          to: { opacity: "1" },
        },
        "scale-in": {
          from: { opacity: "0", transform: "scale(0.96)" },
          to: { opacity: "1", transform: "scale(1)" },
        },
      },
      animation: {
        "accordion-down": "accordion-down 200ms cubic-bezier(0.16, 1, 0.3, 1)",
        "accordion-up": "accordion-up 200ms cubic-bezier(0.16, 1, 0.3, 1)",
        "fade-in": "fade-in 200ms cubic-bezier(0.16, 1, 0.3, 1)",
        "fade-in-soft": "fade-in-soft 200ms cubic-bezier(0.16, 1, 0.3, 1)",
        "scale-in": "scale-in 200ms cubic-bezier(0.16, 1, 0.3, 1)",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
};
export default config;
