"use client";

import { useMemo, useState } from "react";
import { cn } from "@/lib/utils";
import { PlatformIcon } from "@/components/ui/platform-icon";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  format,
  startOfWeek,
  endOfWeek,
  addDays,
  addWeeks,
  subWeeks,
  isSameDay,
  parseISO,
  getHours,
  getMinutes,
  isToday,
} from "date-fns";
import {
  ChevronLeft,
  ChevronRight,
  Plus,
  Globe,
  Clock,
  Sparkles,
} from "lucide-react";
import type { CalendarStrategyAction } from "@/types/intelligence";

// Calendar post type
type CalendarPost = {
  id: string;
  status: string;
  platforms?: string[];
  scheduled_at?: string;
  published_at?: string;
  created_at?: string;
  content?: Record<string, unknown>;
  media?: unknown[];
  _source?: string;
  _calendarDate?: string;
  _title?: string;
  _postType?: string;
  _permalink?: string;
  _metrics?: Record<string, unknown>;
  [key: string]: unknown;
};

interface WeekViewProps {
  posts: CalendarPost[];
  currentDate: Date;
  onDateChange: (date: Date) => void;
  onPostClick: (post: CalendarPost) => void;
  onNewPost: (date: Date, hour: number) => void;
  strategyActions?: CalendarStrategyAction[];
  onStrategyActionClick?: (action: CalendarStrategyAction) => void;
}

// Hour slots for the week view (6am to 11pm)
const HOUR_SLOTS = Array.from({ length: 18 }, (_, i) => i + 6);

/**
 * Week View - 7-day horizontal layout with time slots
 * Shows posts at their scheduled times
 */
