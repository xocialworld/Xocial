"use client";

import { formatDistanceToNow } from "date-fns";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Reply, MoreHorizontal, ThumbsUp } from "lucide-react";
import { ReplyComposer } from "./reply-composer";
import { useState } from "react";

export interface Comment {
    id: string;
    author_name: string;
    author_avatar?: string;
    content: string;
    platform: "instagram" | "facebook" | "twitter" | "linkedin";
    created_at: string;
    is_reply?: boolean;
}

interface CommentItemProps {
    comment: Comment;
    onReply?: (text: string) => Promise<void>;
}

export function CommentItem({ comment, onReply }: CommentItemProps) {
    const [isReplying, setIsReplying] = useState(false);

    const handleReplySubmit = async (text: string) => {
        if (onReply) {
            await onReply(text);
            setIsReplying(false);
        }
    };

    return (
        <div className="flex gap-4 p-4 border-b hover:bg-muted/5 transition-colors">
            <Avatar className="h-10 w-10">
                <AvatarImage src={comment.author_avatar} alt={comment.author_name} />
                <AvatarFallback>{comment.author_name.charAt(0)}</AvatarFallback>
            </Avatar>
            <div className="flex-1 space-y-1">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <span className="font-semibold text-sm">{comment.author_name}</span>
                        <span className="text-xs text-muted-foreground">
                            {formatDistanceToNow(new Date(comment.created_at), { addSuffix: true })}
                        </span>
                        <span className="text-xs px-2 py-0.5 rounded-full bg-secondary-100 text-secondary-700 capitalize">
                            {comment.platform}
                        </span>
                    </div>
                    <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                        <MoreHorizontal className="h-4 w-4" />
                    </Button>
                </div>
                <p className="text-sm text-secondary-800 leading-relaxed">
                    {comment.content}
                </p>

                <div className="flex items-center gap-4 pt-2">
                    <Button variant="ghost" size="sm" className="h-auto p-0 text-muted-foreground hover:text-foreground">
                        <ThumbsUp className="mr-1.5 h-3.5 w-3.5" />
                        Like
                    </Button>
                    <Button
                        variant="ghost"
                        size="sm"
                        className="h-auto p-0 text-muted-foreground hover:text-foreground"
                        onClick={() => setIsReplying(!isReplying)}
                    >
                        <Reply className="mr-1.5 h-3.5 w-3.5" />
                        Reply
                    </Button>
                </div>

                {isReplying && (
                    <div className="mt-4 pl-4 border-l-2 border-muted">
                        <ReplyComposer
                            onSubmit={handleReplySubmit}
                            onCancel={() => setIsReplying(false)}
                        />
                    </div>
                )}
            </div>
        </div>
    );
}
