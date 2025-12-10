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

      // Premium shadow utilities
      boxShadow: {
        ...tailwindTheme.boxShadow,
        'soft': '0 2px 8px hsla(220, 16%, 12%, 0.04)',
        'medium': '0 4px 16px hsla(220, 16%, 12%, 0.08)',
        'strong': '0 8px 32px hsla(220, 16%, 12%, 0.12)',
        'elevated': '0 8px 16px -4px hsla(220, 16%, 12%, 0.08), 0 4px 8px -4px hsla(220, 16%, 12%, 0.04)',
        'glow': '0 0 20px hsla(173, 58%, 42%, 0.35)',
        'glow-lg': '0 0 40px hsla(173, 58%, 42%, 0.25)',
        'glow-accent': '0 0 20px hsla(262, 83%, 65%, 0.35)',
        'focus': '0 0 0 3px hsla(173, 58%, 42%, 0.35)',
        'focus-error': '0 0 0 3px hsla(0, 84%, 60%, 0.35)',
      },

      // Premium animation keyframes
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
        'slide-up-fade': {
          '0%': { transform: 'translateY(10px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        'slide-down-fade': {
          '0%': { transform: 'translateY(-10px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        'scale-in': {
          '0%': { transform: 'scale(0.95)', opacity: '0' },
          '100%': { transform: 'scale(1)', opacity: '1' },
        },
        'scale-in-fade': {
          '0%': { transform: 'scale(0.97)', opacity: '0' },
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
        // Premium micro-interactions
        'shimmer': {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
        'float': {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-5px)' },
        },
        'glow-pulse': {
          '0%, 100%': { opacity: '1', boxShadow: '0 0 20px hsla(173, 58%, 42%, 0.35)' },
          '50%': { opacity: '0.85', boxShadow: '0 0 30px hsla(173, 58%, 42%, 0.5)' },
        },
        'blur-in': {
          '0%': { opacity: '0', filter: 'blur(8px)' },
          '100%': { opacity: '1', filter: 'blur(0)' },
        },
        'accordion-down': {
          '0%': { height: '0' },
          '100%': { height: 'var(--radix-accordion-content-height)' },
        },
        'accordion-up': {
          '0%': { height: 'var(--radix-accordion-content-height)' },
          '100%': { height: '0' },
        },
      },

      animation: {
        'fade-in': 'fade-in 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
        'fade-out': 'fade-out 150ms ease-in',
        'slide-in-from-top': 'slide-in-from-top 300ms cubic-bezier(0.16, 1, 0.3, 1)',
        'slide-in-from-bottom': 'slide-in-from-bottom 300ms cubic-bezier(0.16, 1, 0.3, 1)',
        'slide-in-from-left': 'slide-in-from-left 300ms cubic-bezier(0.16, 1, 0.3, 1)',
        'slide-in-from-right': 'slide-in-from-right 300ms cubic-bezier(0.16, 1, 0.3, 1)',
        'slide-up': 'slide-up 0.4s cubic-bezier(0.16, 1, 0.3, 1)',
        'slide-up-fade': 'slide-up-fade 0.4s cubic-bezier(0.16, 1, 0.3, 1)',
        'slide-down-fade': 'slide-down-fade 0.4s cubic-bezier(0.16, 1, 0.3, 1)',
        'scale-in': 'scale-in 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
        'scale-in-fade': 'scale-in-fade 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
        'spin': 'spin 1s linear infinite',
        'pulse': 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        // Premium animations
        'shimmer': 'shimmer 2s linear infinite',
        'float': 'float 3s ease-in-out infinite',
        'glow-pulse': 'glow-pulse 2s ease-in-out infinite',
        'blur-in': 'blur-in 0.4s ease-out',
        'accordion-down': 'accordion-down 0.2s ease-out',
        'accordion-up': 'accordion-up 0.2s ease-out',
      },
    },
  },
  plugins: [tailwindcssAnimate],
};

export default config;

