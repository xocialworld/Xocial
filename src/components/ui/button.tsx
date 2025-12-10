'use client';

import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  // Base styles with premium transitions
  "inline-flex items-center justify-center whitespace-nowrap rounded-lg text-sm font-medium transition-all duration-200 ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500/40 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 active:scale-[0.98]",
  {
    variants: {
      variant: {
        // Primary — Main CTA with glow on hover
        primary: "bg-primary-500 text-white shadow-sm hover:bg-primary-600 hover:shadow-md hover:shadow-primary-500/20 active:bg-primary-700",

        // Default — Same as primary for backwards compatibility
        default: "bg-primary-500 text-white shadow-sm hover:bg-primary-600 hover:shadow-md hover:shadow-primary-500/20",

        // Destructive — Error/danger actions
        destructive: "bg-error-500 text-white shadow-sm hover:bg-error-600 hover:shadow-md hover:shadow-error-500/20 active:bg-error-700",

        // Outline — Subtle bordered button
        outline: "border border-secondary-200 bg-white/80 backdrop-blur-sm text-secondary-700 hover:bg-secondary-50 hover:border-secondary-300 hover:text-secondary-900",

        // Secondary — Muted background
        secondary: "bg-secondary-100 text-secondary-700 hover:bg-secondary-200 hover:text-secondary-900",

        // Ghost — Minimal, just text
        ghost: "text-secondary-600 hover:bg-secondary-100 hover:text-secondary-900",

        // Link — Underlined text style
        link: "text-primary-600 underline-offset-4 hover:underline hover:text-primary-700",

        // Danger — Alias for destructive
        danger: "bg-error-500 text-white shadow-sm hover:bg-error-600 hover:shadow-md hover:shadow-error-500/20",

        // Gradient — Premium gradient CTA
        gradient: "bg-gradient-to-r from-primary-500 to-info-500 text-white shadow-lg shadow-primary-500/25 hover:shadow-xl hover:shadow-primary-500/30 hover:brightness-110",

        // Success — Positive actions
        success: "bg-success-500 text-white shadow-sm hover:bg-success-600 hover:shadow-md hover:shadow-success-500/20",

        // Soft — Light primary background
        soft: "bg-primary-50 text-primary-700 hover:bg-primary-100 hover:text-primary-800",
      },
      size: {
        default: "h-10 px-4 py-2",
        sm: "h-9 rounded-md px-3 text-xs",
        md: "h-10 px-4 py-2 text-sm",
        lg: "h-11 rounded-lg px-6 text-base",
        xl: "h-12 px-8 py-3 text-base font-semibold",
        icon: "h-10 w-10",
        "icon-sm": "h-8 w-8",
        "icon-lg": "h-12 w-12",
      },
    },
    defaultVariants: {
      variant: "primary",
      size: "default",
    },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
  VariantProps<typeof buttonVariants> {
  asChild?: boolean;
  loading?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, loading = false, disabled, children, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        disabled={disabled || loading}
        {...props}
      >
        {loading ? (
          <span className="flex items-center gap-2">
            <svg
              className="animate-spin h-4 w-4"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              />
            </svg>
            {children}
          </span>
        ) : (
          children
        )}
      </Comp>
    );
  }
);
Button.displayName = "Button";

export { Button, buttonVariants };
