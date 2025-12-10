'use client';

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { LucideIcon } from "lucide-react";

interface PageHeaderProps {
    title: string;
    shortCode?: string;
    description?: string;
    icon?: LucideIcon;
    iconColor?: string;
    actions?: React.ReactNode;
    badge?: {
        label: string;
        variant?: 'default' | 'success' | 'warning' | 'error';
    };
    className?: string;
}

const badgeVariants = {
    default: 'bg-secondary-100 text-secondary-700',
    success: 'bg-green-100 text-green-700',
    warning: 'bg-yellow-100 text-yellow-700',
    error: 'bg-red-100 text-red-700',
};

export function PageHeader({
    title,
    shortCode,
    description,
    icon: Icon,
    iconColor = "text-primary-500",
    actions,
    badge,
    className,
}: PageHeaderProps) {
    return (
        <header className={cn("mb-6", className)}>
            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                <div className="flex items-start gap-3">
                    {Icon && (
                        <div className={cn(
                            "hidden sm:flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br shadow-sm flex-shrink-0",
                            iconColor.includes('primary') && "from-primary-100 to-primary-50",
                            iconColor.includes('blue') && "from-blue-100 to-blue-50",
                            iconColor.includes('green') && "from-green-100 to-green-50",
                            iconColor.includes('purple') && "from-purple-100 to-purple-50",
                            iconColor.includes('orange') && "from-orange-100 to-orange-50",
                            iconColor.includes('pink') && "from-pink-100 to-pink-50",
                            iconColor.includes('yellow') && "from-yellow-100 to-yellow-50",
                        )}>
                            <Icon className={cn("h-5 w-5", iconColor)} />
                        </div>
                    )}

                    <div>
                        <div className="flex items-center gap-2.5 flex-wrap">
                            {shortCode && (
                                <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-secondary-900 text-white text-xs font-bold font-mono">
                                    {shortCode}
                                </span>
                            )}
                            <h1 className="text-xl sm:text-2xl font-bold text-secondary-900">
                                {title}
                            </h1>
                            {badge && (
                                <span className={cn(
                                    "px-2 py-0.5 rounded-full text-xs font-medium",
                                    badgeVariants[badge.variant || 'default']
                                )}>
                                    {badge.label}
                                </span>
                            )}
                        </div>
                        {description && (
                            <p className="mt-1 text-sm text-secondary-500 max-w-xl">
                                {description}
                            </p>
                        )}
                    </div>
                </div>

                {actions && (
                    <div className="flex items-center gap-2 flex-shrink-0">
                        {actions}
                    </div>
                )}
            </div>
        </header>
    );
}

interface PageContainerProps {
    children: React.ReactNode;
    className?: string;
    fullWidth?: boolean;
}

export function PageContainer({
    children,
    className,
    fullWidth = false
}: PageContainerProps) {
    return (
        <div className={cn(
            "p-4 sm:p-5 lg:p-6",
            !fullWidth && "max-w-[1600px] mx-auto",
            className
        )}>
            {children}
        </div>
    );
}

interface ContentCardProps {
    children: React.ReactNode;
    className?: string;
    padding?: 'none' | 'sm' | 'md' | 'lg';
    hover?: boolean;
}

const paddingVariants = {
    none: '',
    sm: 'p-3 sm:p-4',
    md: 'p-4 sm:p-5',
    lg: 'p-5 sm:p-6',
};

export function ContentCard({
    children,
    className,
    padding = 'md',
    hover = false
}: ContentCardProps) {
    return (
        <div className={cn(
            "bg-white rounded-xl border border-secondary-200 shadow-sm",
            paddingVariants[padding],
            hover && "transition-all duration-200 hover:shadow-md hover:border-secondary-300",
            className
        )}>
            {children}
        </div>
    );
}

interface SectionTitleProps {
    title: string;
    description?: string;
    action?: React.ReactNode;
    className?: string;
}

export function SectionTitle({
    title,
    description,
    action,
    className
}: SectionTitleProps) {
    return (
        <div className={cn("flex items-center justify-between mb-3", className)}>
            <div>
                <h2 className="text-base font-semibold text-secondary-900">{title}</h2>
                {description && (
                    <p className="text-xs text-secondary-500 mt-0.5">{description}</p>
                )}
            </div>
            {action}
        </div>
    );
}

interface EmptyStateProps {
    icon: LucideIcon;
    title: string;
    description: string;
    action?: {
        label: string;
        onClick: () => void;
        icon?: LucideIcon;
    };
    className?: string;
}

