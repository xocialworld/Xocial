import { Skeleton } from "@/components/ui/skeleton";
import { Sparkles } from "lucide-react";

export default function DashboardLoading() {
  return (
    <div className="flex h-screen overflow-hidden bg-gradient-to-br from-secondary-50 via-white to-secondary-50/50">
      {/* Sidebar Skeleton */}
      <div className="hidden lg:flex h-screen w-72 flex-col bg-gradient-to-b from-secondary-900 via-secondary-900 to-secondary-950 border-r border-white/5">
        <div className="flex h-16 items-center gap-2.5 px-5 border-b border-white/10">
          <div className="relative">
            <div className="absolute inset-0 bg-primary-400/20 blur-lg rounded-full" />
            <Sparkles className="h-8 w-8 text-primary-400 relative z-10 animate-pulse" />
          </div>
          <span className="text-xl font-bold bg-gradient-to-r from-primary-300 via-primary-400 to-primary-300 bg-clip-text text-transparent">
            Xocial
          </span>
        </div>
        <div className="flex-1 space-y-2 px-3 py-4">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="flex items-center gap-3 rounded-xl px-3 py-3">
              <Skeleton className="h-9 w-9 rounded-lg bg-white/5" />
              <div className="space-y-2 flex-1">
                <Skeleton className="h-4 w-24 bg-white/5" />
                <Skeleton className="h-3 w-32 bg-white/5" />
              </div>
            </div>
          ))}
        </div>
        <div className="border-t border-white/10 p-4 space-y-2">
          <Skeleton className="h-10 w-full bg-white/5 rounded-xl" />
          <Skeleton className="h-10 w-full bg-white/5 rounded-xl" />
        </div>
      </div>

      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header Skeleton */}
        <div className="flex h-16 items-center justify-between px-4 lg:px-6 border-b border-secondary-200/80 bg-white/80 backdrop-blur-xl">
          <div className="flex flex-1 items-center gap-4">
            <Skeleton className="h-9 w-36 rounded-xl" />
            <div className="hidden sm:block h-6 w-px bg-secondary-200" />
            <Skeleton className="h-10 w-full max-w-md rounded-xl" />
          </div>
          <div className="flex items-center gap-2">
            <Skeleton className="h-9 w-9 rounded-lg" />
            <Skeleton className="h-9 w-9 rounded-lg" />
            <Skeleton className="h-9 w-9 rounded-lg" />
            <div className="flex items-center gap-3 ml-2">
              <Skeleton className="h-8 w-8 rounded-full" />
              <div className="hidden md:block space-y-1.5">
                <Skeleton className="h-3 w-20" />
                <Skeleton className="h-2.5 w-28" />
              </div>
            </div>
          </div>
        </div>

        {/* Main Content Loading State */}
        <main className="flex-1 overflow-y-auto">
          <div className="p-4 sm:p-6 lg:p-8 max-w-screen-2xl mx-auto">
            {/* Page Header Skeleton */}
            <div className="mb-6 lg:mb-8">
              <div className="flex items-start gap-4">
                <Skeleton className="hidden sm:block h-12 w-12 rounded-xl" />
                <div className="space-y-2">
                  <div className="flex items-center gap-3">
                    <Skeleton className="h-6 w-8 rounded-lg" />
                    <Skeleton className="h-8 w-48" />
                  </div>
                  <Skeleton className="h-4 w-64" />
                </div>
              </div>
            </div>

            {/* Content Cards Grid Skeleton */}
            <div className="bg-white rounded-xl border border-secondary-200 shadow-sm p-6 mb-6">
              <div className="flex flex-wrap gap-4 items-end">
                <div className="space-y-2">
                  <Skeleton className="h-4 w-20" />
                  <Skeleton className="h-10 w-40 rounded-lg" />
                </div>
                <div className="space-y-2">
                  <Skeleton className="h-4 w-16" />
                  <Skeleton className="h-10 w-32 rounded-lg" />
                </div>
                <div className="ml-auto flex items-center gap-4">
                  <Skeleton className="h-4 w-16" />
                  <Skeleton className="h-4 w-16" />
                </div>
              </div>
            </div>

            <div className="grid gap-4 sm:gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
              {[...Array(6)].map((_, i) => (
                <div
                  key={i}
                  className="bg-white rounded-xl border border-secondary-200 shadow-sm p-6 space-y-4 animate-pulse"
                  style={{ animationDelay: `${i * 100}ms` }}
                >
                  <div className="flex items-center gap-3">
                    <Skeleton className="h-12 w-12 rounded-full" />
                    <div className="space-y-2 flex-1">
                      <Skeleton className="h-4 w-32" />
                      <Skeleton className="h-3 w-24" />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <Skeleton className="h-3 w-16" />
                      <Skeleton className="h-3 w-12" />
                    </div>
                    <Skeleton className="h-2 w-full rounded-full" />
                  </div>
                  <Skeleton className="h-9 w-full rounded-lg" />
                </div>
              ))}
            </div>
          </div>
        </main>
      </div>

      {/* Loading overlay with logo animation */}
      <div className="fixed inset-0 bg-white/60 backdrop-blur-sm flex items-center justify-center z-50 animate-in fade-in duration-300">
        <div className="flex flex-col items-center gap-4">
          <div className="relative">
            <div className="absolute inset-0 bg-primary-500/30 blur-xl rounded-full animate-pulse" />
            <div className="relative h-16 w-16 bg-gradient-to-br from-primary-500 to-primary-600 rounded-2xl flex items-center justify-center shadow-lg shadow-primary-500/30 animate-bounce">
              <Sparkles className="h-8 w-8 text-white" />
            </div>
          </div>
          <div className="flex items-center gap-1">
            <span className="text-lg font-semibold text-secondary-700">Loading</span>
            <span className="flex gap-0.5">
              <span className="h-1.5 w-1.5 bg-primary-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
              <span className="h-1.5 w-1.5 bg-primary-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
              <span className="h-1.5 w-1.5 bg-primary-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
