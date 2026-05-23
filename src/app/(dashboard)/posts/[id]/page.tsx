"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { format } from "date-fns";
import {
    AlertCircle,
    ArrowLeft,
    Calendar,
    CheckCircle,
    Clock,
    ExternalLink,
    Facebook,
    Instagram,
    Linkedin,
    Loader2,
    MessageSquare,
    Send,
    Trash2,
    Twitter,
    Youtube,
} from "lucide-react";
import { toast } from "sonner";

import { PageHeader } from "@/components/shared/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Skeleton } from "@/components/ui/skeleton";
import {
    buildPostDetailVariants,
    getPostDetailDescription,
    getPostDetailTitle,
    getPostFromDetailResponse,
} from "@/lib/posts";
import { cn } from "@/lib/utils";
import { useSelectedWorkspace } from "@/store/workspaceStore";
import type { Post } from "@/types";

type PostMediaItem = {
    id?: string;
    url?: string;
    type?: "image" | "video";
    filename?: string;
    name?: string;
};

const platformIcons: Record<string, any> = {
    instagram: Instagram,
    facebook: Facebook,
    twitter: Twitter,
    linkedin: Linkedin,
    youtube: Youtube,
    tiktok: MessageSquare,
};

const statusColors: Record<string, string> = {
    draft: "bg-secondary-100 text-secondary-700",
    scheduled: "bg-blue-100 text-blue-700",
    published: "bg-green-100 text-green-700",
    failed: "bg-red-100 text-red-700",
    partial: "bg-amber-100 text-amber-700",
    pending_approval: "bg-amber-100 text-amber-700",
    approved: "bg-emerald-100 text-emerald-700",
    rejected: "bg-red-100 text-red-700",
};

function formatLocalDate(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
}

function formatLocalTime(date: Date): string {
    const hours = String(date.getHours()).padStart(2, "0");
    const minutes = String(date.getMinutes()).padStart(2, "0");
    return `${hours}:${minutes}`;
}

function getErrorMessage(payload: any, fallback: string) {
    return payload?.error?.message || payload?.error || payload?.message || fallback;
}

function workspaceHeader(workspaceId?: string): Record<string, string> {
    return workspaceId ? { "x-workspace-id": workspaceId } : {};
}

