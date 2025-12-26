"use client";

import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, Filter, Plus, LayoutGrid, List, RefreshCw } from "lucide-react";
import { format } from "date-fns";
import { PlatformFilterBar } from "./platform-filter-bar";
import { cn } from "@/lib/utils";
import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/lib/react-query";
import { useAccounts } from "@/hooks/use-accounts";
import { toast } from "sonner";
import React from "react";
import { useSelectedWorkspace } from "@/store/workspaceStore";

interface CalendarTopBarProps {
    currentMonth: Date;
    onPrevMonth: () => void;
    onNextMonth: () => void;
    onToday: () => void;
    onNewPost: () => void;
    activeFiltersCount: number;
    onToggleFilters: () => void;
    isFiltersOpen: boolean;
    onToggleSidebar: () => void;
    isSidebarOpen: boolean;
}

export function CalendarTopBar({
    currentMonth,
    onPrevMonth,
    onNextMonth,
    onToday,
    onNewPost,
    onToggleFilters,
    isFiltersOpen,
    activeFiltersCount = 0,
    onToggleSidebar,
    isSidebarOpen,
}: CalendarTopBarProps) {
    const { accounts } = useAccounts();
    const [isSyncing, setIsSyncing] = React.useState(false);
    const queryClient = useQueryClient();
    const selectedWorkspace = useSelectedWorkspace();

    const handleSync = async () => {
        setIsSyncing(true);
        try {
            // If the local accounts hook yields nothing (common when workspace/account hydration is slow),
            // fall back to the API endpoint so we don't "sync 0" silently.
            let accountsToSync = accounts ?? [];

            if (accountsToSync.length === 0) {
                const params = new URLSearchParams();
                if (selectedWorkspace?.id) params.set('workspaceId', selectedWorkspace.id);
                params.set('status', 'active');
                const res = await fetch(`/api/accounts?${params.toString()}`, { method: 'GET' });
                const payload = await res.json().catch(() => null);
                accountsToSync = payload?.data?.accounts ?? [];
            }

            if (!accountsToSync || accountsToSync.length === 0) {
                toast.error('No connected accounts found', {
                    description: 'Connect Twitter/YouTube in Accounts (X) and make sure the correct workspace is selected.',
                });
                return;
            }

            const results = await Promise.allSettled(
                accountsToSync.map(async (acc: any) => {
                    // Client-side throttle for Twitter rate limits
                    if ((acc.platform || '').toLowerCase() === 'twitter') {
                        const key = `xocial_twitter_sync_block_until:${acc.id}`;
                        const blockedUntil = Number(localStorage.getItem(key) || '0');
                        if (blockedUntil && Date.now() < blockedUntil) {
                            const seconds = Math.ceil((blockedUntil - Date.now()) / 1000);
                            throw new Error(`Twitter is rate-limited for this account. Please wait ~${seconds}s and try again.`);
                        }
                    }

                    const res = await fetch(`/api/accounts/${acc.id}/sync-posts`, { method: 'POST' });
                    let body: any = null;
                    try {
                        body = await res.json();
                    } catch { }

                    if (!res.ok) {
                        // If server provided retryAfterSeconds, persist client throttle window
                        const retryAfterSeconds = body?.error?.details?.retryAfterSeconds;
                        if ((acc.platform || '').toLowerCase() === 'twitter' && retryAfterSeconds) {
                            const key = `xocial_twitter_sync_block_until:${acc.id}`;
                            localStorage.setItem(key, String(Date.now() + (Number(retryAfterSeconds) * 1000)));
                        }
                        const message = body?.error?.message || body?.message || `Sync failed for ${acc.platform}`;
                        throw new Error(message);
                    }

                    return {
                        accountId: acc.id,
                        platform: acc.platform,
                        count: body?.count ?? body?.synced ?? 0,
                        errors: body?.errors ?? 0,
                        details: body?.details ?? [],
                    };
                })
            );

            const successes = results.filter(r => r.status === 'fulfilled').map(r => (r as PromiseFulfilledResult<any>).value);
            const failures = results.filter(r => r.status === 'rejected').map(r => (r as PromiseRejectedResult).reason);

            const totalSynced = successes.reduce((sum, r) => sum + (r.count || 0), 0);
            const totalErrors = successes.reduce((sum, r) => sum + (r.errors || 0), 0) + failures.length;

            // Invalidate posts query to refresh calendar immediately
            queryClient.invalidateQueries({ queryKey: queryKeys.posts.all });

            if (failures.length > 0 || totalErrors > 0) {
                toast.error('Sync completed with errors', {
                    description: `Synced ${totalSynced} posts. Errors: ${totalErrors}. Open console for details.`,
                });
                console.error('[Calendar Sync] Failures:', failures);
                console.info('[Calendar Sync] Success results:', successes);
            } else {
                if (totalSynced === 0) {
                    toast.warning('No posts returned from connected platforms', {
                        description: 'Your accounts are connected, but the platform APIs returned 0 items. Open console for per-platform details.',
                    });
                    console.info('[Calendar Sync] 0 posts results:', successes);
                } else {
                    toast.success('Sync completed', { description: `Synced ${totalSynced} posts from connected platforms.` });
                }
            }
        } catch (error) {
            toast.error('Sync failed', { description: error instanceof Error ? error.message : 'Could not synchronize accounts' });
        } finally {
            // Keep spinning a bit longer for visual feedback or until real completion
            setTimeout(() => setIsSyncing(false), 2000);
        }
    };

    // Auto-sync once per session when opening the calendar, if accounts exist but have never been synced
    React.useEffect(() => {
        if (!accounts || accounts.length === 0) return;
        try {
            const key = 'xocial_calendar_autosync_v1';
            if (sessionStorage.getItem(key)) return;

            const needsSync = accounts.some(acc => !acc.last_synced_at);
            if (!needsSync) return;

            sessionStorage.setItem(key, '1');
            handleSync();
        } catch {
            // ignore
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [accounts]);

    return (
        <div className="flex items-center justify-between px-3 py-2 sm:px-6 sm:py-4 border-b border-secondary-200 bg-white/50 backdrop-blur-sm sticky top-0 z-20 gap-2">
            <div className="flex items-center gap-2 sm:gap-4 shrink-0">
                <Button
                    variant="ghost"
                    size="icon"
                    onClick={onToggleSidebar}
                    className={cn("h-8 w-8 sm:h-9 sm:w-9 text-secondary-500 hover:text-secondary-900", isSidebarOpen && "bg-secondary-100")}
                    title={isSidebarOpen ? "Collapse sidebar" : "Expand sidebar"}
                >
                    <LayoutGrid className="h-4 w-4 sm:h-5 sm:w-5" />
                </Button>

                {/* Date Navigation */}
                <div className="flex items-center bg-secondary-100/50 p-0.5 sm:p-1 rounded-lg border border-secondary-200">
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={onPrevMonth}
                        className="h-7 w-7 sm:h-7 sm:w-7 hover:bg-white hover:shadow-sm"
                    >
                        <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <div className="flex items-center gap-2 px-1 sm:px-2">
                        <span className="text-xs sm:text-sm font-semibold min-w-[80px] sm:min-w-[100px] text-center">
                            {format(currentMonth, "MMMM yyyy")}
                        </span>
                    </div>
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={onNextMonth}
                        className="h-7 w-7 sm:h-7 sm:w-7 hover:bg-white hover:shadow-sm"
                    >
                        <ChevronRight className="h-4 w-4" />
                    </Button>
                </div>

                <Button
                    variant="outline"
                    size="sm"
                    onClick={onToday}
                    className="h-8 sm:h-9 font-medium hidden md:flex"
                >
                    Today
                </Button>

                <Button
                    variant="ghost"
                    size="icon"
                    onClick={handleSync}
                    disabled={isSyncing}
                    className={cn("h-8 w-8 sm:h-9 sm:w-9", isSyncing && "opacity-70")}
                    title="Sync from platforms"
                >
                    <RefreshCw className={cn("h-3.5 w-3.5 sm:h-4 sm:w-4", isSyncing && "animate-spin")} />
                </Button>
            </div>

            <div className="flex items-center gap-1.5 sm:gap-3 shrink-1 overflow-x-auto no-scrollbar">
                {/* Platform Filters - hide on mobile if space constrained? Or simple scroll? */}
                <div className="hidden sm:block">
                    <PlatformFilterBar />
                </div>

                <div className="h-4 w-px bg-secondary-300 mx-1 hidden sm:block" />

                <Button
                    variant={isFiltersOpen ? "secondary" : "outline"}
                    size="sm"
                    onClick={onToggleFilters}
                    className={cn("h-8 sm:h-9 gap-2 px-2.5 sm:px-4", isFiltersOpen && "bg-secondary-100")}
                >
                    <Filter className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                    <span className="hidden lg:inline">Filters</span>
                    {activeFiltersCount > 0 && (
                        <span className="ml-1 px-1.5 py-0.5 text-[10px] sm:text-xs rounded-full bg-primary-100 text-primary-700">
                            {activeFiltersCount}
                        </span>
                    )}
                </Button>
                <Button onClick={onNewPost} size="sm" className="h-8 sm:h-9 gap-2 bg-primary-600 hover:bg-primary-700 text-white shadow-sm px-3 sm:px-4">
                    <Plus className="h-4 w-4" />
                    <span className="hidden lg:inline">Schedule</span>
                </Button>
            </div>
        </div>
    );
}

