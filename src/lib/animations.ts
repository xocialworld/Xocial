/**
 * Framer Motion animation variants
 * Based on Xocial SRS Section 2.1.3
 */

import { Variants, Transition } from 'framer-motion';

/**
 * Fade in from bottom with upward motion
 */
export const fadeInUp: Variants = {
    initial: {
        opacity: 0,
        y: 20
    },
    animate: {
        opacity: 1,
        y: 0,
        transition: {
            duration: 0.3,
            ease: 'easeOut'
        }
    },
    exit: {
        opacity: 0,
        y: -20,
        transition: {
            duration: 0.2,
            ease: 'easeIn'
        }
    },
};

/**
 * Stagger children animations
 */
export const staggerContainer: Variants = {
    animate: {
        transition: {
            staggerChildren: 0.1
        }
    }
};

/**
 * Scale on hover and tap
 */
export const scaleOnHover: Variants = {
    whileHover: {
        scale: 1.02,
        transition: {
            duration: 0.2,
            ease: 'easeOut'
        }
    },
    whileTap: {
        scale: 0.98,
        transition: {
            duration: 0.1,
            ease: 'easeIn'
        }
    }
};

/**
 * Slide in from right (for drawers/panels)
 */
export const slideInRight: Variants = {
    initial: {
        x: '100%',
        opacity: 0
    },
    animate: {
        x: 0,
        opacity: 1,
        transition: {
            duration: 0.4,
            ease: [0.16, 1, 0.3, 1] // cubic-bezier
        }
    },
    exit: {
        x: '100%',
        opacity: 0,
        transition: {
            duration: 0.3,
            ease: 'easeIn'
        }
    }
};

/**
 * Slide in from left
 */
export const slideInLeft: Variants = {
    initial: {
        x: '-100%',
        opacity: 0
    },
    animate: {
        x: 0,
        opacity: 1,
        transition: {
            duration: 0.4,
            ease: [0.16, 1, 0.3, 1]
        }
    },
    exit: {
        x: '-100%',
        opacity: 0,
        transition: {
            duration: 0.3,
            ease: 'easeIn'
        }
    }
};

/**
 * Modal/Dialog fade and scale in
 */
export const modalVariants: Variants = {
    initial: {
        opacity: 0,
        scale: 0.95
    },
    animate: {
        opacity: 1,
        scale: 1,
        transition: {
            duration: 0.2,
            ease: 'easeOut'
        }
    },
    exit: {
        opacity: 0,
        scale: 0.95,
        transition: {
            duration: 0.15,
            ease: 'easeIn'
        }
    }
};

/**
 * Card lift on hover
 */
export const cardHover: Variants = {
    rest: {
        scale: 1,
        boxShadow: '0 2px 8px rgba(0, 0, 0, 0.04)'
    },
    hover: {
        scale: 1.02,
        boxShadow: '0 4px 16px rgba(0, 0, 0, 0.08)',
        transition: {
            duration: 0.2,
            ease: 'easeOut'
        }
    }
};

/**
 * Pulsing animation for loading states
 */
export const pulse: Variants = {
    animate: {
        opacity: [1, 0.5, 1],
        transition: {
            duration: 1.5,
            repeat: Infinity,
            ease: 'easeInOut'
        }
    }
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
            ease: 'linear'
        }
    }
};

/**
 * Success checkmark animation
 */
export const successCheck: Variants = {
    initial: {
        pathLength: 0,
        opacity: 0
    },
    animate: {
        pathLength: 1,
        opacity: 1,
        transition: {
            duration: 0.5,
            ease: 'easeOut'
        }
    }
};

/**
 * Number count-up animation
 */
export const countUp = (from: number, to: number): Transition => ({
    duration: 1,
    ease: 'easeOut'
});

/**
 * Calendar month transition (slide left/right)
 */
export const calendarTransition = (direction: 'left' | 'right'): Variants => ({
    initial: {
        x: direction === 'left' ? '-100%' : '100%',
        opacity: 0
    },
    animate: {
        x: 0,
        opacity: 1,
        transition: {
            duration: 0.3,
            ease: 'easeInOut'
        }
    },
    exit: {
        x: direction === 'left' ? '100%' : '-100%',
        opacity: 0,
        transition: {
            duration: 0.3,
            ease: 'easeInOut'
        }
    }
});

/**
 * Toast notification slide in from top
 */
export const toastVariants: Variants = {
    initial: {
        y: -100,
        opacity: 0
    },
    animate: {
        y: 0,
        opacity: 1,
        transition: {
            duration: 0.3,
            ease: [0.16, 1, 0.3, 1]
        }
    },
    exit: {
        y: -100,
        opacity: 0,
        transition: {
            duration: 0.2,
            ease: 'easeIn'
        }
    }
};

/**
 * List item stagger animation
 */
export const listItem: Variants = {
    initial: {
        opacity: 0,
        y: 10
    },
    animate: {
        opacity: 1,
        y: 0
    }
};

/**
 * Accordion expand/collapse
 */
export const accordion: Variants = {
    collapsed: {
        height: 0,
        opacity: 0,
        transition: {
            duration: 0.2,
            ease: 'easeInOut'
        }
    },
    expanded: {
        height: 'auto',
        opacity: 1,
        transition: {
            duration: 0.3,
            ease: 'easeInOut'
        }
    }
};
