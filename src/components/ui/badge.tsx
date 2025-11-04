'use client';

import * as React from "react";
import { cn } from "@/lib/utils";

export interface BadgeProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: "default" | "secondary" | "outline" | "success" | "error" | "warning" | "info";
}

function Badge({ className, variant = "default", ...props }: BadgeProps) {
  const variants = {
    default: "bg-secondary-100 text-secondary-800",
    secondary: "bg-secondary-200 text-secondary-900",
    outline: "border border-secondary-300 text-secondary-700 bg-transparent",
    success: "bg-success-50 text-success-700",
    error: "bg-error-50 text-error-700",
    warning: "bg-warning-50 text-warning-700",
    info: "bg-info-50 text-info-700",
  };

  return (
    <div
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold",
        variants[variant],
        className
      )}
      {...props}
    />
  );
}

export { Badge };

