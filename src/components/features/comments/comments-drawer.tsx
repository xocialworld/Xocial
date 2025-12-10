"use client";

import { useState, useRef, useEffect } from "react";
import {
    X,
    Send,
    MoreHorizontal,
    Globe,
    Lock,
    Reply,
    Edit2,
    Trash2,
    AtSign,
    Smile,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { formatDistanceToNow } from "date-fns";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface Comment {
    id: string;
    author: {
        id: string;
        name: string;
        avatar?: string;
    };
    body: string;
    visibility: "internal" | "external";
    mentions: string[];
    createdAt: Date;
    parentId?: string;
    replies?: Comment[];
}

interface CommentsDrawerProps {
    open: boolean;
    onClose: () => void;
    contentId: string;
    contentTitle?: string;
}

// Mock team members for @mention
const teamMembers = [
    { id: "1", name: "Sarah Chen", avatar: null, role: "Manager" },
    { id: "2", name: "Alex Rivera", avatar: null, role: "Creator" },
    { id: "3", name: "Jordan Kim", avatar: null, role: "Admin" },
    { id: "4", name: "Taylor Smith", avatar: null, role: "Creator" },
];

// Mock comments
const mockComments: Comment[] = [
    {
        id: "1",
        author: { id: "1", name: "Sarah Chen", avatar: undefined },
        body: "Love this content! Can we add more hashtags for better reach?",
        visibility: "internal",
        mentions: [],
        createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000),
        replies: [
            {
                id: "1-1",
                author: { id: "2", name: "Alex Rivera", avatar: undefined },
                body: "Great idea! I'll add some trending ones. @Sarah Chen",
                visibility: "internal",
                mentions: ["1"],
                createdAt: new Date(Date.now() - 1 * 60 * 60 * 1000),
                parentId: "1",
            },
        ],
    },
    {
        id: "2",
        author: { id: "3", name: "Jordan Kim", avatar: undefined },
        body: "Please review the brand guidelines for the logo placement.",
        visibility: "external",
        mentions: [],
        createdAt: new Date(Date.now() - 24 * 60 * 60 * 1000),
    },
];

function CommentItem({
    comment,
    onReply,
    isReply = false,
}: {
    comment: Comment;
    onReply: (id: string) => void;
    isReply?: boolean;
}) {
    return (
        <div className={cn("group", isReply && "ml-10 mt-3")}>
            <div className="flex gap-3">
                <Avatar className={cn("flex-shrink-0", isReply ? "h-7 w-7" : "h-8 w-8")}>
                    {comment.author.avatar ? (
                        <AvatarImage src={comment.author.avatar} />
                    ) : (
                        <AvatarFallback className="bg-primary-100 text-primary-600 text-xs font-medium">
                            {comment.author.name.charAt(0)}
                        </AvatarFallback>
                    )}
                </Avatar>
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-medium text-secondary-900">
                            {comment.author.name}
                        </span>
                        <Badge
                            variant="outline"
                            className={cn(
                                "text-[10px] px-1.5 py-0",
                                comment.visibility === "internal"
                                    ? "border-orange-200 text-orange-600 bg-orange-50"
                                    : "border-blue-200 text-blue-600 bg-blue-50"
                            )}
                        >
                            {comment.visibility === "internal" ? (
                                <>
                                    <Lock className="h-2.5 w-2.5 mr-0.5" />
                                    Team
                                </>
                            ) : (
                                <>
                                    <Globe className="h-2.5 w-2.5 mr-0.5" />
                                    Client
                                </>
                            )}
                        </Badge>
                        <span className="text-xs text-secondary-400">
                            {formatDistanceToNow(comment.createdAt, { addSuffix: true })}
                        </span>
                    </div>
                    <p className="text-sm text-secondary-700 mt-1 whitespace-pre-wrap">
                        {comment.body.split(" ").map((word, i) =>
                            word.startsWith("@") ? (
                                <span key={i} className="text-primary-600 font-medium">
                                    {word}{" "}
                                </span>
                            ) : (
                                word + " "
                            )
                        )}
                    </p>
                    <div className="flex items-center gap-2 mt-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                            onClick={() => onReply(comment.id)}
                            className="flex items-center gap-1 text-xs text-secondary-500 hover:text-secondary-700"
                        >
                            <Reply className="h-3 w-3" />
                            Reply
                        </button>
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <button className="p-1 rounded hover:bg-secondary-100">
                                    <MoreHorizontal className="h-3 w-3 text-secondary-400" />
                                </button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="start">
                                <DropdownMenuItem>
                                    <Edit2 className="h-3 w-3 mr-2" />
                                    Edit
                                </DropdownMenuItem>
                                <DropdownMenuItem className="text-red-600">
                                    <Trash2 className="h-3 w-3 mr-2" />
                                    Delete
                                </DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </div>
                </div>
            </div>

            {/* Replies */}
            {comment.replies?.map((reply) => (
                <CommentItem key={reply.id} comment={reply} onReply={onReply} isReply />
            ))}
        </div>
    );
}

