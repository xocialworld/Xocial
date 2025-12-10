import { Skeleton } from "@/components/ui/skeleton";
import { Sparkles } from "lucide-react";

export default function ComposerLoading() {
    return (
        <div className="p-4 sm:p-6 lg:p-8 max-w-screen-2xl mx-auto">
            {/* Header */}
            <div className="mb-6 lg:mb-8">
                <div className="flex items-start gap-4">
                    <div className="hidden sm:flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-purple-100 to-purple-50 shadow-sm">
                        <Sparkles className="h-6 w-6 text-purple-500" />
                    </div>
                    <div className="space-y-2">
                        <div className="flex items-center gap-3">
                            <Skeleton className="h-6 w-8 rounded-lg" />
                            <Skeleton className="h-8 w-32" />
                        </div>
                        <Skeleton className="h-4 w-64" />
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Left - Editor */}
                <div className="lg:col-span-2 space-y-6">
                    <div className="bg-white rounded-xl border border-secondary-200 shadow-sm p-6">
                        <Skeleton className="h-5 w-32 mb-4" />
                        <Skeleton className="h-48 w-full mb-4 rounded-lg" />
                        <div className="flex gap-2">
                            <Skeleton className="h-10 w-10 rounded-lg" />
                            <Skeleton className="h-10 w-10 rounded-lg" />
                            <Skeleton className="h-10 w-10 rounded-lg" />
                            <Skeleton className="h-10 flex-1 rounded-lg" />
                        </div>
                    </div>

                    <div className="bg-white rounded-xl border border-secondary-200 shadow-sm p-6">
                        <Skeleton className="h-5 w-24 mb-4" />
                        <div className="grid grid-cols-3 sm:grid-cols-4 gap-4">
                            {[1, 2, 3, 4].map((i) => (
                                <Skeleton
                                    key={i}
                                    className="aspect-square w-full rounded-xl"
                                    style={{ animationDelay: `${i * 100}ms` }}
                                />
                            ))}
                        </div>
                    </div>
                </div>

                {/* Right - Platform selector & preview */}
                <div className="space-y-6">
                    <div className="bg-white rounded-xl border border-secondary-200 shadow-sm p-6">
                        <Skeleton className="h-5 w-32 mb-4" />
                        <div className="flex flex-wrap gap-2">
                            {[1, 2, 3, 4, 5, 6].map((i) => (
                                <Skeleton
                                    key={i}
                                    className="h-10 w-24 rounded-lg"
                                    style={{ animationDelay: `${i * 50}ms` }}
                                />
                            ))}
                        </div>
                    </div>

                    <div className="bg-white rounded-xl border border-secondary-200 shadow-sm p-6">
                        <Skeleton className="h-5 w-20 mb-4" />
                        <div className="space-y-4">
                            <Skeleton className="h-12 w-full rounded-lg" />
                            <Skeleton className="h-64 w-full rounded-xl" />
                        </div>
                    </div>

                    <div className="flex gap-3">
                        <Skeleton className="h-12 flex-1 rounded-lg" />
                        <Skeleton className="h-12 w-32 rounded-lg" />
                    </div>
                </div>
            </div>

            {/* Loading overlay */}
            <div className="fixed inset-0 bg-white/50 backdrop-blur-sm flex items-center justify-center z-50 animate-in fade-in duration-300">
                <div className="flex flex-col items-center gap-4">
                    <div className="relative">
                        <div className="absolute inset-0 bg-purple-500/30 blur-xl rounded-full animate-pulse" />
                        <div className="relative h-16 w-16 bg-gradient-to-br from-purple-500 to-pink-500 rounded-2xl flex items-center justify-center shadow-lg shadow-purple-500/30 animate-bounce">
                            <Sparkles className="h-8 w-8 text-white" />
                        </div>
                    </div>
                    <div className="flex items-center gap-1">
                        <span className="text-lg font-semibold text-secondary-700">Loading Composer</span>
                        <span className="flex gap-0.5">
                            <span className="h-1.5 w-1.5 bg-purple-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                            <span className="h-1.5 w-1.5 bg-purple-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                            <span className="h-1.5 w-1.5 bg-purple-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                        </span>
                    </div>
                </div>
            </div>
        </div>
    );
}
