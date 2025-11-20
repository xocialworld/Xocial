/**
 * Empty State Component
 * Based on Xocial SRS Section 3.1.7
 */

'use client';

import { LucideIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface EmptyStateProps {
    icon?: LucideIcon;
    title: string;
    description?: string;
    action?: {
        label: string;
        onClick: () => void;
    };
    className?: string;
}

export function EmptyState({
    icon: Icon,
    title,
    description,
    action,
    className,
}: EmptyStateProps) {
    return (
        <div className={cn('flex flex-col items-center justify-center p-12 text-center', className)}>
            {Icon && (
                <div className="rounded-full bg-gray-100 p-4 mb-4">
                    <Icon className="h-12 w-12 text-gray-400" />
                </div>
            )}

            <h3 className="text-lg font-semibold text-gray-900 mb-2">{title}</h3>

            {description && (
                <p className="text-gray-600 mb-6 max-w-md">{description}</p>
            )}

            {action && (
                <Button onClick={action.onClick}>
                    {action.label}
                </Button>
            )}
        </div>
    );
}

/**
 * Empty State with Illustration
 */
export function EmptyStateWithIllustration({
    illustration,
    title,
    description,
    action,
    className,
}: {
    illustration: React.ReactNode;
    title: string;
    description?: string;
    action?: {
        label: string;
        onClick: () => void;
    };
    className?: string;
}) {
    return (
        <div className={cn('flex flex-col items-center justify-center p-12 text-center', className)}>
            <div className="mb-6">{illustration}</div>

            <h3 className="text-lg font-semibold text-gray-900 mb-2">{title}</h3>

            {description && (
                <p className="text-gray-600 mb-6 max-w-md">{description}</p>
            )}

            {action && (
                <Button onClick={action.onClick}>
                    {action.label}
                </Button>
            )}
        </div>
    );
}

/**
 * Dashed Border Empty State (for drag-drop areas)
 */
export function DashedEmptyState({
    icon: Icon,
    title,
    description,
    action,
    className,
}: EmptyStateProps) {
    return (
        <div
            className={cn(
                'flex flex-col items-center justify-center p-12 text-center',
                'rounded-lg border-2 border-dashed border-gray-300',
                'hover:border-gray-400 transition-colors',
                className
            )}
        >
            {Icon && (
                <Icon className="h-12 w-12 text-gray-400 mb-4" />
            )}

            <h3 className="text-base font-medium text-gray-900 mb-1">{title}</h3>

            {description && (
                <p className="text-sm text-gray-600 mb-4">{description}</p>
            )}

            {action && (
                <Button onClick={action.onClick} variant="outline">
                    {action.label}
                </Button>
            )}
        </div>
    );
}
