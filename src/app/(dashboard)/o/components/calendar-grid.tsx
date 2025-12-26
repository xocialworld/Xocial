import {
  format,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  isSameMonth,
  isSameDay,
  isToday,
  startOfMonth,
  endOfMonth,
} from "date-fns";
import { cn } from "@/lib/utils";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CalendarPostCard } from "./calendar-post-card";
import { Skeleton } from "@/components/ui/skeleton";

// Calendar post type - flexible to handle both Post and CalendarEntry shapes
type CalendarPost = {
  id: string;
  status: string;
  platforms?: string[];
  scheduled_at?: string;
  published_at?: string;
  created_at?: string;
  _calendarDate?: string;
  [key: string]: unknown;
};

interface CalendarGridProps {
  posts: CalendarPost[];
  selectedDate: Date | null;
  onDateSelect: (date: Date) => void;
  onPostClick: (post: CalendarPost) => void;
  onPostDrop: (postId: string, date: Date) => void;
  currentMonth: Date;
  onMonthChange: (date: Date) => void;
  isLoading?: boolean;
}

/**
 * Skeleton loader for calendar cells during initial load
 */
function CalendarGridSkeleton({ currentMonth }: { currentMonth: Date }) {
  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(monthStart);
  const startDate = startOfWeek(monthStart);
  const endDate = endOfWeek(monthEnd);
  
  const days = eachDayOfInterval({ start: startDate, end: endDate });
  const weeks = days.length / 7;
  const weekDays = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  return (
    <div className="flex flex-col h-full bg-white rounded-xl shadow-sm border border-secondary-200 overflow-hidden select-none animate-pulse">
      {/* Weekday Headers */}
      <div className="grid grid-cols-7 border-b border-secondary-200 bg-secondary-50 z-10 shrink-0">
        {weekDays.map((day) => (
          <div
            key={day}
            className="py-2 text-center text-[10px] sm:text-xs font-semibold uppercase tracking-wider text-secondary-500"
          >
            {day}
          </div>
        ))}
      </div>

      {/* Skeleton Grid */}
      <div
        className="grid grid-cols-7 flex-1 bg-secondary-200 gap-px border-secondary-200 min-h-0"
        style={{ gridTemplateRows: `repeat(${weeks}, minmax(0, 1fr))` }}
      >
        {days.map((day, index) => {
          const isCurrentMonth = isSameMonth(day, monthStart);
          const showSkeletonPosts = isCurrentMonth && (index % 5 === 0 || index % 7 === 2);

          return (
            <div
              key={day.toString()}
              className={cn(
                "min-h-0 p-1 flex flex-col gap-0.5",
                isCurrentMonth ? "bg-white" : "bg-secondary-50/50"
              )}
            >
              {/* Day number skeleton */}
              <div className="flex justify-between items-start mb-0.5">
                <Skeleton className="h-5 w-5 sm:h-6 sm:w-6 rounded-full" />
              </div>

              {/* Mobile: Dots skeleton */}
              <div className="flex md:hidden flex-wrap gap-1 content-start mt-1">
                {showSkeletonPosts && (
                  <>
                    <Skeleton className="h-1.5 w-1.5 rounded-full" />
                    <Skeleton className="h-1.5 w-1.5 rounded-full" />
                  </>
                )}
              </div>

              {/* Desktop: Post card skeletons */}
              <div className="hidden md:flex flex-1 flex-col gap-1 min-h-0">
                {showSkeletonPosts && (
                  <>
                    <Skeleton className="h-6 w-full rounded" />
                    {index % 3 === 0 && <Skeleton className="h-6 w-full rounded" />}
                  </>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function CalendarGrid({
  posts,
  selectedDate,
  onDateSelect,
  onPostClick,
  onPostDrop,
  currentMonth,
  isLoading = false,
}: CalendarGridProps) {
  // Show skeleton during initial load
  if (isLoading) {
    return <CalendarGridSkeleton currentMonth={currentMonth} />;
  }

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(monthStart);
  const startDate = startOfWeek(monthStart);
  const endDate = endOfWeek(monthEnd);

  const days = eachDayOfInterval({
    start: startDate,
    end: endDate,
  });

  const weekDays = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  const weeks = days.length / 7;

  // Handle Drag and Drop (Simplified HTML5 API)
  const handleDragStart = (e: React.DragEvent, postId: string) => {
    e.dataTransfer.setData("postId", postId);
    e.dataTransfer.effectAllowed = "move";
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
  };

  // We need to pass the drop handler from parent, but for now we'll just log/ignore since onPostDrop is a prop
  // Ideally this component should receive the handler properly.
  // Let's assume onPostDrop is passed correctly and use it.

  const handleDrop = (e: React.DragEvent, date: Date) => {
    e.preventDefault();
    const postId = e.dataTransfer.getData("postId");
    if (postId) {
      onPostDrop(postId, date);
    }
  };

  return (
    <div className="flex flex-col h-full bg-white rounded-xl shadow-sm border border-secondary-200 overflow-hidden select-none">
      {/* Weekday Headers */}
      <div className="grid grid-cols-7 border-b border-secondary-200 bg-secondary-50 z-10 shrink-0">
        {weekDays.map((day) => (
          <div
            key={day}
            className="py-2 text-center text-[10px] sm:text-xs font-semibold uppercase tracking-wider text-secondary-500"
          >
            {day}
          </div>
        ))}
      </div>

      {/* Calendar Grid */}
      <div
        className="grid grid-cols-7 flex-1 bg-secondary-200 gap-px border-secondary-200 min-h-0"
        style={{ gridTemplateRows: `repeat(${weeks}, minmax(0, 1fr))` }}
      >
        {days.map((day) => {
          const dayPosts = posts
            .filter((post: any) => {
              // Use _calendarDate for status-aware date bucketing (drafted_at for drafts, scheduled_at for scheduled, etc.)
              const calendarDate = post._calendarDate || post.scheduled_at || post.published_at || post.created_at;
              const postDate = new Date(calendarDate);
              return isSameDay(postDate, day);
            })
            .sort((a: any, b: any) => {
              // Sort posts by their calendar date
              const aDate = new Date(a._calendarDate || a.scheduled_at || a.published_at || a.created_at);
              const bDate = new Date(b._calendarDate || b.scheduled_at || b.published_at || b.created_at);
              return aDate.getTime() - bDate.getTime();
            });

          const isSelected = selectedDate && isSameDay(day, selectedDate);
          const isCurrentMonth = isSameMonth(day, monthStart);
          const isCurrentDay = isToday(day);

          const maxVisiblePosts = 3;
          const visiblePosts = dayPosts.slice(0, maxVisiblePosts);
          const hiddenCount = dayPosts.length - maxVisiblePosts;

          const hasPosts = dayPosts.length > 0;

          // Helper for status colors in dots
          const getDotColor = (status: string) => {
            switch (status) {
              case 'published': return 'bg-green-500';
              case 'scheduled': return 'bg-blue-500';
              case 'failed': return 'bg-red-500';
              case 'rejected': return 'bg-red-500';
              case 'pending_approval': return 'bg-yellow-500';
              case 'approved': return 'bg-emerald-500';
              default: return 'bg-secondary-400';
            }
          };

          return (
            <div
              key={day.toString()}
              onClick={() => onDateSelect(day)}
              onDragOver={handleDragOver}
              onDrop={(e) => handleDrop(e, day)}
              className={cn(
                "min-h-0 p-1 relative group transition-colors cursor-pointer flex flex-col gap-0.5",
                isCurrentMonth ? "bg-white hover:bg-secondary-50/50" : "bg-secondary-50/50 text-secondary-400",
                isSelected && "bg-primary-50/30 ring-inset ring-2 ring-primary-500 z-10"
              )}
            >
              {/* Day Header */}
              <div className="flex justify-between items-start mb-0.5">
                <span
                  className={cn(
                    "text-[10px] sm:text-xs font-medium h-5 w-5 sm:h-6 sm:w-6 flex items-center justify-center rounded-full transition-all",
                    isCurrentDay
                      ? "bg-primary-600 text-white shadow-md shadow-primary-500/20 scale-110"
                      : isCurrentMonth ? "text-secondary-700" : "text-secondary-400 opacity-50"
                  )}
                >
                  {format(day, "d")}
                </span>

                {/* Quick Add Button (Desktop only hover) */}
                <Button
                  variant="ghost"
                  size="icon"
                  className="hidden sm:flex h-5 w-5 -mr-1 -mt-1 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-primary-50 hover:text-primary-600 rounded-full"
                  onClick={(e) => {
                    e.stopPropagation();
                    onDateSelect(day);
                  }}
                >
                  <Plus className="h-3 w-3" />
                </Button>
              </div>

              {/* Mobile: Dots Indicator */}
              <div className="flex md:hidden flex-wrap gap-1 content-start mt-1">
                {dayPosts.slice(0, 4).map((post) => (
                  <div key={post.id} className={cn("h-1.5 w-1.5 rounded-full", getDotColor(post.status))} />
                ))}
                {dayPosts.length > 4 && (
                  <span className="text-[9px] text-secondary-400 leading-none self-center">+</span>
                )}
              </div>

              {/* Desktop: Posts List */}
              <div className="hidden md:flex flex-1 flex-col gap-1 min-h-0">
                {visiblePosts.map((post) => (
                  <div key={post.id} draggable onDragStart={(e) => handleDragStart(e, post.id)}>
                    <CalendarPostCard
                      post={post}
                      onClick={(e) => {
                        e.stopPropagation();
                        onPostClick(post);
                      }}
                    />
                  </div>
                ))}

                {hiddenCount > 0 && (
                  <div className="mt-auto pt-1">
                    <div className="text-xs font-medium text-secondary-500 hover:text-primary-600 px-2 py-1 bg-secondary-50 hover:bg-secondary-100 rounded text-center transition-colors">
                      +{hiddenCount} more
                    </div>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
