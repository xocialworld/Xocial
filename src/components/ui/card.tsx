'use client';

import * as React from "react";
import { cn } from "@/lib/utils";

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Enable hover elevation effect */
  hoverable?: boolean;
  /** Use glass morphism style */
  glass?: boolean;
}

const Card = React.forwardRef<HTMLDivElement, CardProps>(
  ({ className, hoverable = false, glass = false, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(
        "rounded-xl border bg-white shadow-sm transition-all duration-200",
        // Default border
        "border-secondary-100",
        // Hoverable effect
        hoverable && "hover:shadow-elevated hover:border-secondary-200 hover:-translate-y-0.5",
        // Glass effect
        glass && "bg-white/72 backdrop-blur-xl border-white/20",
        className
      )}
      {...props}
    />
  )
);
Card.displayName = "Card";

const CardHeader = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("flex flex-col space-y-1.5 p-6", className)}
    {...props}
  />
));
CardHeader.displayName = "CardHeader";

const CardTitle = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLHeadingElement>
>(({ className, ...props }, ref) => (
  <h3
    ref={ref}
    className={cn(
      "text-xl font-semibold leading-none tracking-tight text-secondary-900",
      className
    )}
    {...props}
  />
));
CardTitle.displayName = "CardTitle";

const CardDescription = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLParagraphElement>
>(({ className, ...props }, ref) => (
  <p
    ref={ref}
    className={cn("text-sm text-secondary-500 leading-relaxed", className)}
    {...props}
  />
));
CardDescription.displayName = "CardDescription";

const CardContent = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div ref={ref} className={cn("p-6 pt-0", className)} {...props} />
));
CardContent.displayName = "CardContent";

const CardFooter = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("flex items-center p-6 pt-0", className)}
    {...props}
  />
));
CardFooter.displayName = "CardFooter";

// Premium variant: Metric Card
interface MetricCardProps extends React.HTMLAttributes<HTMLDivElement> {
  title: string;
  value: string | number;
  subtitle?: string;
  trend?: {
    value: number;
    direction: 'up' | 'down';
  };
  icon?: React.ReactNode;
}

const MetricCard = React.forwardRef<HTMLDivElement, MetricCardProps>(
  ({ className, title, value, subtitle, trend, icon, ...props }, ref) => (
    <Card
      ref={ref}
      hoverable
      className={cn("p-6", className)}
      {...props}
    >
      <div className="flex items-start justify-between">
        <div className="space-y-2">
          <p className="text-sm font-medium text-secondary-500">{title}</p>
          <div className="flex items-baseline gap-2">
            <p className="text-3xl font-bold tracking-tight text-secondary-900">{value}</p>
            {trend && (
              <span className={cn(
                "inline-flex items-center text-sm font-medium",
                trend.direction === 'up' ? "text-success-600" : "text-error-600"
              )}>
                {trend.direction === 'up' ? '↑' : '↓'} {Math.abs(trend.value)}%
              </span>
            )}
          </div>
          {subtitle && (
            <p className="text-sm text-secondary-400">{subtitle}</p>
          )}
        </div>
        {icon && (
          <div className="p-3 rounded-lg bg-primary-50 text-primary-600">
            {icon}
          </div>
        )}
      </div>
    </Card>
  )
);
MetricCard.displayName = "MetricCard";

export { Card, CardHeader, CardFooter, CardTitle, CardDescription, CardContent, MetricCard };
