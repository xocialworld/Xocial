import type { Config } from "tailwindcss";
import tailwindcssAnimate from "tailwindcss-animate";
import { tailwindTheme } from "./src/lib/design-tokens";

const { zIndex: tokenZIndex, ...tailwindThemeWithoutZIndex } = tailwindTheme as Record<string, any>;
const normalizedZIndex = tokenZIndex
  ? Object.fromEntries(Object.entries(tokenZIndex).map(([key, value]) => [key, String(value)]))
  : undefined;

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/lib/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      // Import all design tokens (with normalized z-index)
      ...tailwindThemeWithoutZIndex,
      ...(normalizedZIndex ? { zIndex: normalizedZIndex } : {}),

      // Additional custom values
      colors: {
        ...tailwindTheme.colors,
        background: "var(--background)",
        foreground: "var(--foreground)",
        muted: {
          DEFAULT: tailwindTheme.colors.gray[500],
          foreground: tailwindTheme.colors.gray[400],
        },
      },

      // Container with responsive padding
      container: {
        center: true,
        padding: {
          DEFAULT: '1rem',
          sm: '1.5rem',
          md: '2rem',
          lg: '3rem',
          xl: '4rem',
          '2xl': '5rem',
        },
        screens: {
          sm: '640px',
          md: '768px',
          lg: '1024px',
          xl: '1280px',
          '2xl': '1536px',
        },
      },

      // SRS-specified shadow utilities (Section 2.1.2)
      boxShadow: {
        ...tailwindTheme.boxShadow,
        'soft': '0 2px 8px rgba(0, 0, 0, 0.04)',
        'medium': '0 4px 16px rgba(0, 0, 0, 0.08)',
        'strong': '0 8px 32px rgba(0, 0, 0, 0.12)',
        'glow': '0 0 20px rgba(20, 184, 166, 0.3)',
      },

      // Animation keyframes
      keyframes: {
        'fade-in': {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        'fade-out': {
          '0%': { opacity: '1' },
          '100%': { opacity: '0' },
        },
        'slide-in-from-top': {
          '0%': { transform: 'translateY(-100%)' },
          '100%': { transform: 'translateY(0)' },
        },
        'slide-in-from-bottom': {
          '0%': { transform: 'translateY(100%)' },
          '100%': { transform: 'translateY(0)' },
        },
        'slide-in-from-left': {
          '0%': { transform: 'translateX(-100%)' },
          '100%': { transform: 'translateX(0)' },
        },
        'slide-in-from-right': {
          '0%': { transform: 'translateX(100%)' },
          '100%': { transform: 'translateX(0)' },
        },
        'slide-up': {
          '0%': { transform: 'translateY(20px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        'scale-in': {
          '0%': { transform: 'scale(0.95)', opacity: '0' },
          '100%': { transform: 'scale(1)', opacity: '1' },
        },
        'spin': {
          '0%': { transform: 'rotate(0deg)' },
          '100%': { transform: 'rotate(360deg)' },
        },
        'pulse': {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.5' },
        },
      },

      animation: {
        'fade-in': 'fade-in 0.3s ease-in-out',
        'fade-out': 'fade-out 150ms ease-in',
        'slide-in-from-top': 'slide-in-from-top 250ms ease-out',
        'slide-in-from-bottom': 'slide-in-from-bottom 250ms ease-out',
        'slide-in-from-left': 'slide-in-from-left 250ms ease-out',
        'slide-in-from-right': 'slide-in-from-right 250ms ease-out',
        'slide-up': 'slide-up 0.4s cubic-bezier(0.16, 1, 0.3, 1)',
        'scale-in': 'scale-in 0.2s ease-out',
        'spin': 'spin 1s linear infinite',
        'pulse': 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
      },
    },
  },
  plugins: [tailwindcssAnimate],
};

export default config;

