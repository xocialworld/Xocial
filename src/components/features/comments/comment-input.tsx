"use client";

import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import { Send, Loader2, Globe, Lock, AtSign, X } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import type { Comment } from "./comment-item";

interface CommentInputProps {
    contentItemId: string;
    workspaceId: string;
    parentId?: string;
    onCommentAdded: (comment: Comment) => void;
    onCancel?: () => void;
    placeholder?: string;
    autoFocus?: boolean;
}

export function CommentInput({
    contentItemId,
    workspaceId,
    parentId,
    onCommentAdded,
    onCancel,
    placeholder = "Add a comment...",
    autoFocus = false,
}: CommentInputProps) {
    const [body, setBody] = useState("");
    const [visibility, setVisibility] = useState<"internal" | "external">("internal");
    const [submitting, setSubmitting] = useState(false);
    const [focused, setFocused] = useState(false);
    const textareaRef = useRef<HTMLTextAreaElement>(null);

    useEffect(() => {
        if (autoFocus && textareaRef.current) {
            textareaRef.current.focus();
        }
    }, [autoFocus]);

    const handleSubmit = async () => {
        if (!body.trim()) return;

        setSubmitting(true);
        try {
            const res = await fetch("/api/comments", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    content_item_id: contentItemId,
                    workspace_id: workspaceId,
                    body: body.trim(),
                    parent_id: parentId,
                    visibility,
                    mentions: [], // TODO: Parse @mentions from body
                }),
            });

            const data = await res.json();

            if (res.ok && data.comment) {
                setBody("");
                onCommentAdded(data.comment);
                toast.success("Comment added");
            } else {
                throw new Error(data.error);
            }
        } catch (error: any) {
            toast.error(error.message || "Failed to add comment");
        } finally {
            setSubmitting(false);
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        // Submit on Cmd/Ctrl + Enter
        if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
            e.preventDefault();
            handleSubmit();
        }
        // Cancel on Escape
        if (e.key === "Escape" && onCancel) {
            onCancel();
        }
    };

    const isExpanded = focused || body.length > 0;

    return (
        <div className={cn(
            "rounded-lg border transition-all",
            focused ? "border-primary-300 ring-2 ring-primary-100" : "border-secondary-200",
            parentId && "bg-secondary-50"
        )}>
            <Textarea
                ref={textareaRef}
                value={body}
                onChange={(e) => setBody(e.target.value)}
                onFocus={() => setFocused(true)}
                onBlur={() => setFocused(false)}
                onKeyDown={handleKeyDown}
                placeholder={placeholder}
                className={cn(
                    "border-0 bg-transparent resize-none focus-visible:ring-0 focus-visible:ring-offset-0",
                    isExpanded ? "min-h-[80px]" : "min-h-[40px]"
                )}
                disabled={submitting}
            />

            {/* Actions - show when focused or has content */}
            {isExpanded && (
                <div className="flex items-center justify-between px-3 py-2 border-t border-secondary-100">
                    <div className="flex items-center gap-2">
                        {/* Visibility Toggle */}
                        {!parentId && (
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        className="h-7 px-2 text-xs gap-1.5"
                                    >
                                        {visibility === "internal" ? (
                                            <>
                                                <Lock className="h-3 w-3" />
                                                Internal
                                            </>
                                        ) : (
                                            <>
                                                <Globe className="h-3 w-3" />
                                                External
                                            </>
                                        )}
                                    </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="start">
                                    <DropdownMenuItem onClick={() => setVisibility("internal")}>
                                        <Lock className="h-3.5 w-3.5 mr-2" />
                                        Internal
                                        <span className="text-xs text-secondary-400 ml-2">Team only</span>
                                    </DropdownMenuItem>
                                    <DropdownMenuItem onClick={() => setVisibility("external")}>
                                        <Globe className="h-3.5 w-3.5 mr-2" />
                                        External
                                        <span className="text-xs text-secondary-400 ml-2">Visible to clients</span>
                                    </DropdownMenuItem>
                                </DropdownMenuContent>
                            </DropdownMenu>
                        )}

                        {/* Mention Button */}
                        <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 px-2 text-xs gap-1"
                            onClick={() => {
                                const textarea = textareaRef.current;
                                if (textarea) {
                                    const cursorPos = textarea.selectionStart;
                                    const before = body.slice(0, cursorPos);
                                    const after = body.slice(cursorPos);
                                    setBody(before + "@" + after);
                                    textarea.focus();
                                    setTimeout(() => {
                                        textarea.setSelectionRange(cursorPos + 1, cursorPos + 1);
                                    }, 0);
                                }
                            }}
                        >
                            <AtSign className="h-3 w-3" />
                            Mention
                        </Button>
                    </div>

                    <div className="flex items-center gap-2">
                        {onCancel && (
                            <Button
                                variant="ghost"
                                size="sm"
                                className="h-7 px-2 text-xs"
                                onClick={onCancel}
                            >
                                <X className="h-3 w-3 mr-1" />
                                Cancel
                            </Button>
                        )}
                        <Button
                            size="sm"
                            className="h-7 px-3 text-xs"
                            onClick={handleSubmit}
                            disabled={!body.trim() || submitting}
                        >
                            {submitting ? (
                                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            ) : (
                                <>
                                    <Send className="h-3 w-3 mr-1" />
                                    Send
                                </>
                            )}
                        </Button>
                    </div>
                </div>
            )}

            {/* Keyboard hint */}
            {isExpanded && (
                <div className="px-3 pb-2 text-[10px] text-secondary-400">
                    Press <kbd className="px-1 py-0.5 bg-secondary-100 rounded text-[9px]">⌘</kbd> +
                    <kbd className="px-1 py-0.5 bg-secondary-100 rounded text-[9px] ml-1">Enter</kbd> to send
                </div>
            )}
        </div>
    );
}
