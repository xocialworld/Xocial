import Image from "next/image";
import { MediaAsset } from "@/hooks/use-media-assets";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Heart, MessageCircle, Send, Bookmark, MoreHorizontal, ThumbsUp, MessageSquare, Share2, Globe, MoreVertical } from "lucide-react";

interface PlatformPreviewProps {
    content: string;
    media: MediaAsset[];
    platform: 'instagram' | 'facebook' | 'linkedin';
    user?: {
        name: string;
        handle: string;
        avatar?: string;
    };
}

export function PlatformPreview({ content, media, platform, user }: PlatformPreviewProps) {
    const defaultUser = {
        name: "Your Brand",
        handle: "yourbrand",
        avatar: "",
    };

    const currentUser = user || defaultUser;

    if (platform === 'instagram') {
        return (
            <Card className="w-full max-w-[375px] mx-auto bg-white border border-gray-200 shadow-sm overflow-hidden text-sm font-sans">
                {/* Header */}
                <div className="flex items-center justify-between p-3">
                    <div className="flex items-center space-x-2">
                        <Avatar className="w-8 h-8">
                            <AvatarImage src={currentUser.avatar} />
                            <AvatarFallback>{currentUser.name[0]}</AvatarFallback>
                        </Avatar>
                        <span className="font-semibold text-xs">{currentUser.handle}</span>
                    </div>
                    <MoreHorizontal className="w-4 h-4 text-gray-500" />
                </div>

                {/* Media */}
                <div className="aspect-square bg-gray-100 relative items-center justify-center flex overflow-hidden">
                    {media.length > 0 ? (
                        media[0].file_type === 'video' || media[0].mime_type.startsWith('video/') ? (
                            <video src={media[0].url} className="w-full h-full object-cover" controls />
                        ) : (
                            <Image
                                src={media[0].url}
                                alt="Post content"
                                fill
                                sizes="375px"
                                className="object-cover"
                                unoptimized
                            />
                        )
                    ) : (
                        <div className="text-gray-400 text-xs">No media</div>
                    )}
                    {media.length > 1 && (
                        <div className="absolute top-2 right-2 bg-black/60 text-white text-[10px] px-2 py-1 rounded-full">
                            1/{media.length}
                        </div>
                    )}
                </div>

                {/* Actions */}
                <div className="p-3">
                    <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center space-x-4">
                            <Heart className="w-6 h-6" />
                            <MessageCircle className="w-6 h-6" />
                            <Send className="w-6 h-6" />
                        </div>
                        <Bookmark className="w-6 h-6" />
                    </div>
                    <div className="font-semibold text-xs mb-1">1,234 likes</div>
                    <div className="text-xs">
                        <span className="font-semibold mr-1">{currentUser.handle}</span>
                        {content || <span className="text-gray-400 italic">No content...</span>}
                    </div>
                    <div className="text-[10px] text-gray-400 mt-1 uppercase">2 hours ago</div>
                </div>
            </Card>
        );
    }

    if (platform === 'facebook') {
        return (
            <Card className="w-full max-w-[500px] mx-auto bg-white border border-gray-200 shadow-sm overflow-hidden font-sans">
                {/* Header */}
                <div className="p-4 flex items-center justify-between pb-2">
                    <div className="flex items-center space-x-2">
                        <Avatar className="w-10 h-10">
                            <AvatarImage src={currentUser.avatar} />
                            <AvatarFallback>{currentUser.name[0]}</AvatarFallback>
                        </Avatar>
                        <div>
                            <div className="font-semibold text-sm">{currentUser.name}</div>
                            <div className="text-xs text-gray-500 flex items-center">
                                2h <span className="mx-1">·</span> <Globe className="w-3 h-3" />
                            </div>
                        </div>
                    </div>
                    <MoreHorizontal className="w-5 h-5 text-gray-500" />
                </div>

                {/* Content */}
                <div className="px-4 pb-3 text-sm whitespace-pre-wrap">
                    {content || <span className="text-gray-400 italic">No content...</span>}
                </div>

                {/* Media */}
                {media.length > 0 && (
                    <div className={cn("bg-gray-100 overflow-hidden", media.length === 1 ? "aspect-auto" : "aspect-square grid grid-cols-2 gap-0.5")}>
                        {media.slice(0, 4).map((m, i) => (
                            <div key={m.id} className={cn("relative overflow-hidden", media.length === 1 ? "w-full h-full" : "w-full h-full")}>
                                {m.file_type === 'video' || m.mime_type.startsWith('video/') ? (
                                    <video src={m.url} className="w-full h-full object-cover" />
                                ) : (
                                    <Image
                                        src={m.url}
                                        alt="Post content"
                                        width={800}
                                        height={800}
                                        sizes={media.length === 1 ? "500px" : "250px"}
                                        className={cn(
                                            "object-cover",
                                            media.length === 1 ? "h-auto max-h-[500px] w-full" : "h-full w-full"
                                        )}
                                        unoptimized
                                    />
                                )}
                                {i === 3 && media.length > 4 && (
                                    <div className="absolute inset-0 bg-black/50 flex items-center justify-center text-white text-xl font-bold">
                                        +{media.length - 4}
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                )}

                {/* Stats */}
                <div className="px-4 py-2 text-xs text-gray-500 flex items-center justify-between border-b mx-4 border-gray-100">
                    <div className="flex items-center">
                        <div className="bg-blue-500 rounded-full p-0.5 mr-1">
                            <ThumbsUp className="w-2 h-2 text-white fill-current" />
                        </div>
                        120
                    </div>
                    <div>
                        12 comments 4 shares
                    </div>
                </div>

                {/* Actions */}
                <div className="px-2 py-1 flex items-center justify-between">
                    <Button variant="ghost" className="flex-1 text-gray-600 hover:bg-gray-100 h-8">
                        <ThumbsUp className="w-4 h-4 mr-2" /> Like
                    </Button>
                    <Button variant="ghost" className="flex-1 text-gray-600 hover:bg-gray-100 h-8">
                        <MessageSquare className="w-4 h-4 mr-2" /> Comment
                    </Button>
                    <Button variant="ghost" className="flex-1 text-gray-600 hover:bg-gray-100 h-8">
                        <Share2 className="w-4 h-4 mr-2" /> Share
                    </Button>
                </div>
            </Card>
        );
    }

    if (platform === 'linkedin') {
        return (
            <Card className="w-full max-w-[500px] mx-auto bg-white border border-gray-200 shadow-sm overflow-hidden font-sans">
                {/* Header */}
                <div className="p-4 flex items-center justify-between pb-2">
                    <div className="flex items-center space-x-2">
                        <Avatar className="w-10 h-10">
                            <AvatarImage src={currentUser.avatar} />
                            <AvatarFallback>{currentUser.name[0]}</AvatarFallback>
                        </Avatar>
                        <div>
                            <div className="font-semibold text-sm">{currentUser.name}</div>
                            <div className="text-xs text-gray-500">Post author details</div>
                            <div className="text-xs text-gray-500 flex items-center">
                                2h <span className="mx-1">·</span> <Globe className="w-3 h-3" />
                            </div>
                        </div>
                    </div>
                    <MoreHorizontal className="w-5 h-5 text-gray-500" />
                </div>

                {/* Content */}
                <div className="px-4 pb-2 text-sm whitespace-pre-wrap">
                    {content || <span className="text-gray-400 italic">No content...</span>}
                </div>

                {/* Media */}
                {media.length > 0 && (
                    <div className="bg-gray-100 overflow-hidden">
                        {media[0].file_type === 'video' || media[0].mime_type.startsWith('video/') ? (
                            <video src={media[0].url} className="w-full h-auto max-h-[500px] object-contain bg-black" controls />
                        ) : (
                            <Image
                                src={media[0].url}
                                alt="Post content"
                                width={800}
                                height={800}
                                sizes="500px"
                                className="h-auto max-h-[500px] w-full object-cover"
                                unoptimized
                            />
                        )}
                        {media.length > 1 && (
                            <div className="p-2 bg-gray-100 text-xs text-gray-500 text-center">
                                +{media.length - 1} more items (carousel not fully simulated)
                            </div>
                        )}
                    </div>
                )}

                {/* Stats */}
                <div className="px-4 py-2 text-xs text-gray-500 flex items-center justify-between border-b mx-4 border-gray-100">
                    <div className="flex items-center">
                        <ThumbsUp className="w-3 h-3 p-0.5 bg-blue-100 text-blue-600 rounded-full mr-1" />
                        15
                    </div>
                    <div>
                        2 comments
                    </div>
                </div>

                {/* Actions */}
                <div className="px-2 py-1 flex items-center justify-between">
                    <Button variant="ghost" className="flex-1 text-gray-600 hover:bg-gray-100 h-10 flex-col gap-0 text-[10px] sm:flex-row sm:text-sm sm:gap-2">
                        <ThumbsUp className="w-4 h-4" /> <span>Like</span>
                    </Button>
                    <Button variant="ghost" className="flex-1 text-gray-600 hover:bg-gray-100 h-10 flex-col gap-0 text-[10px] sm:flex-row sm:text-sm sm:gap-2">
                        <MessageSquare className="w-4 h-4" /> <span>Comment</span>
                    </Button>
                    <Button variant="ghost" className="flex-1 text-gray-600 hover:bg-gray-100 h-10 flex-col gap-0 text-[10px] sm:flex-row sm:text-sm sm:gap-2">
                        <Share2 className="w-4 h-4" /> <span>Repost</span>
                    </Button>
                    <Button variant="ghost" className="flex-1 text-gray-600 hover:bg-gray-100 h-10 flex-col gap-0 text-[10px] sm:flex-row sm:text-sm sm:gap-2">
                        <Send className="w-4 h-4" /> <span>Send</span>
                    </Button>
                </div>
            </Card>
        );
    }

    return null;
}
