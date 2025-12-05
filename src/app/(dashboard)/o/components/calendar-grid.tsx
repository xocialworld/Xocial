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
import { Post } from "@/types";
import { PlatformIcon } from "@/components/ui/platform-icon"; // Assuming this exists or I'll use text
import { MoreHorizontal, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface CalendarGridProps {
  posts: Post[];
  selectedDate: Date | null;
  onDateSelect: (date: Date) => void;
  onPostClick: (post: Post) => void;
  onPostDrop: (postId: string, date: Date) => void;
  currentMonth: Date;
  onMonthChange: (date: Date) => void;
}

export function CalendarGrid({
  posts,
  selectedDate,
  onDateSelect,
  onPostClick,
  currentMonth,
}: CalendarGridProps) {
  function getPostTextSafe(post: Post): string {
    const c: any = (post as any).content;
    if (!c) return "No content";
    if (typeof c === "string") return c;
    if (typeof c.text === "string") return c.text;
    const platforms = (post as any).platforms;
    const first = Array.isArray(platforms) ? (platforms[0] as any) : undefined;
    const key = typeof first === "string" ? first : Array.isArray(first) ? first[0] : undefined;
    const candidate = key && c[key];
    if (candidate && typeof candidate.text === "string") return candidate.text;
    try {
      const s = JSON.stringify(c);
      return s.length > 120 ? s.slice(0, 120) + "…" : s;
    } catch {
      return "No content";
    }
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

  return (
    <div className="flex flex-col h-full bg-white rounded-lg shadow border border-secondary-200">
      {/* Weekday Headers */}
      <div className="grid grid-cols-7 border-b border-secondary-200">
        {weekDays.map((day) => (
          <div
            key={day}
            className="py-2 text-center text-sm font-semibold text-secondary-500 bg-secondary-50 first:rounded-tl-lg last:rounded-tr-lg"
          >
            {day}
          </div>
        ))}
      </div>

      {/* Calendar Grid */}
      <div className="grid grid-cols-7 flex-1 auto-rows-fr">
        {days.map((day, dayIdx) => {
          const dayPosts = posts.filter((post) => {
            const postDate = new Date(post.scheduled_at || post.created_at);
            return isSameDay(postDate, day);
          });

          const isSelected = selectedDate && isSameDay(day, selectedDate);
          const isCurrentMonth = isSameMonth(day, monthStart);

          return (
            <div
              key={day.toString()}
              onClick={() => onDateSelect(day)}
              className={cn(
                "min-h-[120px] p-2 border-b border-r border-secondary-100 relative group transition-colors hover:bg-secondary-50/50 cursor-pointer",
                !isCurrentMonth && "bg-secondary-50/30 text-secondary-400",
                isSelected && "bg-primary-50 ring-2 ring-inset ring-primary-500 z-10",
                dayIdx % 7 === 0 && "border-l", // Add left border for first column
                // Rounded corners for bottom row
                dayIdx >= days.length - 7 && dayIdx === days.length - 7 && "rounded-bl-lg",
                dayIdx === days.length - 1 && "rounded-br-lg"
              )}
            >
              <div className="flex justify-between items-start mb-1">
                <span
                  className={cn(
                    "text-sm font-medium h-7 w-7 flex items-center justify-center rounded-full",
                    isToday(day)
                      ? "bg-primary-600 text-white"
                      : "text-secondary-700"
                  )}
                >
                  {format(day, "d")}
                </span>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                  onClick={(e) => {
                    e.stopPropagation();
                    // Handle add post for this day
                    onDateSelect(day);
                  }}
                >
                  <Plus className="h-4 w-4 text-secondary-500" />
                </Button>
              </div>

              <div className="space-y-1">
                {dayPosts.slice(0, 3).map((post) => (
                  <div
                    key={post.id}
                    onClick={(e) => {
                      e.stopPropagation();
                      onPostClick(post);
                    }}
                    className={cn(
                      "text-xs p-1.5 rounded border truncate flex items-center gap-1.5 shadow-sm transition-all hover:shadow-md hover:-translate-y-0.5",
                      post.status === "published"
                        ? "bg-green-50 border-green-200 text-green-700"
                        : post.status === "scheduled"
                          ? "bg-blue-50 border-blue-200 text-blue-700"
                          : post.status === "failed"
                            ? "bg-red-50 border-red-200 text-red-700"
                            : "bg-gray-50 border-gray-200 text-gray-700"
                    )}
                  >
                    {/* Platform Icon Placeholder - using text for now if icon component missing */}
                    <span className="font-bold uppercase text-[10px] opacity-70">
                      {post.platforms[0]?.[0]}
                    </span>
                    <span className="truncate">{getPostTextSafe(post)}</span>
                  </div>
                ))}
                {dayPosts.length > 3 && (
                  <div className="text-xs text-secondary-500 pl-1">
                    + {dayPosts.length - 3} more
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
