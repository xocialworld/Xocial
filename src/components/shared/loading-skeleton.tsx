/**
 * Loading Skeleton Component
 * Based on Xocial SRS Section 2.1.2
 */

import { cn } from '@/lib/utils';

interface LoadingSkeletonProps {
    className?: string;
    variant?: 'text' | 'circular' | 'rectangular';
    width?: string | number;
    height?: string | number;
    count?: number;
}

export function LoadingSkeleton({
    className,
    variant = 'rectangular',
    width,
    height,
    count = 1,
}: LoadingSkeletonProps) {
    const baseClasses = 'animate-pulse bg-gray-200 dark:bg-gray-700';

    const variantClasses = {
        text: 'h-4 rounded',
        circular: 'rounded-full',
        rectangular: 'rounded-md',
    };

    const style = {
        width: typeof width === 'number' ? `${width}px` : width,
        height: typeof height === 'number' ? `${height}px` : height,
    };

    if (count > 1) {
        return (
            <div className="space-y-2">
                {Array.from({ length: count }).map((_, index) => (
                    <div
                        key={index}
                        className={cn(baseClasses, variantClasses[variant], className)}
                        style={style}
                    />
                ))}
            </div>
        );
    }

    return (
        <div
            className={cn(baseClasses, variantClasses[variant], className)}
            style={style}
        />
    );
}

/**
 * Card Loading Skeleton
 */
export function CardSkeleton({ className }: { className?: string }) {
    return (
        <div className={cn('rounded-lg border border-gray-200 bg-white p-6', className)}>
            <div className="space-y-4">
                <LoadingSkeleton variant="circular" width={64} height={64} />
                <LoadingSkeleton variant="text" width="60%" />
                <LoadingSkeleton variant="text" width="40%" />
                <div className="grid grid-cols-3 gap-4 pt-4">
                    <LoadingSkeleton variant="rectangular" height={60} />
                    <LoadingSkeleton variant="rectangular" height={60} />
                    <LoadingSkeleton variant="rectangular" height={60} />
                </div>
            </div>
        </div>
    );
}

/**
 * Table Loading Skeleton
 */
export function TableSkeleton({ rows = 5 }: { rows?: number }) {
    return (
        <div className="space-y-3">
            {Array.from({ length: rows }).map((_, index) => (
                <div key={index} className="flex items-center gap-4">
                    <LoadingSkeleton variant="circular" width={40} height={40} />
                    <div className="flex-1 space-y-2">
                        <LoadingSkeleton variant="text" width="80%" />
                        <LoadingSkeleton variant="text" width="60%" />
                    </div>
                </div>
            ))}
        </div>
    );
}

/**
 * Post Card Loading Skeleton
 */
export function PostCardSkeleton() {
    return (
        <div className="rounded-lg border border-gray-200 bg-white overflow-hidden">
            <LoadingSkeleton variant="rectangular" height={200} className="rounded-none" />
            <div className="p-4 space-y-3">
                <LoadingSkeleton variant="text" count={2} />
                <div className="flex items-center gap-4 pt-2">
                    <LoadingSkeleton variant="text" width={60} />
                    <LoadingSkeleton variant="text" width={60} />
                    <LoadingSkeleton variant="text" width={60} />
                </div>
            </div>
        </div>
    );
}

/**
 * Account Card Loading Skeleton
 */
export function AccountCardSkeleton() {
    return (
        <div className="rounded-lg border border-gray-200 bg-white p-6">
            <div className="flex items-start gap-4">
                <LoadingSkeleton variant="circular" width={80} height={80} />
                <div className="flex-1 space-y-2">
                    <LoadingSkeleton variant="text" width="70%" />
                    <LoadingSkeleton variant="text" width="50%" />
                </div>
            </div>
            <div className="grid grid-cols-3 gap-4 mt-6">
                <div className="space-y-2">
                    <LoadingSkeleton variant="text" width="100%" />
                    <LoadingSkeleton variant="text" width="60%" />
                </div>
                <div className="space-y-2">
                    <LoadingSkeleton variant="text" width="100%" />
                    <LoadingSkeleton variant="text" width="60%" />
                </div>
                <div className="space-y-2">
                    <LoadingSkeleton variant="text" width="100%" />
                    <LoadingSkeleton variant="text" width="60%" />
                </div>
            </div>
        </div>
    );
}