export function CommentsDrawer({
    open,
    onClose,
    contentId,
    contentTitle,
}: CommentsDrawerProps) {
    const [comments, setComments] = useState<Comment[]>(mockComments);
    const [newComment, setNewComment] = useState("");
    const [visibility, setVisibility] = useState<"internal" | "external">("internal");
    const [replyingTo, setReplyingTo] = useState<string | null>(null);
    const [showMentions, setShowMentions] = useState(false);
    const [mentionSearch, setMentionSearch] = useState("");
    const inputRef = useRef<HTMLTextAreaElement>(null);

    // Handle @mention detection
    const handleInputChange = (value: string) => {
        setNewComment(value);
        const lastAtIndex = value.lastIndexOf("@");
        if (lastAtIndex !== -1) {
            const textAfterAt = value.slice(lastAtIndex + 1);
            if (!textAfterAt.includes(" ")) {
                setShowMentions(true);
                setMentionSearch(textAfterAt.toLowerCase());
            } else {
                setShowMentions(false);
            }
        } else {
            setShowMentions(false);
        }
    };

    const insertMention = (member: typeof teamMembers[0]) => {
        const lastAtIndex = newComment.lastIndexOf("@");
        const beforeAt = newComment.slice(0, lastAtIndex);
        setNewComment(`${beforeAt}@${member.name} `);
        setShowMentions(false);
        inputRef.current?.focus();
    };

    const filteredMembers = teamMembers.filter((m) =>
        m.name.toLowerCase().includes(mentionSearch)
    );

    const handleSubmit = () => {
        if (!newComment.trim()) return;

        const newCommentObj: Comment = {
            id: Date.now().toString(),
            author: { id: "current", name: "You", avatar: undefined },
            body: newComment,
            visibility,
            mentions: [],
            createdAt: new Date(),
            parentId: replyingTo || undefined,
        };

        if (replyingTo) {
            setComments((prev) =>
                prev.map((c) =>
                    c.id === replyingTo
                        ? { ...c, replies: [...(c.replies || []), newCommentObj] }
                        : c
                )
            );
        } else {
            setComments((prev) => [newCommentObj, ...prev]);
        }

        setNewComment("");
        setReplyingTo(null);
    };

    if (!open) return null;

    return (
        <>
            {/* Backdrop */}
            <div
                className="fixed inset-0 bg-black/20 backdrop-blur-sm z-[100]"
                onClick={onClose}
            />

            {/* Drawer */}
            <div className="fixed right-0 top-0 h-full w-full max-w-md bg-white shadow-2xl z-[100] flex flex-col animate-in slide-in-from-right duration-300">
                {/* Header */}
                <div className="flex items-center justify-between p-4 border-b border-secondary-200">
                    <div>
                        <h2 className="font-semibold text-secondary-900">Comments</h2>
                        {contentTitle && (
                            <p className="text-sm text-secondary-500 truncate max-w-[250px]">
                                {contentTitle}
                            </p>
                        )}
                    </div>
                    <Button variant="ghost" size="sm" onClick={onClose}>
                        <X className="h-4 w-4" />
                    </Button>
                </div>

                {/* Comments List */}
                <div className="flex-1 overflow-y-auto p-4 space-y-4">
                    {comments.length === 0 ? (
                        <div className="text-center py-12">
                            <div className="w-16 h-16 rounded-full bg-secondary-100 flex items-center justify-center mx-auto mb-4">
                                <AtSign className="h-8 w-8 text-secondary-400" />
                            </div>
                            <p className="text-secondary-600 font-medium">No comments yet</p>
                            <p className="text-sm text-secondary-500 mt-1">
                                Start the conversation by adding a comment below
                            </p>
                        </div>
                    ) : (
                        comments.map((comment) => (
                            <CommentItem
                                key={comment.id}
                                comment={comment}
                                onReply={(id) => setReplyingTo(id)}
                            />
                        ))
                    )}
                </div>

                {/* Input Area */}
                <div className="border-t border-secondary-200 p-4">
                    {/* Visibility Toggle */}
                    <div className="flex gap-2 mb-3">
                        <button
                            onClick={() => setVisibility("internal")}
                            className={cn(
                                "flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-colors",
                                visibility === "internal"
                                    ? "bg-orange-100 text-orange-700"
                                    : "bg-secondary-100 text-secondary-600 hover:bg-secondary-200"
                            )}
                        >
                            <Lock className="h-3 w-3" />
                            Team Only
                        </button>
                        <button
                            onClick={() => setVisibility("external")}
                            className={cn(
                                "flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-colors",
                                visibility === "external"
                                    ? "bg-blue-100 text-blue-700"
                                    : "bg-secondary-100 text-secondary-600 hover:bg-secondary-200"
                            )}
                        >
                            <Globe className="h-3 w-3" />
                            Client Visible
                        </button>
                    </div>

                    {/* Reply indicator */}
                    {replyingTo && (
                        <div className="flex items-center gap-2 mb-2 text-xs text-secondary-500">
                            <Reply className="h-3 w-3" />
                            Replying to comment
                            <button
                                onClick={() => setReplyingTo(null)}
                                className="text-primary-600 hover:underline"
                            >
                                Cancel
                            </button>
                        </div>
                    )}

                    {/* Input */}
                    <div className="relative">
                        <textarea
                            ref={inputRef}
                            value={newComment}
                            onChange={(e) => handleInputChange(e.target.value)}
                            placeholder="Add a comment... Use @ to mention"
                            className="w-full px-4 py-3 pr-12 rounded-xl border border-secondary-200 focus:border-primary-300 focus:ring-2 focus:ring-primary-500/10 outline-none resize-none min-h-[80px] text-sm"
                            onKeyDown={(e) => {
                                if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
                                    handleSubmit();
                                }
                            }}
                        />
                        <Button
                            size="sm"
                            className="absolute right-2 bottom-2"
                            onClick={handleSubmit}
                            disabled={!newComment.trim()}
                        >
                            <Send className="h-4 w-4" />
                        </Button>

                        {/* Mention dropdown */}
                        {showMentions && filteredMembers.length > 0 && (
                            <div className="absolute bottom-full left-0 right-0 mb-2 bg-white border border-secondary-200 rounded-lg shadow-lg overflow-hidden">
                                {filteredMembers.map((member) => (
                                    <button
                                        key={member.id}
                                        onClick={() => insertMention(member)}
                                        className="w-full flex items-center gap-2 p-2 hover:bg-secondary-50 text-left"
                                    >
                                        <Avatar className="h-6 w-6">
                                            <AvatarFallback className="bg-primary-100 text-primary-600 text-xs">
                                                {member.name.charAt(0)}
                                            </AvatarFallback>
                                        </Avatar>
                                        <div>
                                            <p className="text-sm font-medium text-secondary-900">{member.name}</p>
                                            <p className="text-xs text-secondary-500">{member.role}</p>
                                        </div>
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>

                    <p className="text-xs text-secondary-400 mt-2">
                        Press ⌘+Enter to send
                    </p>
                </div>
            </div>
        </>
    );
}
