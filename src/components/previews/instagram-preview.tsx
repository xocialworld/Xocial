"use client";

import { Heart, MessageCircle, Send, Bookmark, MoreHorizontal } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";

interface InstagramPreviewProps {
    content: string;
    media?: { url: string; type: "image" | "video" }[];
    username?: string;
    avatar?: string;
    timestamp?: Date;
    className?: string;
}

export function InstagramPreview({
    content,
    media = [],
    username = "your_account",
    avatar,
    timestamp = new Date(),
    className,
}: InstagramPreviewProps) {
    // Process hashtags and mentions
    const formattedContent = content.split(" ").map((word, i) => {
        if (word.startsWith("#")) {
            return (
                <span key={i} className="text-[#00376b]">
                    {word}{" "}
                </span>
            );
        }
        if (word.startsWith("@")) {
            return (
                <span key={i} className="text-[#00376b]">
                    {word}{" "}
                </span>
            );
        }
        return word + " ";
    });

    return (
        <div className={cn("bg-white rounded-lg border border-gray-200 overflow-hidden max-w-[400px]", className)}>
            {/* Header */}
            <div className="flex items-center justify-between p-3">
                <div className="flex items-center gap-2">
                    <Avatar className="h-8 w-8 ring-2 ring-gradient-to-tr from-yellow-400 via-pink-500 to-purple-600 ring-offset-2">
                        {avatar ? (
                            <AvatarImage src={avatar} alt={username} />
                        ) : (
                            <AvatarFallback className="bg-gradient-to-br from-purple-500 to-pink-500 text-white text-xs font-medium">
                                {username.charAt(0).toUpperCase()}
                            </AvatarFallback>
                        )}
                    </Avatar>
                    <div>
                        <p className="text-sm font-semibold text-gray-900">{username}</p>
                    </div>
                </div>
                <button className="p-1">
                    <MoreHorizontal className="h-5 w-5 text-gray-900" />
                </button>
            </div>

            {/* Media */}
            {media.length > 0 ? (
                <div className="aspect-square bg-gray-100 relative">
                    {media[0].type === "video" ? (
                        <video
                            src={media[0].url}
                            className="w-full h-full object-cover"
                            controls={false}
                            muted
                        />
                    ) : (
                        <img
                            src={media[0].url}
                            alt="Post media"
                            className="w-full h-full object-cover"
                        />
                    )}
                    {media.length > 1 && (
                        <div className="absolute top-3 right-3 bg-black/60 text-white text-xs px-2 py-1 rounded">
                            1/{media.length}
                        </div>
                    )}
                </div>
            ) : (
                <div className="aspect-square bg-gradient-to-br from-purple-100 to-pink-100 flex items-center justify-center">
                    <p className="text-gray-400 text-sm">No media</p>
                </div>
            )}

            {/* Actions */}
            <div className="p-3 flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <Heart className="h-6 w-6 text-gray-900 cursor-pointer hover:text-gray-500" />
                    <MessageCircle className="h-6 w-6 text-gray-900 cursor-pointer hover:text-gray-500" />
                    <Send className="h-6 w-6 text-gray-900 cursor-pointer hover:text-gray-500" />
                </div>
                <Bookmark className="h-6 w-6 text-gray-900 cursor-pointer hover:text-gray-500" />
            </div>

            {/* Likes */}
            <div className="px-3 pb-1">
                <p className="text-sm font-semibold text-gray-900">0 likes</p>
            </div>

            {/* Caption */}
            <div className="px-3 pb-2">
                <p className="text-sm text-gray-900">
                    <span className="font-semibold mr-1">{username}</span>
                    {formattedContent}
                </p>
            </div>

            {/* Timestamp */}
            <div className="px-3 pb-3">
                <p className="text-[10px] text-gray-400 uppercase">
                    {timestamp.toLocaleDateString("en-US", {
                        month: "long",
                        day: "numeric",
                    })}
                </p>
            </div>
        </div>
    );
}
