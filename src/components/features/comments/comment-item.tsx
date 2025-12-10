"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
    MoreHorizontal,
    Reply,
    Trash2,
    Edit2,
    CheckCircle,
    Circle,
    Clock
} from "lucide-react";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

export interface Comment {
    id: string;
    content_item_id: string;
    parent_id?: string;
    workspace_id: string;
    author_id: string;
    body: string;
    visibility: "internal" | "external";
    mentions: string[];
    is_resolved: boolean;
    resolved_at?: string;
    created_at: string;
    updated_at: string;
    author?: {
        id: string;
        full_name: string;
        avatar_url?: string;
    };
    resolved_by_user?: {
        id: string;
        full_name: string;
    };
    replies?: Comment[];
}

interface CommentItemProps {
    comment: Comment;
    isReply?: boolean;
    onReply?: () => void;
    onDelete?: () => void;
    onResolve?: (resolved: boolean) => void;
    onEdit?: (newBody: string) => void;
}

export function CommentItem({
    comment,
    isReply = false,
    onReply,
    onDelete,
    onResolve,
    onEdit,
}: CommentItemProps) {
    const [deleting, setDeleting] = useState(false);
    const [resolving, setResolving] = useState(false);

    const authorName = comment.author?.full_name || "Unknown User";
    const authorInitial = authorName.charAt(0).toUpperCase();
    const createdAt = new Date(comment.created_at);
    const isEditable = Date.now() - createdAt.getTime() < 5 * 60 * 1000; // 5 minutes

    const formatTime = (date: Date) => {
        const now = new Date();
        const diffMs = now.getTime() - date.getTime();
        const diffMins = Math.floor(diffMs / 60000);
        const diffHours = Math.floor(diffMs / 3600000);
        const diffDays = Math.floor(diffMs / 86400000);

        if (diffMins < 1) return "just now";
        if (diffMins < 60) return `${diffMins}m ago`;
        if (diffHours < 24) return `${diffHours}h ago`;
        if (diffDays < 7) return `${diffDays}d ago`;
        return date.toLocaleDateString(undefined, { month: "short", day: "numeric" });
    };

    const handleDelete = async () => {
        if (!confirm("Are you sure you want to delete this comment?")) return;

        setDeleting(true);
        try {
            const res = await fetch(`/api/comments/${comment.id}`, {
                method: "DELETE",
            });

            if (res.ok) {
                toast.success("Comment deleted");
                onDelete?.();
            } else {
                const data = await res.json();
                toast.error(data.error || "Failed to delete comment");
            }
        } catch (error) {
            toast.error("Failed to delete comment");
        } finally {
            setDeleting(false);
        }
    };

    const handleResolve = async () => {
        setResolving(true);
        try {
            const res = await fetch(`/api/comments/${comment.id}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ is_resolved: !comment.is_resolved }),
            });

            if (res.ok) {
                toast.success(comment.is_resolved ? "Comment reopened" : "Comment resolved");
                onResolve?.(!comment.is_resolved);
            } else {
                const data = await res.json();
                toast.error(data.error || "Failed to update comment");
            }
        } catch (error) {
            toast.error("Failed to update comment");
        } finally {
            setResolving(false);
        }
    };

    return (
        <div
            className={cn(
                "group flex gap-3",
                comment.is_resolved && "opacity-60"
            )}
        >
            {/* Avatar */}
            {comment.author?.avatar_url ? (
                <img
                    src={comment.author.avatar_url}
                    alt={authorName}
                    className={cn(
                        "rounded-full object-cover flex-shrink-0",
                        isReply ? "h-6 w-6" : "h-8 w-8"
                    )}
                />
            ) : (
                <div
                    className={cn(
                        "rounded-full bg-primary-100 flex items-center justify-center flex-shrink-0",
                        isReply ? "h-6 w-6 text-xs" : "h-8 w-8 text-sm"
                    )}
                >
                    <span className="font-medium text-primary-700">{authorInitial}</span>
                </div>
            )}

            {/* Content */}
            <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                    <span className="text-sm font-medium text-secondary-900">{authorName}</span>
                    <span className="text-xs text-secondary-400">{formatTime(createdAt)}</span>
                    {comment.visibility === "external" && (
                        <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-4">
                            External
                        </Badge>
                    )}
                    {comment.is_resolved && (
                        <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-4 bg-green-50 text-green-700 border-green-200">
                            <CheckCircle className="h-2.5 w-2.5 mr-0.5" />
                            Resolved
                        </Badge>
                    )}
                    {isEditable && (
                        <span className="text-[10px] text-secondary-400 flex items-center">
                            <Clock className="h-2.5 w-2.5 mr-0.5" />
                            Editable
                        </span>
                    )}
                </div>

                <p className={cn(
                    "text-sm text-secondary-700",
                    comment.is_resolved && "line-through"
                )}>
                    {comment.body}
                </p>

                {/* Actions */}
                <div className="flex items-center gap-2 mt-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                    {!isReply && onReply && (
                        <Button
                            variant="ghost"
                            size="sm"
                            className="h-6 px-2 text-xs text-secondary-500 hover:text-secondary-900"
                            onClick={onReply}
                        >
                            <Reply className="h-3 w-3 mr-1" />
                            Reply
                        </Button>
                    )}

                    {!isReply && onResolve && (
                        <Button
                            variant="ghost"
                            size="sm"
                            className="h-6 px-2 text-xs text-secondary-500 hover:text-secondary-900"
                            onClick={handleResolve}
                            disabled={resolving}
                        >
                            {comment.is_resolved ? (
                                <>
                                    <Circle className="h-3 w-3 mr-1" />
                                    Reopen
                                </>
                            ) : (
                                <>
                                    <CheckCircle className="h-3 w-3 mr-1" />
                                    Resolve
                                </>
                            )}
                        </Button>
                    )}

                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button
                                variant="ghost"
                                size="sm"
                                className="h-6 w-6 p-0 text-secondary-400 hover:text-secondary-900"
                            >
                                <MoreHorizontal className="h-3.5 w-3.5" />
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="start">
                            {isEditable && (
                                <DropdownMenuItem>
                                    <Edit2 className="h-3.5 w-3.5 mr-2" />
                                    Edit
                                </DropdownMenuItem>
                            )}
                            <DropdownMenuItem
                                className="text-red-600 focus:text-red-600"
                                onClick={handleDelete}
                                disabled={deleting}
                            >
                                <Trash2 className="h-3.5 w-3.5 mr-2" />
                                Delete
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                </div>
            </div>
        </div>
    );
}
