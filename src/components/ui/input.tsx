'use client';

import * as React from "react";
import { cn } from "@/lib/utils";

export interface InputProps
  extends React.InputHTMLAttributes<HTMLInputElement> {
  /** Error state */
  error?: boolean;
  /** Icon on the left */
  leftIcon?: React.ReactNode;
  /** Icon on the right */
  rightIcon?: React.ReactNode;
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, error, leftIcon, rightIcon, ...props }, ref) => {
    return (
      <div className="relative">
        {leftIcon && (
          <div className="absolute left-3 top-1/2 -translate-y-1/2 text-secondary-400">
            {leftIcon}
          </div>
        )}
        <input
          type={type}
          className={cn(
            // Base styles
            "flex h-10 w-full rounded-lg border bg-white px-3.5 py-2",
            "text-sm text-secondary-900 placeholder:text-secondary-400",
            // Transition
            "transition-all duration-200",
            // Border states
            "border-secondary-200 hover:border-secondary-300",
            // Focus state with glow
            "focus:outline-none focus:border-primary-400 focus:ring-2 focus:ring-primary-500/20",
            // Error state
            error && "border-error-400 focus:border-error-500 focus:ring-error-500/20",
            // Disabled
            "disabled:cursor-not-allowed disabled:opacity-50 disabled:bg-secondary-50",
            // Icon padding
            leftIcon && "pl-10",
            rightIcon && "pr-10",
            className
          )}
          ref={ref}
          {...props}
        />
        {rightIcon && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2 text-secondary-400">
            {rightIcon}
          </div>
        )}
      </div>
    );
  }
);

Input.displayName = "Input";

export { Input };