export function EmptyState({
    icon: Icon,
    title,
    description,
    action,
    className
}: EmptyStateProps) {
    return (
        <div className={cn(
            "flex flex-col items-center justify-center py-12 px-4 text-center",
            className
        )}>
            <div className="p-3 rounded-xl bg-secondary-100 mb-4">
                <Icon className="h-8 w-8 text-secondary-400" />
            </div>
            <h3 className="text-lg font-semibold text-secondary-900 mb-1">{title}</h3>
            <p className="text-sm text-secondary-500 mb-5 max-w-sm">{description}</p>
            {action && (
                <Button onClick={action.onClick} size="sm" className="gap-2">
                    {action.icon && <action.icon className="h-4 w-4" />}
                    {action.label}
                </Button>
            )}
        </div>
    );
}

// Grid wrapper for consistent stat card sizing
interface StatsGridProps {
    children: React.ReactNode;
    columns?: 2 | 3 | 4;
    className?: string;
}

export function StatsGrid({
    children,
    columns = 4,
    className
}: StatsGridProps) {
    return (
        <div className={cn(
            "grid gap-3 sm:gap-4",
            columns === 2 && "grid-cols-1 sm:grid-cols-2",
            columns === 3 && "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3",
            columns === 4 && "grid-cols-2 lg:grid-cols-4",
            className
        )}>
            {children}
        </div>
    );
}

interface StatCardProps {
    label: string;
    value: string | number;
    change?: {
        value: number;
        isPositive: boolean;
    };
    icon?: LucideIcon;
    iconColor?: string;
    className?: string;
}

export function StatCard({
    label,
    value,
    change,
    icon: Icon,
    iconColor = "text-primary-500",
    className
}: StatCardProps) {
    return (
        <ContentCard className={cn("min-h-[88px]", className)} padding="sm">
            <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-secondary-500 truncate">{label}</p>
                    <div className="flex items-baseline gap-1.5 mt-1">
                        <p className="text-xl sm:text-2xl font-bold text-secondary-900 truncate">{value}</p>
                        {change && (
                            <span className={cn(
                                "text-xs font-medium px-1 py-0.5 rounded flex-shrink-0",
                                change.isPositive
                                    ? "text-green-700 bg-green-100"
                                    : "text-red-700 bg-red-100"
                            )}>
                                {change.isPositive ? '+' : ''}{change.value}%
                            </span>
                        )}
                    </div>
                </div>
                {Icon && (
                    <div className={cn(
                        "h-9 w-9 rounded-lg flex items-center justify-center flex-shrink-0",
                        iconColor.includes('primary') && "bg-primary-100",
                        iconColor.includes('blue') && "bg-blue-100",
                        iconColor.includes('green') && "bg-green-100",
                        iconColor.includes('purple') && "bg-purple-100",
                        iconColor.includes('orange') && "bg-orange-100",
                        iconColor.includes('pink') && "bg-pink-100",
                    )}>
                        <Icon className={cn("h-4 w-4", iconColor)} />
                    </div>
                )}
            </div>
        </ContentCard>
    );
}

interface FilterChipProps {
    label: string;
    isActive: boolean;
    onClick: () => void;
    icon?: LucideIcon;
    count?: number;
}

export function FilterChip({
    label,
    isActive,
    onClick,
    icon: Icon,
    count
}: FilterChipProps) {
    return (
        <button
            onClick={onClick}
            className={cn(
                "inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all",
                isActive
                    ? "bg-primary-100 text-primary-700 ring-1 ring-primary-500/30"
                    : "bg-secondary-100 text-secondary-600 hover:bg-secondary-200"
            )}
        >
            {Icon && <Icon className="h-3.5 w-3.5" />}
            {label}
            {count !== undefined && (
                <span className={cn(
                    "px-1 py-0.5 rounded text-[10px] leading-none",
                    isActive ? "bg-primary-200" : "bg-secondary-200"
                )}>
                    {count}
                </span>
            )}
        </button>
    );
}

// Card grid for consistent card sizing
interface CardGridProps {
    children: React.ReactNode;
    columns?: 1 | 2 | 3 | 4;
    className?: string;
}

export function CardGrid({
    children,
    columns = 3,
    className
}: CardGridProps) {
    return (
        <div className={cn(
            "grid gap-4",
            columns === 1 && "grid-cols-1",
            columns === 2 && "grid-cols-1 sm:grid-cols-2",
            columns === 3 && "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3",
            columns === 4 && "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4",
            className
        )}>
            {children}
        </div>
    );
}

// Divider component
interface DividerProps {
    className?: string;
    label?: string;
}

export function Divider({ className, label }: DividerProps) {
    if (label) {
        return (
            <div className={cn("flex items-center gap-3 my-4", className)}>
                <div className="flex-1 h-px bg-secondary-200" />
                <span className="text-xs font-medium text-secondary-400 uppercase tracking-wider">{label}</span>
                <div className="flex-1 h-px bg-secondary-200" />
            </div>
        );
    }
    return <div className={cn("h-px bg-secondary-200 my-4", className)} />;
}
