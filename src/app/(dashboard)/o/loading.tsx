import { Skeleton } from "@/components/ui/skeleton";
import { Card } from "@/components/ui/card";

export default function CalendarLoading() {
    return (
        <div className="p-8">
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
                <div>
                    <Skeleton className="h-9 w-48 mb-2" />
                    <Skeleton className="h-5 w-64" />
                </div>
                <Skeleton className="h-10 w-32" />
            </div>

            {/* Calendar nav */}
            <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                    <Skeleton className="h-9 w-9" />
                    <Skeleton className="h-8 w-40" />
                    <Skeleton className="h-9 w-9" />
                </div>
                <div className="flex gap-2">
                    <Skeleton className="h-8 w-20" />
                    <Skeleton className="h-8 w-20" />
                </div>
            </div>

            {/* Calendar grid */}
            <Card className="p-4">
                {/* Week headers */}
                <div className="grid grid-cols-7 gap-2 mb-2">
                    {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((day, i) => (
                        <Skeleton key={i} className="h-6 w-full" />
                    ))}
                </div>

                {/* Calendar cells */}
                <div className="grid grid-cols-7 gap-2">
                    {Array.from({ length: 35 }).map((_, i) => (
                        <Skeleton key={i} className="h-24 w-full rounded-lg" />
                    ))}
                </div>
            </Card>
        </div>
    );
}
