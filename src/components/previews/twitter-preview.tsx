"use client";

import { Heart, MessageCircle, Repeat2, Share, BarChart2, Bookmark, MoreHorizontal, BadgeCheck } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";

interface TwitterPreviewProps {
    content: string;
    media?: { url: string; type: "image" | "video" }[];
    displayName?: string;
    username?: string;
    avatar?: string;
    verified?: boolean;
    timestamp?: Date;
    className?: string;
}

export function TwitterPreview({
    content,
    media = [],
    displayName = "Your Name",
    username = "youraccount",
    avatar,
    verified = false,
    timestamp = new Date(),
    className,
}: TwitterPreviewProps) {
    // Process hashtags, mentions, and links
    const formattedContent = content.split(" ").map((word, i) => {
        if (word.startsWith("#")) {
            return (
                <span key={i} className="text-[#1d9bf0]">
                    {word}{" "}
                </span>
            );
        }
        if (word.startsWith("@")) {
            return (
                <span key={i} className="text-[#1d9bf0]">
                    {word}{" "}
                </span>
            );
        }
        if (word.startsWith("http://") || word.startsWith("https://")) {
            return (
                <span key={i} className="text-[#1d9bf0]">
                    {word}{" "}
                </span>
            );
        }
        return word + " ";
    });

    // Character count indicator
    const charCount = content.length;
    const maxChars = 280;
    const isOverLimit = charCount > maxChars;

    return (
        <div className={cn("bg-white rounded-xl border border-gray-200 p-4 max-w-[500px]", className)}>
            <div className="flex gap-3">
                {/* Avatar */}
                <Avatar className="h-10 w-10 flex-shrink-0">
                    {avatar ? (
                        <AvatarImage src={avatar} alt={displayName} />
                    ) : (
                        <AvatarFallback className="bg-[#1d9bf0] text-white text-sm font-medium">
                            {displayName.charAt(0).toUpperCase()}
                        </AvatarFallback>
                    )}
                </Avatar>

                <div className="flex-1 min-w-0">
                    {/* Header */}
                    <div className="flex items-center gap-1">
                        <span className="font-bold text-[15px] text-gray-900 truncate">
                            {displayName}
                        </span>
                        {verified && (
                            <BadgeCheck className="h-4 w-4 text-[#1d9bf0] fill-[#1d9bf0]" />
                        )}
                        <span className="text-gray-500 text-[15px]">@{username}</span>
                        <span className="text-gray-500 text-[15px]">·</span>
                        <span className="text-gray-500 text-[15px]">
                            {timestamp.toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                        </span>
                    </div>

                    {/* Content */}
                    <div className="mt-1">
                        <p className={cn("text-[15px] text-gray-900 whitespace-pre-wrap", isOverLimit && "text-red-500")}>
                            {formattedContent}
                        </p>
                    </div>

                    {/* Media */}
                    {media.length > 0 && (
                        <div className="mt-3 rounded-2xl overflow-hidden border border-gray-200">
                            {media.length === 1 ? (
                                media[0].type === "video" ? (
                                    <video
                                        src={media[0].url}
                                        className="w-full max-h-[300px] object-cover"
                                        controls={false}
                                        muted
                                    />
                                ) : (
                                    <img
                                        src={media[0].url}
                                        alt="Post media"
                                        className="w-full max-h-[300px] object-cover"
                                    />
                                )
                            ) : (
                                <div className="grid grid-cols-2 gap-0.5">
                                    {media.slice(0, 4).map((m, i) => (
                                        <div key={i} className="aspect-square relative">
                                            <img
                                                src={m.url}
                                                alt={`Media ${i + 1}`}
                                                className="w-full h-full object-cover"
                                            />
                                            {i === 3 && media.length > 4 && (
                                                <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                                                    <span className="text-white text-xl font-bold">+{media.length - 4}</span>
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}

                    {/* Actions */}
                    <div className="flex items-center justify-between mt-3 max-w-[400px]">
                        <button className="flex items-center gap-1 text-gray-500 hover:text-[#1d9bf0] group">
                            <div className="p-2 rounded-full group-hover:bg-[#1d9bf0]/10">
                                <MessageCircle className="h-4 w-4" />
                            </div>
                            <span className="text-xs">0</span>
                        </button>
                        <button className="flex items-center gap-1 text-gray-500 hover:text-green-500 group">
                            <div className="p-2 rounded-full group-hover:bg-green-500/10">
                                <Repeat2 className="h-4 w-4" />
                            </div>
                            <span className="text-xs">0</span>
                        </button>
                        <button className="flex items-center gap-1 text-gray-500 hover:text-pink-500 group">
                            <div className="p-2 rounded-full group-hover:bg-pink-500/10">
                                <Heart className="h-4 w-4" />
                            </div>
                            <span className="text-xs">0</span>
                        </button>
                        <button className="flex items-center gap-1 text-gray-500 hover:text-[#1d9bf0] group">
                            <div className="p-2 rounded-full group-hover:bg-[#1d9bf0]/10">
                                <BarChart2 className="h-4 w-4" />
                            </div>
                            <span className="text-xs">0</span>
                        </button>
                        <div className="flex items-center gap-1">
                            <button className="p-2 rounded-full text-gray-500 hover:text-[#1d9bf0] hover:bg-[#1d9bf0]/10">
                                <Bookmark className="h-4 w-4" />
                            </button>
                            <button className="p-2 rounded-full text-gray-500 hover:text-[#1d9bf0] hover:bg-[#1d9bf0]/10">
                                <Share className="h-4 w-4" />
                            </button>
                        </div>
                    </div>

                    {/* Character count */}
                    {isOverLimit && (
                        <p className="mt-2 text-xs text-red-500">
                            {charCount}/{maxChars} characters (over limit by {charCount - maxChars})
                        </p>
                    )}
                </div>
            </div>
        </div>
    );
}
