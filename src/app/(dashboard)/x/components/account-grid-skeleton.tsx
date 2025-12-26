"use client";

import { Skeleton } from "@/components/ui/skeleton";
import { Card } from "@/components/ui/card";

export function AccountCardSkeleton() {
    return (
        <Card className="p-6 space-y-4">
            {/* Platform badge */}
            <div className="flex justify-between items-start">
                <Skeleton className="h-6 w-6 rounded-full" />
                <Skeleton className="h-5 w-16 rounded-full" />
            </div>

            {/* Avatar and name */}
            <div className="flex items-center gap-4">
                <Skeleton className="h-20 w-20 rounded-full" />
                <div className="space-y-2 flex-1">
                    <Skeleton className="h-5 w-32" />
                    <Skeleton className="h-4 w-24" />
                </div>
            </div>

            {/* Metrics */}
            <div className="grid grid-cols-3 gap-4 pt-4">
                {[1, 2, 3].map((i) => (
                    <div key={i} className="space-y-2">
                        <Skeleton className="h-3 w-16" />
                        <Skeleton className="h-6 w-20" />
                    </div>
                ))}
            </div>

            {/* Button */}
            <Skeleton className="h-10 w-full rounded-md" />

            {/* Last synced */}
            <Skeleton className="h-3 w-32" />
        </Card>
    );
}

export function AccountGridSkeleton({ count = 6 }: { count?: number }) {
    return (
        <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 auto-rows-fr">
            {Array.from({ length: count }).map((_, i) => (
                <AccountCardSkeleton key={i} />
            ))}
        </div>
    );
}
