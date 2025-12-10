"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { PageHeader } from "@/components/shared/page-header";
import { Input } from "@/components/ui/input";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
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
} from "lucide-react";
import { cn } from "@/lib/utils";
import { format } from "date-fns";

interface ContentItem {
    id: string;
    title: string | null;
    status: string;
    scheduled_at: string | null;
    created_at: string;
    variants: Array<{
        platform: string;
    }>;
}

const platformIcons: Record<string, any> = {
    instagram: Instagram,
    facebook: Facebook,
    twitter: Twitter,
    linkedin: Linkedin,
    youtube: Youtube,
};

const statusConfig: Record<string, { icon: any; color: string; label: string }> = {
    draft: { icon: FileText, color: "text-secondary-500 bg-secondary-100", label: "Draft" },
    scheduled: { icon: Clock, color: "text-blue-600 bg-blue-100", label: "Scheduled" },
    published: { icon: CheckCircle, color: "text-green-600 bg-green-100", label: "Published" },
    failed: { icon: AlertCircle, color: "text-red-600 bg-red-100", label: "Failed" },
    in_review: { icon: Clock, color: "text-amber-600 bg-amber-100", label: "In Review" },
};

export default function PostsPage() {
    const router = useRouter();
    const [items, setItems] = useState<ContentItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [workspaceId, setWorkspaceId] = useState<string | null>(null);
    const [statusFilter, setStatusFilter] = useState<string>("all");
    const [search, setSearch] = useState("");

    useEffect(() => {
        fetchWorkspace();
    }, []);

    const fetchWorkspace = async () => {
        try {
            const res = await fetch("/api/workspaces");
            const data = await res.json();
            if (data.workspaces?.[0]) {
                setWorkspaceId(data.workspaces[0].id);
            }
        } catch (error) {
            console.error("Failed to get workspace:", error);
        }
    };

    useEffect(() => {
        if (workspaceId) {
            fetchPosts();
        }
    }, [workspaceId, statusFilter]);

    const fetchPosts = async () => {
        if (!workspaceId) return;

        try {
            let url = `/api/composer/items?workspace_id=${workspaceId}`;
            if (statusFilter !== "all") {
                url += `&status=${statusFilter}`;
            }

            const res = await fetch(url);
            const data = await res.json();

            if (!res.ok) throw new Error(data.error);

            setItems(data.items || []);
        } catch (error: any) {
            console.error("Fetch posts error:", error);
            toast.error("Failed to load posts");
        } finally {
            setLoading(false);
        }
    };

    const filteredItems = items.filter((item) => {
        if (!search) return true;
        return (
            item.title?.toLowerCase().includes(search.toLowerCase()) ||
            item.id.includes(search)
        );
    });

    return (
        <div className="p-8">
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
            <div className="flex items-center gap-4 mt-6 mb-6">
                <div className="relative flex-1 max-w-sm">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-secondary-400" />
                    <Input
                        placeholder="Search posts..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="pl-10"
                    />
                </div>

                <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger className="w-40">
                        <SelectValue placeholder="Status" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">All Status</SelectItem>
                        <SelectItem value="draft">Draft</SelectItem>
                        <SelectItem value="scheduled">Scheduled</SelectItem>
                        <SelectItem value="published">Published</SelectItem>
                        <SelectItem value="in_review">In Review</SelectItem>
                        <SelectItem value="failed">Failed</SelectItem>
                    </SelectContent>
                </Select>

                <Button variant="outline" size="sm" onClick={fetchPosts}>
                    <RefreshCw className="h-4 w-4" />
                </Button>
            </div>

            {/* Content */}
            {loading ? (
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    {[1, 2, 3, 4, 5, 6].map((i) => (
                        <Card key={i} className="p-4">
                            <Skeleton className="h-4 w-2/3 mb-3" />
                            <Skeleton className="h-3 w-full mb-2" />
                            <Skeleton className="h-3 w-1/2" />
                        </Card>
                    ))}
                </div>
            ) : filteredItems.length === 0 ? (
                <Card className="p-12 text-center">
                    <FileText className="h-12 w-12 text-secondary-300 mx-auto mb-4" />
                    <h3 className="text-lg font-medium">No posts yet</h3>
                    <p className="text-secondary-500 mt-2">
                        Get started by creating your first post
                    </p>
                    <Button className="mt-4" onClick={() => router.push("/c")}>
                        <Plus className="h-4 w-4 mr-2" />
                        Create Post
                    </Button>
                </Card>
            ) : (
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    {filteredItems.map((item) => {
                        const status = statusConfig[item.status] || statusConfig.draft;
                        const StatusIcon = status.icon;
                        const uniquePlatforms = [...new Set(item.variants.map((v) => v.platform))];

                        return (
                            <Card
                                key={item.id}
                                className="cursor-pointer hover:shadow-md transition-shadow"
                                onClick={() => router.push(`/posts/${item.id}`)}
                            >
                                <CardContent className="pt-4">
                                    <div className="flex items-start justify-between mb-3">
                                        <h3 className="font-medium text-secondary-900 line-clamp-2">
                                            {item.title || "Untitled"}
                                        </h3>
                                        <Badge className={cn("shrink-0 ml-2", status.color)}>
                                            <StatusIcon className="h-3 w-3 mr-1" />
                                            {status.label}
                                        </Badge>
                                    </div>

                                    {/* Platforms */}
                                    <div className="flex items-center gap-2 mb-3">
                                        {uniquePlatforms.slice(0, 4).map((platform) => {
                                            const Icon = platformIcons[platform] || MessageSquare;
                                            return (
                                                <div
                                                    key={platform}
                                                    className="h-6 w-6 rounded-full bg-secondary-100 flex items-center justify-center"
                                                >
                                                    <Icon className="h-3 w-3 text-secondary-600" />
                                                </div>
                                            );
                                        })}
                                        {uniquePlatforms.length > 4 && (
                                            <span className="text-xs text-secondary-500">
                                                +{uniquePlatforms.length - 4}
                                            </span>
                                        )}
                                    </div>

                                    {/* Meta */}
                                    <div className="flex items-center gap-3 text-xs text-secondary-500">
                                        {item.scheduled_at ? (
                                            <span className="flex items-center gap-1">
                                                <Calendar className="h-3 w-3" />
                                                {format(new Date(item.scheduled_at), "MMM d")}
                                            </span>
                                        ) : (
                                            <span>
                                                Created {format(new Date(item.created_at), "MMM d")}
                                            </span>
                                        )}
                                    </div>
                                </CardContent>
                            </Card>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
