"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Post } from "@/types";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay, addMonths, subMonths } from "date-fns";

interface CalendarViewProps {
  posts: Post[];
}

export function CalendarView({ posts }: CalendarViewProps) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);

  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);
  const daysInMonth = eachDayOfInterval({ start: monthStart, end: monthEnd });

  // Get posts for a specific date
  const getPostsForDate = (date: Date) => {
    return posts.filter((post) => {
      if (!post.scheduled_at) return false;
      return isSameDay(new Date(post.scheduled_at), date);
    });
  };

  const postsForSelectedDate = selectedDate ? getPostsForDate(selectedDate) : [];

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Calendar Grid */}
      <div className="lg:col-span-2">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>
                {format(currentDate, "MMMM yyyy")}
              </CardTitle>
              <div className="flex gap-2">
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => setCurrentDate(subMonths(currentDate, 1))}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => setCurrentDate(new Date())}
                >
                  Today
                </Button>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => setCurrentDate(addMonths(currentDate, 1))}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {/* Day labels */}
            <div className="grid grid-cols-7 gap-2 mb-2">
              {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
                <div
                  key={day}
                  className="text-center text-sm font-medium text-secondary-600 p-2"
                >
                  {day}
                </div>
              ))}
            </div>

            {/* Calendar days */}
            <div className="grid grid-cols-7 gap-2">
              {daysInMonth.map((day) => {
                const dayPosts = getPostsForDate(day);
                const isSelected = selectedDate && isSameDay(day, selectedDate);
                const isToday = isSameDay(day, new Date());

                return (
                  <button
                    key={day.toString()}
                    onClick={() => setSelectedDate(day)}
                    className={`
                      min-h-24 p-2 rounded-lg border transition-all
                      ${isSelected
                        ? "border-primary-500 bg-primary-50"
                        : isToday
                        ? "border-primary-300 bg-primary-50/50"
                        : "border-secondary-200 hover:border-secondary-300 hover:bg-secondary-50"
                      }
                      ${!isSameMonth(day, currentDate) ? "opacity-50" : ""}
                    `}
                  >
                    <div className="text-sm font-medium text-secondary-900 mb-1">
                      {format(day, "d")}
                    </div>
                    {dayPosts.length > 0 && (
                      <div className="space-y-1">
                        {dayPosts.slice(0, 2).map((post) => (
                          <div
                            key={post.id}
                            className="text-xs bg-primary-100 text-primary-700 rounded px-1 py-0.5 truncate"
                          >
                            {post.status}
                          </div>
                        ))}
                        {dayPosts.length > 2 && (
                          <div className="text-xs text-secondary-600">
                            +{dayPosts.length - 2} more
                          </div>
                        )}
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Legend */}
        <div className="mt-4 flex items-center gap-4 text-sm">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded bg-secondary-200" />
            <span className="text-secondary-600">Draft</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded bg-info-500" />
            <span className="text-secondary-600">Scheduled</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded bg-success-500" />
            <span className="text-secondary-600">Published</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded bg-error-500" />
            <span className="text-secondary-600">Failed</span>
          </div>
        </div>
      </div>

      {/* Day Posts Panel */}
      <div className="lg:col-span-1">
        <Card className="sticky top-4">
          <CardHeader>
            <CardTitle className="text-lg">
              {selectedDate ? format(selectedDate, "MMMM d, yyyy") : "Select a date"}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {postsForSelectedDate.length === 0 ? (
              <div className="text-center py-8 text-secondary-500">
                No posts scheduled for this day
              </div>
            ) : (
              <div className="space-y-4">
                {postsForSelectedDate.map((post) => (
                  <div
                    key={post.id}
                    className="border border-secondary-200 rounded-lg p-4 hover:shadow-md transition-shadow"
                  >
                    <div className="flex items-start justify-between mb-2">
                      <Badge
                        variant={
                          post.status === "scheduled" ? "info" :
                          post.status === "published" ? "success" :
                          "default"
                        }
                      >
                        {post.status}
                      </Badge>
                      <span className="text-xs text-secondary-500">
                        {post.scheduled_at && format(new Date(post.scheduled_at), "HH:mm")}
                      </span>
                    </div>
                    <p className="text-sm text-secondary-700 line-clamp-3 mb-2">
                      {typeof post.content === "string"
                        ? post.content
                        : post.content?.text || "No content"}
                    </p>
                    <div className="flex gap-1 flex-wrap">
                      {post.platforms.map((platform) => (
                        <Badge key={platform} variant="default" className="text-xs">
                          {platform}
                        </Badge>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

