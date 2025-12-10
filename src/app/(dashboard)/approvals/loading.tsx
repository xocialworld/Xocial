import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader } from "@/components/ui/card";

export default function ApprovalsLoading() {
    return (
        <div className="p-8">
            <div className="mb-6">
                <Skeleton className="h-9 w-48 mb-2" />
                <Skeleton className="h-5 w-96" />
            </div>

            <div className="grid gap-4">
                {[1, 2, 3].map((i) => (
                    <Card key={i}>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <Skeleton className="h-4 w-48" />
                            <div className="flex gap-2">
                                <Skeleton className="h-8 w-20" />
                                <Skeleton className="h-8 w-20" />
                            </div>
                        </CardHeader>
                        <CardContent>
                            <Skeleton className="h-6 w-full mb-2" />
                            <Skeleton className="h-4 w-32" />
                        </CardContent>
                    </Card>
                ))}
            </div>
        </div>
    );
}
