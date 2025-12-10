import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader } from "@/components/ui/card";

export default function AnalyticsLoading() {
    return (
        <div className="p-8">
            {/* Header */}
            <div className="mb-6">
                <Skeleton className="h-9 w-48 mb-2" />
                <Skeleton className="h-5 w-96" />
            </div>

            {/* Date range and controls */}
            <div className="flex items-center justify-between mb-6">
                <Skeleton className="h-10 w-64" />
                <Skeleton className="h-10 w-32" />
            </div>

            {/* Metric cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                {[1, 2, 3, 4].map((i) => (
                    <Card key={i}>
                        <CardHeader className="pb-2">
                            <Skeleton className="h-4 w-24" />
                        </CardHeader>
                        <CardContent>
                            <Skeleton className="h-8 w-20 mb-2" />
                            <Skeleton className="h-4 w-16" />
                        </CardContent>
                    </Card>
                ))}
            </div>

            {/* Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
                <Card>
                    <CardHeader>
                        <Skeleton className="h-5 w-32" />
                    </CardHeader>
                    <CardContent>
                        <Skeleton className="h-64 w-full" />
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader>
                        <Skeleton className="h-5 w-32" />
                    </CardHeader>
                    <CardContent>
                        <Skeleton className="h-64 w-full" />
                    </CardContent>
                </Card>
            </div>

            {/* Table */}
            <Card>
                <CardHeader>
                    <Skeleton className="h-5 w-32" />
                </CardHeader>
                <CardContent>
                    <div className="space-y-3">
                        {[1, 2, 3, 4, 5].map((i) => (
                            <Skeleton key={i} className="h-12 w-full" />
                        ))}
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
