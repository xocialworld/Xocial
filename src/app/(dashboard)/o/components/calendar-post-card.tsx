"use client";

import { cn } from "@/lib/utils";
import { PlatformIcon } from "@/components/ui/platform-icon";
import { AlertCircle, Clock, CheckCircle2, Send } from "lucide-react";
import { format } from "date-fns";

// Calendar post type - flexible to handle both Post and CalendarEntry shapes
type CalendarPost = {
  id: string;
  status: string;
  platforms?: string[];
  scheduled_at?: string;
  published_at?: string;
  created_at?: string;
  content?: Record<string, unknown>;
  _source?: string;
  _calendarDate?: string;
  _title?: string;
  [key: string]: unknown;
};

interface CalendarPostCardProps {
    post: CalendarPost;
    onClick: (e: React.MouseEvent) => void;
    isDragging?: boolean;
}

export function CalendarPostCard({ post, onClick, isDragging }: CalendarPostCardProps) {
    // Helper to safely get content text
    const getPostContent = (p: CalendarPost) => {
        // @ts-ignore - dynamic content structure handling
        const content = p.content;
        if (!content) return "No content";
        // Check for title (from CalendarEntry)
        if (p._title) return p._title;
        
        if (typeof content === "string") return content;
        
        const c = content as Record<string, unknown>;
        if (typeof c.text === "string") return c.text;
        if (typeof c.caption === "string") return c.caption; // Handle external sync structure
        if (typeof c.message === "string") return c.message; // Facebook
        if (typeof c.title === "string") return c.title; // TikTok/YouTube
        if (typeof c.description === "string") return c.description; // Fallback

        // Try to get first platform content
        const platforms = p.platforms || [];
        const firstPlatform = platforms[0];
        if (firstPlatform) {
            const platformContent = c[firstPlatform] as Record<string, unknown> | undefined;
            if (platformContent?.text && typeof platformContent.text === "string") {
                return platformContent.text;
            }
        }

        return "Untitled Post";
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'published': return 'bg-green-50/80 border-green-200 text-green-800 hover:bg-green-100';
            case 'scheduled': return 'bg-blue-50/80 border-blue-200 text-blue-800 hover:bg-blue-100';
            case 'partial': return 'bg-orange-50/80 border-orange-200 text-orange-800 hover:bg-orange-100';
            case 'failed': return 'bg-red-50/80 border-red-200 text-red-800 hover:bg-red-100';
            case 'approved': return 'bg-purple-50/80 border-purple-200 text-purple-800 hover:bg-purple-100';
            case 'pending_approval': return 'bg-yellow-50/80 border-yellow-200 text-yellow-800 hover:bg-yellow-100';
            default: return 'bg-gray-50/80 border-gray-200 text-gray-700 hover:bg-gray-100';
        }
    };

    const statusColor = getStatusColor(post.status);
    // Show the relevant time for the post based on its status
    const relevantDate = post.scheduled_at || post.published_at || post.created_at;
    const time = relevantDate ? format(new Date(relevantDate), "h:mm a") : null;

    return (
        <div
            onClick={onClick}
            className={cn(
                "group relative flex flex-col gap-0.5 lg:gap-1 p-1 lg:p-1.5 rounded-md border text-[10px] lg:text-[11px] shadow-sm transition-all cursor-pointer hover:shadow hover:z-10",
                statusColor,
                isDragging && "opacity-50 ring-2 ring-primary-500 z-50",
            )}
        >
            {/* Header: Platforms & Time */}
            <div className="flex items-center justify-between leading-none">
                <div className="flex items-center gap-0.5 lg:gap-1">
                    {(post.platforms || []).slice(0, 3).map(p => (
                        <PlatformIcon key={p} platform={p} className="h-2.5 w-2.5 lg:h-3 lg:w-3 opacity-90" />
                    ))}
                    {(post.platforms || []).length > 3 && (
                        <span className="text-[8px] lg:text-[9px] font-medium opacity-70">+{(post.platforms || []).length - 3}</span>
                    )}
                </div>
                {time && (
                    <span className="hidden xl:block text-[9px] lg:text-[10px] font-medium opacity-60 ml-1">
                        {time}
                    </span>
                )}
            </div>

            {/* Content Preview */}
            <div className="font-medium line-clamp-1 opacity-90 leading-tight">
                {getPostContent(post)}
            </div>

            {/* Footer Status Indicators - Minimal */}
            <div className="flex items-center justify-between opacity-60 h-2.5 lg:h-3 mt-0.5">
                <div className="flex gap-1 items-center">
                    {/* @ts-ignore */}
                    {(post.media?.length > 0) && (
                        <span className="text-[8px] lg:text-[9px] px-0.5 rounded border border-current/20">IMG</span>
                    )}
                </div>

                {(post.status === 'failed' || post.status === 'partial') && <AlertCircle className="w-2.5 h-2.5 lg:w-3 lg:h-3 text-red-600" />}
                {post.status === 'published' && <CheckCircle2 className="w-2.5 h-2.5 lg:w-3 lg:h-3 text-green-600" />}
            </div>
        </div>
    );
}