export default function PostDetailPage() {
    const params = useParams();
    const router = useRouter();
    const workspace = useSelectedWorkspace();
    const workspaceId = workspace?.id;
    const postId = params.id as string;

    const [post, setPost] = useState<Post | null>(null);
    const [loading, setLoading] = useState(true);
    const [publishing, setPublishing] = useState(false);
    const [scheduling, setScheduling] = useState(false);
    const [deleting, setDeleting] = useState(false);
    const [scheduleOpen, setScheduleOpen] = useState(false);
    const [scheduledDate, setScheduledDate] = useState("");
    const [scheduledTime, setScheduledTime] = useState("10:00");

    const fetchPost = useCallback(async () => {
        try {
            setLoading(true);
            const response = await fetch(`/api/posts/${postId}`, {
                headers: workspaceHeader(workspaceId),
            });
            const payload = await response.json().catch(() => ({}));

            if (!response.ok) {
                throw new Error(getErrorMessage(payload, "Failed to fetch post"));
            }

            const nextPost = getPostFromDetailResponse(payload);
            if (!nextPost) {
                throw new Error("Post not found");
            }

            setPost(nextPost);

            const initialSchedule = nextPost.scheduled_at
                ? new Date(nextPost.scheduled_at)
                : new Date(Date.now() + 24 * 60 * 60 * 1000);
            setScheduledDate(formatLocalDate(initialSchedule));
            setScheduledTime(formatLocalTime(initialSchedule));
        } catch (error: any) {
            console.error("Fetch post error:", error);
            setPost(null);
            toast.error(error.message || "Failed to load post");
        } finally {
            setLoading(false);
        }
    }, [postId, workspaceId]);

    useEffect(() => {
        if (postId) {
            void fetchPost();
        }
    }, [fetchPost, postId]);

    const title = useMemo(() => getPostDetailTitle(post), [post]);
    const description = useMemo(() => getPostDetailDescription(post), [post]);
    const variants = useMemo(() => (post ? buildPostDetailVariants(post) : []), [post]);
    const media = useMemo(() => (Array.isArray(post?.media) ? post?.media as PostMediaItem[] : []), [post?.media]);

    const handlePublish = async () => {
        setPublishing(true);
        try {
            const response = await fetch(`/api/posts/${postId}/publish`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    ...workspaceHeader(workspaceId),
                },
            });
            const payload = await response.json().catch(() => ({}));

            if (!response.ok) {
                throw new Error(getErrorMessage(payload, "Failed to publish post"));
            }

            toast.success(payload.message || "Post published");
            await fetchPost();
        } catch (error: any) {
            toast.error(error.message || "Failed to publish post");
        } finally {
            setPublishing(false);
        }
    };

    const handleSchedule = async () => {
        const scheduledAt = scheduledDate && scheduledTime ? new Date(`${scheduledDate}T${scheduledTime}`) : null;
        if (!scheduledAt || Number.isNaN(scheduledAt.getTime())) {
            toast.error("Choose a valid schedule date and time");
            return;
        }
        if (scheduledAt <= new Date()) {
            toast.error("Schedule time must be in the future");
            return;
        }

        setScheduling(true);
        try {
            const response = await fetch(`/api/posts/${postId}`, {
                method: "PATCH",
                headers: {
                    "Content-Type": "application/json",
                    ...workspaceHeader(workspaceId),
                },
                body: JSON.stringify({
                    status: "scheduled",
                    scheduled_at: scheduledAt.toISOString(),
                }),
            });
            const payload = await response.json().catch(() => ({}));

            if (!response.ok) {
                throw new Error(getErrorMessage(payload, "Failed to schedule post"));
            }

            const nextPost = getPostFromDetailResponse(payload);
            if (nextPost) setPost(nextPost);
            setScheduleOpen(false);
            toast.success(`Post scheduled for ${scheduledAt.toLocaleString()}`);
        } catch (error: any) {
            toast.error(error.message || "Failed to schedule post");
        } finally {
            setScheduling(false);
        }
    };

    const handleDelete = async () => {
        if (!confirm("Delete this post?")) return;

        setDeleting(true);
        try {
            const response = await fetch(`/api/posts/${postId}`, {
                method: "DELETE",
                headers: workspaceHeader(workspaceId),
            });
            const payload = await response.json().catch(() => ({}));

            if (!response.ok) {
                throw new Error(getErrorMessage(payload, "Failed to delete post"));
            }

            toast.success("Post deleted");
            router.push("/posts");
        } catch (error: any) {
            toast.error(error.message || "Failed to delete post");
        } finally {
            setDeleting(false);
        }
    };

    if (loading) {
        return (
            <div className="p-8">
                <div className="mx-auto max-w-5xl">
                    <Skeleton className="mb-4 h-8 w-48" />
                    <Skeleton className="mb-8 h-4 w-96" />
                    <Skeleton className="h-64 w-full rounded-xl" />
                </div>
            </div>
        );
    }

    if (!post) {
        return (
            <div className="p-8">
                <div className="mx-auto max-w-4xl py-12 text-center">
                    <AlertCircle className="mx-auto mb-4 h-12 w-12 text-secondary-400" />
                    <h2 className="text-xl font-semibold">Post not found</h2>
                    <p className="mt-2 text-secondary-500">
                        This post may have been deleted or you don&apos;t have access to it.
                    </p>
                    <Button className="mt-4" onClick={() => router.push("/posts")}>
                        <ArrowLeft className="mr-2 h-4 w-4" />
                        Back to Posts
                    </Button>
                </div>
            </div>
        );
    }

    const canModify = post.status !== "published";

    return (
        <div className="p-8">
            <div className="mx-auto max-w-5xl">
                <PageHeader
                    title={title}
                    description={description}
                    breadcrumbs={[
                        { label: "Content", href: "/posts" },
                        { label: "Post" },
                    ]}
                    actions={
                        <div className="flex flex-wrap items-center gap-2">
                            <Button variant="outline" size="sm" onClick={() => router.push("/posts")}>
                                <ArrowLeft className="mr-2 h-4 w-4" />
                                Back
                            </Button>

                            {canModify && (
                                <>
                                    <Popover open={scheduleOpen} onOpenChange={setScheduleOpen}>
                                        <PopoverTrigger asChild>
                                            <Button variant="outline" size="sm" className="gap-2">
                                                <Calendar className="h-4 w-4" />
                                                Schedule
                                            </Button>
                                        </PopoverTrigger>
                                        <PopoverContent className="w-80" align="end">
                                            <div className="space-y-3">
                                                <div>
                                                    <h3 className="text-sm font-semibold text-secondary-900">Schedule post</h3>
                                                    <p className="mt-1 text-xs text-secondary-500">
                                                        Choose the exact local date and time for this draft.
                                                    </p>
                                                </div>
                                                <div className="grid gap-2">
                                                    <Label htmlFor="schedule-date">Date</Label>
                                                    <Input
                                                        id="schedule-date"
                                                        type="date"
                                                        value={scheduledDate}
                                                        min={formatLocalDate(new Date())}
                                                        onChange={(event) => setScheduledDate(event.target.value)}
                                                    />
                                                </div>
                                                <div className="grid gap-2">
                                                    <Label htmlFor="schedule-time">Time</Label>
                                                    <Input
                                                        id="schedule-time"
                                                        type="time"
                                                        value={scheduledTime}
                                                        onChange={(event) => setScheduledTime(event.target.value)}
                                                    />
                                                </div>
                                                <Button
                                                    type="button"
                                                    onClick={handleSchedule}
                                                    disabled={scheduling}
                                                    className="w-full gap-2"
                                                >
                                                    {scheduling ? <Loader2 className="h-4 w-4 animate-spin" /> : <Calendar className="h-4 w-4" />}
                                                    Confirm Schedule
                                                </Button>
                                            </div>
                                        </PopoverContent>
                                    </Popover>

                                    <Button size="sm" onClick={handlePublish} disabled={publishing} className="gap-2">
                                        {publishing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                                        Publish now
                                    </Button>

                                    <Button
                                        variant="outline"
                                        size="sm"
                                        className="text-red-600 hover:text-red-700"
                                        onClick={handleDelete}
                                        disabled={deleting}
                                    >
                                        {deleting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                                    </Button>
                                </>
                            )}
                        </div>
                    }
                />

                <div className="mt-4 mb-6 flex flex-wrap items-center gap-3">
                    <Badge className={cn("capitalize", statusColors[post.status] || statusColors.draft)}>
                        {post.status.replace(/_/g, " ")}
                    </Badge>
                    {post.scheduled_at && (
                        <span className="flex items-center gap-1 text-sm text-secondary-500">
                            <Calendar className="h-4 w-4" />
                            {format(new Date(post.scheduled_at), "MMM d, yyyy 'at' h:mm a")}
                        </span>
                    )}
                    {post.published_at && (
                        <span className="flex items-center gap-1 text-sm text-green-600">
                            <CheckCircle className="h-4 w-4" />
                            Published {format(new Date(post.published_at), "MMM d, yyyy")}
                        </span>
                    )}
                    <span className="flex items-center gap-1 text-sm text-secondary-500">
                        <Clock className="h-4 w-4" />
                        Created {format(new Date(post.created_at), "MMM d, yyyy")}
                    </span>
                </div>

                {media.length > 0 && (
                    <Card className="mb-6">
                        <CardHeader>
                            <CardTitle className="text-base">Media</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-6">
                                {media.map((item, index) => (
                                    <div key={item.id || item.url || index} className="flex aspect-square items-center justify-center overflow-hidden rounded-lg bg-secondary-100 text-secondary-600">
                                        {item.type === "image" && item.url ? (
                                            // eslint-disable-next-line @next/next/no-img-element
                                            <img src={item.url} alt={item.filename || item.name || "Post media"} className="h-full w-full object-cover" />
                                        ) : (
                                            <div className="px-3 text-center text-xs">
                                                {item.type === "video" ? "Video" : "Media"}
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </CardContent>
                    </Card>
                )}

                <div className="space-y-4">
                    <h3 className="text-lg font-medium">Platform previews</h3>
                    {variants.length === 0 ? (
                        <Card className="p-6 text-center text-secondary-500">
                            No platforms configured
                        </Card>
                    ) : (
                        variants.map((variant) => {
                            const Icon = platformIcons[variant.platform] || MessageSquare;

                            return (
                                <Card key={variant.id}>
                                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                        <div className="flex min-w-0 items-center gap-3">
                                            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-secondary-100">
                                                <Icon className="h-5 w-5 text-secondary-600" />
                                            </div>
                                            <div className="min-w-0">
                                                <CardTitle className="truncate text-base capitalize">
                                                    {variant.platform}
                                                </CardTitle>
                                                <p className="truncate text-sm text-secondary-500">
                                                    {variant.social_account ? "Account selected" : "No account saved with this draft"}
                                                </p>
                                            </div>
                                        </div>
                                        <Badge className={cn("capitalize", statusColors[variant.status] || statusColors.draft)}>
                                            {variant.status.replace(/_/g, " ")}
                                        </Badge>
                                    </CardHeader>
                                    <CardContent>
                                        <p className="whitespace-pre-wrap text-secondary-700">
                                            {variant.caption || "No content"}
                                        </p>
                                    </CardContent>
                                </Card>
                            );
                        })
                    )}
                </div>

                {post.published_at && (
                    <Card className="mt-8">
                        <CardContent className="flex items-center gap-2 pt-6 text-sm text-secondary-500">
                            <ExternalLink className="h-4 w-4" />
                            Published posts can be managed from connected platform analytics and engagement views.
                        </CardContent>
                    </Card>
                )}
            </div>
        </div>
    );
}
