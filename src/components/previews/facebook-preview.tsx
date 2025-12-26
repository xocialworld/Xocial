"use client";


import Image from "next/image";
import { ThumbsUp, MessageCircle, Share2, Globe, MoreHorizontal } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";

interface FacebookPreviewProps {
    content: string;
    media?: { url: string; type: "image" | "video" }[];
    pageName?: string;
    avatar?: string;
    timestamp?: Date;
    className?: string;
}

export function FacebookPreview({
    content,
    media = [],
    pageName = "Your Page",
    avatar,
    timestamp = new Date(),
    className,
}: FacebookPreviewProps) {
    // Format content with hashtags
    const formattedContent = content.split(" ").map((word, i) => {
        if (word.startsWith("#")) {
            return (
                <span key={i} className="text-[#1877f2] hover:underline cursor-pointer">
                    {word}{" "}
                </span>
            );
        }
        if (word.startsWith("@")) {
            return (
                <span key={i} className="text-[#1877f2] hover:underline cursor-pointer">
                    {word}{" "}
                </span>
            );
        }
        return word + " ";
    });

    // Time ago format
    const timeAgo = () => {
        const now = new Date();
        const diff = now.getTime() - timestamp.getTime();
        const hours = Math.floor(diff / (1000 * 60 * 60));
        if (hours < 1) return "Just now";
        if (hours < 24) return `${hours}h`;
        return timestamp.toLocaleDateString("en-US", { month: "short", day: "numeric" });
    };

    return (
        <div className={cn("bg-white rounded-lg shadow-sm border border-gray-200 max-w-[500px]", className)}>
            {/* Header */}
            <div className="p-3 flex items-start justify-between">
                <div className="flex items-center gap-2">
                    <Avatar className="h-10 w-10">
                        {avatar ? (
                            <AvatarImage src={avatar} alt={pageName} />
                        ) : (
                            <AvatarFallback className="bg-[#1877f2] text-white text-sm font-bold">
                                {pageName.charAt(0).toUpperCase()}
                            </AvatarFallback>
                        )}
                    </Avatar>
                    <div>
                        <p className="font-semibold text-[15px] text-gray-900 hover:underline cursor-pointer">
                            {pageName}
                        </p>
                        <div className="flex items-center gap-1 text-[13px] text-gray-500">
                            <span>{timeAgo()}</span>
                            <span>·</span>
                            <Globe className="h-3 w-3" />
                        </div>
                    </div>
                </div>
                <button className="p-2 rounded-full hover:bg-gray-100">
                    <MoreHorizontal className="h-5 w-5 text-gray-500" />
                </button>
            </div>

            {/* Content */}
            <div className="px-3 pb-3">
                <p className="text-[15px] text-gray-900 whitespace-pre-wrap">{formattedContent}</p>
            </div>

            {/* Media */}
            {media.length > 0 && (
                <div className="bg-gray-100">
                    {media.length === 1 ? (
                        media[0].type === "video" ? (
                            <video
                                src={media[0].url}
                                className="w-full max-h-[400px] object-cover"
                                controls={false}
                                muted
                            />
                        ) : (
                            <Image
                                src={media[0].url}
                                alt="Post media"
                                width={500}
                                height={400}
                                className="w-full max-h-[400px] object-cover"
                            />
                        )
                    ) : (
                        <div className={cn(
                            "grid gap-1",
                            media.length === 2 && "grid-cols-2",
                            media.length === 3 && "grid-cols-2",
                            media.length >= 4 && "grid-cols-2"
                        )}>
                            {media.slice(0, 4).map((m, i) => (
                                <div
                                    key={i}
                                    className={cn(
                                        "relative",
                                        media.length === 3 && i === 0 && "row-span-2",
                                        i === 3 && media.length > 4 && "relative"
                                    )}
                                >
                                    <Image
                                        src={m.url}
                                        alt={`Media ${i + 1}`}
                                        fill
                                        className="object-cover"
                                    />
                                    {i === 3 && media.length > 4 && (
                                        <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                                            <span className="text-white text-2xl font-bold">+{media.length - 4}</span>
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}

            {/* Reactions summary */}
            <div className="px-3 py-2 flex items-center justify-between text-[13px] text-gray-500 border-b border-gray-200">
                <div className="flex items-center gap-1">
                    <div className="flex -space-x-1">
                        <div className="h-[18px] w-[18px] rounded-full bg-[#1877f2] flex items-center justify-center">
                            <ThumbsUp className="h-2.5 w-2.5 text-white fill-white" />
                        </div>
                    </div>
                    <span className="ml-1 hover:underline cursor-pointer">0</span>
                </div>
                <div className="flex items-center gap-3">
                    <span className="hover:underline cursor-pointer">0 comments</span>
                    <span className="hover:underline cursor-pointer">0 shares</span>
                </div>
            </div>

            {/* Actions */}
            <div className="px-2 py-1 flex items-center justify-around">
                <button className="flex-1 flex items-center justify-center gap-2 py-2 rounded-lg hover:bg-gray-100 text-gray-600">
                    <ThumbsUp className="h-5 w-5" />
                    <span className="font-semibold text-[15px]">Like</span>
                </button>
                <button className="flex-1 flex items-center justify-center gap-2 py-2 rounded-lg hover:bg-gray-100 text-gray-600">
                    <MessageCircle className="h-5 w-5" />
                    <span className="font-semibold text-[15px]">Comment</span>
                </button>
                <button className="flex-1 flex items-center justify-center gap-2 py-2 rounded-lg hover:bg-gray-100 text-gray-600">
                    <Share2 className="h-5 w-5" />
                    <span className="font-semibold text-[15px]">Share</span>
                </button>
            </div>
        </div>
    );
}
