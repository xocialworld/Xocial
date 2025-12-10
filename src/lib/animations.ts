/**
 * Framer Motion animation variants
 * Premium Design System — Inspired by Linear, Notion, Figma
 */

import { Variants, Transition } from 'framer-motion';

// ═══════════════════════════════════════════════════════════════
// SPRING PHYSICS CONFIGURATIONS
// ═══════════════════════════════════════════════════════════════

/**
 * Reusable spring configurations for consistent physics
 */
export const springConfig = {
    /** Gentle spring for subtle animations */
    gentle: { type: 'spring' as const, stiffness: 120, damping: 14 },
    /** Snappy spring for responsive interactions */
    snappy: { type: 'spring' as const, stiffness: 300, damping: 24 },
    /** Bouncy spring for playful feedback */
    bouncy: { type: 'spring' as const, stiffness: 400, damping: 10 },
    /** Slow spring for dramatic reveals */
    slow: { type: 'spring' as const, stiffness: 80, damping: 20 },
    /** Stiff spring for quick micro-interactions */
    stiff: { type: 'spring' as const, stiffness: 500, damping: 30 },
};

/**
 * Custom cubic-bezier easing curves
 */
export const easings = {
    /** Apple-style ease out for smooth entrances */
    easeOutExpo: [0.16, 1, 0.3, 1] as const,
    /** Standard ease in-out */
    easeInOut: [0.4, 0, 0.2, 1] as const,
    /** Smooth ease out */
    easeOut: [0, 0, 0.2, 1] as const,
    /** Quick ease in */
    easeIn: [0.4, 0, 1, 1] as const,
};

// ═══════════════════════════════════════════════════════════════
// FADE ANIMATIONS
// ═══════════════════════════════════════════════════════════════

/**
 * Fade in from bottom with upward motion (enhanced)
 */
export const fadeInUp: Variants = {
    initial: {
        opacity: 0,
        y: 16,
        filter: 'blur(4px)',
    },
    animate: {
        opacity: 1,
        y: 0,
        filter: 'blur(0px)',
        transition: {
            duration: 0.4,
            ease: easings.easeOutExpo,
        },
    },
    exit: {
        opacity: 0,
        y: -8,
        filter: 'blur(4px)',
        transition: {
            duration: 0.2,
            ease: easings.easeIn,
        },
    },
};

/**
 * Simple fade in
 */
export const fadeIn: Variants = {
    initial: { opacity: 0 },
    animate: {
        opacity: 1,
        transition: { duration: 0.3, ease: easings.easeOut },
    },
    exit: {
        opacity: 0,
        transition: { duration: 0.2, ease: easings.easeIn },
    },
};

// ═══════════════════════════════════════════════════════════════
// STAGGER ANIMATIONS
// ═══════════════════════════════════════════════════════════════

/**
 * Stagger children animations (enhanced)
 */
export const staggerContainer: Variants = {
    initial: {},
    animate: {
        transition: {
            staggerChildren: 0.05,
            delayChildren: 0.1,
        },
    },
    exit: {
        transition: {
            staggerChildren: 0.03,
            staggerDirection: -1,
        },
    },
};

/**
 * Fast stagger for lists
 */
export const staggerFast: Variants = {
    animate: {
        transition: {
            staggerChildren: 0.03,
        },
    },
};

// ═══════════════════════════════════════════════════════════════
// BUTTON & INTERACTIVE ANIMATIONS
// ═══════════════════════════════════════════════════════════════

/**
 * Premium button press with spring physics
 */
export const buttonPress: Variants = {
    rest: { scale: 1 },
    hover: {
        scale: 1.02,
        transition: springConfig.gentle,
    },
    pressed: {
        scale: 0.97,
        transition: springConfig.snappy,
    },
};

/**
 * Scale on hover and tap (enhanced)
 */
export const scaleOnHover: Variants = {
    initial: { scale: 1 },
    whileHover: {
        scale: 1.02,
        transition: springConfig.gentle,
    },
    whileTap: {
        scale: 0.98,
        transition: springConfig.stiff,
    },
};

/**
 * Subtle hover lift effect
 */
export const hoverLift: Variants = {
    rest: {
        y: 0,
        transition: springConfig.gentle,
    },
    hover: {
        y: -2,
        transition: springConfig.gentle,
    },
};

// ═══════════════════════════════════════════════════════════════
// SLIDE ANIMATIONS
// ═══════════════════════════════════════════════════════════════

/**
 * Slide in from right (for drawers/panels) - enhanced
 */
export const slideInRight: Variants = {
    initial: {
        x: '100%',
        opacity: 0,
    },
    animate: {
        x: 0,
        opacity: 1,
        transition: {
            duration: 0.4,
            ease: easings.easeOutExpo,
        },
    },
    exit: {
        x: '100%',
        opacity: 0,
        transition: {
            duration: 0.3,
            ease: easings.easeIn,
        },
    },
};

/**
 * Slide in from left
 */
