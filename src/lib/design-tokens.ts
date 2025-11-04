/**
 * Design Token System
 * Centralized design system tokens for colors, typography, spacing, etc.
 * Based on SRS Section 3.1
 */

export const DesignTokens = {
  // ═══════════════════════════════════════════════════════════════
  // COLOR SYSTEM (Based on HSL for easy manipulation)
  // ═══════════════════════════════════════════════════════════════
  colors: {
    // Primary Brand Colors
    primary: {
      50: 'hsl(199, 89%, 97%)',   // Lightest
      100: 'hsl(199, 89%, 93%)',
      200: 'hsl(199, 89%, 85%)',
      300: 'hsl(199, 89%, 75%)',
      400: 'hsl(199, 89%, 63%)',
      500: 'hsl(199, 89%, 48%)',  // Base
      600: 'hsl(199, 100%, 35%)', 
      700: 'hsl(199, 100%, 30%)',
      800: 'hsl(199, 100%, 25%)',
      900: 'hsl(199, 100%, 20%)',  // Darkest
      950: 'hsl(199, 100%, 15%)',
      DEFAULT: 'hsl(199, 89%, 48%)',
    },

    // Secondary/Neutral Colors
    secondary: {
      50: 'hsl(220, 13%, 98%)',
      100: 'hsl(220, 13%, 95%)',
      200: 'hsl(220, 13%, 91%)',
      300: 'hsl(220, 9%, 78%)',
      400: 'hsl(220, 9%, 65%)',
      500: 'hsl(220, 9%, 46%)',
      600: 'hsl(220, 13%, 36%)',
      700: 'hsl(220, 14%, 27%)',
      800: 'hsl(220, 15%, 20%)',
      900: 'hsl(220, 15%, 13%)',
      950: 'hsl(220, 15%, 8%)',
      DEFAULT: 'hsl(220, 9%, 46%)',
    },

    // Semantic Colors
    success: {
      50: 'hsl(145, 63%, 97%)',
      100: 'hsl(145, 63%, 95%)',
      200: 'hsl(145, 63%, 85%)',
      300: 'hsl(145, 63%, 75%)',
      400: 'hsl(145, 63%, 63%)',
      500: 'hsl(145, 63%, 49%)',  // Base
      600: 'hsl(145, 63%, 40%)',
      700: 'hsl(145, 63%, 35%)',
      800: 'hsl(145, 63%, 28%)',
      900: 'hsl(145, 63%, 22%)',
      DEFAULT: 'hsl(145, 63%, 49%)',
    },

    warning: {
      50: 'hsl(38, 92%, 97%)',
      100: 'hsl(38, 92%, 95%)',
      200: 'hsl(38, 92%, 85%)',
      300: 'hsl(38, 92%, 75%)',
      400: 'hsl(38, 92%, 63%)',
      500: 'hsl(38, 92%, 50%)',  // Base
      600: 'hsl(38, 92%, 42%)',
      700: 'hsl(38, 92%, 35%)',
      800: 'hsl(38, 92%, 28%)',
      900: 'hsl(38, 92%, 22%)',
      DEFAULT: 'hsl(38, 92%, 50%)',
    },

    error: {
      50: 'hsl(0, 84%, 97%)',
      100: 'hsl(0, 84%, 95%)',
      200: 'hsl(0, 84%, 85%)',
      300: 'hsl(0, 84%, 75%)',
      400: 'hsl(0, 84%, 65%)',
      500: 'hsl(0, 84%, 60%)',  // Base
      600: 'hsl(0, 84%, 50%)',
      700: 'hsl(0, 84%, 40%)',
      800: 'hsl(0, 84%, 32%)',
      900: 'hsl(0, 84%, 25%)',
      DEFAULT: 'hsl(0, 84%, 60%)',
    },

    info: {
      50: 'hsl(199, 89%, 97%)',
      100: 'hsl(199, 89%, 95%)',
      200: 'hsl(199, 89%, 85%)',
      300: 'hsl(199, 89%, 75%)',
      400: 'hsl(199, 89%, 63%)',
      500: 'hsl(199, 89%, 48%)',  // Base
      600: 'hsl(199, 89%, 40%)',
      700: 'hsl(199, 89%, 35%)',
      800: 'hsl(199, 89%, 28%)',
      900: 'hsl(199, 89%, 22%)',
      DEFAULT: 'hsl(199, 89%, 48%)',
    },

    // Neutral Grays
    gray: {
      50: 'hsl(220, 13%, 98%)',
      100: 'hsl(220, 13%, 95%)',
      200: 'hsl(220, 13%, 91%)',
      300: 'hsl(220, 9%, 78%)',
      400: 'hsl(220, 9%, 65%)',
      500: 'hsl(220, 9%, 46%)',
      600: 'hsl(220, 13%, 36%)',
      700: 'hsl(220, 14%, 27%)',
      800: 'hsl(220, 15%, 20%)',
      900: 'hsl(220, 15%, 13%)',
      950: 'hsl(220, 15%, 8%)',
      DEFAULT: 'hsl(220, 9%, 46%)',
    },

    // Platform-Specific Colors
    platforms: {
      facebook: 'hsl(221, 44%, 41%)',    // #1877F2
      instagram: 'hsl(329, 100%, 50%)',  // #E4405F gradient approximation
      twitter: 'hsl(203, 89%, 53%)',     // #1DA1F2
      linkedin: 'hsl(201, 100%, 35%)',   // #0A66C2
      youtube: 'hsl(0, 100%, 50%)',      // #FF0000
      tiktok: 'hsl(0, 0%, 0%)',          // #000000
    },
  },

  // ═══════════════════════════════════════════════════════════════
  // TYPOGRAPHY SYSTEM
  // ═══════════════════════════════════════════════════════════════
  typography: {
    fontFamily: {
      sans: ['Inter', 'system-ui', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'sans-serif'],
      mono: ['JetBrains Mono', 'Menlo', 'Monaco', 'Courier New', 'monospace'],
    },
    
    fontSize: {
      // Major Third Scale (1.250)
      xs: ['0.75rem', { lineHeight: '1rem', letterSpacing: '0.01em' }],      // 12px
      sm: ['0.875rem', { lineHeight: '1.25rem', letterSpacing: '0.01em' }],  // 14px
      base: ['1rem', { lineHeight: '1.5rem', letterSpacing: '0' }],          // 16px
      lg: ['1.125rem', { lineHeight: '1.75rem', letterSpacing: '0' }],       // 18px
      xl: ['1.25rem', { lineHeight: '1.875rem', letterSpacing: '-0.01em' }], // 20px
      '2xl': ['1.5rem', { lineHeight: '2rem', letterSpacing: '-0.01em' }],   // 24px
      '3xl': ['1.875rem', { lineHeight: '2.25rem', letterSpacing: '-0.02em' }], // 30px
      '4xl': ['2.25rem', { lineHeight: '2.5rem', letterSpacing: '-0.02em' }],   // 36px
      '5xl': ['3rem', { lineHeight: '3.5rem', letterSpacing: '-0.02em' }],      // 48px
      '6xl': ['3.75rem', { lineHeight: '4rem', letterSpacing: '-0.02em' }],     // 60px
      '7xl': ['4.5rem', { lineHeight: '4.75rem', letterSpacing: '-0.02em' }],   // 72px
    },
    
    fontWeight: {
      thin: '100',
      extralight: '200',
      light: '300',
      normal: '400',
      medium: '500',
      semibold: '600',
      bold: '700',
      extrabold: '800',
      black: '900',
    },
  },

  // ═══════════════════════════════════════════════════════════════
  // SPACING SYSTEM (Based on 4px grid)
  // ═══════════════════════════════════════════════════════════════
  spacing: {
    px: '1px',
    0: '0',
    0.5: '0.125rem',  // 2px
    1: '0.25rem',     // 4px
    1.5: '0.375rem',  // 6px
    2: '0.5rem',      // 8px
    2.5: '0.625rem',  // 10px
    3: '0.75rem',     // 12px
    3.5: '0.875rem',  // 14px
    4: '1rem',        // 16px
    5: '1.25rem',     // 20px
    6: '1.5rem',      // 24px
    7: '1.75rem',     // 28px
    8: '2rem',        // 32px
    9: '2.25rem',     // 36px
    10: '2.5rem',     // 40px
    11: '2.75rem',    // 44px
    12: '3rem',       // 48px
    14: '3.5rem',     // 56px
    16: '4rem',       // 64px
    20: '5rem',       // 80px
    24: '6rem',       // 96px
    28: '7rem',       // 112px
    32: '8rem',       // 128px
  },

  // ═══════════════════════════════════════════════════════════════
  // BORDER RADIUS
  // ═══════════════════════════════════════════════════════════════
  borderRadius: {
    none: '0',
    sm: '0.25rem',    // 4px
    DEFAULT: '0.5rem', // 8px
    md: '0.75rem',    // 12px
    lg: '1rem',       // 16px
    xl: '1.5rem',     // 24px
    '2xl': '2rem',    // 32px
    '3xl': '3rem',    // 48px
    full: '9999px',
  },

  // ═══════════════════════════════════════════════════════════════
  // SHADOWS
  // ═══════════════════════════════════════════════════════════════
  shadows: {
    sm: '0 1px 2px 0 rgb(0 0 0 / 0.05)',
    DEFAULT: '0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1)',
    md: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)',
    lg: '0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)',
    xl: '0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)',
    '2xl': '0 25px 50px -12px rgb(0 0 0 / 0.25)',
    inner: 'inset 0 2px 4px 0 rgb(0 0 0 / 0.05)',
    none: 'none',
  },

  // ═══════════════════════════════════════════════════════════════
  // ANIMATION TIMING
  // ═══════════════════════════════════════════════════════════════
  animation: {
    duration: {
      instant: '50ms',
      fast: '150ms',
      normal: '250ms',
      slow: '350ms',
      slower: '500ms',
    },
    
    easing: {
      linear: 'linear',
      ease: 'cubic-bezier(0.4, 0, 0.2, 1)',
      easeIn: 'cubic-bezier(0.4, 0, 1, 1)',
      easeOut: 'cubic-bezier(0, 0, 0.2, 1)',
      easeInOut: 'cubic-bezier(0.4, 0, 0.2, 1)',
      bounce: 'cubic-bezier(0.68, -0.55, 0.265, 1.55)',
    },
  },

  // ═══════════════════════════════════════════════════════════════
  // BREAKPOINTS
  // ═══════════════════════════════════════════════════════════════
  breakpoints: {
    sm: '640px',   // Mobile landscape
    md: '768px',   // Tablet portrait
    lg: '1024px',  // Tablet landscape / Desktop
    xl: '1280px',  // Desktop
    '2xl': '1536px', // Large desktop
  },

  // ═══════════════════════════════════════════════════════════════
  // Z-INDEX SCALE
  // ═══════════════════════════════════════════════════════════════
  zIndex: {
    base: 0,
    dropdown: 1000,
    sticky: 1100,
    fixed: 1200,
    modal: 1300,
    popover: 1400,
    tooltip: 1500,
    notification: 1600,
    max: 9999,
  },

  // ═══════════════════════════════════════════════════════════════
  // CONTAINER SIZES
  // ═══════════════════════════════════════════════════════════════
  container: {
    sm: '640px',
    md: '768px',
    lg: '1024px',
    xl: '1280px',
    '2xl': '1536px',
  },

  // ═══════════════════════════════════════════════════════════════
  // BLUR VALUES
  // ═══════════════════════════════════════════════════════════════
  blur: {
    none: '0',
    sm: '4px',
    DEFAULT: '8px',
    md: '12px',
    lg: '16px',
    xl: '24px',
    '2xl': '40px',
    '3xl': '64px',
  },

  // ═══════════════════════════════════════════════════════════════
  // OPACITY VALUES
  // ═══════════════════════════════════════════════════════════════
  opacity: {
    0: '0',
    5: '0.05',
    10: '0.1',
    20: '0.2',
    25: '0.25',
    30: '0.3',
    40: '0.4',
    50: '0.5',
    60: '0.6',
    70: '0.7',
    75: '0.75',
    80: '0.8',
    90: '0.9',
    95: '0.95',
    100: '1',
  },

  // ═══════════════════════════════════════════════════════════════
  // LINE HEIGHT
  // ═══════════════════════════════════════════════════════════════
  lineHeight: {
    none: '1',
    tight: '1.25',
    snug: '1.375',
    normal: '1.5',
    relaxed: '1.625',
    loose: '2',
  },

  // ═══════════════════════════════════════════════════════════════
  // LETTER SPACING
  // ═══════════════════════════════════════════════════════════════
  letterSpacing: {
    tighter: '-0.05em',
    tight: '-0.025em',
    normal: '0',
    wide: '0.025em',
    wider: '0.05em',
    widest: '0.1em',
  },
} as const;

