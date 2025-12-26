import React from 'react';
import { useUnscheduledDrafts } from '@/hooks/use-unscheduled-drafts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { Plus, GripVertical, FileText, Edit2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Post } from '@/types';
import { PlatformIcon } from '@/components/ui/platform-icon';
import { format } from 'date-fns';

interface UnscheduledDraftsPanelProps {
    className?: string;
    onDragStart?: (e: React.DragEvent, post: Post) => void;
    onEdit?: (post: Post) => void;
}

export function UnscheduledDraftsPanel({ className, onDragStart, onEdit }: UnscheduledDraftsPanelProps) {
    const { data: drafts, isLoading } = useUnscheduledDrafts();

    const handleDragStart = (e: React.DragEvent, post: Post) => {
        e.dataTransfer.setData('application/json', JSON.stringify(post));
        e.dataTransfer.setData('text/plain', post.id);
        e.dataTransfer.setData('postId', post.id); // For CalendarGrid compatibility
        e.dataTransfer.effectAllowed = 'move';

        if (onDragStart) {
            onDragStart(e, post);
        }
    };

    if (isLoading) {
        return (
            <div className={cn("flex flex-col h-full border-r bg-muted/10 w-[300px]", className)}>
                <div className="p-4 border-b">
                    <h3 className="font-semibold text-sm flex items-center gap-2">
                        <div className="h-4 w-4 bg-gray-200 animate-pulse rounded" />
                        Unscheduled Drafts
                    </h3>
                </div>
                <div className="p-4 space-y-3">
                    {[1, 2, 3].map((i) => (
                        <div key={i} className="h-24 bg-gray-100 animate-pulse rounded-lg" />
                    ))}
                </div>
            </div>
        );
    }

    return (
        <div className={cn("flex flex-col h-full border-r bg-muted/10 w-[300px]", className)}>
            <div className="p-4 border-b flex items-center justify-between bg-background/50 backdrop-blur-sm sticky top-0 z-10">
                <h3 className="font-semibold text-sm flex items-center gap-2">
                    <FileText className="h-4 w-4 text-primary" />
                    Unscheduled Drafts
                </h3>
                <span className="text-xs text-muted-foreground bg-secondary/20 px-2 py-0.5 rounded-full">
                    {drafts?.length || 0}
                </span>
            </div>

            <ScrollArea className="flex-1 p-3">
                <div className="space-y-3">
                    {drafts?.length === 0 ? (
                        <div className="text-center py-8 text-muted-foreground text-sm border-2 border-dashed rounded-lg bg-background/50">
                            <p>No drafts yet</p>
                            <p className="text-xs mt-1">Create a post to see it here</p>
                        </div>
                    ) : (
                        drafts?.map((post) => (
                            <div
                                key={post.id}
                                draggable
                                onDragStart={(e) => handleDragStart(e, post)}
                                className="group relative bg-card hover:bg-accent/5 transition-all duration-200 border rounded-lg p-3 shadow-sm hover:shadow-md cursor-grab active:cursor-grabbing"
                            >
                                <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <GripVertical className="h-4 w-4 text-muted-foreground mb-1" />
                                    {onEdit && (
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            className="h-6 w-6"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                onEdit(post);
                                            }}
                                        >
                                            <Edit2 className="h-3 w-3" />
                                        </Button>
                                    )}
                                </div>
                                <div className="space-y-2 pr-6">
                                    <div className="flex items-center gap-1.5 flex-wrap">
                                        {post.platforms.map((p) => (
                                            <PlatformIcon key={p} platform={p} className="h-3 w-3" />
                                        ))}
                                    </div>
                                    <p className="text-sm font-medium line-clamp-2 text-card-foreground">
                                        {(post.content as any).text || (post.content as any).title || "Untitled draft"}
                                    </p>
                                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                                        <span>Last edited {format(new Date(post.updated_at), 'MMM d')}</span>
                                    </div>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </ScrollArea>
        </div>
    );
}
