"use client";

import { useState, useEffect, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import {
    MessageSquare,
    AtSign,
    Heart,
    Send,
    Filter,
    RefreshCw,
    Inbox,
    CheckCheck,
    Star,
    Archive,
    Search,
    Instagram,
    Facebook,
    Twitter,
    Linkedin,
    Youtube,
    Loader2,
    ChevronRight,
    Reply,
    MoreHorizontal,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import {
    PageHeader,
    PageContainer,
} from "@/components/shared/page-components";
import { cn } from "@/lib/utils";
import { formatDistanceToNow } from "date-fns";
import { useSelectedWorkspace } from "@/store/workspaceStore";

// Types
type EngagementType = "comment" | "mention" | "dm" | "like";
type EngagementStatus = "new" | "read" | "replied" | "archived";
type Platform = "instagram" | "facebook" | "twitter" | "linkedin" | "youtube" | "tiktok";

interface EngagementItem {
    id: string;
    type: EngagementType;
    status: EngagementStatus;
    platform: Platform;
    authorName: string;
    authorHandle: string;
    authorAvatar: string | null;
    content: string;
    postPreview?: string;
    createdAt: string;
    isStarred: boolean;
}

interface EngagementAccount {
    id: string;
    platform: string;
    name: string;
    avatar: string | null;
}

// Mock data for demonstration


// Platform icon component
function PlatformIcon({ platform, className }: { platform: Platform; className?: string }) {
    const icons: Record<Platform, typeof Instagram> = {
        instagram: Instagram,
        facebook: Facebook,
        twitter: Twitter,
        linkedin: Linkedin,
        youtube: Youtube,
        tiktok: MessageSquare, // Use generic for TikTok
    };
    const Icon = icons[platform] || MessageSquare;
    return <Icon className={className} />;
}

// Platform colors
const platformColors: Record<Platform, { bg: string; text: string; border: string }> = {
    instagram: { bg: "bg-pink-50", text: "text-pink-600", border: "border-pink-200" },
    facebook: { bg: "bg-blue-50", text: "text-blue-600", border: "border-blue-200" },
    twitter: { bg: "bg-sky-50", text: "text-sky-600", border: "border-sky-200" },
    linkedin: { bg: "bg-indigo-50", text: "text-indigo-600", border: "border-indigo-200" },
    youtube: { bg: "bg-red-50", text: "text-red-600", border: "border-red-200" },
    tiktok: { bg: "bg-gray-50", text: "text-gray-600", border: "border-gray-200" },
};

// Type icons
const typeIcons: Record<EngagementType, typeof MessageSquare> = {
    comment: MessageSquare,
    mention: AtSign,
    dm: Send,
    like: Heart,
};

// Folder navigation
const folders = [
    { id: "all", label: "All Inbox", icon: Inbox, count: 0 },
    { id: "unread", label: "Unread", icon: MessageSquare, count: 0 },
    { id: "starred", label: "Starred", icon: Star, count: 0 },
    { id: "replied", label: "Replied", icon: CheckCheck, count: 0 },
    { id: "archived", label: "Archived", icon: Archive, count: 0 },
];

// Fetch engagement data
async function fetchEngagement(workspaceId?: string) {
    const params = new URLSearchParams();
    if (workspaceId) params.append("workspaceId", workspaceId);

    const response = await fetch(`/api/engagement?${params.toString()}`);
    if (!response.ok) throw new Error("Failed to fetch engagement");
    return response.json();
}

export default function EngagementInboxPage() {
    const [activeFolder, setActiveFolder] = useState("all");
    const [activePlatform, setActivePlatform] = useState<Platform | "all">("all");
    const [selectedItem, setSelectedItem] = useState<EngagementItem | null>(null);
    const [searchQuery, setSearchQuery] = useState("");
    const [replyText, setReplyText] = useState("");

    const selectedWorkspace = useSelectedWorkspace();
    const workspaceId = selectedWorkspace?.id;

    // Fetch engagement data
    const { data, isLoading, refetch, isFetching } = useQuery({
        queryKey: ["engagement", workspaceId],
        queryFn: () => fetchEngagement(workspaceId),
        enabled: !!workspaceId,
    });

    // Transform API data to component format
    const items: EngagementItem[] = (data?.data?.items || []).map((item: any) => ({
        id: item.id,
        type: item.type as EngagementType,
        status: item.responded ? 'replied' : (!item.isRead ? 'new' : 'read') as EngagementStatus,
        platform: item.platform as Platform,
        authorName: item.user,
        authorHandle: item.handle,
        authorAvatar: item.avatar,
        content: item.content,
        postPreview: item.postTitle, // Using post title as preview context for now
        createdAt: item.timestamp,
        isStarred: false, // Not yet supported by API
    }));

    // Filter items based on folder, platform, and search
    const filteredItems = items.filter((item) => {
        // Folder filter
        if (activeFolder === "unread" && item.status !== "new") return false;
        if (activeFolder === "starred" && !item.isStarred) return false;
        if (activeFolder === "replied" && item.status !== "replied") return false;
        if (activeFolder === "archived" && item.status !== "archived") return false;

        // Platform filter
        if (activePlatform !== "all" && item.platform !== activePlatform) return false;

        // Search filter
        if (searchQuery) {
            const query = searchQuery.toLowerCase();
            return (
                item.content.toLowerCase().includes(query) ||
                item.authorName.toLowerCase().includes(query) ||
                item.authorHandle.toLowerCase().includes(query)
            );
        }

        return true;
    });

    // Calculate folder counts
    const folderCounts = {
        all: items.length,
        unread: items.filter((i) => i.status === "new").length,
        starred: items.filter((i) => i.isStarred).length,
        replied: items.filter((i) => i.status === "replied").length,
        archived: items.filter((i) => i.status === "archived").length,
    };

    // Handle reply
    const handleReply = useCallback(async () => {
        if (!selectedItem || !replyText.trim()) return;

        // TODO: Implement actual reply API call
        console.log("Replying to:", selectedItem.id, "with:", replyText);
        setReplyText("");
        // Show success toast
    }, [selectedItem, replyText]);

    return (
        <PageContainer>
            <PageHeader
                shortCode="E"
                title="Engagement"
                description="Manage comments, mentions, and messages from all your platforms"
                icon={MessageSquare}
                iconColor="text-pink-500"
            />

            <div className="flex flex-col lg:flex-row gap-6 h-[calc(100vh-220px)]">
                {/* Sidebar */}
                <div className="lg:w-64 flex-shrink-0">
                    <div className="bg-white rounded-xl border border-secondary-200 shadow-sm overflow-hidden h-full">
                        {/* Search */}
                        <div className="p-3 border-b border-secondary-100">
                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-secondary-400" />
                                <Input
                                    placeholder="Search messages..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className="pl-9 h-9 text-sm"
                                />
                            </div>
                        </div>

                        {/* Folders */}
                        <div className="p-2 border-b border-secondary-100">
                            <p className="px-2 py-1 text-xs font-medium text-secondary-400 uppercase tracking-wide">
                                Folders
                            </p>
                            <nav className="space-y-0.5 mt-1">
                                {folders.map((folder) => {
                                    const count = folderCounts[folder.id as keyof typeof folderCounts] || 0;
                                    return (
                                        <button
                                            key={folder.id}
                                            onClick={() => setActiveFolder(folder.id)}
                                            className={cn(
                                                "w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm transition-colors",
                                                activeFolder === folder.id
                                                    ? "bg-primary-50 text-primary-700"
                                                    : "text-secondary-600 hover:bg-secondary-50"
                                            )}
                                        >
                                            <div className="flex items-center gap-2">
                                                <folder.icon className="h-4 w-4" />
                                                <span>{folder.label}</span>
                                            </div>
                                            {count > 0 && (
                                                <Badge
                                                    variant="secondary"
                                                    className={cn(
                                                        "text-xs px-1.5 min-w-[20px] justify-center",
                                                        activeFolder === folder.id && "bg-primary-100 text-primary-700"
                                                    )}
                                                >
                                                    {count}
                                                </Badge>
                                            )}
                                        </button>
                                    );
                                })}
                            </nav>
                        </div>

                        {/* Platform Filters */}
                        <div className="p-2">
                            <p className="px-2 py-1 text-xs font-medium text-secondary-400 uppercase tracking-wide">
                                Platforms
                            </p>
                            <nav className="space-y-0.5 mt-1">
                                <button
                                    onClick={() => setActivePlatform("all")}
                                    className={cn(
                                        "w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors",
                                        activePlatform === "all"
                                            ? "bg-secondary-100 text-secondary-900"
                                            : "text-secondary-600 hover:bg-secondary-50"
                                    )}
                                >
                                    <Filter className="h-4 w-4" />
                                    <span>All Platforms</span>
                                </button>
                                {(["instagram", "facebook", "twitter", "linkedin", "youtube"] as Platform[]).map(
                                    (platform) => {
                                        const colors = platformColors[platform];
                                        return (
                                            <button
                                                key={platform}
                                                onClick={() => setActivePlatform(platform)}
                                                className={cn(
                                                    "w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors",
                                                    activePlatform === platform
                                                        ? `${colors.bg} ${colors.text}`
                                                        : "text-secondary-600 hover:bg-secondary-50"
                                                )}
                                            >
                                                <PlatformIcon platform={platform} className="h-4 w-4" />
                                                <span className="capitalize">{platform}</span>
                                            </button>
                                        );
                                    }
                                )}
                            </nav>
                        </div>

                        {/* Refresh */}
                        <div className="p-3 border-t border-secondary-100 mt-auto">
                            <Button
                                variant="outline"
                                size="sm"
                                className="w-full gap-2"
                                onClick={() => refetch()}
                                disabled={isFetching}
                            >
                                <RefreshCw className={cn("h-4 w-4", isFetching && "animate-spin")} />
                                Refresh
                            </Button>
                        </div>
                    </div>
                </div>

                {/* Message List */}
                <div className="lg:w-96 flex-shrink-0">
                    <div className="bg-white rounded-xl border border-secondary-200 shadow-sm h-full flex flex-col">
                        {/* List Header */}
                        <div className="p-4 border-b border-secondary-100 flex items-center justify-between">
                            <div>
                                <h3 className="font-medium text-secondary-900">
                                    {folders.find((f) => f.id === activeFolder)?.label || "All Messages"}
                                </h3>
                                <p className="text-xs text-secondary-500">
                                    {filteredItems.length} {filteredItems.length === 1 ? "message" : "messages"}
                                </p>
                            </div>
                        </div>

                        {/* Message List */}
                        <div className="flex-1 overflow-y-auto">
                            {isLoading ? (
                                <div className="p-4 space-y-4">
                                    {[1, 2, 3, 4, 5].map((i) => (
                                        <div key={i} className="flex gap-3">
                                            <Skeleton className="h-10 w-10 rounded-full" />
                                            <div className="flex-1 space-y-2">
                                                <Skeleton className="h-4 w-32" />
                                                <Skeleton className="h-4 w-full" />
                                                <Skeleton className="h-3 w-20" />
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : filteredItems.length === 0 ? (
                                <div className="flex flex-col items-center justify-center h-64 text-center p-6">
                                    <div className="h-12 w-12 rounded-full bg-secondary-100 flex items-center justify-center mb-3">
                                        <Inbox className="h-6 w-6 text-secondary-400" />
                                    </div>
                                    <p className="text-secondary-600 font-medium">No messages</p>
                                    <p className="text-sm text-secondary-500 mt-1">
                                        {searchQuery
                                            ? "Try a different search term"
                                            : "Your inbox is empty. Messages will appear here."}
                                    </p>
                                </div>
                            ) : (
                                <div className="divide-y divide-secondary-100">
                                    {filteredItems.map((item) => {
                                        const TypeIcon = typeIcons[item.type];
                                        const colors = platformColors[item.platform] || platformColors.tiktok;
                                        const isSelected = selectedItem?.id === item.id;

                                        return (
                                            <button
                                                key={item.id}
                                                onClick={() => setSelectedItem(item)}
                                                className={cn(
                                                    "w-full text-left p-4 transition-colors",
                                                    isSelected ? "bg-primary-50" : "hover:bg-secondary-50",
                                                    item.status === "new" && "bg-blue-50/50"
                                                )}
                                            >
                                                <div className="flex gap-3">
                                                    <div className="relative">
                                                        <Avatar className="h-10 w-10">
                                                            {item.authorAvatar ? (
                                                                <AvatarImage src={item.authorAvatar} alt={item.authorName} />
                                                            ) : (
                                                                <AvatarFallback className="bg-secondary-100 text-secondary-600 text-sm font-medium">
                                                                    {item.authorName.charAt(0)}
                                                                </AvatarFallback>
                                                            )}
                                                        </Avatar>
                                                        <div
                                                            className={cn(
                                                                "absolute -bottom-1 -right-1 rounded-full p-0.5",
                                                                colors.bg
                                                            )}
                                                        >
                                                            <PlatformIcon
                                                                platform={item.platform}
                                                                className={cn("h-3 w-3", colors.text)}
                                                            />
                                                        </div>
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                        <div className="flex items-center gap-2 mb-0.5">
                                                            <span className="font-medium text-secondary-900 text-sm truncate">
                                                                {item.authorName}
                                                            </span>
                                                            <span className="text-xs text-secondary-400">{item.authorHandle}</span>
                                                            {item.isStarred && (
                                                                <Star className="h-3 w-3 text-yellow-500 fill-yellow-500" />
                                                            )}
                                                        </div>
                                                        <div className="flex items-center gap-1.5 mb-1">
                                                            <TypeIcon className="h-3 w-3 text-secondary-400" />
                                                            <span className="text-xs text-secondary-500 capitalize">
                                                                {item.type}
                                                            </span>
                                                        </div>
                                                        <p className="text-sm text-secondary-600 line-clamp-2">{item.content}</p>
                                                        <p className="text-xs text-secondary-400 mt-1">
                                                            {formatDistanceToNow(new Date(item.createdAt), { addSuffix: true })}
                                                        </p>
                                                    </div>
                                                    {item.status === "new" && (
                                                        <div className="h-2 w-2 rounded-full bg-blue-500 mt-2" />
                                                    )}
                                                </div>
                                            </button>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Message Detail */}
                <div className="flex-1 min-w-0">
                    <div className="bg-white rounded-xl border border-secondary-200 shadow-sm h-full flex flex-col">
                        {selectedItem ? (
                            <>
                                {/* Detail Header */}
                                <div className="p-4 border-b border-secondary-100">
                                    <div className="flex items-start justify-between">
                                        <div className="flex gap-3">
                                            <Avatar className="h-12 w-12">
                                                {selectedItem.authorAvatar ? (
                                                    <AvatarImage src={selectedItem.authorAvatar} alt={selectedItem.authorName} />
                                                ) : (
                                                    <AvatarFallback className="bg-secondary-100 text-secondary-600 text-lg font-medium">
                                                        {selectedItem.authorName.charAt(0)}
                                                    </AvatarFallback>
                                                )}
                                            </Avatar>
                                            <div>
                                                <h3 className="font-semibold text-secondary-900">{selectedItem.authorName}</h3>
                                                <p className="text-sm text-secondary-500">{selectedItem.authorHandle}</p>
                                                <div className="flex items-center gap-2 mt-1">
                                                    <Badge
                                                        variant="outline"
                                                        className={cn(
                                                            "text-xs capitalize",
                                                            (platformColors[selectedItem.platform] || platformColors.tiktok).bg,
                                                            (platformColors[selectedItem.platform] || platformColors.tiktok).text,
                                                            (platformColors[selectedItem.platform] || platformColors.tiktok).border
                                                        )}
                                                    >
                                                        <PlatformIcon platform={selectedItem.platform} className="h-3 w-3 mr-1" />
                                                        {selectedItem.platform}
                                                    </Badge>
                                                    <Badge variant="outline" className="text-xs capitalize">
                                                        {selectedItem.type}
                                                    </Badge>
                                                </div>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                className={cn(
                                                    selectedItem.isStarred && "text-yellow-500"
                                                )}
                                            >
                                                <Star
                                                    className={cn(
                                                        "h-4 w-4",
                                                        selectedItem.isStarred && "fill-yellow-500"
                                                    )}
                                                />
                                            </Button>
                                            <Button variant="ghost" size="sm">
                                                <Archive className="h-4 w-4" />
                                            </Button>
                                            <Button variant="ghost" size="sm">
                                                <MoreHorizontal className="h-4 w-4" />
                                            </Button>
                                        </div>
                                    </div>
                                </div>

                                {/* Message Content */}
                                <div className="flex-1 p-6 overflow-y-auto">
                                    <div className="max-w-2xl">
                                        {selectedItem.postPreview && (
                                            <div className="mb-4 p-3 bg-secondary-50 rounded-lg border border-secondary-100">
                                                <p className="text-xs text-secondary-500 mb-1">In response to your post:</p>
                                                <p className="text-sm text-secondary-700 italic">&quot;{selectedItem.postPreview}&quot;</p>
                                            </div>
                                        )}
                                        <p className="text-secondary-900 leading-relaxed">{selectedItem.content}</p>
                                        <p className="text-sm text-secondary-400 mt-4">
                                            {formatDistanceToNow(new Date(selectedItem.createdAt), { addSuffix: true })}
                                        </p>
                                    </div>
                                </div>

                                {/* Reply Box */}
                                <div className="p-4 border-t border-secondary-100">
                                    <div className="flex gap-3">
                                        <Input
                                            placeholder="Type your reply..."
                                            value={replyText}
                                            onChange={(e) => setReplyText(e.target.value)}
                                            onKeyDown={(e) => {
                                                if (e.key === "Enter" && !e.shiftKey) {
                                                    e.preventDefault();
                                                    handleReply();
                                                }
                                            }}
                                            className="flex-1"
                                        />
                                        <Button onClick={handleReply} disabled={!replyText.trim()}>
                                            <Reply className="h-4 w-4 mr-2" />
                                            Reply
                                        </Button>
                                    </div>
                                    <p className="text-xs text-secondary-400 mt-2">
                                        Reply will be sent via {selectedItem.platform}
                                    </p>
                                </div>
                            </>
                        ) : (
                            <div className="flex flex-col items-center justify-center h-full text-center p-6">
                                <div className="h-16 w-16 rounded-full bg-secondary-100 flex items-center justify-center mb-4">
                                    <MessageSquare className="h-8 w-8 text-secondary-400" />
                                </div>
                                <h3 className="font-medium text-secondary-900 mb-1">Select a message</h3>
                                <p className="text-sm text-secondary-500 max-w-xs">
                                    Choose a message from the list to view details and reply
                                </p>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </PageContainer>
    );
}
