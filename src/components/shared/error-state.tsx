/**
 * Error State Component
 * Based on Xocial SRS Section 3.1.7
 */

'use client';

import { AlertCircle, RefreshCw, Home } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface ErrorStateProps {
    title?: string;
    message?: string;
    hint?: string;
    onRetry?: () => void;
    onGoHome?: () => void;
    className?: string;
    variant?: 'default' | 'minimal';
}

export function ErrorState({
    title = 'Something went wrong',
    message = 'An unexpected error occurred',
    hint,
    onRetry,
    onGoHome,
    className,
    variant = 'default',
}: ErrorStateProps) {
    if (variant === 'minimal') {
        return (
            <div className={cn('flex items-center gap-2 text-sm text-red-600', className)}>
                <AlertCircle className="h-4 w-4" />
                <span>{message}</span>
                {onRetry && (
                    <button
                        onClick={onRetry}
                        className="text-primary-600 hover:text-primary-700 underline"
                    >
                        Retry
                    </button>
                )}
            </div>
        );
    }

    return (
        <div className={cn('flex flex-col items-center justify-center p-8 text-center', className)}>
            <div className="rounded-full bg-red-50 p-4 mb-4">
                <AlertCircle className="h-12 w-12 text-red-600" />
            </div>

            <h3 className="text-lg font-semibold text-gray-900 mb-2">{title}</h3>

            <p className="text-gray-600 mb-1 max-w-md">{message}</p>

            {hint && (
                <p className="text-sm text-gray-500 mb-6 max-w-md">{hint}</p>
            )}

            <div className="flex items-center gap-3">
                {onRetry && (
                    <Button onClick={onRetry} variant="default">
                        <RefreshCw className="mr-2 h-4 w-4" />
                        Try Again
                    </Button>
                )}

                {onGoHome && (
                    <Button onClick={onGoHome} variant="outline">
                        <Home className="mr-2 h-4 w-4" />
                        Go Home
                    </Button>
                )}
            </div>
        </div>
    );
}

/**
 * Inline Error Message
 */
export function InlineError({
    message,
    className,
}: {
    message: string;
    className?: string;
}) {
    return (
        <div className={cn('flex items-start gap-2 rounded-md bg-red-50 p-3 text-sm text-red-800', className)}>
            <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
            <p>{message}</p>
        </div>
    );
}

/**
 * Field Error (for forms)
 */
export function FieldError({
    message,
    className,
}: {
    message?: string;
    className?: string;
}) {
    if (!message) return null;

    return (
        <p className={cn('text-sm text-red-600 mt-1', className)}>
            {message}
        </p>
    );
}
