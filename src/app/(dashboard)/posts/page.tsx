"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { PageHeader } from "@/components/shared/page-header";
import { PageContainer } from "@/components/shared/page-components";
import { Input } from "@/components/ui/input";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import {
    Plus,
    Search,
    Calendar,
    Instagram,
    Facebook,
    Twitter,
    Linkedin,
    Youtube,
    MessageSquare,
    Clock,
    CheckCircle,
    AlertCircle,
    FileText,
    RefreshCw,
    Hourglass,
    XCircle,
    Globe,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import type { Post, Platform } from "@/types";
import { usePosts } from "@/hooks/use-posts";
import { useSelectedWorkspace } from "@/store/workspaceStore";

const platformIcons: Record<string, any> = {
    instagram: Instagram,
    facebook: Facebook,
    twitter: Twitter,
    linkedin: Linkedin,
    youtube: Youtube,
    tiktok: MessageSquare,
};

const statusConfig: Record<string, { icon: any; color: string; label: string }> = {
    draft: { icon: FileText, color: "text-secondary-500 bg-secondary-100", label: "Draft" },
    scheduled: { icon: Clock, color: "text-blue-600 bg-blue-100", label: "Scheduled" },
    published: { icon: CheckCircle, color: "text-green-600 bg-green-100", label: "Published" },
    failed: { icon: AlertCircle, color: "text-red-600 bg-red-100", label: "Failed" },
    pending_approval: { icon: Hourglass, color: "text-amber-600 bg-amber-100", label: "Pending" },
    in_review: { icon: Hourglass, color: "text-amber-600 bg-amber-100", label: "In Review" },
    approved: { icon: CheckCircle, color: "text-emerald-600 bg-emerald-100", label: "Approved" },
    rejected: { icon: XCircle, color: "text-red-600 bg-red-100", label: "Rejected" },
};

export default function PostsPage() {
    const router = useRouter();
    const workspace = useSelectedWorkspace();
    const [statusFilter, setStatusFilter] = useState<string>("all");
    const [search, setSearch] = useState("");

    // Use React Query hook for consistent data fetching
    const filters = useMemo(() => 
        statusFilter !== "all" ? { status: statusFilter } : {},
        [statusFilter]
    );
    
    const { 
        posts, 
        isLoading, 
        error, 
        refetch 
    } = usePosts(filters);

    // Helper to extract text from post content
    const getPostText = (post: Post): string => {
        if (!post.content) return '';
        // Content is Record<platform, { text: string }>
        const values = Object.values(post.content) as any[];
        const firstContent = values.find(v => v?.text);
        return firstContent?.text || '';
    };

    // Filter posts by search term
    const filteredPosts = useMemo(() => {
        if (!search) return posts;
        
        const searchLower = search.toLowerCase();
        return posts.filter((post) => {
            const text = getPostText(post).toLowerCase();
            return text.includes(searchLower) || post.id.includes(searchLower);
        });
    }, [posts, search]);

    // Show workspace selection prompt if no workspace
    if (!workspace) {
        return (
            <PageContainer>
                <Card className="p-12 text-center">
                    <Globe className="h-12 w-12 text-secondary-300 mx-auto mb-4" />
                    <h3 className="text-lg font-medium">No workspace selected</h3>
                    <p className="text-secondary-500 mt-2">
                        Please select or create a workspace to view your posts
                    </p>
                    <Button className="mt-4" onClick={() => router.push("/settings/workspace/create")}>
                        Create Workspace
                    </Button>
                </Card>
            </PageContainer>
        );
    }

    return (
        <PageContainer>
            <PageHeader
                title="Content"
                description="Manage all your content items"
                breadcrumbs={[{ label: "Content" }]}
                actions={
                    <Button onClick={() => router.push("/c")}>
                        <Plus className="h-4 w-4 mr-2" />
                        Create New
                    </Button>
                }
            />

            {/* Filters */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4 mt-6 mb-6">
                <div className="relative w-full sm:flex-1 sm:max-w-sm">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-secondary-400" />
                    <Input
                        placeholder="Search posts..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="pl-10"
                    />
                </div>

                <div className="flex items-center gap-2">
                    <Select value={statusFilter} onValueChange={setStatusFilter}>
                        <SelectTrigger className="w-full sm:w-40">
                            <SelectValue placeholder="Status" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">All Status</SelectItem>
                            <SelectItem value="draft">Draft</SelectItem>
                            <SelectItem value="scheduled">Scheduled</SelectItem>
                            <SelectItem value="published">Published</SelectItem>
                            <SelectItem value="pending_approval">Pending Approval</SelectItem>
                            <SelectItem value="in_review">In Review</SelectItem>
                            <SelectItem value="failed">Failed</SelectItem>
                        </SelectContent>
                    </Select>

                    <Button 
                        variant="outline" 
                        size="icon" 
                        onClick={() => refetch()} 
                        className="shrink-0"
                        disabled={isLoading}
                    >
                        <RefreshCw className={cn("h-4 w-4", isLoading && "animate-spin")} />
                    </Button>
                </div>
            </div>

            {/* Error state */}
            {error && (
                <Card className="p-6 mb-6 border-red-200 bg-red-50">
                    <div className="flex items-center gap-3">
                        <AlertCircle className="h-5 w-5 text-red-500" />
                        <div>
                            <p className="font-medium text-red-800">Failed to load posts</p>
                            <p className="text-sm text-red-600">{error}</p>
                        </div>
                        <Button 
                            variant="outline" 
                            size="sm" 
                            onClick={() => refetch()} 
                            className="ml-auto"
                        >
                            Retry
                        </Button>
                    </div>
                </Card>
            )}

            {/* Content */}
            {isLoading ? (
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    {[1, 2, 3, 4, 5, 6].map((i) => (
                        <Card key={i} className="p-4">
                            <Skeleton className="h-4 w-2/3 mb-3" />
                            <Skeleton className="h-3 w-full mb-2" />
                            <Skeleton className="h-3 w-1/2" />
                        </Card>
                    ))}
                </div>
            ) : filteredPosts.length === 0 ? (
                <Card className="p-12 text-center">
                    <FileText className="h-12 w-12 text-secondary-300 mx-auto mb-4" />
                    <h3 className="text-lg font-medium">
                        {search || statusFilter !== "all" ? "No matching posts" : "No posts yet"}
                    </h3>
                    <p className="text-secondary-500 mt-2">
                        {search || statusFilter !== "all" 
                            ? "Try adjusting your filters or search term"
                            : "Get started by creating your first post"
                        }
                    </p>
                    {!search && statusFilter === "all" && (
                        <Button className="mt-4" onClick={() => router.push("/c")}>
                            <Plus className="h-4 w-4 mr-2" />
                            Create Post
                        </Button>
                    )}
                </Card>
            ) : (
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    {filteredPosts.map((post) => {
                        const status = statusConfig[post.status] || statusConfig.draft;
                        const StatusIcon = status.icon;
                        const platforms = post.platforms || [];
                        const postText = getPostText(post);

                        return (
                            <Card
                                key={post.id}
                                className="cursor-pointer hover:shadow-md transition-shadow group"
                                onClick={() => router.push(`/posts/${post.id}`)}
                            >
                                <CardContent className="pt-4">
                                    <div className="flex items-start justify-between mb-3">
                                        <p className="font-medium text-secondary-900 line-clamp-2 text-sm group-hover:text-primary-600 transition-colors">
                                            {postText.slice(0, 80) || "No content"}
                                            {postText.length > 80 ? "..." : ""}
                                        </p>
                                        <Badge className={cn("shrink-0 ml-2", status.color)}>
                                            <StatusIcon className="h-3 w-3 mr-1" />
                                            {status.label}
                                        </Badge>
                                    </div>

                                    {/* Platforms */}
                                    <div className="flex items-center gap-2 mb-3">
                                        {platforms.slice(0, 4).map((platform) => {
                                            const Icon = platformIcons[platform] || MessageSquare;
                                            return (
                                                <div
                                                    key={platform}
                                                    className="h-6 w-6 rounded-full bg-secondary-100 flex items-center justify-center"
                                                    title={platform}
                                                >
                                                    <Icon className="h-3 w-3 text-secondary-600" />
                                                </div>
                                            );
                                        })}
                                        {platforms.length > 4 && (
                                            <span className="text-xs text-secondary-500">
                                                +{platforms.length - 4}
                                            </span>
                                        )}
                                        {platforms.length === 0 && (
                                            <span className="text-xs text-secondary-400">
                                                No platforms selected
                                            </span>
                                        )}
                                    </div>

                                    {/* Meta */}
                                    <div className="flex items-center gap-3 text-xs text-secondary-500">
                                        {post.scheduled_at ? (
                                            <span className="flex items-center gap-1">
                                                <Calendar className="h-3 w-3" />
                                                {format(new Date(post.scheduled_at), "MMM d, h:mm a")}
                                            </span>
                                        ) : post.published_at ? (
                                            <span className="flex items-center gap-1">
                                                <CheckCircle className="h-3 w-3" />
                                                Published {format(new Date(post.published_at), "MMM d")}
                                            </span>
                                        ) : (
                                            <span>
                                                Created {format(new Date(post.created_at), "MMM d")}
                                            </span>
                                        )}
                                    </div>
                                </CardContent>
                            </Card>
                        );
                    })}
                </div>
            )}
        </PageContainer>
    );
}