// ═══════════════════════════════════════════════════════════════
// HELPER FUNCTIONS
// ═══════════════════════════════════════════════════════════════

/**
 * Get color value by path (e.g., 'primary.500', 'success.DEFAULT')
 */
export function getColor(path: string): string | undefined {
  const parts = path.split('.');
  let value: any = DesignTokens.colors;

  for (const part of parts) {
    value = value?.[part];
    if (value === undefined) return undefined;
  }

  return typeof value === 'string' ? value : undefined;
}

/**
 * Get spacing value by key
 */
export function getSpacing(key: string | number): string | undefined {
  return DesignTokens.spacing[key as keyof typeof DesignTokens.spacing];
}

/**
 * Get shadow value by key
 */
export function getShadow(key: string): string | undefined {
  return DesignTokens.shadows[key as keyof typeof DesignTokens.shadows];
}

// ═══════════════════════════════════════════════════════════════
// TAILWIND THEME CONFIGURATION
// ═══════════════════════════════════════════════════════════════

/**
 * Export tokens in Tailwind-compatible format
 */
export const tailwindTheme = {
  colors: DesignTokens.colors,
  spacing: DesignTokens.spacing,
  borderRadius: DesignTokens.borderRadius,
  boxShadow: DesignTokens.shadows,
  fontFamily: DesignTokens.typography.fontFamily,
  fontSize: DesignTokens.typography.fontSize,
  fontWeight: DesignTokens.typography.fontWeight,
  lineHeight: DesignTokens.lineHeight,
  letterSpacing: DesignTokens.letterSpacing,
  blur: DesignTokens.blur,
  opacity: DesignTokens.opacity,
  zIndex: DesignTokens.zIndex,
  container: DesignTokens.container,
  screens: DesignTokens.breakpoints,
  transitionDuration: DesignTokens.animation.duration,
  transitionTimingFunction: DesignTokens.animation.easing,
};

export default DesignTokens;