export const slideInLeft: Variants = {
    initial: {
        x: '-100%',
        opacity: 0,
    },
    animate: {
        x: 0,
        opacity: 1,
        transition: {
            duration: 0.4,
            ease: easings.easeOutExpo,
        },
    },
    exit: {
        x: '-100%',
        opacity: 0,
        transition: {
            duration: 0.3,
            ease: easings.easeIn,
        },
    },
};

// ═══════════════════════════════════════════════════════════════
// MODAL & OVERLAY ANIMATIONS
// ═══════════════════════════════════════════════════════════════

/**
 * Modal/Dialog fade and scale in (premium)
 */
export const modalVariants: Variants = {
    initial: {
        opacity: 0,
        scale: 0.96,
        y: 8,
    },
    animate: {
        opacity: 1,
        scale: 1,
        y: 0,
        transition: {
            duration: 0.25,
            ease: easings.easeOutExpo,
        },
    },
    exit: {
        opacity: 0,
        scale: 0.96,
        y: 4,
        transition: {
            duration: 0.15,
            ease: easings.easeIn,
        },
    },
};

/**
 * Overlay backdrop animation
 */
export const overlayVariants: Variants = {
    initial: { opacity: 0 },
    animate: {
        opacity: 1,
        transition: { duration: 0.2 },
    },
    exit: {
        opacity: 0,
        transition: { duration: 0.15, delay: 0.05 },
    },
};

// ═══════════════════════════════════════════════════════════════
// CARD ANIMATIONS
// ═══════════════════════════════════════════════════════════════

/**
 * Card lift on hover (enhanced with elevation)
 */
export const cardHover: Variants = {
    rest: {
        scale: 1,
        y: 0,
        boxShadow: '0 2px 8px hsla(220, 16%, 12%, 0.04)',
    },
    hover: {
        scale: 1.01,
        y: -2,
        boxShadow: '0 8px 16px -4px hsla(220, 16%, 12%, 0.08), 0 4px 8px -4px hsla(220, 16%, 12%, 0.04)',
        transition: springConfig.gentle,
    },
};

/**
 * Card elevation for interactive cards
 */
export const cardElevation: Variants = {
    rest: {
        scale: 1,
        y: 0,
        boxShadow: '0 1px 3px hsla(220, 16%, 12%, 0.04), 0 1px 2px hsla(220, 16%, 12%, 0.02)',
    },
    hover: {
        scale: 1.01,
        y: -3,
        boxShadow: '0 20px 25px -5px hsla(220, 16%, 12%, 0.08), 0 8px 10px -6px hsla(220, 16%, 12%, 0.04)',
        transition: springConfig.gentle,
    },
};

// ═══════════════════════════════════════════════════════════════
// LOADING & FEEDBACK ANIMATIONS
// ═══════════════════════════════════════════════════════════════

/**
 * Pulsing animation for loading states
 */
export const pulse: Variants = {
    animate: {
        opacity: [1, 0.5, 1],
        transition: {
            duration: 1.5,
            repeat: Infinity,
            ease: 'easeInOut',
        },
    },
};

/**
 * Skeleton loading shimmer
 */
export const shimmer: Variants = {
    animate: {
        backgroundPosition: ['200% 0', '-200% 0'],
        transition: {
            duration: 2,
            repeat: Infinity,
            ease: 'linear',
        },
    },
};

/**
 * Glow pulse for emphasis
 */
export const glowPulse: Variants = {
    animate: {
        boxShadow: [
            '0 0 20px hsla(173, 58%, 42%, 0.35)',
            '0 0 30px hsla(173, 58%, 42%, 0.5)',
            '0 0 20px hsla(173, 58%, 42%, 0.35)',
        ],
        transition: {
            duration: 2,
            repeat: Infinity,
            ease: 'easeInOut',
        },
    },
};

/**
 * Success checkmark animation
 */
export const successCheck: Variants = {
    initial: {
        pathLength: 0,
        opacity: 0,
    },
    animate: {
        pathLength: 1,
        opacity: 1,
        transition: {
            duration: 0.5,
            ease: easings.easeOut,
        },
    },
};

// ═══════════════════════════════════════════════════════════════
// LIST & ITEM ANIMATIONS
// ═══════════════════════════════════════════════════════════════

/**
 * List container with stagger
 */
export const listContainer: Variants = {
    hidden: { opacity: 0 },
    visible: {
        opacity: 1,
        transition: {
            staggerChildren: 0.05,
            delayChildren: 0.1,
        },
    },
    exit: {
        opacity: 0,
        transition: {
            staggerChildren: 0.03,
            staggerDirection: -1,
        },
    },
};

/**
 * List item with blur entrance
 */
export const listItem: Variants = {
    hidden: {
        opacity: 0,
        y: 8,
        filter: 'blur(4px)',
    },
    visible: {
        opacity: 1,
        y: 0,
        filter: 'blur(0px)',
        transition: springConfig.gentle,
    },
    exit: {
        opacity: 0,
        y: -4,
        transition: { duration: 0.15 },
    },
};

