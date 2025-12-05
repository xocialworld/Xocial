import { Skeleton } from "@/components/ui/skeleton";

export default function DashboardLoading() {
  return (
    <div className="flex h-screen overflow-hidden">
      {/* Sidebar Skeleton */}
      <div className="flex h-screen w-64 flex-col bg-secondary-900 text-white">
        <div className="flex h-16 items-center px-6 border-b border-secondary-800">
          <Skeleton className="h-8 w-24 bg-secondary-800" />
        </div>
        <div className="flex-1 space-y-1 px-3 py-4">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="flex items-center gap-3 rounded-lg px-3 py-2">
              <Skeleton className="h-5 w-5 bg-secondary-800" />
              <Skeleton className="h-4 w-32 bg-secondary-800" />
            </div>
          ))}
        </div>
        <div className="border-t border-secondary-800 p-4">
          <Skeleton className="h-10 w-full bg-secondary-800 rounded-lg" />
        </div>
      </div>

      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header Skeleton */}
        <div className="flex h-16 items-center justify-between px-6 border-b border-secondary-200 bg-white">
          <div className="flex flex-1 items-center gap-4">
            <Skeleton className="h-9 w-48" />
            <Skeleton className="h-9 w-full max-w-md" />
          </div>
          <div className="flex items-center gap-3">
            <Skeleton className="h-9 w-9 rounded-lg" />
            <Skeleton className="h-9 w-9 rounded-lg" />
            <div className="flex items-center gap-3">
              <Skeleton className="h-8 w-8 rounded-full" />
              <div className="hidden md:block space-y-1">
                <Skeleton className="h-3 w-24" />
                <Skeleton className="h-2 w-32" />
              </div>
            </div>
          </div>
        </div>

        {/* Main Content Skeleton */}
        <main className="flex-1 overflow-y-auto bg-secondary-50 p-6">
          <div className="mx-auto max-w-7xl space-y-6">
            <div className="flex items-center justify-between">
              <Skeleton className="h-8 w-48" />
              <div className="flex gap-2">
                <Skeleton className="h-9 w-24" />
                <Skeleton className="h-9 w-24" />
              </div>
            </div>
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {[...Array(6)].map((_, i) => (
                <Skeleton key={i} className="h-48 w-full rounded-xl" />
              ))}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
