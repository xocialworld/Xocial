import type { Config } from "tailwindcss";
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
        'fade-in': 'fade-in 150ms ease-out',
        'fade-out': 'fade-out 150ms ease-in',
        'slide-in-from-top': 'slide-in-from-top 250ms ease-out',
        'slide-in-from-bottom': 'slide-in-from-bottom 250ms ease-out',
        'slide-in-from-left': 'slide-in-from-left 250ms ease-out',
        'slide-in-from-right': 'slide-in-from-right 250ms ease-out',
        'scale-in': 'scale-in 200ms ease-out',
        'spin': 'spin 1s linear infinite',
        'pulse': 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
      },
    },
  },
  plugins: [],
};

export default config;

