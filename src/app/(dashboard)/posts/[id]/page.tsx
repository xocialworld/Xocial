"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { PageHeader } from "@/components/shared/page-header";
import { CommentsPanel, CommentList } from "@/components/features/comments";
import { toast } from "sonner";
import {
    ArrowLeft,
    Calendar,
    Clock,
    Edit,
    Trash2,
    MessageSquare,
    Instagram,
    Facebook,
    Twitter,
    Linkedin,
    Youtube,
    ExternalLink,
    CheckCircle,
    AlertCircle,
    Loader2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { format } from "date-fns";

interface ContentItem {
    id: string;
    workspace_id: string;
    title: string | null;
    brief: string | null;
    status: string;
    scheduled_at: string | null;
    published_at: string | null;
    created_at: string;
    created_by_user: {
        id: string;
        full_name: string;
        avatar_url: string | null;
    } | null;
    variants: Array<{
        id: string;
        platform: string;
        caption: string;
        status: string;
        scheduled_at: string | null;
        published_at: string | null;
        social_account: {
            id: string;
            platform_username: string;
            avatar_url: string | null;
        } | null;
    }>;
    approval_instance: Array<{
        id: string;
        status: string;
        workflow: {
            id: string;
            name: string;
        } | null;
    }>;
}

const platformIcons: Record<string, any> = {
    instagram: Instagram,
    facebook: Facebook,
    twitter: Twitter,
    linkedin: Linkedin,
    youtube: Youtube,
};

const statusColors: Record<string, string> = {
    draft: "bg-secondary-100 text-secondary-700",
    scheduled: "bg-blue-100 text-blue-700",
    published: "bg-green-100 text-green-700",
    failed: "bg-red-100 text-red-700",
    in_review: "bg-amber-100 text-amber-700",
};

export default function PostDetailPage() {
    const params = useParams();
    const router = useRouter();
    const postId = params.id as string;

    const [item, setItem] = useState<ContentItem | null>(null);
    const [loading, setLoading] = useState(true);

    const fetchPost = useCallback(async () => {
        try {
            const res = await fetch(`/api/composer/items/${postId}`);
            const data = await res.json();
            if (!res.ok) {
                throw new Error(data.error || "Failed to fetch post");
            }

            setItem(data.item);
        } catch (error: any) {
            console.error("Fetch post error:", error);
            toast.error(error.message || "Failed to load post");
        } finally {
            setLoading(false);
        }
    }, [postId]);

    useEffect(() => {
        if (postId) {
            fetchPost();
        }
    }, [postId, fetchPost]);

    const handleDelete = async () => {
        if (!confirm("Are you sure you want to delete this post?")) return;

        try {
            const res = await fetch(`/api/composer/items/${postId}`, {
                method: "DELETE",
            });

            if (!res.ok) {
                const data = await res.json();
                throw new Error(data.error);
            }

            toast.success("Post deleted");
            router.push("/posts");
        } catch (error: any) {
            toast.error(error.message || "Failed to delete post");
        }
    };

    if (loading) {
        return (
            <div className="p-8">
                <div className="max-w-4xl mx-auto">
                    <Skeleton className="h-8 w-48 mb-4" />
                    <Skeleton className="h-4 w-96 mb-8" />
                    <Skeleton className="h-64 w-full rounded-xl" />
                </div>
            </div>
        );
    }

    if (!item) {
        return (
            <div className="p-8">
                <div className="max-w-4xl mx-auto text-center py-12">
                    <AlertCircle className="h-12 w-12 text-secondary-400 mx-auto mb-4" />
                    <h2 className="text-xl font-semibold">Post not found</h2>
                    <p className="text-secondary-500 mt-2">
                        This post may have been deleted or you don&apos;t have access to it.
                    </p>
                    <Button className="mt-4" onClick={() => router.push("/posts")}>
                        <ArrowLeft className="h-4 w-4 mr-2" />
                        Back to Posts
                    </Button>
                </div>
            </div>
        );
    }

    const approvalStatus = item.approval_instance?.[0]?.status;

    return (
        <div className="p-8">
            <div className="max-w-4xl mx-auto">
                <PageHeader
                    title={item.title || "Untitled Post"}
                    description={item.brief || "No description"}
                    breadcrumbs={[
                        { label: "Content", href: "/posts" },
                        { label: item.title || "Post" },
                    ]}
                    actions={
                        <div className="flex items-center gap-2">
                            <CommentsPanel
                                contentItemId={postId}
                                workspaceId={item.workspace_id}
                                trigger={
                                    <Button variant="outline" size="sm">
                                        <MessageSquare className="h-4 w-4 mr-2" />
                                        Comments
                                    </Button>
                                }
                            />
                            {item.status !== "published" && (
                                <>
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => router.push(`/c?edit=${postId}`)}
                                    >
                                        <Edit className="h-4 w-4 mr-2" />
                                        Edit
                                    </Button>
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        className="text-red-600 hover:text-red-700"
                                        onClick={handleDelete}
                                    >
                                        <Trash2 className="h-4 w-4" />
                                    </Button>
                                </>
                            )}
                        </div>
                    }
                />

                {/* Status & Meta */}
                <div className="flex items-center gap-3 mt-4 mb-6">
                    <Badge className={cn("capitalize", statusColors[item.status])}>
                        {item.status.replace(/_/g, " ")}
                    </Badge>
                    {approvalStatus && (
                        <Badge variant="outline" className="capitalize">
                            Approval: {approvalStatus}
                        </Badge>
                    )}
                    {item.scheduled_at && (
                        <span className="flex items-center gap-1 text-sm text-secondary-500">
                            <Calendar className="h-4 w-4" />
                            {format(new Date(item.scheduled_at), "MMM d, yyyy 'at' h:mm a")}
                        </span>
                    )}
                    {item.published_at && (
                        <span className="flex items-center gap-1 text-sm text-green-600">
                            <CheckCircle className="h-4 w-4" />
                            Published {format(new Date(item.published_at), "MMM d, yyyy")}
                        </span>
                    )}
                </div>

                {/* Variants */}
                <div className="space-y-4">
                    <h3 className="text-lg font-medium">Platform Variants</h3>
                    {item.variants.length === 0 ? (
                        <Card className="p-6 text-center text-secondary-500">
                            No variants configured
                        </Card>
                    ) : (
                        item.variants.map((variant) => {
                            const Icon = platformIcons[variant.platform] || MessageSquare;
                            return (
                                <Card key={variant.id}>
                                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                        <div className="flex items-center gap-3">
                                            <div className="h-10 w-10 rounded-full bg-secondary-100 flex items-center justify-center">
                                                <Icon className="h-5 w-5 text-secondary-600" />
                                            </div>
                                            <div>
                                                <CardTitle className="text-base capitalize">
                                                    {variant.platform}
                                                </CardTitle>
                                                {variant.social_account && (
                                                    <p className="text-sm text-secondary-500">
                                                        @{variant.social_account.platform_username}
                                                    </p>
                                                )}
                                            </div>
                                        </div>
                                        <Badge
                                            className={cn("capitalize", statusColors[variant.status])}
                                        >
                                            {variant.status}
                                        </Badge>
                                    </CardHeader>
                                    <CardContent>
                                        <p className="text-secondary-700 whitespace-pre-wrap">
                                            {variant.caption || "No content"}
                                        </p>
                                        {variant.published_at && (
                                            <div className="mt-3 pt-3 border-t flex items-center gap-2 text-sm text-secondary-500">
                                                <ExternalLink className="h-4 w-4" />
                                                Published {format(new Date(variant.published_at), "PPp")}
                                            </div>
                                        )}
                                    </CardContent>
                                </Card>
                            );
                        })
                    )}
                </div>

                {/* Comments Section (inline) */}
                <div className="mt-8">
                    <h3 className="text-lg font-medium mb-4">Comments & Feedback</h3>
                    <Card>
                        <CardContent className="pt-6">
                            <CommentList
                                contentItemId={postId}
                                workspaceId={item.workspace_id}
                            />
                        </CardContent>
                    </Card>
                </div>
            </div>

        </div>
    );
}
