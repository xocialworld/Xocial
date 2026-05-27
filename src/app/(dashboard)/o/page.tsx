"use client";

import { Button } from "@/components/ui/button";
import { CalendarGrid } from "./components/calendar-grid";
import { CalendarTopBar } from "./components/calendar-top-bar";
import { DayPostsPanel } from "./components/day-posts-panel";
import { RescheduleModal } from "./components/reschedule-modal";
import { EditPostModal } from "./components/edit-post-modal";
import { GridView } from "./components/grid-view";
import { WeekView } from "./components/week-view";
import { CalendarAIPanel } from "./components/calendar-ai-panel";
import { useRouter, useSearchParams } from "next/navigation";
import { useState, useEffect, useCallback, useRef, Suspense } from "react";
import { useCalendarLogic } from "@/hooks/use-calendar-logic";
import { useCalendarActions } from "@/hooks/use-calendar-actions";
import { useLazySync } from "@/hooks/use-lazy-sync";
import { Spinner } from "@/components/ui/spinner";
import { ErrorBoundary } from "@/components/shared/error-boundary";
import { ErrorState } from "@/components/shared/error-state";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import {
  PageContainer,
  ContentCard,
} from "@/components/shared/page-components";
import { statusOptions } from "@/store/calendarFiltersStore";
import { Calendar, Grid3X3, RefreshCw, Loader2, CalendarDays, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

type ViewMode = 'month' | 'week' | 'grid';

const statusColors: Record<string, { bg: string; text: string }> = {
  draft: { bg: 'bg-secondary-100', text: 'text-secondary-700' },
  pending_approval: { bg: 'bg-yellow-100', text: 'text-yellow-700' },
  approved: { bg: 'bg-emerald-100', text: 'text-emerald-700' },
  scheduled: { bg: 'bg-blue-100', text: 'text-blue-700' },
  published: { bg: 'bg-green-100', text: 'text-green-700' },
  partial: { bg: 'bg-orange-100', text: 'text-orange-700' },
  failed: { bg: 'bg-red-100', text: 'text-red-700' },
  rejected: { bg: 'bg-red-100', text: 'text-red-700' },
};

function toDateParam(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function toTimeParam(date: Date) {
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  return `${hours}:${minutes}`;
}

function OPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const noop = useCallback(() => { }, []);
  const initialUrlProcessed = useRef(false);

  // View mode state (month, week, or grid)
  const [viewMode, setViewMode] = useState<ViewMode>('month');
  const [gridPlatform, setGridPlatform] = useState<string>('instagram');
  const [aiPanelOpen, setAiPanelOpen] = useState(false);

  // Custom hooks to manage logic
  const {
    selectedDate,
    setSelectedDate,
    currentMonth,
    setCurrentMonth,
    posts,
    filteredPosts,
    selectedDatePosts,
    loading,
    error,
    refetch,
    showFilters,
    setShowFilters,
    statusFilters,
    toggleStatus,
    reset,
    noWorkspace,
    workspaceId,
  } = useCalendarLogic();

  // Lazy sync hook for on-demand month-based syncing
  const { syncMonthRange, isSyncing, syncStatus } = useLazySync();

  // Trigger lazy sync when month changes
  useEffect(() => {
    if (currentMonth) {
      syncMonthRange(currentMonth);
    }
  }, [currentMonth, syncMonthRange]);

  // Handle URL deep linking: /o?date=2025-12-15
  useEffect(() => {
    if (initialUrlProcessed.current) return;

    const dateParam = searchParams.get('date');
    if (dateParam) {
      try {
        const parsedDate = new Date(dateParam);
        if (!isNaN(parsedDate.getTime())) {
          setSelectedDate(parsedDate);
          setCurrentMonth(parsedDate);
          initialUrlProcessed.current = true;
        }
      } catch (e) {
        console.warn('[Calendar] Invalid date param:', dateParam);
      }
    }
  }, [searchParams, setSelectedDate, setCurrentMonth]);

  // Update URL when date changes (for shareability)
  useEffect(() => {
    if (!selectedDate) {
      // Remove date from URL if no date selected
      const url = new URL(window.location.href);
      if (url.searchParams.has('date')) {
        url.searchParams.delete('date');
        router.replace(url.pathname + url.search, { scroll: false });
      }
    } else {
      // Add date to URL
      const dateStr = selectedDate.toISOString().split('T')[0]; // YYYY-MM-DD
      const url = new URL(window.location.href);
      if (url.searchParams.get('date') !== dateStr) {
        url.searchParams.set('date', dateStr);
        router.replace(url.pathname + url.search, { scroll: false });
      }
    }
  }, [selectedDate, router]);

  const {
    handleReschedule,
    handleRescheduleSubmit,
    handlePostDrop,
    handleDeletePost,
    handleApprovePost,
    handleRejectPost,
    reschedulePost,
    setReschedulePost,
    editingPost,
    setEditingPost,
    updatePostAsync,
    updateStatus
  } = useCalendarActions(posts);

  useEffect(() => {
    const timeoutId = setTimeout(() => refetch(), 75);
    const handleVisibilityChange = () => {
      if (globalThis.document?.visibilityState === 'visible') {
        refetch();
      }
    };
    const handleFocus = () => refetch();

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('focus', handleFocus);

    return () => {
      clearTimeout(timeoutId);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', handleFocus);
    };
  }, [refetch]);

  // Only show full-page spinner on first load with no cached data
  const isInitialLoading = loading && posts.length === 0;

  // Handle case where no workspace is selected
  if (noWorkspace) {
    return (
      <PageContainer>
        <ContentCard className="text-center py-12">
          <div className="max-w-md mx-auto">
            <Calendar className="h-16 w-16 mx-auto text-secondary-400 mb-4" />
            <h2 className="text-xl font-semibold text-secondary-900 mb-2">
              No Workspace Selected
            </h2>
            <p className="text-secondary-600 mb-6">
              Please select a workspace from the sidebar to view your content calendar.
            </p>
            <Button onClick={() => router.push('/settings/workspace/create?next=/o')}>
              Create Your First Workspace
            </Button>
          </div>
        </ContentCard>
      </PageContainer>
    );
  }

  if (error) {
    return (
      <PageContainer>
        <ContentCard>
          <ErrorState
            title="Failed to load calendar"
            message={error instanceof Error ? error.message : "Could not load posts"}
            onRetry={refetch}
          />
        </ContentCard>
      </PageContainer>
    );
  }

  return (
    <ErrorBoundary>
      <div className="flex flex-col h-[calc(100dvh-4rem)] min-h-0 bg-secondary-50/50">
        {/* Top Navigation Bar */}
        <CalendarTopBar
          currentMonth={currentMonth}
          onPrevMonth={() => setCurrentMonth((prev) => new Date(prev.getFullYear(), prev.getMonth() - 1))}
          onNextMonth={() => setCurrentMonth((prev) => new Date(prev.getFullYear(), prev.getMonth() + 1))}
          onToday={() => {
            setCurrentMonth(new Date());
            setSelectedDate(new Date());
          }}
          onNewPost={() => {
            const date = selectedDate ?? new Date();
            const prefillDate = new Date(date);
            prefillDate.setHours(10, 0, 0, 0);
            router.push(`/c?date=${toDateParam(prefillDate)}&time=${toTimeParam(prefillDate)}`);
          }}
          activeFiltersCount={statusFilters.length}
          onToggleFilters={() => setShowFilters(!showFilters)}
          isFiltersOpen={showFilters}
          onToggleSidebar={noop}
          isSidebarOpen={false}
        />

        {/* Filters Panel (Collapsible) */}
        {showFilters && (
          <div className="border-b border-secondary-200 bg-white p-4 animate-in slide-in-from-top-2 z-10 shadow-sm relative">
            <div className="max-w-7xl mx-auto flex flex-wrap gap-6">
              {/* Statuses Only - Platforms are in top bar now */}
              <div>
                <p className="text-xs font-semibold text-secondary-500 uppercase tracking-wider mb-2">Statuses</p>
                <div className="flex flex-wrap gap-2">
                  {statusOptions.map((status) => {
                    const selected = statusFilters.includes(status);
                    const colors = statusColors[status] || statusColors.draft;
                    return (
                      <button
                        key={status}
                        onClick={() => toggleStatus(status)}
                        className={`
                          px-3 py-1.5 rounded-full text-xs font-medium transition-all capitalize border
                          ${selected
                            ? `${colors.bg} ${colors.text} border-transparent ring-1 ring-inset ring-black/5`
                            : 'bg-white text-secondary-600 border-secondary-200 hover:bg-secondary-50'
                          }
                        `}
                      >
                        {status.replace(/_/g, ' ')}
                      </button>
                    );
                  })}
                </div>
              </div>

              {(statusFilters.length > 0) && (
                <div className="flex items-end">
                  <Button variant="link" size="sm" onClick={reset} className="text-secondary-500 h-auto p-0 hover:text-secondary-900">
                    Reset filters
                  </Button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* View Mode Toggle Bar */}
        <div className="flex items-center justify-between px-4 py-2 bg-white border-b border-secondary-200">
          <div className="flex items-center gap-2">
            {/* View mode toggle */}
            <div className="flex items-center gap-0.5 bg-secondary-100 rounded-lg p-0.5">
              <button
                onClick={() => setViewMode('month')}
                className={cn(
                  "flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors",
                  viewMode === 'month'
                    ? "bg-white text-secondary-900 shadow-sm"
                    : "text-secondary-600 hover:text-secondary-900"
                )}
              >
                <Calendar className="h-4 w-4" />
                Month
              </button>
              <button
                onClick={() => setViewMode('week')}
                className={cn(
                  "flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors",
                  viewMode === 'week'
                    ? "bg-white text-secondary-900 shadow-sm"
                    : "text-secondary-600 hover:text-secondary-900"
                )}
              >
                <CalendarDays className="h-4 w-4" />
                Week
              </button>
              <button
                onClick={() => setViewMode('grid')}
                className={cn(
                  "flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors",
                  viewMode === 'grid'
                    ? "bg-white text-secondary-900 shadow-sm"
                    : "text-secondary-600 hover:text-secondary-900"
                )}
              >
                <Grid3X3 className="h-4 w-4" />
                Grid
              </button>
            </div>

            {/* Sync indicator */}
            {isSyncing && (
              <div className="flex items-center gap-1.5 text-xs text-secondary-500 ml-3">
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                Syncing posts...
              </div>
            )}
          </div>

          <div className="flex items-center gap-2">
            {/* Manual sync button */}
            <Button
              variant="outline"
              size="sm"
              onClick={() => setAiPanelOpen(true)}
              className="text-secondary-600 hover:text-secondary-900"
            >
              <Sparkles className="h-4 w-4 mr-1.5" />
              AI Plan
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => syncMonthRange(currentMonth)}
              disabled={isSyncing}
              className="text-secondary-600 hover:text-secondary-900"
            >
              <RefreshCw className={cn("h-4 w-4 mr-1.5", isSyncing && "animate-spin")} />
              Sync
            </Button>
          </div>
        </div>

        <div className="flex-1 overflow-hidden p-1 sm:p-4">
          {viewMode === 'month' && (
            <CalendarGrid
              posts={filteredPosts}
              selectedDate={selectedDate}
              onDateSelect={setSelectedDate}
              onPostClick={(post) => setEditingPost(post)}
              onPostDrop={handlePostDrop}
              currentMonth={currentMonth}
              onMonthChange={setCurrentMonth}
              isLoading={isInitialLoading}
            />
          )}
          {viewMode === 'week' && (
            <WeekView
              posts={filteredPosts}
              currentDate={currentMonth}
              onDateChange={setCurrentMonth}
              onPostClick={(post) => setEditingPost(post)}
              onNewPost={(date, hour) => {
                const prefillDate = new Date(date);
                prefillDate.setHours(hour, 0, 0, 0);
                router.push(`/c?date=${toDateParam(prefillDate)}&time=${toTimeParam(prefillDate)}`);
              }}
            />
          )}
          {viewMode === 'grid' && (
            <GridView
              posts={filteredPosts}
              onPostClick={(post) => setEditingPost(post)}
              selectedPlatform={gridPlatform}
              onPlatformChange={setGridPlatform}
            />
          )}
        </div>

        {/* Day Posts Panel */}
        {/* Day Posts Sidebar / Sheet */}
        <Sheet open={!!selectedDate} onOpenChange={(open) => !open && setSelectedDate(null)}>
          <SheetContent side="right" className="w-full sm:w-[400px] p-0 border-l border-secondary-200 shadow-2xl">
            {selectedDate && (
              <DayPostsPanel
                date={selectedDate}
                posts={selectedDatePosts}
                onClose={() => setSelectedDate(null)}
                onEditPost={(post) => {
                  // Close sheet if needed or keep open depending on Edit Modal behavior?
                  // Usually Edit Modal is top level, so it's fine.
                  setEditingPost(post);
                }}
                onDeletePost={handleDeletePost}
                onReschedulePost={handleReschedule}
                onApprovePost={handleApprovePost}
                onRejectPost={handleRejectPost}
              />
            )}
          </SheetContent>
        </Sheet>

        {/* Modals */}
        {reschedulePost && (
          <RescheduleModal
            open={!!reschedulePost}
            onOpenChange={(open) => !open && setReschedulePost(null)}
            currentDate={reschedulePost.date}
            onReschedule={handleRescheduleSubmit}
          />
        )}

        <EditPostModal
          post={editingPost}
          isOpen={!!editingPost}
          onClose={() => setEditingPost(null)}
          onSave={async (postId, updates) => {
            await updatePostAsync(postId, updates);
            setEditingPost(null);
          }}
          onUpdateStatus={async (postId, status) => {
            await updateStatus({ id: postId, status });
            setEditingPost(null);
          }}
        />

        <CalendarAIPanel
          open={aiPanelOpen}
          onOpenChange={setAiPanelOpen}
          workspaceId={workspaceId}
          currentMonth={currentMonth}
          onDraftCreated={refetch}
        />
      </div>
    </ErrorBoundary>
  );
}

/**
 * Calendar page with deep linking support
 * URL params:
 * - date: YYYY-MM-DD - Opens the calendar to this date and selects it
 * 
 * Examples:
 * - /o - Calendar at current month
 * - /o?date=2025-12-15 - Calendar showing December 2025 with Dec 15 selected
 */
export default function CalendarPage() {
  return (
    <Suspense fallback={
      <PageContainer>
        <div className="flex h-[60vh] items-center justify-center">
          <Spinner />
        </div>
      </PageContainer>
    }>
      <OPage />
    </Suspense>
  );
}