export function WeekView({
  posts,
  currentDate,
  onDateChange,
  onPostClick,
  onNewPost,
  strategyActions = [],
  onStrategyActionClick,
}: WeekViewProps) {
  const [hoveredSlot, setHoveredSlot] = useState<string | null>(null);
  
  // Get the week's dates
  const weekStart = startOfWeek(currentDate, { weekStartsOn: 0 });
  const weekEnd = endOfWeek(currentDate, { weekStartsOn: 0 });
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

  // Group posts by day and hour
  const postsByDayAndHour = useMemo(() => {
    const grouped: Record<string, CalendarPost[]> = {};
    
    for (const post of posts) {
      const calendarDate = post._calendarDate || post.scheduled_at || post.published_at || post.created_at;
      if (!calendarDate) continue;
      
      const postDate = parseISO(calendarDate);
      const dayKey = format(postDate, 'yyyy-MM-dd');
      const hour = getHours(postDate);
      const key = `${dayKey}-${hour}`;
      
      if (!grouped[key]) {
        grouped[key] = [];
      }
      grouped[key].push(post);
    }
    
    return grouped;
  }, [posts]);

  const actionsByDayAndHour = useMemo(() => {
    const grouped: Record<string, CalendarStrategyAction[]> = {};

    for (const action of strategyActions) {
      const actionDate = parseISO(action.scheduledAt);
      if (Number.isNaN(actionDate.getTime())) continue;

      const dayKey = format(actionDate, 'yyyy-MM-dd');
      const hour = getHours(actionDate);
      const key = `${dayKey}-${hour}`;

      if (!grouped[key]) {
        grouped[key] = [];
      }
      grouped[key].push(action);
    }

    return grouped;
  }, [strategyActions]);

  // Navigation handlers
  const handlePrevWeek = () => {
    onDateChange(subWeeks(currentDate, 1));
  };

  const handleNextWeek = () => {
    onDateChange(addWeeks(currentDate, 1));
  };

  const handleToday = () => {
    onDateChange(new Date());
  };

  // Get status color
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'published': return 'bg-green-500 border-green-600';
      case 'scheduled': return 'bg-blue-500 border-blue-600';
      case 'approved': return 'bg-emerald-500 border-emerald-600';
      case 'in_review': return 'bg-yellow-500 border-yellow-600';
      case 'draft': return 'bg-gray-400 border-gray-500';
      case 'failed': return 'bg-red-500 border-red-600';
      default: return 'bg-gray-400 border-gray-500';
    }
  };

  // Get caption preview
  const getCaptionPreview = (post: CalendarPost): string => {
    const content = post.content as Record<string, unknown>;
    if (!content) return '';
    
    const text = content.text || content.caption || content.message || content.title || '';
    const caption = String(text);
    return caption.length > 30 ? caption.slice(0, 30) + '...' : caption;
  };

  return (
    <div className="flex flex-col h-full bg-white rounded-xl shadow-sm border border-secondary-200 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-secondary-200 bg-secondary-50/50">
        <div className="flex items-center gap-3">
          <Button variant="outline" size="icon" onClick={handlePrevWeek}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="sm" onClick={handleToday}>
            Today
          </Button>
          <Button variant="outline" size="icon" onClick={handleNextWeek}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
        
        <h2 className="text-lg font-semibold text-secondary-900">
          {format(weekStart, 'MMM d')} - {format(weekEnd, 'MMM d, yyyy')}
        </h2>

        <div className="text-sm text-secondary-500">
          {posts.length} posts this week
        </div>
      </div>

      {/* Week grid */}
      <div className="flex-1 overflow-auto">
        <div className="min-w-[1000px]">
          {/* Day headers */}
          <div className="grid grid-cols-[60px_repeat(7,1fr)] sticky top-0 bg-white z-10 border-b border-secondary-200">
            <div className="p-2 border-r border-secondary-100" />
            {weekDays.map((day) => {
              const isCurrentDay = isToday(day);
              return (
                <div
                  key={day.toISOString()}
                  className={cn(
                    "p-3 text-center border-r border-secondary-100 last:border-r-0",
                    isCurrentDay && "bg-primary-50"
                  )}
                >
                  <div className={cn(
                    "text-xs font-medium uppercase",
                    isCurrentDay ? "text-primary-600" : "text-secondary-500"
                  )}>
                    {format(day, 'EEE')}
                  </div>
                  <div className={cn(
                    "text-xl font-semibold mt-1",
                    isCurrentDay ? "text-primary-700" : "text-secondary-900"
                  )}>
                    {format(day, 'd')}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Time slots */}
          <div className="relative">
            {HOUR_SLOTS.map((hour) => (
              <div key={hour} className="grid grid-cols-[60px_repeat(7,1fr)] border-b border-secondary-100">
                {/* Time label */}
                <div className="p-2 text-xs text-secondary-500 text-right pr-3 border-r border-secondary-100">
                  {format(new Date().setHours(hour, 0), 'h a')}
                </div>
                
                {/* Day cells */}
                {weekDays.map((day) => {
                  const dayKey = format(day, 'yyyy-MM-dd');
                  const slotKey = `${dayKey}-${hour}`;
                  const slotPosts = postsByDayAndHour[slotKey] || [];
                  const slotActions = actionsByDayAndHour[slotKey] || [];
                  const isHovered = hoveredSlot === slotKey;
                  const isCurrentDay = isToday(day);
                  
                  return (
                    <div
                      key={slotKey}
                      className={cn(
                        "relative min-h-[60px] p-1 border-r border-secondary-100 last:border-r-0 transition-colors",
                        isCurrentDay && "bg-primary-50/30",
                        isHovered && "bg-secondary-50"
                      )}
                      onMouseEnter={() => setHoveredSlot(slotKey)}
                      onMouseLeave={() => setHoveredSlot(null)}
                    >
                      {/* Posts in this slot */}
                      {slotPosts.map((post) => {
                        const isExternal = post._source === 'external';
                        const calendarDate = post._calendarDate || post.scheduled_at || post.published_at;
                        const minutes = calendarDate ? getMinutes(parseISO(calendarDate)) : 0;
                        
                        return (
                          <div
                            key={post.id}
                            onClick={() => onPostClick(post)}
                            className={cn(
                              "group cursor-pointer rounded-md p-1.5 mb-1 text-white text-xs transition-all hover:shadow-md border-l-2",
                              getStatusColor(post.status)
                            )}
                            style={{ marginTop: `${(minutes / 60) * 100}%` }}
                          >
                            <div className="flex items-center gap-1 mb-0.5">
                              {/* Platforms */}
                              {post.platforms?.slice(0, 2).map((platform) => (
                                <PlatformIcon
                                  key={platform}
                                  platform={platform}
                                  className="h-3 w-3 opacity-80"
                                />
                              ))}
                              {(post.platforms?.length || 0) > 2 && (
                                <span className="text-[10px] opacity-70">+{(post.platforms?.length || 0) - 2}</span>
                              )}
                              {isExternal && (
                                <Globe className="h-3 w-3 opacity-70" />
                              )}
                              {/* Time */}
                              <span className="ml-auto opacity-70 flex items-center gap-0.5">
                                <Clock className="h-2.5 w-2.5" />
                                {calendarDate && format(parseISO(calendarDate), 'h:mm a')}
                              </span>
                            </div>
                            <p className="line-clamp-1 opacity-90">
                              {getCaptionPreview(post) || 'No caption'}
                            </p>
                          </div>
                        );
                      })}
                      
                      {/* Add button on hover */}
                      {slotPosts.length === 0 && slotActions.length > 0 && (
                        <button
                          type="button"
                          onClick={() => onStrategyActionClick?.(slotActions[0])}
                          className="mb-1 flex w-full items-start gap-1 rounded-md border border-primary-200 bg-primary-50 p-1.5 text-left text-[11px] text-primary-800 transition-colors hover:bg-primary-100"
                        >
                          <Sparkles className="mt-0.5 h-3 w-3 shrink-0" />
                          <span className="line-clamp-2">{slotActions[0].title}</span>
                        </button>
                      )}

                      {isHovered && slotPosts.length === 0 && slotActions.length === 0 && (
                        <button
                          onClick={() => onNewPost(day, hour)}
                          className="absolute inset-0 flex items-center justify-center text-secondary-400 hover:text-primary-500 transition-colors"
                        >
                          <Plus className="h-5 w-5" />
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      </div>
      
      {/* Legend */}
      <div className="px-4 py-2 border-t border-secondary-200 bg-secondary-50/30 flex items-center gap-4 text-xs text-secondary-600">
        <div className="flex items-center gap-1.5">
          <div className="w-2 h-2 rounded-full bg-gray-400" />
          Draft
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-2 h-2 rounded-full bg-blue-500" />
          Scheduled
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-2 h-2 rounded-full bg-green-500" />
          Published
        </div>
        <div className="flex items-center gap-1.5">
          <Globe className="h-3 w-3 opacity-60" />
          Imported
        </div>
      </div>
    </div>
  );
}
