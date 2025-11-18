'use client';

import * as React from "react";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay, addMonths, subMonths, startOfWeek, endOfWeek, isToday } from "date-fns";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DayCell } from "./day-cell";
import { cn } from "@/lib/utils";
import type { Post } from "@/types";

interface CalendarGridProps {
  posts: Post[];
  selectedDate: Date | null;
  onDateSelect: (date: Date) => void;
  onPostClick?: (post: Post) => void;
  onPostDrop?: (postId: string, date: Date) => void;
}

export function CalendarGrid({
  posts,
  selectedDate,
  onDateSelect,
  onPostClick,
  onPostDrop,
}: CalendarGridProps) {
  const [currentMonth, setCurrentMonth] = React.useState(new Date());
  const [draggedPostId, setDraggedPostId] = React.useState<string | null>(null);

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const calendarStart = startOfWeek(monthStart);
  const calendarEnd = endOfWeek(monthEnd);

  const days = eachDayOfInterval({ start: calendarStart, end: calendarEnd });

  const handlePrevMonth = () => {
    setCurrentMonth(subMonths(currentMonth, 1));
  };

  const handleNextMonth = () => {
    setCurrentMonth(addMonths(currentMonth, 1));
  };

  const handleToday = () => {
    setCurrentMonth(new Date());
    onDateSelect(new Date());
  };

  // Group posts by date
  const postsByDate = React.useMemo(() => {
    const grouped: Record<string, Post[]> = {};

    posts.forEach((post) => {
      const date = post.scheduled_at || post.published_at || post.created_at;
      if (!date) return;

      const dateKey = format(new Date(date), 'yyyy-MM-dd');
      if (!grouped[dateKey]) {
        grouped[dateKey] = [];
      }
      grouped[dateKey].push(post);
    });

    return grouped;
  }, [posts]);

  return (
    <div className="bg-white rounded-lg border border-secondary-200 overflow-hidden">
      {/* Calendar Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-secondary-200">
        <h2 className="text-xl font-semibold text-secondary-900">
          {format(currentMonth, 'MMMM yyyy')}
        </h2>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleToday}
            className="text-sm"
          >
            Today
          </Button>
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={handlePrevMonth}
              className="p-2"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleNextMonth}
              className="p-2"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Weekday Headers */}
      <div className="grid grid-cols-7 border-b border-secondary-200 bg-secondary-50">
        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
          <div
            key={day}
            className="py-3 text-center text-xs font-semibold text-secondary-600 uppercase"
          >
            {day}
          </div>
        ))}
      </div>

      {/* Calendar Grid */}
      <div className="grid grid-cols-7">
        {days.map((day, index) => {
          const dateKey = format(day, 'yyyy-MM-dd');
          const dayPosts = postsByDate[dateKey] || [];
          const isCurrentMonth = isSameMonth(day, currentMonth);
          const isSelected = selectedDate && isSameDay(day, selectedDate);
          const isTodayDate = isToday(day);

          return (
            <DayCell
              key={index}
              date={day}
              posts={dayPosts}
              isCurrentMonth={isCurrentMonth}
              isSelected={!!isSelected}
              isToday={isTodayDate}
              onSelect={() => onDateSelect(day)}
              onPostClick={onPostClick}
              onDropPost={onPostDrop ? (postId) => onPostDrop(postId, day) : undefined}
              onPostDragStart={setDraggedPostId}
              onPostDragEnd={() => setDraggedPostId(null)}
              draggedPostId={draggedPostId}
            />
          );
        })}
      </div>
    </div>
  );
}

