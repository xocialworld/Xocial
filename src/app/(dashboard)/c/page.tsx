"use client";

import { Suspense } from "react";
import { UnifiedPostComposer } from "@/components/features/create/unified-post-composer";
import {
    PageHeader,
    PageContainer
} from "@/components/shared/page-components";
import { Sparkles } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

function ComposerSkeleton() {
    return (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-6">
                <div className="bg-white rounded-xl border border-secondary-200 shadow-sm p-6">
                    <Skeleton className="h-5 w-32 mb-4" />
                    <Skeleton className="h-48 w-full mb-4 rounded-lg" />
                    <div className="flex gap-2">
                        <Skeleton className="h-10 flex-1 rounded-lg" />
                    </div>
                </div>
            </div>
            <div className="space-y-6">
                <div className="bg-white rounded-xl border border-secondary-200 shadow-sm p-6">
                    <Skeleton className="h-5 w-32 mb-4" />
                    <div className="flex flex-wrap gap-2">
                        {[1, 2, 3, 4, 5, 6].map((i) => (
                            <Skeleton key={i} className="h-10 w-24 rounded-lg" />
                        ))}
                    </div>
                </div>
                <div className="bg-white rounded-xl border border-secondary-200 shadow-sm p-6">
                    <Skeleton className="h-5 w-20 mb-4" />
                    <Skeleton className="h-64 w-full rounded-xl" />
                </div>
            </div>
        </div>
    );
}

export default function CreatePage() {
    return (
        <PageContainer>
            <PageHeader
                shortCode="C"
                title="Create"
                description="Compose and schedule posts across all your platforms"
                icon={Sparkles}
                iconColor="text-purple-500"
            />

            <Suspense fallback={<ComposerSkeleton />}>
                <UnifiedPostComposer />
            </Suspense>
        </PageContainer>
    );
}