// ═══════════════════════════════════════════════════════════════
// NAVIGATION ANIMATIONS
// ═══════════════════════════════════════════════════════════════

/**
 * Sidebar nav item hover
 */
export const navItemVariants: Variants = {
    rest: {
        x: 0,
        backgroundColor: 'transparent',
    },
    hover: {
        x: 4,
        backgroundColor: 'hsla(0, 0%, 100%, 0.05)',
        transition: springConfig.snappy,
    },
};

/**
 * Tab indicator animation
 */
export const tabIndicator: Variants = {
    initial: { opacity: 0, scale: 0.95 },
    animate: {
        opacity: 1,
        scale: 1,
        transition: springConfig.snappy,
    },
};

// ═══════════════════════════════════════════════════════════════
// CALENDAR & DATE ANIMATIONS
// ═══════════════════════════════════════════════════════════════

/**
 * Calendar month transition (slide left/right)
 */
export const calendarTransition = (direction: 'left' | 'right'): Variants => ({
    initial: {
        x: direction === 'left' ? '-100%' : '100%',
        opacity: 0,
    },
    animate: {
        x: 0,
        opacity: 1,
        transition: {
            duration: 0.3,
            ease: easings.easeInOut,
        },
    },
    exit: {
        x: direction === 'left' ? '100%' : '-100%',
        opacity: 0,
        transition: {
            duration: 0.3,
            ease: easings.easeInOut,
        },
    },
});

// ═══════════════════════════════════════════════════════════════
// TOAST & NOTIFICATION ANIMATIONS
// ═══════════════════════════════════════════════════════════════

/**
 * Toast notification slide in from top
 */
export const toastVariants: Variants = {
    initial: {
        y: -20,
        opacity: 0,
        scale: 0.95,
    },
    animate: {
        y: 0,
        opacity: 1,
        scale: 1,
        transition: {
            duration: 0.3,
            ease: easings.easeOutExpo,
        },
    },
    exit: {
        y: -10,
        opacity: 0,
        scale: 0.95,
        transition: {
            duration: 0.2,
            ease: easings.easeIn,
        },
    },
};

// ═══════════════════════════════════════════════════════════════
// TOOLTIP & POPOVER ANIMATIONS
// ═══════════════════════════════════════════════════════════════

/**
 * Tooltip entrance
 */
export const tooltipVariants: Variants = {
    hidden: {
        opacity: 0,
        scale: 0.96,
        y: 4,
    },
    visible: {
        opacity: 1,
        scale: 1,
        y: 0,
        transition: springConfig.stiff,
    },
    exit: {
        opacity: 0,
        scale: 0.96,
        transition: { duration: 0.1 },
    },
};

/**
 * Popover entrance
 */
export const popoverVariants: Variants = {
    hidden: {
        opacity: 0,
        scale: 0.95,
        y: 8,
    },
    visible: {
        opacity: 1,
        scale: 1,
        y: 0,
        transition: {
            duration: 0.2,
            ease: easings.easeOutExpo,
        },
    },
    exit: {
        opacity: 0,
        scale: 0.95,
        y: 4,
        transition: { duration: 0.15 },
    },
};

// ═══════════════════════════════════════════════════════════════
// ACCORDION ANIMATIONS
// ═══════════════════════════════════════════════════════════════

/**
 * Accordion expand/collapse
 */
export const accordion: Variants = {
    collapsed: {
        height: 0,
        opacity: 0,
        transition: {
            duration: 0.2,
            ease: easings.easeInOut,
        },
    },
    expanded: {
        height: 'auto',
        opacity: 1,
        transition: {
            duration: 0.3,
            ease: easings.easeOutExpo,
        },
    },
};

// ═══════════════════════════════════════════════════════════════
// PAGE TRANSITIONS
// ═══════════════════════════════════════════════════════════════

/**
 * Page transition variants
 */
export const pageTransition: Variants = {
    initial: {
        opacity: 0,
        y: 8,
        filter: 'blur(4px)',
    },
    enter: {
        opacity: 1,
        y: 0,
        filter: 'blur(0px)',
        transition: {
            duration: 0.4,
            ease: easings.easeOutExpo,
        },
    },
    exit: {
        opacity: 0,
        y: -8,
        filter: 'blur(4px)',
        transition: {
            duration: 0.3,
            ease: easings.easeIn,
        },
    },
};

// ═══════════════════════════════════════════════════════════════
// UTILITY FUNCTIONS
// ═══════════════════════════════════════════════════════════════

/**
 * Number count-up animation
 */
export const countUp = (_from: number, _to: number): Transition => ({
    duration: 1,
    ease: easings.easeOut,
});

/**
 * Create custom stagger variants
 */
export const createStagger = (staggerDelay: number = 0.05, delayChildren: number = 0): Variants => ({
    animate: {
        transition: {
            staggerChildren: staggerDelay,
            delayChildren,
        },
    },
});
