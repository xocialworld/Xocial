'use client';

import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center rounded-full text-xs font-medium transition-colors",
  {
    variants: {
      variant: {
        default: "bg-secondary-100 text-secondary-700",
        secondary: "bg-secondary-200 text-secondary-800",
        outline: "border border-secondary-200 text-secondary-600 bg-transparent",
        success: "bg-success-50 text-success-700 border border-success-200/50",
        error: "bg-error-50 text-error-700 border border-error-200/50",
        warning: "bg-warning-50 text-warning-700 border border-warning-200/50",
        info: "bg-info-50 text-info-700 border border-info-200/50",
        // Premium variants
        primary: "bg-primary-50 text-primary-700 border border-primary-200/50",
        accent: "bg-accent-violet/10 text-accent-violet border border-accent-violet/20",
        // Status variants with dot
        draft: "bg-secondary-100 text-secondary-600",
        scheduled: "bg-info-50 text-info-700",
        published: "bg-success-50 text-success-700",
        pending: "bg-warning-50 text-warning-700",
      },
      size: {
        default: "px-2.5 py-0.5",
        sm: "px-2 py-0.5 text-[10px]",
        lg: "px-3 py-1 text-sm",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
  VariantProps<typeof badgeVariants> {
  /** Show a status dot indicator */
  dot?: boolean;
  /** Dot color - defaults to matching the variant */
  dotColor?: string;
}

function Badge({
  className,
  variant = "default",
  size,
  dot,
  dotColor,
  children,
  ...props
}: BadgeProps) {
  // Determine dot color based on variant
  const getDotColor = () => {
    if (dotColor) return dotColor;
    switch (variant) {
      case 'success':
      case 'published':
        return 'bg-success-500';
      case 'error':
        return 'bg-error-500';
      case 'warning':
      case 'pending':
        return 'bg-warning-500';
      case 'info':
      case 'scheduled':
        return 'bg-info-500';
      case 'primary':
        return 'bg-primary-500';
      case 'accent':
        return 'bg-accent-violet';
      default:
        return 'bg-secondary-400';
    }
  };

  return (
    <div
      className={cn(badgeVariants({ variant, size }), className)}
      {...props}
    >
      {dot && (
        <span
          className={cn(
            "w-1.5 h-1.5 rounded-full mr-1.5",
            getDotColor()
          )}
        />
      )}
      {children}
    </div>
  );
}

// Status Badge - A specialized badge for post statuses
interface StatusBadgeProps extends Omit<BadgeProps, 'variant'> {
  status: 'draft' | 'scheduled' | 'published' | 'pending' | 'failed';
}

function StatusBadge({ status, ...props }: StatusBadgeProps) {
  const statusConfig = {
    draft: { variant: 'draft' as const, label: 'Draft' },
    scheduled: { variant: 'scheduled' as const, label: 'Scheduled' },
    published: { variant: 'published' as const, label: 'Published' },
    pending: { variant: 'pending' as const, label: 'Pending' },
    failed: { variant: 'error' as const, label: 'Failed' },
  };

  const config = statusConfig[status];

  return (
    <Badge variant={config.variant} dot {...props}>
      {config.label}
    </Badge>
  );
}

export { Badge, StatusBadge, badgeVariants };
