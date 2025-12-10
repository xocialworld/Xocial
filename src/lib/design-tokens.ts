/**
 * Design Token System
 * Centralized design system tokens for colors, typography, spacing, etc.
 * Based on SRS Section 3.1
 */

export const DesignTokens = {
  // ═══════════════════════════════════════════════════════════════
  // COLOR SYSTEM — Premium palette inspired by Linear/Notion/Figma
  // ═══════════════════════════════════════════════════════════════
  colors: {
    // Primary Brand Colors (Ocean Depth Teal)
    primary: {
      50: 'hsl(172, 67%, 97%)',    // Barely-there tint
      100: 'hsl(172, 67%, 93%)',   // Subtle highlight
      200: 'hsl(172, 62%, 85%)',   // Light accent
      300: 'hsl(172, 58%, 72%)',   // Mid-light
      400: 'hsl(173, 55%, 55%)',   // Vivid accent
      500: 'hsl(173, 58%, 42%)',   // Primary base (hero color)
      600: 'hsl(174, 65%, 34%)',   // Hover state
      700: 'hsl(175, 72%, 26%)',   // Active/pressed
      800: 'hsl(176, 78%, 20%)',   // Dark accent
      900: 'hsl(177, 82%, 14%)',   // Deepest
      950: 'hsl(178, 85%, 8%)',    // Near-black
      DEFAULT: 'hsl(173, 58%, 42%)',
    },

    // Secondary Colors (Refined Slate)
    secondary: {
      50: 'hsl(230, 25%, 98%)',    // Near white
      100: 'hsl(228, 22%, 96%)',   // Subtle tint
      200: 'hsl(226, 18%, 91%)',   // Light border
      300: 'hsl(224, 15%, 82%)',   // Muted text
      400: 'hsl(222, 12%, 62%)',   // Placeholder
      500: 'hsl(220, 13%, 46%)',   // Secondary text
      600: 'hsl(218, 16%, 36%)',   // Emphasis
      700: 'hsl(216, 20%, 27%)',   // Card backgrounds (dark)
      800: 'hsl(214, 24%, 18%)',   // Sidebar/panels
      900: 'hsl(212, 28%, 12%)',   // Deep dark
      950: 'hsl(210, 32%, 7%)',    // Near black
      DEFAULT: 'hsl(220, 13%, 46%)',
    },

    // Accent Colors (Premium highlights)
    accent: {
      violet: 'hsl(262, 83%, 65%)',
      indigo: 'hsl(238, 78%, 62%)',
      rose: 'hsl(347, 77%, 62%)',
      amber: 'hsl(38, 92%, 55%)',
      emerald: 'hsl(160, 84%, 42%)',
      DEFAULT: 'hsl(262, 83%, 65%)',
    },

    // Semantic Colors (Refined)
    success: {
      50: 'hsl(158, 64%, 97%)',
      100: 'hsl(158, 64%, 93%)',
      200: 'hsl(158, 60%, 82%)',
      300: 'hsl(159, 56%, 68%)',
      400: 'hsl(160, 72%, 52%)',
      500: 'hsl(160, 84%, 42%)',   // Base emerald
      600: 'hsl(161, 90%, 34%)',
      700: 'hsl(162, 92%, 28%)',
      800: 'hsl(163, 88%, 22%)',
      900: 'hsl(164, 85%, 16%)',
      DEFAULT: 'hsl(160, 84%, 42%)',
    },

    warning: {
      50: 'hsl(48, 96%, 97%)',
      100: 'hsl(48, 96%, 92%)',
      200: 'hsl(45, 94%, 82%)',
      300: 'hsl(42, 92%, 70%)',
      400: 'hsl(40, 92%, 60%)',
      500: 'hsl(38, 92%, 55%)',    // Base amber
      600: 'hsl(35, 90%, 48%)',
      700: 'hsl(32, 88%, 40%)',
      800: 'hsl(28, 85%, 32%)',
      900: 'hsl(24, 80%, 24%)',
      DEFAULT: 'hsl(38, 92%, 55%)',
    },

    error: {
      50: 'hsl(0, 86%, 97%)',
      100: 'hsl(0, 86%, 94%)',
      200: 'hsl(0, 84%, 86%)',
      300: 'hsl(0, 82%, 74%)',
      400: 'hsl(0, 80%, 64%)',
      500: 'hsl(0, 84%, 60%)',     // Base red
      600: 'hsl(0, 78%, 52%)',
      700: 'hsl(0, 75%, 44%)',
      800: 'hsl(0, 70%, 36%)',
      900: 'hsl(0, 65%, 28%)',
      DEFAULT: 'hsl(0, 84%, 60%)',
    },

    info: {
      50: 'hsl(204, 94%, 97%)',
      100: 'hsl(204, 94%, 93%)',
      200: 'hsl(203, 92%, 84%)',
      300: 'hsl(202, 90%, 72%)',
      400: 'hsl(201, 88%, 60%)',
      500: 'hsl(199, 89%, 48%)',   // Base blue
      600: 'hsl(198, 85%, 42%)',
      700: 'hsl(197, 80%, 36%)',
      800: 'hsl(196, 75%, 28%)',
      900: 'hsl(195, 70%, 22%)',
      DEFAULT: 'hsl(199, 89%, 48%)',
    },

    // Neutral Grays (Enhanced)
    gray: {
      50: 'hsl(220, 20%, 98%)',
      100: 'hsl(220, 18%, 96%)',
      200: 'hsl(220, 16%, 91%)',
      300: 'hsl(220, 12%, 80%)',
      400: 'hsl(220, 10%, 62%)',
      500: 'hsl(220, 10%, 46%)',
      600: 'hsl(220, 12%, 36%)',
      700: 'hsl(220, 16%, 27%)',
      800: 'hsl(220, 20%, 18%)',
      900: 'hsl(220, 24%, 12%)',
      950: 'hsl(220, 28%, 6%)',
      DEFAULT: 'hsl(220, 10%, 46%)',
    },

    // Surface System (for backgrounds, overlays, glassmorphism)
    surface: {
      base: 'hsl(220, 20%, 98%)',
      elevated: 'hsl(0, 0%, 100%)',
      sunken: 'hsl(220, 18%, 96%)',
      overlay: 'hsla(220, 24%, 12%, 0.8)',
      glass: 'hsla(0, 0%, 100%, 0.72)',
      glassDark: 'hsla(220, 24%, 12%, 0.65)',
      DEFAULT: 'hsl(220, 20%, 98%)',
    },

    // Border System
    border: {
      subtle: 'hsla(220, 16%, 12%, 0.06)',
      default: 'hsla(220, 16%, 12%, 0.1)',
      strong: 'hsla(220, 16%, 12%, 0.16)',
      focus: 'hsla(173, 58%, 42%, 0.5)',
      DEFAULT: 'hsla(220, 16%, 12%, 0.1)',
    },

    // Platform-Specific Colors (unchanged)
    platforms: {
      facebook: 'hsl(221, 44%, 41%)',
      instagram: 'hsl(329, 100%, 50%)',
      twitter: 'hsl(203, 89%, 53%)',
      linkedin: 'hsl(201, 100%, 35%)',
      youtube: 'hsl(0, 100%, 50%)',
      tiktok: 'hsl(0, 0%, 0%)',
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
  // SHADOWS — Enhanced with glow effects and focus states
  // ═══════════════════════════════════════════════════════════════
  shadows: {
    xs: '0 1px 2px hsla(220, 16%, 12%, 0.03)',
    sm: '0 1px 3px hsla(220, 16%, 12%, 0.04), 0 1px 2px hsla(220, 16%, 12%, 0.02)',
    DEFAULT: '0 2px 4px -1px hsla(220, 16%, 12%, 0.06), 0 1px 2px -1px hsla(220, 16%, 12%, 0.03)',
    md: '0 4px 6px -1px hsla(220, 16%, 12%, 0.06), 0 2px 4px -2px hsla(220, 16%, 12%, 0.04)',
    lg: '0 10px 15px -3px hsla(220, 16%, 12%, 0.07), 0 4px 6px -4px hsla(220, 16%, 12%, 0.04)',
    xl: '0 20px 25px -5px hsla(220, 16%, 12%, 0.08), 0 8px 10px -6px hsla(220, 16%, 12%, 0.04)',
    '2xl': '0 25px 50px -12px hsla(220, 16%, 12%, 0.15)',
    inner: 'inset 0 2px 4px 0 hsla(220, 16%, 12%, 0.04)',
    none: 'none',
    // Glow effects for interactive elements
    glow: '0 0 20px hsla(173, 58%, 42%, 0.35)',
    glowLg: '0 0 40px hsla(173, 58%, 42%, 0.25)',
    glowAccent: '0 0 20px hsla(262, 83%, 65%, 0.35)',
    // Focus ring
    focus: '0 0 0 3px hsla(173, 58%, 42%, 0.35)',
    focusError: '0 0 0 3px hsla(0, 84%, 60%, 0.35)',
    // Card hover elevation
    elevated: '0 8px 16px -4px hsla(220, 16%, 12%, 0.08), 0 4px 8px -4px hsla(220, 16%, 12%, 0.04)',
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

